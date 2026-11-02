import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import Feather from '@expo/vector-icons/Feather';
import { Text } from './scaledText';
import { useLanguage } from '../context/LanguageContext';
import { spacing, radii } from '../theme';

const ESCALA_MAXIMA = 4;
const PASO_ZOOM = 0.25;
// Más allá de esto no se gana nitidez y las subidas pesan de más.
const LADO_MAXIMO = 1440;

const acotar = (valor, minimo, maximo) => Math.min(Math.max(valor, minimo), maximo);

/**
 * Recorte dentro de la app: se arrastra y se acerca la foto hasta que encaje en
 * el marco, y se recorta justo lo que se ve.
 *
 * El recorte del sistema (allowsEditing) decide por su cuenta y en Android ni
 * siquiera deja mover la foto si ya cabe; aquí el encuadre es de quien sube la
 * foto, y el resultado es el mismo en Android, iOS y web.
 *
 * `aspecto` es ancho/alto del marco: 1 para una foto de perfil (se ve en
 * círculo) y 4/3 para la evidencia de una actividad.
 */
export const AjustarFotoModal = ({
  visible,
  uri,
  aspecto = 1,
  circular = false,
  onCancelar,
  onListo,
}) => {
  const { colors, styles } = useThemeValues(getAjustarFotoModalTheme);
  const { t } = useLanguage();
  const { width: anchoVentana, height: altoVentana } = useWindowDimensions();

  const [medidas, setMedidas] = useState(null);
  const [escala, setEscala] = useState(1);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(false);

  // El arrastre va por Animated para no repintar en cada dedo movido; el valor
  // de verdad se guarda aparte, que es el que manda al recortar.
  const desplazamiento = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const posicion = useRef({ x: 0, y: 0 });
  const gesto = useRef({ x: 0, y: 0, distancia: 0, escala: 1 });

  const marco = useMemo(() => {
    const ancho = Math.min(anchoVentana - spacing.xxl * 2, 340);
    const alto = Math.min(ancho / aspecto, altoVentana * 0.5);
    return { ancho: alto * aspecto, alto };
  }, [anchoVentana, altoVentana, aspecto]);

  // Tamaño de la foto cuando apenas cubre el marco: el punto de partida.
  const base = medidas ? Math.max(marco.ancho / medidas.ancho, marco.alto / medidas.alto) : 1;
  const mostrada = {
    ancho: medidas ? medidas.ancho * base * escala : 0,
    alto: medidas ? medidas.alto * base * escala : 0,
  };
  const limite = {
    x: Math.max(0, (mostrada.ancho - marco.ancho) / 2),
    y: Math.max(0, (mostrada.alto - marco.alto) / 2),
  };

  const colocar = (x, y) => {
    const puesto = { x: acotar(x, -limite.x, limite.x), y: acotar(y, -limite.y, limite.y) };
    posicion.current = puesto;
    desplazamiento.setValue(puesto);
  };

  // Cada foto empieza centrada y sin acercar.
  useEffect(() => {
    if (!visible || !uri) return undefined;
    let vigente = true;
    setMedidas(null);
    setError(false);
    setEscala(1);
    posicion.current = { x: 0, y: 0 };
    desplazamiento.setValue({ x: 0, y: 0 });
    Image.getSize(
      uri,
      (ancho, alto) => { if (vigente) setMedidas({ ancho, alto }); },
      () => { if (vigente) setError(true); }
    );
    return () => { vigente = false; };
  }, [visible, uri, desplazamiento]);

  // Al alejar, la foto puede quedar descolocada: se vuelve a meter en el marco.
  useEffect(() => {
    colocar(posicion.current.x, posicion.current.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escala, medidas]);

  const distanciaEntre = (toques) => {
    const [a, b] = toques;
    return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
  };

  // El PanResponder se crea una sola vez, así que no puede leer el estado de
  // este render: lo mira por referencia, que siempre apunta a lo de ahora.
  const escalaRef = useRef(escala);
  const colocarRef = useRef(colocar);
  escalaRef.current = escala;
  colocarRef.current = colocar;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evento) => {
        const toques = evento.nativeEvent.touches || [];
        gesto.current = {
          x: posicion.current.x,
          y: posicion.current.y,
          distancia: toques.length >= 2 ? distanciaEntre(toques) : 0,
          escala: escalaRef.current,
        };
      },
      onPanResponderMove: (evento, estado) => {
        const toques = evento.nativeEvent.touches || [];
        // Dos dedos: acercar o alejar. Uno: mover la foto por el marco.
        if (toques.length >= 2 && gesto.current.distancia > 0) {
          const proporcion = distanciaEntre(toques) / gesto.current.distancia;
          setEscala(acotar(gesto.current.escala * proporcion, 1, ESCALA_MAXIMA));
          return;
        }
        colocarRef.current(gesto.current.x + estado.dx, gesto.current.y + estado.dy);
      },
    })
  ).current;

  const cambiarZoom = (paso) => setEscala((previa) => acotar(previa + paso, 1, ESCALA_MAXIMA));

  const confirmar = async () => {
    if (!medidas || procesando) return;
    setProcesando(true);
    try {
      // De píxeles de pantalla a píxeles de la foto original.
      const factor = base * escala;
      const anchoVisible = Math.min(marco.ancho / factor, medidas.ancho);
      const altoVisible = Math.min(marco.alto / factor, medidas.alto);
      const origenX = acotar(
        (medidas.ancho - anchoVisible) / 2 - posicion.current.x / factor,
        0,
        Math.max(0, medidas.ancho - anchoVisible)
      );
      const origenY = acotar(
        (medidas.alto - altoVisible) / 2 - posicion.current.y / factor,
        0,
        Math.max(0, medidas.alto - altoVisible)
      );

      const acciones = [{
        crop: {
          originX: Math.round(origenX),
          originY: Math.round(origenY),
          width: Math.round(anchoVisible),
          height: Math.round(altoVisible),
        },
      }];
      // Una foto recién hecha puede venir enorme: se recorta y luego se encoge.
      if (anchoVisible > LADO_MAXIMO || altoVisible > LADO_MAXIMO) {
        acciones.push(
          anchoVisible >= altoVisible
            ? { resize: { width: LADO_MAXIMO } }
            : { resize: { height: LADO_MAXIMO } }
        );
      }

      const recortada = await ImageManipulator.manipulateAsync(uri, acciones, {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      onListo(recortada.uri);
    } catch (fallo) {
      console.error('No se pudo recortar la foto:', fallo);
      // Antes que dejarla sin foto, se sube tal cual se eligió.
      onListo(uri);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancelar}
    >
      <View style={styles.overlay}>
        <View style={styles.hoja}>
          <Text style={styles.titulo}>{t('photo.adjust_title') || 'Ajusta tu foto'}</Text>
          <Text style={styles.ayuda}>
            {t('photo.adjust_hint') || 'Arrastra la foto y usa los botones para acercarla. Se guardará lo que se vea dentro del marco.'}
          </Text>

          <View
            style={[
              styles.marco,
              { width: marco.ancho, height: marco.alto, borderRadius: circular ? marco.alto / 2 : radii.card },
            ]}
            {...pan.panHandlers}
          >
            {medidas && !error ? (
              <Animated.Image
                source={{ uri }}
                style={{
                  width: mostrada.ancho,
                  height: mostrada.alto,
                  transform: [
                    { translateX: desplazamiento.x },
                    { translateY: desplazamiento.y },
                  ],
                }}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cargando}>
                {error ? (
                  <Text style={styles.errorTexto}>
                    {t('photo.adjust_error') || 'No se pudo abrir esta foto.'}
                  </Text>
                ) : (
                  <ActivityIndicator color={colors.primary} />
                )}
              </View>
            )}
          </View>

          <View style={styles.zoomFila}>
            <TouchableOpacity
              style={[styles.zoomBoton, escala <= 1 && styles.zoomBotonApagado]}
              onPress={() => cambiarZoom(-PASO_ZOOM)}
              disabled={escala <= 1}
              accessibilityRole="button"
              accessibilityLabel={t('photo.zoom_out') || 'Alejar'}
            >
              <Feather name="zoom-out" size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.zoomBarra}>
              <View
                style={[
                  styles.zoomRelleno,
                  { width: `${((escala - 1) / (ESCALA_MAXIMA - 1)) * 100}%` },
                ]}
              />
            </View>
            <TouchableOpacity
              style={[styles.zoomBoton, escala >= ESCALA_MAXIMA && styles.zoomBotonApagado]}
              onPress={() => cambiarZoom(PASO_ZOOM)}
              disabled={escala >= ESCALA_MAXIMA}
              accessibilityRole="button"
              accessibilityLabel={t('photo.zoom_in') || 'Acercar'}
            >
              <Feather name="zoom-in" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.acciones}>
            <TouchableOpacity
              style={styles.cancelar}
              onPress={onCancelar}
              disabled={procesando}
              accessibilityRole="button"
            >
              <Text style={styles.cancelarTexto}>{t('common.cancel') || 'Cancelar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.usar, (procesando || !medidas) && styles.usarApagado]}
              onPress={confirmar}
              disabled={procesando || !medidas}
              accessibilityRole="button"
            >
              {procesando ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.usarTexto}>{t('photo.use_photo') || 'Usar esta foto'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Los valores claros originales se conservan; solo se resuelven colores según el tema.
export const getAjustarFotoModalTheme = createThemeStyles((theme) => {
  const { colors } = theme;
  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.color('rgba(5, 31, 37, 0.58)', 'scrim'),
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    hoja: {
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radii.card,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
    },
    titulo: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '600',
      letterSpacing: -0.3,
    },
    ayuda: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.lg,
    },
    marco: {
      overflow: 'hidden',
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cargando: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    errorTexto: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    zoomFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
      alignSelf: 'stretch',
    },
    zoomBoton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    zoomBotonApagado: {
      opacity: 0.45,
    },
    zoomBarra: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    zoomRelleno: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    acciones: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.xl,
      alignSelf: 'stretch',
    },
    cancelar: {
      flex: 1,
      height: 46,
      borderRadius: radii.round,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    cancelarTexto: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    usar: {
      flex: 1.4,
      height: 46,
      borderRadius: radii.round,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    usarApagado: {
      opacity: 0.6,
    },
    usarTexto: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
  return { theme, colors, styles };
});
