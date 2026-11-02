import { useThemeValues } from '../context/ThemeContext';
import { createThemeStyles } from '../theme/themeRuntime';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
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
// El apagado de alrededor es el borde de un marco gigante: con uno así de
// ancho, su esquina redondeada tapa la pantalla entera por grande que sea.
const GROSOR_SOMBRA = 1200;
const NEGRO = '#000000';
const BLANCO = '#FFFFFF';
const TENUE = 'rgba(255, 255, 255, 0.66)';
const SOMBRA = 'rgba(0, 0, 0, 0.62)';
const BORDE = 'rgba(255, 255, 255, 0.92)';

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

  // El encuadre manda en la pantalla, como en cualquier editor de fotos: se
  // come el ancho que haya y solo cede si no cabe de alto.
  const marco = useMemo(() => {
    const ancho = Math.min(anchoVentana - spacing.xl * 2, 480);
    const alto = Math.min(ancho / aspecto, altoVentana * 0.52);
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
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancelar}
    >
      <StatusBar barStyle="light-content" backgroundColor={NEGRO} />
      <View style={styles.editor}>
        <View style={styles.barraSuperior}>
          <TouchableOpacity
            style={styles.cerrar}
            onPress={onCancelar}
            disabled={procesando}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common.close') || 'Cerrar'}
          >
            <Feather name="x" size={24} color={BLANCO} />
          </TouchableOpacity>
          <Text style={styles.titulo}>{t('photo.adjust_title') || 'Ajusta tu foto'}</Text>
          <View style={styles.cerrar} />
        </View>

        <View style={styles.lienzo} {...pan.panHandlers}>
          {medidas && !error ? (
            <>
              <Animated.Image
                source={{ uri }}
                style={{
                  width: mostrada.ancho,
                  height: mostrada.alto,
                  flexShrink: 0,
                  transform: [
                    { translateX: desplazamiento.x },
                    { translateY: desplazamiento.y },
                  ],
                }}
                resizeMode="cover"
              />

              {/* El resto de la foto se sigue viendo, apagado, para saber qué
                  queda fuera. El hueco es el borde interior de un marco enorme:
                  así sale redondo de verdad cuando toca. */}
              <View pointerEvents="none" style={styles.capa}>
                <View
                  style={{
                    width: marco.ancho + GROSOR_SOMBRA * 2,
                    height: marco.alto + GROSOR_SOMBRA * 2,
                    borderWidth: GROSOR_SOMBRA,
                    borderColor: SOMBRA,
                    borderRadius: GROSOR_SOMBRA + (circular ? marco.alto / 2 : radii.card),
                  }}
                />
              </View>

              <View pointerEvents="none" style={styles.capa}>
                <View
                  style={{
                    width: marco.ancho,
                    height: marco.alto,
                    borderWidth: 1.5,
                    borderColor: BORDE,
                    borderRadius: circular ? marco.alto / 2 : radii.card,
                  }}
                />
              </View>
            </>
          ) : error ? (
            <Text style={styles.errorTexto}>
              {t('photo.adjust_error') || 'No se pudo abrir esta foto.'}
            </Text>
          ) : (
            <ActivityIndicator color={BLANCO} />
          )}
        </View>

        <View style={styles.barraInferior}>
          <Text style={styles.ayuda}>
            {t('photo.adjust_hint') || 'Arrastra la foto para moverla y pellizca para acercarla.'}
          </Text>

          <View style={styles.zoomFila}>
            <TouchableOpacity
              style={[styles.zoomBoton, escala <= 1 && styles.zoomBotonApagado]}
              onPress={() => cambiarZoom(-PASO_ZOOM)}
              disabled={escala <= 1}
              accessibilityRole="button"
              accessibilityLabel={t('photo.zoom_out') || 'Alejar'}
            >
              <Feather name="zoom-out" size={18} color={BLANCO} />
            </TouchableOpacity>
            <View style={styles.zoomBarra}>
              <View
                style={[
                  styles.zoomRelleno,
                  { width: ((escala - 1) / (ESCALA_MAXIMA - 1)) * 100 + '%' },
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
              <Feather name="zoom-in" size={18} color={BLANCO} />
            </TouchableOpacity>
          </View>

          {/* Lo que se viene a hacer aquí va primero; irse, después. */}
          <View style={styles.acciones}>
            <TouchableOpacity
              style={[styles.listo, (procesando || !medidas) && styles.listoApagado]}
              onPress={confirmar}
              disabled={procesando || !medidas}
              accessibilityRole="button"
            >
              {procesando ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.listoTexto}>{t('photo.use_photo') || 'Listo'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelar}
              onPress={onCancelar}
              disabled={procesando}
              accessibilityRole="button"
            >
              <Text style={styles.cancelarTexto}>{t('common.cancel') || 'Cancelar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// El editor va en negro a propósito, como el de cualquier app de fotos: así la
// foto manda y se ve bien qué queda dentro del encuadre. Es la única pantalla
// que no sigue el tema; de él solo toma el color del botón principal.
export const getAjustarFotoModalTheme = createThemeStyles((theme) => {
  const { colors } = theme;
  const styles = StyleSheet.create({
    editor: {
      flex: 1,
      backgroundColor: NEGRO,
    },
    barraSuperior: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + spacing.md : spacing.xl,
      paddingBottom: spacing.md,
    },
    cerrar: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titulo: {
      color: BLANCO,
      fontSize: 16,
      fontWeight: '600',
    },
    lienzo: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    capa: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorTexto: {
      color: BLANCO,
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
    barraInferior: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    ayuda: {
      color: TENUE,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    zoomFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    zoomBoton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
    },
    zoomBotonApagado: {
      opacity: 0.4,
    },
    zoomBarra: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
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
    },
    listo: {
      flex: 1.4,
      height: 48,
      borderRadius: radii.round,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    listoApagado: {
      opacity: 0.5,
    },
    listoTexto: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    cancelar: {
      flex: 1,
      height: 48,
      borderRadius: radii.round,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
    },
    cancelarTexto: {
      color: BLANCO,
      fontSize: 15,
      fontWeight: '600',
    },
  });
  return { theme, colors, styles };
});
