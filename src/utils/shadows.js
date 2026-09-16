import { Platform } from 'react-native';

/**
 * Genera propiedades de sombra compatibles tanto con React Native (iOS/Android)
 * como con React Native Web (evitando el warning "shadow* style props are deprecated. Use boxShadow").
 */
export function getShadow({
  color = '#000000',
  offsetX = 0,
  offsetY = 2,
  opacity = 0.08,
  radius = 6,
  elevation = 3,
} = {}) {
  // Convertir color a formato CSS con opacidad para la web
  let webColor = color;
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      webColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  }

  return Platform.select({
    web: {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${webColor}`,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  });
}
