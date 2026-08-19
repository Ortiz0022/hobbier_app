/**
 * Tokens de diseño de Hobbier.
 *
 * Fuente única de verdad para color, espaciado y radios. Antes cada pantalla
 * declaraba su propio objeto COLORS con literales repetidos, y ajustar un tono
 * obligaba a buscarlo por todo el proyecto.
 */
const COLORS = {
  primary: '#FF6B00', // Naranja del botón principal
  active: '#00B4D8', // Azul brillante para tags seleccionados
  activeText: '#FFFFFF',

  // Estados inactivos limpios: fondo suave + borde, en lugar de mezclar
  // elementos con borde y otros sin fondo.
  inactiveBg: '#F7FAFC',
  inactiveBorder: '#E2E8F0',
  inactiveText: '#4A5568',

  textDark: '#1A202C', // Títulos principales
  textMuted: '#718096', // Subtítulos legibles (contraste accesible)
  white: '#FFFFFF',

  // Barra del control segmentado: el fondo gris sobre el que se desliza la
  // pastilla blanca del elemento activo.
  segmentTrack: '#EDF2F7',

  // Insignia de estado "activa": azul muy suave, para que informe sin competir
  // con el botón de acción principal.
  badgeInfoBg: '#EBF8FF',
  badgeInfoText: '#2B6CB0',

  // Insignia de campo obligatorio: naranja translúcido sobre el primario.
  // Vive aquí y no suelto en una hoja de estilos, que es justo lo que este
  // archivo viene a evitar.
  badgeBg: '#FFEFEB',

  // Rojo de acción destructiva. Es un rojo DISTINTO del de error de
  // validación a propósito: uno avisa de un dato mal escrito, el otro marca un
  // botón que borra contenido de forma irreversible.
  destructive: '#E53E3E',
  // Insignia de puntos: ámbar suave, distinto del acento y del destructivo.
  badgePointsBg: '#FEFCBF',
  badgePointsText: '#B7791F',
  alertBg: '#FFF5F5',
  alertBorder: '#FEB2B2',
  alertText: '#C53030',

  // Error de validación. No estaba en la propuesta pero el formulario lo
  // necesita, y dejarlo suelto rompería la fuente única de verdad.
  danger: '#A94403',
} as const;

export const TOKENS = {
  colors: COLORS,

  // Fondos pastel de los círculos de icono en las tarjetas de preferencias.
  // Son tres a propósito, y las tres salen de la paleta que ya existe (naranja,
  // cian y ámbar): dan la variedad de la maqueta sin inventar colores nuevos
  // que nadie más en la app usa. `getCatalogTint()` reparte estas familias
  // entre las opciones del catálogo.
  iconTints: [
    { bg: COLORS.badgeBg, fg: COLORS.primary },
    { bg: COLORS.badgeInfoBg, fg: COLORS.active },
    { bg: COLORS.badgePointsBg, fg: COLORS.badgePointsText },
  ],

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
  },
  radius: {
    full: 9999,
    card: 16,
  },
} as const;
