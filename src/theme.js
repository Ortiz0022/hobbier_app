// ==================================================
// HOBBIER - Lenguaje visual
// Extraído de la pantalla de sugerencias, que es la referencia de diseño.
// El resto de pantallas tira de aquí para no volver a repartir literales de color
// por todo el proyecto: cambiar el acento debe ser tocar un solo sitio.
// ==================================================

export const colors = {
  // Fondos
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F3F5', // pastillas, separadores y BORDES de tarjeta
  surfaceAccent: '#F0F8FA', // realce turquesa suave

  // Marca
  primary: '#0C8AA6', // turquesa: acciones y elementos activos
  primaryDark: '#053E4A',
  primarySoft: '#EAF7FA',

  // Acentos secundarios
  accent: '#FF8F21', // naranja: destacados y avisos positivos
  accentSoft: '#FFAA55',
  accentDark: '#E67A15',
  salmon: '#DF9C8E',
  salmonSoft: '#F1C2B8',

  // Texto
  text: '#121B22',
  textMuted: '#8A908B',
  textFaint: '#727773',
  onPrimary: '#FFFFFF',

  // Estados
  danger: '#A94403',
  dangerSoft: '#F1C2B8',
  success: '#2A6347',
};

export const radii = {
  pill: 8,
  input: 16,
  card: 20,
  round: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 28,
};

export const fonts = {
  // Cargadas en App.js con useFonts
  heading: 'Poppins_700Bold',
  display: 'DynaPuff',
};

/**
 * La tarjeta de sugerencias es plana: fondo blanco, radio 20 y BORDE gris claro.
 * No lleva sombra, y esa ausencia es justo lo que la distingue del look anterior.
 */
export const card = {
  backgroundColor: colors.surface,
  borderRadius: radii.card,
  borderWidth: 1,
  borderColor: colors.surfaceMuted,
  padding: spacing.lg,
};

/** Título de sección: pequeño, en mayúsculas y espaciado. */
export const sectionTitle = {
  fontSize: 12,
  fontWeight: '600',
  color: colors.text,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
};

/** Campo de formulario, en el mismo tono que las pastillas de la home. */
export const input = {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.surfaceMuted,
  borderWidth: 1,
  borderColor: colors.surfaceMuted,
  borderRadius: radii.input,
  paddingHorizontal: spacing.md,
};

export const primaryButton = {
  backgroundColor: colors.primary,
  borderRadius: radii.input,
  paddingVertical: 15,
  alignItems: 'center',
  justifyContent: 'center',
};

export const primaryButtonText = {
  color: colors.onPrimary,
  fontSize: 16,
  fontWeight: '700',
};
