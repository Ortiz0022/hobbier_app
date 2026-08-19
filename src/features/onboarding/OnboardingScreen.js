import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Text, TextInput } from '../../components/scaledText';
import Feather from '@expo/vector-icons/Feather';
import { SelectableCard } from '../../components/SelectableCard';
import { StepProgressBar } from '../../components/StepProgressBar';
import { TOKENS } from '../../theme/designTokens';
import { getCatalogIcon, getCatalogTint } from './catalogIcons';
import { useAuth } from '../../context/AuthContext';
// Se reutilizan las reglas de fecha del registro en lugar de escribir otras:
// ya están probadas y así el formato pedido es el mismo en toda la app.
import { ageFromISODate, validateBirthDate } from '../auth/validation';
import {
  fetchAllCatalogs,
  fetchUserPreferences,
  saveUserPreferences,
  saveUserBirthDate,
} from '../../services/catalogService';

// El asistente recorre esta lista: primero la fecha (paso propio, sin
// catálogo) y después las tres secciones de opciones. Agregar un paso es
// agregar una entrada aquí; los puntitos y la navegación salen de su longitud.
const STEPS = [
  {
    key: 'birthDate',
    title: 'Tu Fecha de Nacimiento',
    description: 'Usamos tu edad para asegurarnos de sugerirte actividades adecuadas.',
  },
  {
    key: 'likes',
    title: 'Mis Gustos',
    description: '¿Qué temáticas disfrutas en tu día a día?',
  },
  {
    key: 'interests',
    title: 'Mis Objetivos',
    description: '¿Qué habilidades buscas desarrollar?',
  },
  {
    key: 'resources',
    title: 'Recursos Disponibles',
    description: '¿Qué herramientas tienes a la mano?',
  },
];

export const OnboardingScreen = ({ onComplete, onCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [likesCatalog, setLikesCatalog] = useState([]);
  const [interestsCatalog, setInterestsCatalog] = useState([]);
  const [resourcesCatalog, setResourcesCatalog] = useState([]);

  const [selectedLikes, setSelectedLikes] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedResources, setSelectedResources] = useState([]);

  // Fecha de nacimiento: define qué metas son aptas por edad.
  const [birthDate, setBirthDate] = useState('');
  const [birthDateError, setBirthDateError] = useState('');

  // Paso actual del asistente (0 = fecha de nacimiento).
  const [step, setStep] = useState(0);

  // Progreso de la transición de entrada del paso: 0 = recién montado (corrido
  // y transparente), 1 = en su sitio.
  const entrada = useRef(new Animated.Value(1)).current;
  // Hacia dónde se movió el usuario. Decide de qué lado entra el paso nuevo:
  // al avanzar entra por la derecha y al volver por la izquierda, que es lo que
  // hace que el gesto se sienta como ir y venir y no como dos saltos iguales.
  const direccion = useRef(1);
  const scrollRef = useRef(null);

  // Queda contenido por debajo del borde visible. Sirve para avisar de que hay
  // más opciones: la fila cortada por abajo no basta, y quien no se dé cuenta
  // se salta la mitad del catálogo sin saberlo.
  const [hayMasAbajo, setHayMasAbajo] = useState(false);
  const pista = useRef(new Animated.Value(0)).current;
  // Vaivén de la flecha. Es lo que la convierte en una invitación a deslizar en
  // vez de un adorno más de la pantalla.
  const flota = useRef(new Animated.Value(0)).current;
  const desplazamiento = useRef(0);
  const alturaVisible = useRef(0);
  const alturaContenido = useRef(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const catalogs = await fetchAllCatalogs();
    setLikesCatalog(catalogs.likes);
    setInterestsCatalog(catalogs.interests);
    setResourcesCatalog(catalogs.resources);

    if (user?.id) {
      const prefs = await fetchUserPreferences(user.id);
      setSelectedLikes(prefs.userLikes);
      setSelectedInterests(prefs.userInterests);
      setSelectedResources(prefs.userResources);
      // Se muestra en dd/mm/aaaa aunque la base la guarde como YYYY-MM-DD.
      if (prefs.birthDate) {
        const [y, m, d] = prefs.birthDate.split('-');
        setBirthDate(`${d}/${m}/${y}`);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    // Cada paso arranca corrido y transparente, y entra a su sitio.
    entrada.setValue(0);
    Animated.timing(entrada, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      // react-native-web no implementa el driver nativo: dejarlo en true allí
      // llena la consola de avisos y la animación no corre.
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    // Sin esto, al llegar a un paso con muchas opciones se aparece a media
    // lista, con el scroll donde lo dejó el paso anterior.
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  useEffect(() => {
    Animated.timing(pista, {
      toValue: hayMasAbajo ? 1 : 0,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [hayMasAbajo, pista]);

  useEffect(() => {
    if (!hayMasAbajo) return undefined;

    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(flota, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(flota, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    bucle.start();

    // Se detiene al ocultarse: un bucle corriendo debajo de una flecha
    // invisible gasta batería sin que nadie lo vea.
    return () => bucle.stop();
  }, [hayMasAbajo, flota]);

  // Margen de holgura: sin él la pista parpadea al llegar al final, porque el
  // rebote deja el desplazamiento un par de píxeles corto.
  const HOLGURA = 24;

  // Baja casi una pantalla, no una entera: dejar a la vista la fila que estaba
  // al borde es lo que deja claro que no se saltó nada.
  const bajarUnaPantalla = () => {
    scrollRef.current?.scrollTo({
      y: desplazamiento.current + alturaVisible.current * 0.8,
      animated: true,
    });
  };

  const revisarSobrante = (desplazamiento = 0) => {
    setHayMasAbajo(
      alturaContenido.current - alturaVisible.current - desplazamiento > HOLGURA,
    );
  };

  const toggleItem = (id, list, setList) => {
    if (list.includes(id)) {
      setList(list.filter((item) => item !== id));
    } else {
      setList([...list, id]);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // La fecha se valida ANTES de tocar la red: si está mal, no tiene sentido
    // guardar preferencias a medias.
    const birth = validateBirthDate(birthDate);
    if (birth.error) {
      setBirthDateError(birth.error);
      return;
    }
    setBirthDateError('');

    setSaving(true);

    const [result] = await Promise.all([
      saveUserPreferences(user.id, selectedLikes, selectedInterests, selectedResources),
      saveUserBirthDate(user.id, birth.isoDate),
    ]);

    setSaving(false);

    if (result.success) {
      const msg = 'Preferencias guardadas correctamente.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('¡Excelente!', msg);
      if (onComplete) onComplete();
    } else {
      const msg = 'Error al guardar tus preferencias.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const esUltimo = step === STEPS.length - 1;

  const siguiente = () => {
    // La fecha se valida al SALIR de su paso, no al guardar: si estuviera mal,
    // el error aparecería tres pantallas después de haberla escrito.
    if (STEPS[step].key === 'birthDate') {
      const birth = validateBirthDate(birthDate);
      if (birth.error) {
        setBirthDateError(birth.error);
        return;
      }
      setBirthDateError('');
    }

    if (esUltimo) {
      handleSave();
      return;
    }
    direccion.current = 1;
    setStep(step + 1);
  };

  const anterior = () => {
    direccion.current = -1;
    setStep(Math.max(0, step - 1));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TOKENS.colors.active} />
        <Text style={styles.loadingText}>Cargando catálogos...</Text>
      </View>
    );
  }

  const sectionData = {
    likes: {
      catalog: likesCatalog,
      selected: selectedLikes,
      setSelected: setSelectedLikes,
    },
    interests: {
      catalog: interestsCatalog,
      selected: selectedInterests,
      setSelected: setSelectedInterests,
    },
    resources: {
      catalog: resourcesCatalog,
      selected: selectedResources,
      setSelected: setSelectedResources,
    },
  };

  const seccion = STEPS[step];

  // Edad ya calculada, para devolverle al usuario lo que entendimos de su
  // fecha. Escribir 09/03/2003 y que la pantalla conteste "Tienes 22 años" es
  // la única forma de que note un dedazo en el año antes de seguir.
  const edad = (() => {
    const { isoDate } = validateBirthDate(birthDate);
    return isoDate ? ageFromISODate(isoDate) : null;
  })();

  return (
    <SafeAreaView style={styles.screen}>
      {/* CABECERA: volver arriba y la barra de progreso a todo lo ancho */}
      <View style={styles.header}>
        {step > 0 || onCancel ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={step > 0 ? anterior : onCancel}
            accessibilityRole="button"
            accessibilityLabel={step > 0 ? 'Volver al paso anterior' : 'Salir sin guardar'}
          >
            <Feather name="arrow-left" size={20} color={TOKENS.colors.textDark} />
          </TouchableOpacity>
        ) : (
          // Hueco del mismo tamaño que el botón: sin él, la cabecera cambiaría
          // de alto entre el primer paso y los demás y todo daría un salto.
          <View style={styles.headerSpacer} />
        )}
      </View>

      <View style={styles.progressWrap}>
        <StepProgressBar currentStep={step + 1} totalSteps={STEPS.length} />
      </View>

      <Animated.View
        style={[
          styles.stepBody,
          {
            opacity: entrada,
            transform: [
              {
                translateX: entrada.interpolate({
                  inputRange: [0, 1],
                  outputRange: [direccion.current * 34, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onLayout={(e) => {
            alturaVisible.current = e.nativeEvent.layout.height;
            revisarSobrante();
          }}
          onContentSizeChange={(_, alto) => {
            alturaContenido.current = alto;
            revisarSobrante();
          }}
          onScroll={(e) => {
            desplazamiento.current = e.nativeEvent.contentOffset.y;
            revisarSobrante(desplazamiento.current);
          }}
        >
          <Text style={styles.stepTitle}>{seccion.title}</Text>
          <Text style={styles.stepSubtitle}>{seccion.description}</Text>

          {seccion.key === 'birthDate' ? (
            <View style={styles.dateBlock}>
              <View style={styles.dateIconCircle}>
                <Feather name="calendar" size={38} color={TOKENS.colors.active} />
              </View>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>OBLIGATORIO</Text>
              </View>

              <View
                style={[styles.dateInputBox, birthDateError ? styles.dateInputBoxInvalid : null]}
              >
                <TextInput
                  style={styles.dateInput}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor={TOKENS.colors.inactiveBorder}
                  value={birthDate}
                  onChangeText={(value) => {
                    setBirthDate(value);
                    if (birthDateError) setBirthDateError('');
                  }}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              {/* Siempre hay una línea aquí (error, edad o pista) para que el
                bloque no cambie de alto y salte al escribir. */}
              {birthDateError ? (
                <View style={[styles.dateFeedback, styles.dateFeedbackError]}>
                  <Feather name="alert-circle" size={14} color={TOKENS.colors.alertText} />
                  <Text style={styles.dateFeedbackErrorText}>{birthDateError}</Text>
                </View>
              ) : edad !== null ? (
                <View style={[styles.dateFeedback, styles.dateFeedbackOk]}>
                  <Feather name="check-circle" size={14} color={TOKENS.colors.badgeInfoText} />
                  <Text style={styles.dateFeedbackOkText}>Tienes {edad} años</Text>
                </View>
              ) : (
                <Text style={styles.dateHint}>Por ejemplo: 09/03/2003</Text>
              )}
            </View>
          ) : (
            <View style={styles.optionsGrid}>
              {sectionData[seccion.key].catalog.map((item) => (
                <SelectableCard
                  key={item.id}
                  label={item.name}
                  icon={getCatalogIcon(item.name)}
                  tint={getCatalogTint(item.name)}
                  isSelected={sectionData[seccion.key].selected.includes(item.id)}
                  onPress={() =>
                    toggleItem(
                      item.id,
                      sectionData[seccion.key].selected,
                      sectionData[seccion.key].setSelected,
                    )
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* PISTA DE SCROLL: aparece solo si queda contenido por debajo.
            box-none en el contenedor: ocupa todo el ancho para centrar la
            flecha, pero solo la flecha recibe el toque; si no, se comería el
            de las tarjetas que tiene detrás. */}
        <Animated.View
          style={[
            styles.scrollHint,
            {
              opacity: pista,
              transform: [
                { translateY: flota.interpolate({ inputRange: [0, 1], outputRange: [0, 7] }) },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={bajarUnaPantalla}
            style={styles.scrollHintCircle}
            accessibilityRole="button"
            accessibilityLabel="Ver más opciones"
            // Zona de toque mayor que el círculo: 34 px se queda corto para un
            // dedo, y esto la agranda sin agrandar el dibujo.
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-down" size={20} color={TOKENS.colors.active} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* PIE: fuera del ScrollView, para que la acción principal siempre se vea */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryButton}
          onPress={siguiente}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={TOKENS.colors.white} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {esUltimo ? 'Guardar Preferencias' : 'Continuar'}
              </Text>
              {!esUltimo ? (
                <Feather name="arrow-right" size={18} color={TOKENS.colors.white} />
              ) : null}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: TOKENS.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: TOKENS.spacing.md,
    fontSize: 14,
    color: TOKENS.colors.textMuted,
  },
  stepBody: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.inactiveBg,
  },
  progressWrap: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingBottom: TOKENS.spacing.sm,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  contentContainer: {
    // flexGrow + center: cuando el paso tiene pocas opciones queda centrado en
    // la pantalla en vez de amontonado arriba con un hueco vacío debajo. Si el
    // contenido no cabe, vuelve a comportarse como una lista normal.
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing.lg,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: TOKENS.colors.textDark,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: TOKENS.colors.textMuted,
    textAlign: 'center',
    marginTop: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.lg,
    lineHeight: 20,
    // Un renglón muy largo cuesta de leer, y centrado todavía más.
    maxWidth: 340,
    alignSelf: 'center',
  },
  dateBlock: {
    alignItems: 'center',
    gap: TOKENS.spacing.md,
  },
  dateIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.badgeInfoBg,
    marginBottom: TOKENS.spacing.xs,
  },
  dateInputBox: {
    alignSelf: 'stretch',
    backgroundColor: TOKENS.colors.inactiveBg,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.inactiveBorder,
    borderRadius: TOKENS.radius.card,
    paddingHorizontal: TOKENS.spacing.md,
  },
  dateInputBoxInvalid: {
    borderColor: TOKENS.colors.danger,
    backgroundColor: TOKENS.colors.alertBg,
  },
  dateInput: {
    paddingVertical: TOKENS.spacing.md,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    color: TOKENS.colors.textDark,
  },
  dateFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: 6,
    borderRadius: TOKENS.radius.full,
  },
  dateFeedbackOk: {
    backgroundColor: TOKENS.colors.badgeInfoBg,
  },
  dateFeedbackOkText: {
    color: TOKENS.colors.badgeInfoText,
    fontSize: 13,
    fontWeight: '600',
  },
  dateFeedbackError: {
    backgroundColor: TOKENS.colors.alertBg,
  },
  dateFeedbackErrorText: {
    color: TOKENS.colors.alertText,
    fontSize: 13,
    fontWeight: '600',
    // Un mensaje largo baja de línea en vez de estirar la pastilla fuera de
    // la pantalla con la letra del sistema agrandada.
    flexShrink: 1,
  },
  dateHint: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
  },
  badge: {
    // Ámbar: avisa sin repetir el naranja del botón ni el cian de lo demás.
    backgroundColor: TOKENS.colors.badgePointsBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: TOKENS.colors.badgePointsText,
    fontSize: 10,
    fontWeight: '700',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // El `gap` es la ÚNICA separación entre tarjetas: si además tuvieran margen
    // propio, los dos se sumarían y la rejilla dejaría de cuadrar.
    gap: TOKENS.spacing.sm + 4,
  },
  scrollHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: TOKENS.spacing.sm,
    alignItems: 'center',
  },
  scrollHintCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.white,
    // Sin borde, la sombra es lo ÚNICO que despega la flecha del fondo blanco
    // de la pantalla. Sacarla la haría desaparecer.
    shadowColor: TOKENS.colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  footer: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingTop: TOKENS.spacing.sm,
    paddingBottom: TOKENS.spacing.lg,
    backgroundColor: TOKENS.colors.white,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: TOKENS.spacing.sm,
    backgroundColor: TOKENS.colors.primary,
    paddingVertical: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.full,
  },
  primaryButtonText: {
    color: TOKENS.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
