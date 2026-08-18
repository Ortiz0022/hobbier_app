/**
 * Tokens de diseño de Hobbier.
 *
 * Fuente única de verdad para color, espaciado y radios. Antes cada pantalla
 * declaraba su propio objeto COLORS con literales repetidos, y ajustar un tono
 * obligaba a buscarlo por todo el proyecto.
 */
export const TOKENS = {
  colors: {
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
  },
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
