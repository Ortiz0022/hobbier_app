// A dónde lleva cada notificación cuando se toca.
//
// La Edge Function manda `data: { tipo, ...contexto }`, y la app tiene que
// traducir eso al sitio correcto. Es lógica pura, así que se prueba entera sin
// teléfono: lo único que no se puede comprobar aquí es que Android entregue el
// toque, y de eso ya se encarga expo-notifications.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const Module = require('node:module');

const RAIZ = path.join(__dirname, '..');
const babel = require(path.join(RAIZ, 'node_modules/@babel/core'));

// El módulo está en ESM; aquí se compila al vuelo para poder cargarlo.
const original = Module._extensions['.js'];
Module._extensions['.js'] = function (modulo, archivo) {
  if (archivo.includes(path.join('src', 'services', 'avisoDestino'))) {
    const { code } = babel.transformFileSync(archivo, {
      babelrc: false,
      configFile: false,
      presets: [path.join(RAIZ, 'node_modules/babel-preset-expo')],
      plugins: [path.join(RAIZ, 'node_modules/@babel/plugin-transform-modules-commonjs')],
      filename: archivo,
    });
    return modulo._compile(code, archivo);
  }
  return original(modulo, archivo);
};

const {
  destinoDeAviso,
  anotarDestino,
  recogerDestino,
  escucharDestino,
  olvidarTodo,
  SECCION,
} = require(path.join(RAIZ, 'src/services/avisoDestino.js'));

test('un mensaje directo abre esa conversación', () => {
  assert.deepStrictEqual(
    destinoDeAviso({ tipo: 'mensaje_directo', conversacionId: 'abc-123', texto: 'hola' }),
    { seccion: SECCION.COMUNIDAD, conversacion: 'abc-123' }
  );
});

test('un mensaje de sala y una invitación abren esa sala', () => {
  for (const tipo of ['mensaje_sala', 'sala_invitacion']) {
    assert.deepStrictEqual(
      destinoDeAviso({ tipo, salaId: 'sala-9' }),
      { seccion: SECCION.COMUNIDAD, pestana: 'rooms', sala: 'sala-9' },
      tipo
    );
  }
});

test('las solicitudes de amistad abren su pestaña', () => {
  assert.deepStrictEqual(destinoDeAviso({ tipo: 'amistad_solicitud', para: 'u1' }), {
    seccion: SECCION.COMUNIDAD,
    pestana: 'requests',
  });
  assert.deepStrictEqual(destinoDeAviso({ tipo: 'amistad_aceptada', para: 'u1' }), {
    seccion: SECCION.COMUNIDAD,
    pestana: 'friends',
  });
});

test('lo de la cuenta y los anuncios lleva a Perfil', () => {
  for (const tipo of [
    'soporte_respuesta',
    'cuenta_sancionada',
    'cuenta_reactivada',
    'anuncio_estado',
    'anuncio_mensaje',
  ]) {
    assert.deepStrictEqual(destinoDeAviso({ tipo }), { seccion: SECCION.PERFIL }, tipo);
  }
});

test('los avisos del panel llevan a su sección', () => {
  assert.deepStrictEqual(destinoDeAviso({ tipo: 'admin_soporte' }), { seccion: SECCION.PANEL, panel: 'support' });
  assert.deepStrictEqual(destinoDeAviso({ tipo: 'admin_reporte' }), { seccion: SECCION.PANEL, panel: 'posts' });
  assert.deepStrictEqual(destinoDeAviso({ tipo: 'admin_solicitud_anuncio' }), { seccion: SECCION.PANEL, panel: 'ads' });
});

test('un aviso sin tipo, o de un tipo desconocido, no lleva a ningún sitio', () => {
  for (const data of [null, undefined, {}, { tipo: '' }, { tipo: 'algo_que_no_existe' }]) {
    assert.strictEqual(destinoDeAviso(data), null, JSON.stringify(data));
  }
});

test('todos los tipos que la app sabe enviar tienen destino o lo descartan a propósito', () => {
  // Los mismos que declara pushService.AVISO. Si alguien añade uno nuevo y se
  // olvida de enrutarlo, aquí se entera.
  const TIPOS = [
    'amistad_solicitud', 'amistad_aceptada', 'mensaje_directo', 'mensaje_sala',
    'sala_invitacion', 'soporte_respuesta', 'cuenta_sancionada', 'cuenta_reactivada',
    'anuncio_estado', 'anuncio_mensaje', 'admin_soporte', 'admin_reporte',
    'admin_solicitud_anuncio',
  ];
  const sinDestino = TIPOS.filter((tipo) => destinoDeAviso({ tipo }) === null);
  assert.deepStrictEqual(sinDestino, [], 'estos tipos no llevan a ninguna parte');
});

test('el id de sala o conversación llega como texto, nunca como objeto raro', () => {
  const d = destinoDeAviso({ tipo: 'mensaje_sala', salaId: 42 });
  assert.strictEqual(typeof d.sala, 'string');
  assert.strictEqual(d.sala, '42');
  // Sin id, el destino sigue siendo válido: abre la pestaña y ya.
  assert.strictEqual(destinoDeAviso({ tipo: 'mensaje_sala' }).sala, null);
});

test('el destino espera a que alguien lo atienda, aunque la app estuviera cerrada', () => {
  olvidarTodo();
  // Nadie escuchando todavía: el toque llegó antes de que hubiera pantallas.
  anotarDestino({ seccion: 'friends', sala: 's1' });

  // Quien llega después sí lo encuentra.
  assert.deepStrictEqual(recogerDestino(), { seccion: 'friends', sala: 's1' });
  // Y solo se atiende una vez.
  assert.strictEqual(recogerDestino(), null);
});

test('quien escucha se entera al momento, y puede darse de baja', () => {
  olvidarTodo();
  const recibidos = [];
  const baja = escucharDestino(() => recibidos.push(recogerDestino()));

  anotarDestino({ seccion: 'profile' });
  assert.deepStrictEqual(recibidos, [{ seccion: 'profile' }]);

  baja();
  anotarDestino({ seccion: 'friends' });
  assert.strictEqual(recibidos.length, 1, 'tras darse de baja ya no debería recibir');
  // Pero el destino sigue guardado para el siguiente que llegue.
  assert.deepStrictEqual(recogerDestino(), { seccion: 'friends' });
});

test('un oyente que falla no se lleva por delante a los demás', () => {
  olvidarTodo();
  const vistos = [];
  escucharDestino(() => { throw new Error('me rompí'); });
  escucharDestino(() => vistos.push('ok'));
  assert.doesNotThrow(() => anotarDestino({ seccion: 'friends' }));
  assert.deepStrictEqual(vistos, ['ok']);
});
