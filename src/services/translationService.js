// ==================================================
// HOBBIER - Servicio de traducción en tiempo real
//
// Permite traducir títulos y descripciones de misiones
// entre Español e Inglés en el feed, al estilo Instagram.
// ==================================================

const cache = new Map();

/**
 * Decodifica entidades HTML básicas devueltas por APIs de traducción
 */
const decodeHtmlEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .trim();
};

/**
 * Heurística simple para determinar si un texto corto parece estar en inglés o español
 */
export const guessLanguage = (text) => {
  if (!text) return 'es';
  const clean = text.toLowerCase();

  const englishTokens = [
    'the', 'and', 'for', 'with', 'rest', 'minute', 'minutes', 'learn', 'read',
    'walk', 'run', 'play', 'cook', 'watch', 'listen', 'write', 'draw', 'sleep',
    'make', 'create', 'new', 'day', 'time', 'water', 'take', 'do', 'go', 'eat',
    'hang', 'family', 'friends', 'friend'
  ];

  const spanishTokens = [
    'el', 'la', 'los', 'las', 'un', 'una', 'y', 'con', 'para', 'descansar',
    'minuto', 'minutos', 'aprender', 'leer', 'caminar', 'correr', 'jugar',
    'cocinar', 'ver', 'escuchar', 'escribir', 'dibujar', 'dormir', 'hacer',
    'crear', 'nuevo', 'nueva', 'día', 'tiempo', 'agua', 'tomar', 'comer',
    'salir', 'familia', 'amigos', 'amigo'
  ];

  const words = clean.split(/\s+/);
  let enCount = 0;
  let esCount = 0;

  for (const w of words) {
    if (englishTokens.includes(w)) enCount++;
    if (spanishTokens.includes(w)) esCount++;
  }

  // Contiene caracteres específicos del español
  if (/[áéíóúüñ¿¡]/.test(clean)) return 'es';

  if (enCount > esCount) return 'en';
  return 'es';
};

/**
 * Extrae la traducción de mayor calidad de la respuesta de MyMemory.
 * Prioriza el modelo Neural (NMT / Machine Translation) y las coincidencias
 * exactas del segmento, descartando entradas comunitarias obsoletas o malas.
 */
const pickBestTranslation = (data, queryText) => {
  const cleanQuery = queryText.trim().toLowerCase();
  const matches = Array.isArray(data?.matches) ? data.matches : [];

  // 1. Coincidencia exacta con modelo Neural (NMT / MT!)
  const neuralExact = matches.find(
    (m) =>
      (m.model === 'neural' || m['created-by'] === 'MT!' || m.id === 0) &&
      m.segment &&
      m.segment.trim().toLowerCase() === cleanQuery &&
      m.translation &&
      !m.translation.startsWith('MYMEMORY WARNING')
  );
  if (neuralExact) return neuralExact.translation;

  // 2. Coincidencia con modelo Neural aunque varíen detalles menores
  const neuralAny = matches.find(
    (m) =>
      (m.model === 'neural' || m['created-by'] === 'MT!' || m.id === 0) &&
      m.translation &&
      !m.translation.startsWith('MYMEMORY WARNING')
  );
  if (neuralAny) return neuralAny.translation;

  // 3. Coincidencia de segmento exacta de cualquier contribución
  const exactSegment = matches.find(
    (m) =>
      m.segment &&
      m.segment.trim().toLowerCase() === cleanQuery &&
      m.translation &&
      !m.translation.startsWith('MYMEMORY WARNING')
  );
  if (exactSegment) return exactSegment.translation;

  // 4. Fallback a responseData.translatedText si es válido
  if (data?.responseData?.translatedText && !data.responseData.translatedText.startsWith('MYMEMORY WARNING')) {
    return data.responseData.translatedText;
  }

  return queryText;
};

/**
 * Traduce un texto entre idiomas soportados ('es' y 'en')
 * @param {string} text - Texto a traducir
 * @param {string} userLanguage - Idioma preferido del usuario ('es' | 'en')
 * @returns {Promise<{ translatedText: string, originalText: string, error: any }>}
 */
export const translateContent = async (text, userLanguage = 'es') => {
  if (!text || !text.trim()) {
    return { translatedText: text, originalText: text, error: null };
  }

  const trimmed = text.trim();
  const detectedLang = guessLanguage(trimmed);

  // Si el texto ya está en el idioma preferido del usuario,
  // traducimos al otro idioma para que pueda ver la alternativa.
  // Si está en otro idioma, traducimos al idioma del usuario.
  let targetLang = userLanguage;
  let sourceLang = detectedLang;

  if (detectedLang === userLanguage) {
    targetLang = userLanguage === 'es' ? 'en' : 'es';
    sourceLang = userLanguage;
  }

  const cacheKey = `${sourceLang}|${targetLang}:${trimmed}`;
  if (cache.has(cacheKey)) {
    return { translatedText: cache.get(cacheKey), originalText: trimmed, error: null };
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${sourceLang}|${targetLang}`;
    const response = await fetch(url);
    const data = await response.json();

    const bestRaw = pickBestTranslation(data, trimmed);
    if (bestRaw) {
      let result = decodeHtmlEntities(bestRaw);
      if (result && !result.startsWith('MYMEMORY WARNING')) {
        cache.set(cacheKey, result);
        return { translatedText: result, originalText: trimmed, error: null };
      }
    }

    return { translatedText: trimmed, originalText: trimmed, error: 'No translation available' };
  } catch (error) {
    console.warn('Error en translateContent:', error);
    return { translatedText: trimmed, originalText: trimmed, error };
  }
};
