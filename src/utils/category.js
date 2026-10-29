/**
 * Categoría de una actividad para mostrar en pantalla con soporte multi-idioma (ES / EN).
 *
 * `activities.category_id` es opcional: una actividad puede no encajar en
 * ninguna categoría del catálogo y eso es válido, no un dato faltante.
 *
 * "Libre" es SOLO una etiqueta de interfaz para `category_id IS NULL`. No existe
 * como fila en `activity_categories` a propósito: si existiera, alguien acabaría
 * filtrando o administrando "Libre" como si fuera una categoría de verdad.
 */
import { capitalizarTitulo } from './titleCase';

export const FREE_CATEGORY_LABEL = 'Libre';

/**
 * Traduce nombres de categoría según el idioma de la app ('es' o 'en').
 * Resuelve las categorías de la base de datos (ej. "Cocina y Gastronomía",
 * "Deportes y Salud", "Lectura y Aprendizaje", etc.)
 */
export const translateCategoryName = (rawName, language = 'es') => {
  const trimmed = (rawName || '').trim();
  if (!trimmed) {
    return language === 'en' ? 'General' : FREE_CATEGORY_LABEL;
  }

  const clean = trimmed.toLowerCase();

  if (language === 'en') {
    if (clean.includes('cocina') || clean.includes('gastronom')) return 'Cooking & Gastronomy';
    if (clean.includes('deport') || clean.includes('salud') || clean.includes('fitness')) return 'Sports & Health';
    if (clean.includes('lectur') || clean.includes('aprend') || clean.includes('libro')) return 'Reading & Learning';
    if (clean.includes('músic') || clean.includes('music')) return 'Music';
    if (clean.includes('arte') || clean.includes('pintur') || clean.includes('cerám')) return 'Art & Creativity';
    if (clean.includes('tecno') || clean.includes('program') || clean.includes('videojuego')) return 'Technology & Gaming';
    if (clean.includes('natur') || clean.includes('aire libre') || clean.includes('botán')) return 'Nature & Outdoors';
    if (clean.includes('juego') || clean.includes('ajedrez') || clean.includes('mesa')) return 'Board Games & Play';
    if (clean.includes('idioma')) return 'Languages & Culture';
    if (clean.includes('bienestar') || clean.includes('yoga') || clean.includes('medita')) return 'Wellness & Mindfulness';
    if (clean === 'libre' || clean === 'general') return 'General';
    return capitalizarTitulo(trimmed);
  }

  // Idioma Español
  if (clean.includes('cocina') || clean.includes('gastronom')) return 'Cocina y Gastronomía';
  if (clean.includes('deport') || clean.includes('salud')) return 'Deportes y Salud';
  if (clean.includes('lectur') || clean.includes('aprend')) return 'Lectura y Aprendizaje';
  if (clean.includes('músic') || clean.includes('music')) return 'Música';
  if (clean.includes('arte') || clean.includes('pintur') || clean.includes('cerám')) return 'Arte y Creatividad';
  if (clean.includes('tecno') || clean.includes('program')) return 'Tecnología';
  if (clean.includes('natur') || clean.includes('aire libre')) return 'Naturaleza y Aire Libre';
  if (clean.includes('juego') || clean.includes('ajedrez')) return 'Juegos';
  if (clean === 'libre' || clean === 'general') return FREE_CATEGORY_LABEL;

  return capitalizarTitulo(trimmed);
};

/** Nombre a mostrar. Traduce automáticamente al idioma especificado. */
export const getCategoryLabel = (categoryObj, language = 'es') => {
  const raw = typeof categoryObj === 'string' ? categoryObj : categoryObj?.name;
  return translateCategoryName(raw, language);
};

/**
 * Nombre traducido + icono para las pastillas y tarjetas de categoría.
 */
export const getCategoryStyle = (categoryObj, title = '', language = 'es') => {
  const catName = typeof categoryObj === 'string' ? categoryObj : categoryObj?.name?.trim() || '';
  const searchKey = `${catName} ${title}`.toLowerCase();

  let iconName = 'compass';

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
  } else if (searchKey.includes('leer') || searchKey.includes('libro') || searchKey.includes('lectur')) {
    iconName = 'book-open';
  } else if (searchKey.includes('cocina') || searchKey.includes('gastronom') || searchKey.includes('chef') || searchKey.includes('recet')) {
    iconName = 'compass';
  }

  const translatedName = translateCategoryName(catName, language);

  return {
    name: translatedName,
    iconName,
    icon: iconName,
  };
};
