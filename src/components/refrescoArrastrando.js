import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  RefreshControl as RefreshControlNativo,
  StyleSheet,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

/**
 * Tirar hacia abajo para recargar, TAMBIÉN en web.
 *
 * El RefreshControl de react-native-web no hace nada: recibe onRefresh,
 * refreshing, colors y tintColor, los descarta y devuelve un View pelado
 * (node_modules/react-native-web/dist/exports/RefreshControl/index.js). En el
 * navegador el gesto no disparaba nunca la recarga.
 *
 * Lo que sí hace react-native-web es RENDERIZAR el refreshControl envolviendo
 * al scroll (ScrollView/index.js: le hace cloneElement pasándole el scroller
 * como children). Eso es lo que se aprovecha aquí: este componente ocupa ese
 * hueco, escucha el arrastre y llama a onRefresh al pasar del umbral.
 *
 * En iOS y Android no se toca nada: se exporta el RefreshControl de siempre,
 * que es el que da el gesto del sistema.
 *
 * Uso: cambiar el import de 'react-native' por este archivo; el resto de cada
 * pantalla se queda igual.
 */

/** Hay que tirar esto para que cuente como recarga. */
const UMBRAL = 64;
/** Más allá de esto el indicador ya no baja: el arrastre se frena. */
const MAXIMO = 110;
/** El arrastre acompaña a medias, como el rebote de iOS. */
const RESISTENCIA = 0.5;

const RefreshControlWeb = ({
  refreshing = false,
  onRefresh,
  enabled = true,
  tintColor = '#0C8AA6',
  colors,
  style,
  children,
  ...resto
}) => {
  const contenedorRef = useRef(null);
  const [distancia, setDistancia] = useState(0);
  const alturaIndicador = useRef(new Animated.Value(0)).current;

  // Datos del gesto en curso. En un ref y no en estado: cambian en cada
  // movimiento del dedo y no deben repintar nada por sí mismos.
  const gesto = useRef({ activo: false, inicioY: 0, scroller: null, recorrido: 0 });

  const color = (Array.isArray(colors) && colors[0]) || tintColor;

  const mover = useCallback(
    (hasta) => {
      setDistancia(hasta);
      Animated.timing(alturaIndicador, {
        toValue: hasta,
        duration: hasta === 0 ? 180 : 0,
        useNativeDriver: false,
      }).start();
    },
    [alturaIndicador]
  );

  // Mientras la pantalla recarga, el indicador se queda fijo arriba.
  useEffect(() => {
    if (refreshing) mover(UMBRAL);
    else if (!gesto.current.activo) mover(0);
  }, [refreshing, mover]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const contenedor = contenedorRef.current;
    if (!contenedor || typeof contenedor.addEventListener !== 'function') return undefined;

    /**
     * El elemento que de verdad desplaza el contenido, buscado desde donde
     * empezó el gesto hacia arriba. Una pantalla puede tener varias listas
     * (pestañas, modales) y la que importa es la que se está tocando.
     */
    const scrollerDesde = (nodo) => {
      let el = nodo;
      while (el && el !== contenedor.parentNode) {
        const estilo = window.getComputedStyle(el);
        // Vale cualquiera de las dos señales: el navegador puede resolver el
        // overflow por clase (react-native-web) o el contenido puede no llegar
        // a desbordar todavía.
        const desplazable =
          /(auto|scroll)/.test(estilo.overflowY) || el.scrollHeight > el.clientHeight + 1;
        if (desplazable) return el;
        el = el.parentElement;
      }
      // Una lista corta no desplaza nada, y aun así se tiene que poder recargar.
      return contenedor;
    };

    const empezar = (y, destino) => {
      if (!enabled || refreshing || typeof onRefresh !== 'function') return;
      const scroller = scrollerDesde(destino);
      // Solo cuenta si ya se está arriba del todo: si no, el gesto es un
      // desplazamiento normal y no hay que robárselo.
      if (!scroller || scroller.scrollTop > 0) return;
      gesto.current = { activo: true, inicioY: y, scroller, recorrido: 0 };
    };

    const arrastrar = (y, evento) => {
      const g = gesto.current;
      if (!g.activo) return;

      const avance = (y - g.inicioY) * RESISTENCIA;

      // Si tira hacia arriba, o el scroller ya no está arriba del todo, se
      // cancela y el desplazamiento sigue siendo el normal.
      if (avance <= 0 || g.scroller.scrollTop > 0) {
        if (g.recorrido > 0) mover(0);
        gesto.current = { ...g, activo: false, recorrido: 0 };
        return;
      }

      g.recorrido = Math.min(avance, MAXIMO);
      mover(g.recorrido);

      // Con el dedo: evita que el navegador haga su propio rebote o su propia
      // recarga por encima de la nuestra. Requiere listener no pasivo.
      if (evento && evento.cancelable) evento.preventDefault();
    };

    const soltar = () => {
      const g = gesto.current;
      if (!g.activo) return;
      const pasoElUmbral = g.recorrido >= UMBRAL;
      gesto.current = { activo: false, inicioY: 0, scroller: null, recorrido: 0 };

      if (pasoElUmbral) {
        // Se deja el indicador puesto: lo quita el efecto de `refreshing`
        // cuando la pantalla termina de recargar.
        mover(UMBRAL);
        onRefresh();
      } else {
        mover(0);
      }
    };

    const alTocar = (e) => empezar(e.touches[0].clientY, e.target);
    const alMoverDedo = (e) => arrastrar(e.touches[0].clientY, e);
    const alPulsar = (e) => {
      if (e.button !== 0) return;
      empezar(e.clientY, e.target);
    };
    const alMoverRaton = (e) => {
      // Sin botón pulsado no hay arrastre que valga.
      if (gesto.current.activo && e.buttons === 0) {
        soltar();
        return;
      }
      arrastrar(e.clientY, e);
    };

    contenedor.addEventListener('touchstart', alTocar, { passive: true });
    contenedor.addEventListener('touchmove', alMoverDedo, { passive: false });
    contenedor.addEventListener('touchend', soltar, { passive: true });
    contenedor.addEventListener('touchcancel', soltar, { passive: true });
    contenedor.addEventListener('mousedown', alPulsar, { passive: true });
    window.addEventListener('mousemove', alMoverRaton, { passive: true });
    window.addEventListener('mouseup', soltar, { passive: true });

    return () => {
      contenedor.removeEventListener('touchstart', alTocar);
      contenedor.removeEventListener('touchmove', alMoverDedo);
      contenedor.removeEventListener('touchend', soltar);
      contenedor.removeEventListener('touchcancel', soltar);
      contenedor.removeEventListener('mousedown', alPulsar);
      window.removeEventListener('mousemove', alMoverRaton);
      window.removeEventListener('mouseup', soltar);
    };
  }, [enabled, refreshing, onRefresh, mover]);

  const listo = distancia >= UMBRAL;

  return (
    <View
      {...resto}
      ref={contenedorRef}
      style={[estilos.contenedor, style]}
      accessibilityLabel="Tira hacia abajo para recargar"
    >
      <Animated.View style={[estilos.indicador, { height: alturaIndicador }]} pointerEvents="none">
        {refreshing ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          distancia > 0 && (
            <Feather
              name={listo ? 'arrow-up' : 'arrow-down'}
              size={18}
              color={color}
              style={{ opacity: Math.min(1, distancia / UMBRAL) }}
            />
          )
        )}
      </Animated.View>

      {children}
    </View>
  );
};

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    // El indicador se coloca encima del scroll, no empuja el contenido: así la
    // lista no da un salto al empezar el gesto.
    position: 'relative',
  },
  indicador: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 5,
  },
});

/**
 * Mismo nombre y mismas props que el de react-native. En móvil es literalmente
 * el de siempre; en web, el de arriba.
 */
export const RefreshControl = Platform.OS === 'web' ? RefreshControlWeb : RefreshControlNativo;

export default RefreshControl;
