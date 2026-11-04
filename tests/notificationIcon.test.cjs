// El icono de las notificaciones de Android.
//
// Android NO respeta los colores de este icono: coge solo el canal alfa y lo
// pinta de un color plano. Un logo a color acaba siendo un cuadrado blanco en
// la barra de estado, y no hay ningún error que lo avise. Por eso tiene que
// ser una silueta: blanco donde hay dibujo, transparente donde no.
//
// Estas comprobaciones existen para que nadie sustituya la silueta por el logo
// a color sin enterarse.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');

const RAIZ = path.join(__dirname, '..');
const app = JSON.parse(fs.readFileSync(path.join(RAIZ, 'app.json'), 'utf8')).expo;

const configDelPlugin = () => {
  const entrada = (app.plugins || []).find(
    (p) => (Array.isArray(p) ? p[0] : p) === 'expo-notifications'
  );
  return Array.isArray(entrada) ? entrada[1] : null;
};

/** Devuelve {w, h, pix} de un PNG RGBA de 8 bits sin interlazado. */
const leerPng = (ruta) => {
  const b = fs.readFileSync(ruta);
  const w = b.readUInt32BE(16);
  const h = b.readUInt32BE(20);
  assert.strictEqual(b[24], 8, 'se esperaba 8 bits por canal');
  assert.strictEqual(b[25], 6, 'se esperaba RGBA (con canal alfa)');

  const trozos = [];
  let p = 8;
  while (p < b.length) {
    const largo = b.readUInt32BE(p);
    const tipo = b.toString('ascii', p + 4, p + 8);
    if (tipo === 'IDAT') trozos.push(b.subarray(p + 8, p + 8 + largo));
    if (tipo === 'IEND') break;
    p += largo + 12;
  }
  const crudo = zlib.inflateSync(Buffer.concat(trozos));
  const bpp = 4;
  const anchoFila = w * bpp;
  const pix = Buffer.alloc(w * h * bpp);
  let o = 0;
  for (let y = 0; y < h; y++) {
    const filtro = crudo[o++];
    const linea = crudo.subarray(o, o + anchoFila);
    o += anchoFila;
    const dst = pix.subarray(y * anchoFila, (y + 1) * anchoFila);
    const arr = y > 0 ? pix.subarray((y - 1) * anchoFila, y * anchoFila) : null;
    for (let x = 0; x < anchoFila; x++) {
      const a = x >= bpp ? dst[x - bpp] : 0;
      const bb = arr ? arr[x] : 0;
      const c = arr && x >= bpp ? arr[x - bpp] : 0;
      let v = linea[x];
      if (filtro === 1) v += a;
      else if (filtro === 2) v += bb;
      else if (filtro === 3) v += (a + bb) >> 1;
      else if (filtro === 4) {
        const pp = a + bb - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - bb);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
      }
      dst[x] = v & 0xff;
    }
  }
  return { w, h, pix };
};

test('app.json declara el icono y el color de las notificaciones', () => {
  const config = configDelPlugin();
  assert.ok(config, 'falta el plugin expo-notifications con opciones en app.json');
  assert.ok(config.icon, 'falta la opción "icon"');
  assert.match(config.color || '', /^#[0-9a-fA-F]{6}$/, 'el color debe ser #rrggbb');
  // El servidor manda channelId "default"; aquí tiene que coincidir.
  assert.strictEqual(config.defaultChannel, 'default');
});

test('el icono existe, es cuadrado y bastante grande', () => {
  const rel = configDelPlugin().icon.replace(/^\.\//, '');
  const ruta = path.join(RAIZ, rel);
  assert.ok(fs.existsSync(ruta), `no existe ${rel}`);

  const { w, h } = leerPng(ruta);
  assert.strictEqual(w, h, `debe ser cuadrado, es ${w}x${h}`);
  assert.ok(w >= 96, `Android pide 96x96 o más, es ${w}x${w}`);
});

test('el icono es una silueta: solo blanco y transparencia', () => {
  const rel = configDelPlugin().icon.replace(/^\.\//, '');
  const { w, h, pix } = leerPng(path.join(RAIZ, rel));

  const conColor = [];
  for (let i = 0; i < w * h && conColor.length < 5; i++) {
    const [r, g, b, a] = [pix[i * 4], pix[i * 4 + 1], pix[i * 4 + 2], pix[i * 4 + 3]];
    // Donde no se ve nada da igual el color; donde se ve, tiene que ser blanco.
    if (a > 8 && !(r > 240 && g > 240 && b > 240)) {
      conColor.push({ x: i % w, y: Math.floor(i / w), rgba: [r, g, b, a] });
    }
  }
  assert.deepStrictEqual(
    conColor,
    [],
    'Hay píxeles de color visibles. Android los descarta y pinta un cuadrado '
      + 'blanco en la barra de estado: el icono tiene que ser blanco sobre transparente.'
  );
});

test('la silueta ocupa una parte razonable del lienzo', () => {
  const rel = configDelPlugin().icon.replace(/^\.\//, '');
  const { w, h, pix } = leerPng(path.join(RAIZ, rel));

  let opacos = 0;
  let bordeOcupado = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (pix[(y * w + x) * 4 + 3] > 127) {
        opacos++;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) bordeOcupado++;
      }
    }
  }
  const ocupacion = opacos / (w * h);
  assert.ok(ocupacion > 0.12, `el dibujo casi no se ve (${Math.round(ocupacion * 100)}%)`);
  assert.ok(ocupacion < 0.75, `el dibujo llena casi todo (${Math.round(ocupacion * 100)}%), parece un bloque`);
  // Android recorta el icono: lo que toque el borde se pierde.
  assert.strictEqual(bordeOcupado, 0, 'el dibujo toca el borde y Android lo recortaría');
});
