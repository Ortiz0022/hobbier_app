/**
 * Comprueba que las notificaciones push están enchufadas.
 *
 *   node supabase/comprobar_push.mjs
 *
 * Existe porque el fallo típico no se ve desde la app: `avisar()` nunca lanza
 * (un aviso que falla no puede tumbar el envío de un mensaje), así que si la
 * Edge Function no está desplegada la app funciona igual y simplemente no
 * llega ninguna notificación, sin un solo error a la vista.
 *
 * Lee la configuración de `.env`. No manda ninguna notificación: solo mira si
 * las piezas están en su sitio.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const leerEnv = () => {
  const vars = {};
  for (const linea of readFileSync(join(raiz, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(linea.trim());
    if (m) vars[m[1]] = m[2];
  }
  return vars;
};

const env = leerEnv();
const URL_BASE = env.EXPO_PUBLIC_SUPABASE_URL;
const CLAVE = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_BASE || !CLAVE) {
  console.error('Falta EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const cabeceras = { Authorization: `Bearer ${CLAVE}`, apikey: CLAVE };
const marca = (ok) => (ok ? '  OK  ' : ' FALLA');
let problemas = 0;

console.log(`\nProyecto: ${URL_BASE}\n`);

// ---------- 1. ¿Está desplegada la Edge Function? ----------
// Se llama con un tipo que no existe a propósito: así no se manda nada.
// - 404 -> la función no está desplegada. Esta es LA causa habitual.
// - 401 -> está desplegada y pide sesión (correcto: la clave anónima no es un
//          usuario, y la función rechaza a quien no ha iniciado sesión).
// - 400 -> está desplegada y ha llegado hasta validar el tipo.
const respuesta = await fetch(`${URL_BASE}/functions/v1/send-push`, {
  method: 'POST',
  headers: { ...cabeceras, 'Content-Type': 'application/json' },
  body: JSON.stringify({ tipo: '__comprobacion__', contexto: {} }),
}).catch((e) => ({ status: 0, error: e.message }));

const desplegada = respuesta.status !== 404 && respuesta.status !== 0;
console.log(`${marca(desplegada)}  La Edge Function "send-push" está desplegada   (HTTP ${respuesta.status})`);
if (!desplegada) {
  problemas++;
  console.log('         Sin esto NO llega ni una sola notificación. Despliégala con:');
  console.log('           npx supabase login');
  console.log('           npx supabase functions deploy send-push --project-ref '
    + URL_BASE.replace(/^https:\/\/|\.supabase\.co\/?$/g, ''));
}

// ---------- 2. ¿Existe la tabla de tokens? ----------
const tabla = await fetch(`${URL_BASE}/rest/v1/user_push_tokens?select=user_id&limit=1`, {
  headers: cabeceras,
}).catch((e) => ({ status: 0, error: e.message }));

const hayTabla = tabla.status === 200;
console.log(`${marca(hayTabla)}  La tabla "user_push_tokens" responde            (HTTP ${tabla.status})`);
if (!hayTabla) {
  problemas++;
  console.log('         Falta la tabla donde se guarda el token de cada aparato.');
}

// ---------- 3. ¿Está el módulo nativo en el proyecto? ----------
const paquete = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
const hayModulo = !!(paquete.dependencies || {})['expo-notifications'];
console.log(`${marca(hayModulo)}  expo-notifications está en el proyecto          `
  + `(${(paquete.dependencies || {})['expo-notifications'] || 'ausente'})`);
if (!hayModulo) problemas++;

// ---------- 4. ¿Hay projectId de EAS? ----------
// Sin él, getExpoPushTokenAsync no puede pedir el token del aparato.
const app = JSON.parse(readFileSync(join(raiz, 'app.json'), 'utf8')).expo;
const projectId = app?.extra?.eas?.projectId;
console.log(`${marca(!!projectId)}  app.json tiene projectId de EAS                (${projectId || 'ausente'})`);
if (!projectId) problemas++;

console.log(
  problemas
    ? `\n${problemas} cosa(s) por arreglar antes de que lleguen las push.\n`
    : '\nTodo en su sitio. Si aun así no llegan, mira que el aparato haya dado permiso\n'
      + 'y que la app sea una build de EAS (en Expo Go las push remotas no funcionan).\n'
);
process.exit(problemas ? 1 : 0);
