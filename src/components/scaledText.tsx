import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextProps,
  type TextInputProps,
} from 'react-native';

/**
 * Tope de escalado de la tipografía.
 *
 * Android e iOS permiten al usuario agrandar el texto del sistema hasta 2x, y en
 * los ajustes de accesibilidad incluso más. React Native lo aplica por defecto a
 * todo `<Text>`, y con esos factores los botones se salen de pantalla, los
 * títulos se comen las tarjetas y las filas se desarman.
 *
 * 1.3 es el equilibrio: quien necesita letra grande la obtiene (un 30% más),
 * pero ninguna pantalla se rompe. Ojo: es un TOPE, no un tamaño fijo. Si el
 * usuario tiene el sistema al 110%, ve el 110%; solo se recorta a partir del 130%.
 *
 * NO se usa `allowFontScaling={false}`: eso ignoraría por completo la
 * preferencia del usuario y dejaría la app inaccesible para quien no ve bien.
 */
export const MAX_FONT_SCALE = 1.3;

/**
 * Sustituto de `Text` de react-native con el tope ya aplicado.
 *
 * Es un componente envoltorio y no `Text.defaultProps` porque React 19 eliminó
 * defaultProps en componentes de función: asignarlo no daría error, simplemente
 * no haría nada, y el problema seguiría ahí sin que nadie lo notara.
 *
 * El tope se puede sobrescribir pasando `maxFontSizeMultiplier` en un caso
 * puntual (por ejemplo, un número grande que sí puede crecer más).
 */
export const Text = React.forwardRef<React.ElementRef<typeof RNText>, TextProps>(
  ({ maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }, ref) => (
    <RNText ref={ref} maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />
  )
);

Text.displayName = 'Text';

/** Igual que arriba, para los campos de formulario. */
export const TextInput = React.forwardRef<React.ElementRef<typeof RNTextInput>, TextInputProps>(
  ({ maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }, ref) => (
    <RNTextInput ref={ref} maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />
  )
);

TextInput.displayName = 'TextInput';
