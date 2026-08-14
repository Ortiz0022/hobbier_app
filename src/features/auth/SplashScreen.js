import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// En web no existe el driver nativo. Pedirlo igualmente deja la animación en manos
// de un puente que no está, y además NO se puede mezclar: `Animated.add` combina el
// desplazamiento de entrada con el vaivén, y si uno fuera nativo y el otro no,
// React Native lanza "Attempting to run JS driven animation on animated node that
// has been moved to native". Por eso el valor es uno solo para todo el archivo.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// Iconos flotantes que representan hobbies.
// `x` e `y` son fracciones de la pantalla (0 a 1), no píxeles: así la constelación
// se reparte igual de bien en un móvil estrecho que en una ventana ancha.
// La franja central (y entre 0.38 y 0.64) se deja libre para el título.
const FLOATING_ICONS = [
  // Zona superior
  { IconLib: MaterialCommunityIcons, name: 'palette-outline', size: 26, color: '#DF9C8E', x: 0.44, y: 0.07 },
  { IconLib: MaterialCommunityIcons, name: 'chef-hat', size: 30, color: '#0C8AA6', x: 0.68, y: 0.10 },
  { IconLib: MaterialCommunityIcons, name: 'book-open-variant', size: 38, color: '#0C8AA6', x: 0.10, y: 0.13 },
  { IconLib: Feather, name: 'edit-3', size: 28, color: '#FF8F21', x: 0.78, y: 0.19 },
  { IconLib: Feather, name: 'headphones', size: 24, color: '#8A908B', x: 0.24, y: 0.23 },
  { IconLib: Ionicons, name: 'telescope-outline', size: 26, color: '#8A908B', x: 0.52, y: 0.26 },
  { IconLib: Ionicons, name: 'leaf-outline', size: 24, color: '#0C8AA6', x: 0.86, y: 0.30 },
  { IconLib: MaterialCommunityIcons, name: 'cards-playing-outline', size: 26, color: '#DF9C8E', x: 0.07, y: 0.31 },

  // Laterales, a la altura del título
  { IconLib: Feather, name: 'coffee', size: 22, color: '#FF8F21', x: 0.08, y: 0.43 },
  { IconLib: MaterialCommunityIcons, name: 'guitar-acoustic', size: 28, color: '#DF9C8E', x: 0.06, y: 0.56 },
  { IconLib: Ionicons, name: 'camera', size: 30, color: '#FF8F21', x: 0.82, y: 0.55 },
  { IconLib: Ionicons, name: 'musical-notes-outline', size: 22, color: '#0C8AA6', x: 0.90, y: 0.61 },

  // Zona inferior
  { IconLib: MaterialCommunityIcons, name: 'flower-outline', size: 24, color: '#FF8F21', x: 0.58, y: 0.69 },
  { IconLib: Ionicons, name: 'basketball-outline', size: 26, color: '#FF8F21', x: 0.84, y: 0.72 },
  { IconLib: MaterialCommunityIcons, name: 'bicycle', size: 36, color: '#8A908B', x: 0.14, y: 0.74 },
  { IconLib: MaterialCommunityIcons, name: 'puzzle-outline', size: 24, color: '#0C8AA6', x: 0.32, y: 0.80 },
  { IconLib: Ionicons, name: 'game-controller-outline', size: 24, color: '#8A908B', x: 0.70, y: 0.81 },
  { IconLib: Feather, name: 'scissors', size: 20, color: '#8A908B', x: 0.88, y: 0.86 },
  { IconLib: MaterialCommunityIcons, name: 'yoga', size: 28, color: '#0C8AA6', x: 0.16, y: 0.88 },
  { IconLib: MaterialCommunityIcons, name: 'chess-knight', size: 26, color: '#DF9C8E', x: 0.46, y: 0.90 },
];

export const SplashScreen = ({ onFinish }) => {
  // Animated values
  const bgFade = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.3)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const chevronOpacity = useRef(new Animated.Value(0)).current;
  const chevronBounce = useRef(new Animated.Value(0)).current;
  const contentLift = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const exiting = useRef(false);

  // Salida encadenada: en lugar de desmontar de golpe, el contenido sube mientras
  // toda la pantalla se desvanece, y solo al terminar se avisa al padre. El
  // AuthScreen entra con el mismo gesto, así que el relevo se lee como continuo.
  const handleFinish = () => {
    if (exiting.current) return; // dos toques seguidos no deben encadenar dos salidas
    exiting.current = true;

    // Se desvanece el CONTENIDO, no el contenedor: el fondo beige sigue pintado
    // hasta el desmontaje, y como el AuthScreen tiene ese mismo fondo, el relevo
    // no deja ni un fotograma de blanco entre pantallas.
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 0,
        duration: 380,
        easing: Easing.in(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(contentLift, {
        toValue: -28,
        duration: 380,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      if (onFinish) onFinish();
    });
  };

  // El flotar de los iconos sale de DOS relojes compartidos que giran sin parar,
  // no de una animación por icono. Cada icono lee esos relojes con su propia fase y
  // amplitud, así que solo hay 2 animaciones en marcha en vez de 40: en web, donde
  // useNativeDriver no aplica, esa diferencia es la que se nota en la fluidez.
  const clockY = useRef(new Animated.Value(0)).current;
  const clockX = useRef(new Animated.Value(0)).current;

  // Each icon gets its own animated values
  const iconAnims = useRef(
    FLOATING_ICONS.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(30),
    }))
  ).current;

  // Convierte un reloj lineal (0→1) en un vaivén senoidal. Se muestrea el seno en
  // 13 puntos y se interpola entre ellos: el resultado es indistinguible de una
  // onda real y no tiene los tirones de ir de un extremo al otro con `timing`.
  // Como sin(2π(0+fase)) == sin(2π(1+fase)), el salto del final del bucle al
  // principio es continuo y no se ve ningún brinco.
  const waves = useRef(
    FLOATING_ICONS.map((_, i) => {
      const SAMPLES = 13;
      const inputRange = Array.from({ length: SAMPLES }, (_, k) => k / (SAMPLES - 1));
      const build = (clock, amplitude, phase) =>
        clock.interpolate({
          inputRange,
          outputRange: inputRange.map(
            (t) => amplitude * Math.sin(2 * Math.PI * (t + phase))
          ),
        });

      // Fases repartidas con multiplicadores que no encajan en fracciones simples,
      // para que los iconos nunca queden sincronizados entre sí.
      return {
        y: build(clockY, 6 + (i % 4) * 2.5, (i * 0.37) % 1),
        x: build(clockX, 3 + (i % 3) * 2, (i * 0.61) % 1),
      };
    })
  ).current;

  useEffect(() => {
    // La cadena de entrada encadena callbacks durante ~2 s. Si el usuario toca el
    // chevron antes, hay que evitar que los bucles del final arranquen ya desmontados.
    let cancelled = false;

    // 0. Los relojes del flotar arrancan de inmediato, antes que nada: así los
    // iconos ya vienen meciéndose mientras aparecen, en lugar de quedarse quietos
    // y empezar a moverse de golpe al terminar la entrada.
    // Los periodos no son múltiplos entre sí, así que la combinación de vertical y
    // horizontal tarda mucho en repetirse y el recorrido se percibe orgánico.
    // `isInteraction: false` evita que un bucle infinito mantenga abierto un handle
    // de InteractionManager para siempre, que es lo que puede dejar en cola tareas
    // que esperan a que "terminen las interacciones".
    const clocks = [
      Animated.loop(
        Animated.timing(clockY, {
          toValue: 1,
          duration: 4200,
          easing: Easing.linear,
          isInteraction: false,
          useNativeDriver: USE_NATIVE_DRIVER,
        })
      ),
      Animated.loop(
        Animated.timing(clockX, {
          toValue: 1,
          duration: 6700,
          easing: Easing.linear,
          isInteraction: false,
          useNativeDriver: USE_NATIVE_DRIVER,
        })
      ),
    ];
    clocks.forEach((c) => c.start());

    // En web, al cambiar de pestaña el navegador congela requestAnimationFrame y el
    // bucle se queda a medias sin volver por su cuenta: los iconos se quedan
    // clavados al regresar. Se para al ocultar y se reanuda al volver, de forma
    // explícita, para que el movimiento no dependa de eso.
    let detachVisibility;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVisibilityChange = () => {
        if (cancelled) return;
        if (document.visibilityState === 'visible') {
          clocks.forEach((c) => c.start());
        } else {
          clocks.forEach((c) => c.stop());
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      detachVisibility = () =>
        document.removeEventListener('visibilitychange', onVisibilityChange);
    }

    // 1. Fade in the background
    Animated.timing(bgFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    // 2. Stagger the icons appearing.
    // Sin `delay: i * 120` a propósito: Animated.stagger ya escalona por sí solo, y
    // sumar ambos retrasos hacía que la entrada creciera al cuadrado con el número
    // de iconos (con 20, el título tardaba más de 4 segundos en aparecer).
    const iconEntries = iconAnims.map((anim) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        // `Easing.out(Easing.cubic)`: entra rápido y frena al final, en vez de
        // llegar de golpe. Es lo que hace que el icono parezca posarse.
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    Animated.stagger(55, iconEntries).start(() => {
      // 3. After icons appear, animate the title
      Animated.parallel([
        Animated.spring(titleScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(() => {
        // 4. Subtitle fades in
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: USE_NATIVE_DRIVER,
        }).start(() => {
          // 5. Show chevron with bounce
          Animated.timing(chevronOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: USE_NATIVE_DRIVER,
          }).start(() => {
            if (cancelled) return;
            // Start looping bounce. Con easing senoidal el rebote frena en los
            // extremos en lugar de rebotar contra un tope invisible.
            const bounce = Animated.loop(
              Animated.sequence([
                Animated.timing(chevronBounce, {
                  toValue: 10,
                  duration: 900,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: USE_NATIVE_DRIVER,
                }),
                Animated.timing(chevronBounce, {
                  toValue: 0,
                  duration: 900,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: USE_NATIVE_DRIVER,
                }),
              ])
            );
            clocks.push(bounce);
            bounce.start();
          });
        });
      });
    });

    // Si se toca el chevron antes de tiempo la pantalla se desmonta, y los bucles
    // seguirían corriendo indefinidamente contra valores que ya nadie pinta.
    return () => {
      cancelled = true;
      if (detachVisibility) detachVisibility();
      clocks.forEach((c) => c.stop());
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: bgFade }]}>
      {/* Floating hobby icons */}
      {FLOATING_ICONS.map((icon, index) => {
        const anim = iconAnims[index];
        const { IconLib } = icon;
        // Se acota al ancho disponible para que los iconos del borde derecho no
        // queden cortados en pantallas estrechas.
        const left = Math.min(icon.x * width, width - icon.size - 8);
        return (
          <Animated.View
            key={index}
            style={[
              styles.floatingIcon,
              {
                left,
                top: icon.y * height,
                // Su propia opacidad de entrada, atenuada por el fundido de salida
                opacity: Animated.multiply(anim.opacity, contentFade),
                transform: [
                  { translateX: waves[index].x },
                  { translateY: Animated.add(anim.translateY, waves[index].y) },
                ],
              },
            ]}
          >
            <IconLib name={icon.name} size={icon.size} color={icon.color} />
          </Animated.View>
        );
      })}

      {/* Center content */}
      <Animated.View
        style={[
          styles.centerContent,
          { opacity: contentFade, transform: [{ translateY: contentLift }] },
        ]}
      >
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ scale: titleScale }],
            },
          ]}
        >
          Hobbier
        </Animated.Text>

        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Encuentra algo nuevo que hacer.
        </Animated.Text>

        <TouchableOpacity onPress={handleFinish} activeOpacity={0.7}>
          <Animated.View
            style={{
              opacity: chevronOpacity,
              transform: [{ translateY: chevronBounce }],
              marginTop: 24,
            }}
          >
            <Ionicons name="chevron-down" size={28} color="#0C8AA6" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F3F5',
  },
  floatingIcon: {
    position: 'absolute',
    zIndex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 40,
    color: '#121B22',
    fontFamily: 'DynaPuff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8A908B',
    marginTop: 10,
    fontWeight: '500',
  },
});
