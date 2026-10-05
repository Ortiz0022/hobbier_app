// ==================================================
// HOBBIER - Formato de fechas y horas (pilar 3 de globalización)
//
// Reglas:
// - Las fechas se GUARDAN en formato estándar (ISO 8601 / timestamptz en la
//   base) y solo se convierten a texto al mostrarlas, aquí.
// - Se formatean con el IDIOMA DE LA APP, no con el del dispositivo: antes se
//   usaba toLocaleDateString() sin locale y, con la app en inglés y el teléfono
//   en español, el texto salía en inglés y las fechas en español.
// - Siempre con el NOMBRE del mes ("3 abr 2026" / "Apr 3, 2026"): "03/04/2026"
//   es el 3 de abril en Costa Rica y el 4 de marzo en EE. UU.
// - El huso horario NO se fija: Intl usa el del dispositivo en cada momento,
//   que es lo correcto porque cambia si la persona viaja.
// ==================================================

// Idioma de la app -> locale de Intl
const LOCALES = { es: 'es', en: 'en-US' };

export const toLocale = (language) => LOCALES[language] || LOCALES.es;

const toDate = (value) => (value instanceof Date ? value : new Date(value));

/** "3 abr 2026" / "Apr 3, 2026" */
export const formatDate = (value, language) => {
  if (!value) return '';
  return new Intl.DateTimeFormat(toLocale(language), { dateStyle: 'medium' }).format(toDate(value));
};

/** "3 de abril de 2026" / "April 3, 2026" */
export const formatLongDate = (value, language) => {
  if (!value) return '';
  return new Intl.DateTimeFormat(toLocale(language), { dateStyle: 'long' }).format(toDate(value));
};

/** "14:32" / "2:32 PM" */
export const formatTime = (value, language) => {
  if (!value) return '';
  return new Intl.DateTimeFormat(toLocale(language), { hour: 'numeric', minute: '2-digit' }).format(toDate(value));
};

/** "3 abr 2026, 14:32" / "Apr 3, 2026, 2:32 PM" */
export const formatDateTime = (value, language) => {
  if (!value) return '';
  return new Intl.DateTimeFormat(toLocale(language), { dateStyle: 'medium', timeStyle: 'short' }).format(toDate(value));
};

/**
 * Hora corta para la bandeja de mensajes, como en Instagram:
 * hoy -> "14:32", esta semana -> "lun", antes -> "3 sept".
 * Solo la hora no basta: un mensaje de hace tres días se leería igual que uno de hoy.
 */
export const formatRelativeShort = (value, language, now = new Date()) => {
  if (!value) return '';
  const date = toDate(value);
  const locale = toLocale(language);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) return formatTime(date, language);

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  if (date >= startOfWeek) {
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  }

  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
};

/**
 * Marca de tiempo de un mensaje de chat: hoy -> "14:32";
 * otro día -> "3 abr, 14:32". Solo la hora haría indistinguibles días distintos.
 */
export const formatMessageStamp = (value, language, now = new Date()) => {
  if (!value) return '';
  const date = toDate(value);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) return formatTime(date, language);
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(toLocale(language), {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

/** Nombres de los 12 meses en el idioma de la app: ["enero", ...] / ["January", ...] */
export const getMonthNames = (language) => {
  const fmt = new Intl.DateTimeFormat(toLocale(language), { month: 'long', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2026, i, 1))));
};

/**
 * Orden en que se escriben día, mes y año en el idioma de la app, para que el
 * selector de fecha siga la convención local: es -> ['day','month','year'],
 * en-US -> ['month','day','year'].
 */
export const getDatePartOrder = (language) =>
  new Intl.DateTimeFormat(toLocale(language))
    .formatToParts(new Date(2026, 3, 3))
    .map((p) => p.type)
    .filter((t) => t === 'day' || t === 'month' || t === 'year');
