/**
 * Categoría de una actividad para mostrar en pantalla.
 *
 * `activities.category_id` es opcional: una actividad puede no encajar en
 * ninguna categoría del catálogo y eso es válido, no un dato faltante.
 *
 * "Libre" es SOLO una etiqueta de interfaz para `category_id IS NULL`. No existe
 * como fila en `activity_categories` a propósito: si existiera, alguien acabaría
 * filtrando o administrando "Libre" como si fuera una categoría de verdad.
 */
export const FREE_CATEGORY_LABEL = 'Libre';

/** Nombre a mostrar. Devuelve "Libre" cuando la actividad no tiene categoría. */
export const getCategoryLabel = (categoryObj) =>
  categoryObj?.name?.trim() || FREE_CATEGORY_LABEL;

/**
 * Nombre + icono para las pastillas de categoría.
 *
 * El ICONO se deduce del título cuando ayuda (una actividad de pintura merece un
 * lápiz aunque no tenga categoría), pero el NOMBRE nunca se inventa: si no hay
 * categoría real, dice "Libre".
 *
 * Antes esta función también adivinaba el nombre — una actividad sin categoría
 * cuyo título mencionara "pinta" se mostraba como "Arte", afirmando algo que
 * nadie había registrado.
 */
export const getCategoryStyle = (categoryObj, title = '') => {
  const catName = categoryObj?.name?.trim() || '';
  const searchKey = `${catName} ${title}`.toLowerCase();

  let iconName = 'star';

  if (searchKey.includes('arte') || searchKey.includes('pint') || searchKey.includes('cerám')) {
    iconName = 'edit-2';
  } else if (
    searchKey.includes('tecno') ||
    searchKey.includes('python') ||
    searchKey.includes('idioma') ||
    searchKey.includes('program')
  ) {
    iconName = 'monitor';
  } else if (
    searchKey.includes('natura') ||
    searchKey.includes('botán') ||
    searchKey.includes('deport') ||
    searchKey.includes('paseo') ||
    searchKey.includes('camin')
  ) {
    iconName = 'map';
  } else if (
    searchKey.includes('músic') ||
    searchKey.includes('canc') ||
    searchKey.includes('jam') ||
    searchKey.includes('instrum')
  ) {
    iconName = 'music';
  } else if (searchKey.includes('juego') || searchKey.includes('ajedrez')) {
    iconName = 'award';
  } else if (searchKey.includes('leer') || searchKey.includes('libro')) {
    iconName = 'book-open';
  }

  return { name: catName || FREE_CATEGORY_LABEL, iconName };
};
