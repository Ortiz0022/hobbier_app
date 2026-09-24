import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Text, TextInput } from '../../../components/scaledText';
import { SelectableCard } from '../../../components/SelectableCard';
import { TOKENS } from '../../../theme/designTokens';
import { useLanguage } from '../../../context/LanguageContext';
import { getCatalogIcon, getCatalogTint } from '../catalogIcons';
import {
  fetchCatalogoInicial,
  buscarEnCatalogo,
  fetchCatalogoPorIds,
} from '../../../services/catalogService';

/** Milisegundos de espera tras la última tecla antes de consultar. */
const ESPERA_BUSQUEDA = 300;
/** Con menos letras la búsqueda devuelve medio catálogo y no ayuda. */
const MINIMO_LETRAS = 2;

/**
 * Selector de un catálogo (gustos o intereses) con búsqueda.
 *
 * Un solo componente para las dos pantallas: solo cambia la tabla.
 *
 * Por qué no se descarga el catálogo entero: el filtrado vive en Postgres. Al
 * abrir se piden unas pocas opciones y, al escribir, se consulta por nombre con
 * un límite. Así la pantalla aguanta un catálogo grande sin cambiar nada.
 *
 * Lo ya elegido se muestra SIEMPRE arriba, aunque no coincida con la búsqueda:
 * si desapareciera al escribir, no habría forma de quitarlo sin borrar el texto.
 *
 * No se pueden crear opciones nuevas: los catálogos los administra el admin.
 */
export const CatalogPicker = ({ tabla, selectedIds, onChange, initialCount = 5 }) => {
  const { t } = useLanguage();

  const [texto, setTexto] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  // Filas completas de lo elegido, para poder pintar su nombre e icono.
  const [elegidas, setElegidas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Cada consulta lleva número: si vuelve una antigua después de otra más
  // reciente (la red no respeta el orden), se descarta en vez de pisar la lista.
  const consultaRef = useRef(0);
  const idsElegidosRef = useRef(selectedIds);
  idsElegidosRef.current = selectedIds;

  const cargarIniciales = useCallback(async () => {
    const consulta = ++consultaRef.current;
    setCargando(true);
    setError(null);
    try {
      const [iniciales, filasElegidas] = await Promise.all([
        fetchCatalogoInicial(tabla, initialCount),
        fetchCatalogoPorIds(tabla, idsElegidosRef.current),
      ]);
      if (consulta !== consultaRef.current) return;
      setSugerencias(iniciales);
      setElegidas(filasElegidas);
    } catch (err) {
      if (consulta !== consultaRef.current) return;
      setError(err);
    } finally {
      if (consulta === consultaRef.current) setCargando(false);
    }
  }, [tabla, initialCount]);

  useEffect(() => {
    cargarIniciales();
  }, [cargarIniciales]);

  // Búsqueda con espera: sin ella se consultaría en cada tecla.
  useEffect(() => {
    const termino = texto.trim();
    if (termino.length < MINIMO_LETRAS) return undefined;

    const temporizador = setTimeout(async () => {
      const consulta = ++consultaRef.current;
      setCargando(true);
      setError(null);
      try {
        const resultados = await buscarEnCatalogo(tabla, termino);
        if (consulta !== consultaRef.current) return;
        setSugerencias(resultados);
      } catch (err) {
        if (consulta !== consultaRef.current) return;
        setError(err);
      } finally {
        if (consulta === consultaRef.current) setCargando(false);
      }
    }, ESPERA_BUSQUEDA);

    return () => clearTimeout(temporizador);
  }, [texto, tabla]);

  const limpiarBusqueda = () => {
    setTexto('');
    cargarIniciales();
  };

  const alternar = (item) => {
    const yaEstaba = selectedIds.includes(item.id);
    onChange(
      yaEstaba ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id],
    );
    // La fila se guarda al elegirla: así sigue pudiéndose quitar aunque la
    // búsqueda cambie y esa opción ya no esté entre los resultados.
    setElegidas((previas) =>
      yaEstaba
        ? previas.filter((fila) => fila.id !== item.id)
        : previas.some((fila) => fila.id === item.id)
          ? previas
          : [...previas, item],
    );
  };

  const pintarOpcion = (item) => (
    <SelectableCard
      key={item.id}
      label={item.name}
      icon={getCatalogIcon(item.name)}
      tint={getCatalogTint(item.name)}
      isSelected={selectedIds.includes(item.id)}
      onPress={() => alternar(item)}
    />
  );

  const buscando = texto.trim().length >= MINIMO_LETRAS;
  const sugerenciasVisibles = sugerencias.filter((item) => !selectedIds.includes(item.id));

  return (
    <View>
      <View style={styles.buscador}>
        <Feather name="search" size={18} color={TOKENS.colors.textMuted} />
        <TextInput
          style={styles.buscadorInput}
          placeholder={t('onboarding.search_placeholder')}
          placeholderTextColor={TOKENS.colors.inactiveBorder}
          value={texto}
          onChangeText={setTexto}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('onboarding.search_placeholder')}
        />
        {texto ? (
          <TouchableOpacity
            onPress={limpiarBusqueda}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.search_clear')}
          >
            <Feather name="x" size={18} color={TOKENS.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {elegidas.length > 0 ? (
        <View style={styles.bloque}>
          <Text style={styles.encabezado}>{t('onboarding.selected_heading')}</Text>
          <View style={styles.lista}>{elegidas.map(pintarOpcion)}</View>
        </View>
      ) : null}

      <View style={styles.bloque}>
        <Text style={styles.encabezado}>
          {buscando ? t('onboarding.search_results') : t('onboarding.suggestions')}
        </Text>

        {error ? (
          <View style={styles.estado}>
            <Feather name="alert-circle" size={22} color={TOKENS.colors.alertText} />
            <Text style={styles.estadoTexto}>{t('onboarding.catalog_error')}</Text>
            <TouchableOpacity
              style={styles.reintentar}
              onPress={buscando ? () => setTexto(texto) : cargarIniciales}
              accessibilityRole="button"
            >
              <Text style={styles.reintentarTexto}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : cargando ? (
          <View style={styles.estado}>
            <ActivityIndicator color={TOKENS.colors.active} />
          </View>
        ) : sugerenciasVisibles.length === 0 ? (
          <View style={styles.estado}>
            <Text style={styles.estadoTexto}>
              {buscando ? t('onboarding.no_results') : t('onboarding.all_selected')}
            </Text>
          </View>
        ) : (
          <View style={styles.lista}>{sugerenciasVisibles.map(pintarOpcion)}</View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
    backgroundColor: TOKENS.colors.inactiveBg,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.inactiveBorder,
    borderRadius: TOKENS.radius.full,
    paddingHorizontal: TOKENS.spacing.md,
    height: 46,
  },
  buscadorInput: {
    flex: 1,
    fontSize: 15,
    color: TOKENS.colors.textDark,
  },
  bloque: {
    marginTop: TOKENS.spacing.md,
  },
  encabezado: {
    fontSize: 12,
    fontWeight: '700',
    color: TOKENS.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: TOKENS.spacing.sm,
  },
  lista: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // El mismo `gap` que la rejilla del asistente: las tarjetas ocupan la fila
    // entera (pastillas), así que esto separa renglones.
    gap: TOKENS.spacing.sm + 4,
  },
  estado: {
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.lg,
  },
  estadoTexto: {
    fontSize: 13.5,
    color: TOKENS.colors.textMuted,
    textAlign: 'center',
  },
  reintentar: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: 6,
    borderRadius: TOKENS.radius.full,
    backgroundColor: TOKENS.colors.badgeInfoBg,
  },
  reintentarTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.badgeInfoText,
  },
});
