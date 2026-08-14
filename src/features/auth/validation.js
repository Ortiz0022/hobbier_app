// ==================================================
// HOBBIER - Reglas de validación de los formularios de auth
// Funciones puras: devuelven el mensaje de error, o null si el valor es válido.
// Viven aparte de las pantallas para poder probarlas sin renderizar nada.
// ==================================================

export const MIN_PASSWORD_LENGTH = 8;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;
export const MAX_AGE = 120;
// Edad mínima para registrarse. Es una decisión de producto, no una restricción
// técnica: súbela a 13 si quieres alinearte con COPPA.
export const MIN_AGE = 5;

// Deliberadamente permisivo: validar correos con una expresión estricta produce
// más falsos negativos que aciertos. Lo que se comprueba es que haya algo antes
// y después de la arroba y un dominio con punto.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-z][a-z0-9_]*$/;

export const validateEmail = (value) => {
  const email = (value || '').trim();
  if (!email) return 'Escribe tu correo electrónico.';
  if (email.length > 254) return 'El correo es demasiado largo.';
  if (!EMAIL_RE.test(email)) return 'Ese correo no parece válido.';
  return null;
};

/**
 * Solo para contraseñas NUEVAS (registro y restablecer).
 * En el inicio de sesión no debe usarse: una cuenta creada antes de estas reglas
 * tiene una contraseña más corta y seguiría siendo válida; exigirle el formato
 * nuevo le impediría entrar con su contraseña correcta.
 */
export const validateNewPassword = (value) => {
  const password = value || '';
  if (!password) return 'Escribe una contraseña.';
  // Un espacio al principio o al final es válido para el servidor, se guarda tal
  // cual, y luego es imposible de ver al teclear: la persona queda fuera de su
  // propia cuenta sin entender por qué. Se rechaza aquí en vez de recortarlo en
  // silencio, porque recortar cambiaría la contraseña que la persona cree tener.
  if (password !== password.trim()) {
    return 'La contraseña no puede empezar ni terminar con espacios.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!/[a-zA-Z]/.test(password)) return 'La contraseña debe incluir al menos una letra.';
  if (!/[0-9]/.test(password)) return 'La contraseña debe incluir al menos un número.';
  return null;
};

export const validateLoginPassword = (value) => {
  if (!value) return 'Escribe tu contraseña.';
  return null;
};

export const validatePasswordConfirmation = (password, confirmation) => {
  if (!confirmation) return 'Repite la contraseña.';
  if (password !== confirmation) return 'Las contraseñas no coinciden.';
  return null;
};

export const validateFullName = (value) => {
  const name = (value || '').trim();
  if (!name) return 'Escribe tu nombre.';
  if (name.length < 2) return 'El nombre es demasiado corto.';
  if (name.length > 80) return 'El nombre es demasiado largo.';
  // Evita nombres como "123" o "...", que pasarían un simple control de longitud.
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(name)) return 'El nombre debe contener letras.';
  return null;
};

export const validateUsername = (value) => {
  const username = (value || '').trim().toLowerCase();
  if (!username) return 'Elige un nombre de usuario.';
  if (username.length < MIN_USERNAME_LENGTH) {
    return `El usuario debe tener al menos ${MIN_USERNAME_LENGTH} caracteres.`;
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return `El usuario no puede pasar de ${MAX_USERNAME_LENGTH} caracteres.`;
  }
  if (!USERNAME_RE.test(username)) {
    return 'Usa solo letras, números y guion bajo, empezando por una letra.';
  }
  return null;
};

/**
 * Convierte la fecha escrita al formato que espera la columna DATE de Postgres.
 * Acepta dd/mm/aaaa (lo que ve el usuario) y también YYYY-MM-DD.
 * Devuelve null si no es una fecha real: `new Date` acepta 31/02 y lo corre a
 * marzo sin avisar, así que se comprueba que los componentes sobrevivan la ida y
 * vuelta.
 */
export const toISODate = (value) => {
  const raw = (value || '').trim();
  let year, month, day;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const local = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (iso) [, year, month, day] = iso;
  else if (local) [, day, month, year] = local;
  else return null;

  const parsed = new Date(Date.UTC(+year, +month - 1, +day));
  if (
    parsed.getUTCFullYear() !== +year ||
    parsed.getUTCMonth() !== +month - 1 ||
    parsed.getUTCDate() !== +day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/** Edad cumplida a día de hoy, en años. */
export const ageFromISODate = (isoDate, today = new Date()) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  let age = today.getFullYear() - year;
  const hasHadBirthday =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!hasHadBirthday) age -= 1;
  return age;
};

/**
 * Valida la fecha de nacimiento y devuelve { error, isoDate }.
 * La edad importa de verdad en esta app: get_recommended_activity filtra las
 * actividades por min_age/max_age, así que una fecha absurda deja al usuario sin
 * recomendaciones sin que se entienda por qué.
 */
export const validateBirthDate = (value, today = new Date()) => {
  const raw = (value || '').trim();
  if (!raw) return { error: 'Escribe tu fecha de nacimiento.', isoDate: null };

  const isoDate = toISODate(raw);
  if (!isoDate) return { error: 'Usa el formato dd/mm/aaaa.', isoDate: null };

  const age = ageFromISODate(isoDate, today);
  if (age < 0) return { error: 'La fecha no puede estar en el futuro.', isoDate: null };
  if (age > MAX_AGE) return { error: 'Revisa el año, esa fecha no parece correcta.', isoDate: null };
  if (age < MIN_AGE) return { error: `Debes tener al menos ${MIN_AGE} años.`, isoDate: null };

  return { error: null, isoDate };
};

/**
 * Traduce los errores de Supabase a algo que el usuario pueda entender.
 * Llegan en inglés y a veces como error crudo de Postgres.
 */
export const describeAuthError = (error) => {
  const message = error?.message || '';

  if (/Invalid login credentials/i.test(message)) {
    return 'Correo o contraseña incorrectos.';
  }
  if (/Email not confirmed/i.test(message)) {
    return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.';
  }
  if (/User already registered|already been registered/i.test(message)) {
    return 'Ese correo ya está registrado. Intenta iniciar sesión.';
  }
  // El trigger handle_new_user inserta en profiles, cuyo username es UNIQUE:
  // un usuario repetido revienta ahí, no en la capa de auth.
  if (/duplicate key|already exists|profiles_username_key|23505/i.test(message)) {
    return 'Ese nombre de usuario ya está en uso. Prueba con otro.';
  }
  if (/Password should be at least/i.test(message)) {
    return 'La contraseña es demasiado corta para este proyecto de Supabase.';
  }
  if (/Unable to validate email address/i.test(message)) {
    return 'Ese correo no parece válido.';
  }
  if (/For security purposes|rate limit|Email rate limit exceeded/i.test(message)) {
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  }
  if (/New password should be different/i.test(message)) {
    return 'La contraseña nueva debe ser distinta de la anterior.';
  }
  if (/Auth session missing|session_not_found|expired/i.test(message)) {
    return 'El enlace expiró o ya se usó. Pide uno nuevo desde "¿Olvidaste tu contraseña?".';
  }
  if (/Failed to fetch|Network request failed/i.test(message)) {
    return 'No hay conexión con el servidor. Revisa tu internet.';
  }

  return message || 'Algo salió mal. Inténtalo de nuevo.';
};
