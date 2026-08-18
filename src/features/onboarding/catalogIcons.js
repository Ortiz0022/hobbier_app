/**
 * Icono de cada opción de los catálogos (gustos, intereses y recursos).
 *
 * Va por NOMBRE y no por id: los ids son UUID del seed y no dicen nada al leer
 * el código, mientras que el nombre es lo que se ve en pantalla.
 *
 * Contrapartida de mapear a mano: una opción nueva creada en Supabase no
 * aparecerá aquí. Por eso existe FALLBACK_ICON, para que salga con un icono
 * neutro en vez de sin nada. Si agregan opciones al catálogo, este archivo es
 * el único sitio donde hay que tocarlas.
 *
 * Todos los nombres están verificados contra el glyphmap de
 * MaterialCommunityIcons instalado.
 */

export const FALLBACK_ICON = 'tag-outline';

const ICONS = {
  // Gustos
  'deportes': 'basketball',
  'arte': 'palette',
  'música': 'music',
  'lectura': 'book-open-page-variant',
  'naturaleza': 'leaf',
  'cocina': 'chef-hat',

  // Intereses
  'leer más': 'book-plus',
  'aprender un idioma': 'translate',
  'hacer ejercicio': 'run',
  'mejorar creatividad': 'lightbulb-on-outline',
  'aprender cosas nuevas': 'brain',

  // Recursos
  'bicicleta': 'bicycle',
  'ajedrez': 'chess-knight',
  'cartas': 'cards-playing-outline',
  'pinturas': 'brush',
  'lápices': 'pencil',
  'libros': 'bookshelf',
  'balón': 'soccer',
  'computadora': 'laptop',
  'instrumento musical': 'guitar-acoustic',
};

/** Devuelve el icono de una opción, o uno neutro si no está mapeada. */
export const getCatalogIcon = (name) => {
  if (!name) return FALLBACK_ICON;
  return ICONS[name.trim().toLowerCase()] || FALLBACK_ICON;
};
