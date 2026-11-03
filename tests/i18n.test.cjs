// Los textos de la app: que no salga ninguna clave en crudo en pantalla.
//
// `t()` devuelve LA PROPIA CLAVE cuando la traducción falta, y como eso es un
// texto no vacío, el patrón que usa todo el código —`t('x') || 'respaldo'`— no
// llega a actuar nunca. Resultado: en el botón de borrar una sala se leía
// literalmente "common.delete".
//
// Y había una trampa peor: `rooms`, `messages` y `admin` estaban DOS VECES en
// cada archivo de idioma. JSON.parse se queda con el último, así que 44 claves
// escritas en el primer bloque no existían para la app, en silencio. Añadir una
// clave al bloque de arriba no hacía absolutamente nada.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const RAIZ = path.join(__dirname, '..');
const IDIOMAS = ['es', 'en'];

const rutaDe = (idioma) => path.join(RAIZ, 'src/i18n/locales/' + idioma + '.json');

/** Todas las claves "a.b.c" que contiene un archivo de idioma. */
const aplanar = (obj, prefijo = '', salida = new Map()) => {
  for (const [clave, valor] of Object.entries(obj)) {
    const ruta = prefijo ? prefijo + '.' + clave : clave;
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) aplanar(valor, ruta, salida);
    else salida.set(ruta, valor);
  }
  return salida;
};

/** Nombres de los bloques de primer nivel tal como están ESCRITOS, con repeticiones. */
const bloquesEscritos = (idioma) => {
  const texto = fs.readFileSync(rutaDe(idioma), 'utf8');
  return texto
    .split(/\r?\n/)
    .map((linea) => /^ {2}"([^"]+)":/.exec(linea))
    .filter(Boolean)
    .map((m) => m[1]);
};

/** Cada t('clave') que aparece en el código, con los archivos donde sale. */
const clavesUsadas = () => {
  const archivos = ['App.js'];
  const recorrer = (dir) => {
    for (const entrada of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
      const rel = dir + '/' + entrada.name;
      if (entrada.isDirectory()) recorrer(rel);
      else if (/\.(js|jsx|tsx)$/.test(entrada.name)) archivos.push(rel);
    }
  };
  recorrer('src');

  const usos = new Map();
  for (const rel of archivos) {
    const fuente = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    for (const m of fuente.matchAll(/\bt\(\s*['"`]([a-zA-Z0-9_.]+)['"`]/g)) {
      if (!usos.has(m[1])) usos.set(m[1], new Set());
      usos.get(m[1]).add(rel);
    }
  }
  return usos;
};

test('ningún archivo de idioma repite un bloque de primer nivel', () => {
  for (const idioma of IDIOMAS) {
    const nombres = bloquesEscritos(idioma);
    const repetidos = nombres.filter((n, i) => nombres.indexOf(n) !== i);
    assert.deepStrictEqual(
      [...new Set(repetidos)],
      [],
      `${idioma}.json repite bloques: JSON.parse se queda con el último y todo lo `
        + 'que solo esté en el primero no existe para la app.'
    );
  }
});

test('cada clave que usa el código existe en los dos idiomas', () => {
  const traducciones = Object.fromEntries(
    IDIOMAS.map((i) => [i, aplanar(JSON.parse(fs.readFileSync(rutaDe(i), 'utf8')))])
  );
  const usos = clavesUsadas();
  assert.ok(usos.size > 500, `se esperaban muchas claves en uso, se encontraron ${usos.size}`);

  const faltan = [];
  for (const [clave, donde] of usos) {
    for (const idioma of IDIOMAS) {
      if (typeof traducciones[idioma].get(clave) !== 'string') {
        faltan.push(`${idioma}: ${clave}  (${[...donde].join(', ')})`);
      }
    }
  }
  assert.deepStrictEqual(
    faltan,
    [],
    'Estas claves saldrían EN CRUDO en pantalla, con el punto y todo:\n  ' + faltan.join('\n  ')
  );
});

test('los dos idiomas tienen exactamente las mismas claves', () => {
  const [es, en] = IDIOMAS.map((i) => aplanar(JSON.parse(fs.readFileSync(rutaDe(i), 'utf8'))));
  const soloEnEs = [...es.keys()].filter((k) => !en.has(k));
  const soloEnEn = [...en.keys()].filter((k) => !es.has(k));
  assert.deepStrictEqual(soloEnEs, [], 'claves que solo están en español');
  assert.deepStrictEqual(soloEnEn, [], 'claves que solo están en inglés');
});

test('ningún texto está vacío', () => {
  for (const idioma of IDIOMAS) {
    const vacias = [...aplanar(JSON.parse(fs.readFileSync(rutaDe(idioma), 'utf8')))]
      .filter(([, v]) => typeof v === 'string' && v.trim() === '')
      .map(([k]) => k);
    assert.deepStrictEqual(vacias, [], `textos vacíos en ${idioma}.json`);
  }
});
