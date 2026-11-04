// Un hook colocado DESPUÉS de un `return` anticipado cierra la app entera.
//
// React exige que cada render llame a los mismos hooks y en el mismo orden. Si
// una pantalla hace `if (cargando) return <Rueda/>` y más abajo llama a
// useEffect, pasa esto:
//
//   render 1 (cargando)  -> sale antes, el useEffect NO llega a llamarse
//   render 2 (con datos) -> ya pasa de largo y el useEffect SÍ se llama
//   React: "Rendered more hooks than during the previous render."
//
// En desarrollo eso es una pantalla roja de la que se puede volver. En un APK
// de release no hay pantalla roja: la app se cierra del todo.
//
// Pasó de verdad: el useEffect del botón de retroceso de RoomDetailScreen
// quedó detrás de `if (detailsLoading && !room) return ...`, y como la sala
// llega de la red, el primer render SIEMPRE salía por ahí. Entrar a una sala
// cerraba la aplicación.
//
// No se puede comprobar renderizando: habría que montar cada pantalla con
// todos sus servicios. Se comprueba leyendo el árbol del archivo, que es donde
// vive el error.

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const RAIZ = path.join(__dirname, '..');
const parser = require(path.join(RAIZ, 'node_modules/@babel/parser'));

const esNombreDeHook = (nombre) => /^use[A-Z]/.test(nombre || '');

/** `useX(...)`, `React.useX(...)` o `algo.useX(...)`; si no, null. */
const nombreDeHookLlamado = (nodo) => {
  if (!nodo || nodo.type !== 'CallExpression') return null;
  const llamado = nodo.callee;
  if (llamado.type === 'Identifier' && esNombreDeHook(llamado.name)) return llamado.name;
  if (
    llamado.type === 'MemberExpression' &&
    llamado.property.type === 'Identifier' &&
    esNombreDeHook(llamado.property.name)
  ) {
    return (llamado.object.name ? `${llamado.object.name}.` : '') + llamado.property.name;
  }
  return null;
};

const ES_FUNCION = /Function|ArrowFunctionExpression/;

/**
 * Hooks llamados en esta sentencia, sin entrar en funciones anidadas: un hook
 * dentro de un callback no es una llamada de este render.
 */
const hooksEn = (nodo, encontrados = []) => {
  if (!nodo || typeof nodo !== 'object') return encontrados;
  const hook = nombreDeHookLlamado(nodo);
  if (hook) encontrados.push({ nombre: hook, linea: nodo.loc.start.line });
  for (const clave of Object.keys(nodo)) {
    if (clave === 'loc' || clave.endsWith('Comments')) continue;
    const hijo = nodo[clave];
    if (Array.isArray(hijo)) {
      hijo.forEach((n) => n && n.type && !ES_FUNCION.test(n.type) && hooksEn(n, encontrados));
    } else if (hijo && hijo.type && !ES_FUNCION.test(hijo.type)) {
      hooksEn(hijo, encontrados);
    }
  }
  return encontrados;
};

/** Línea del `return` que puede cortar el render en esta sentencia, o null. */
const returnQueCorta = (sentencia) => {
  if (sentencia.type === 'ReturnStatement') return sentencia.loc.start.line;
  if (sentencia.type !== 'IfStatement') return null;
  const lineas = [];
  const buscar = (nodo) => {
    if (!nodo || typeof nodo !== 'object') return;
    if (nodo.type === 'ReturnStatement') { lineas.push(nodo.loc.start.line); return; }
    if (ES_FUNCION.test(nodo.type)) return;
    for (const clave of Object.keys(nodo)) {
      if (clave === 'loc') continue;
      const hijo = nodo[clave];
      if (Array.isArray(hijo)) hijo.forEach((n) => n && n.type && buscar(n));
      else if (hijo && hijo.type) buscar(hijo);
    }
  };
  buscar(sentencia.consequent);
  if (sentencia.alternate) buscar(sentencia.alternate);
  return lineas.length ? Math.min(...lineas) : null;
};

/** Cuerpos de funciones que parecen componentes, o sea que devuelven JSX. */
const cuerposDeComponentes = (ast) => {
  const encontrados = [];
  const visitar = (nodo, nombre) => {
    if (!nodo || typeof nodo !== 'object') return;
    if (ES_FUNCION.test(nodo.type) && nodo.body && nodo.body.type === 'BlockStatement') {
      if (/"JSXElement"|"JSXFragment"/.test(JSON.stringify(nodo.body))) {
        encontrados.push({ nombre: nombre || nodo.id?.name || '(anónima)', cuerpo: nodo.body });
      }
    }
    for (const clave of Object.keys(nodo)) {
      if (clave === 'loc') continue;
      const hijo = nodo[clave];
      const etiqueta = nodo.type === 'VariableDeclarator' && nodo.id?.name ? nodo.id.name : nombre;
      if (Array.isArray(hijo)) hijo.forEach((n) => n && n.type && visitar(n, etiqueta));
      else if (hijo && hijo.type) visitar(hijo, nodo.id?.name || etiqueta);
    }
  };
  visitar(ast.program, null);
  return encontrados;
};

const analizar = (rutaRelativa) => {
  const ruta = path.join(RAIZ, rutaRelativa);
  const ast = parser.parse(fs.readFileSync(ruta, 'utf8'), {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'classProperties'],
  });

  const problemas = [];
  for (const { nombre, cuerpo } of cuerposDeComponentes(ast)) {
    let primerReturn = null;
    for (const sentencia of cuerpo.body) {
      const linea = returnQueCorta(sentencia);
      if (linea && primerReturn === null) primerReturn = linea;
      if (primerReturn === null) continue;
      for (const hook of hooksEn(sentencia)) {
        if (hook.linea > primerReturn) {
          problemas.push(
            `${rutaRelativa} -> ${nombre}: ${hook.nombre}() en la línea ${hook.linea}, `
            + `detrás del return de la línea ${primerReturn}`
          );
        }
      }
    }
  }
  return problemas;
};

/** Todos los .js/.jsx/.tsx de src/, más App.js. */
const pantallas = () => {
  const encontrados = ['App.js'];
  const recorrer = (dir) => {
    for (const entrada of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entrada.name}`;
      if (entrada.isDirectory()) recorrer(rel);
      else if (/\.(js|jsx|tsx)$/.test(entrada.name) && !/\.test\./.test(entrada.name)) {
        encontrados.push(rel);
      }
    }
  };
  recorrer('src');
  return encontrados;
};

test('ningún componente llama a un hook después de un return anticipado', () => {
  const archivos = pantallas();
  assert.ok(archivos.length > 50, `se esperaban muchos archivos, se leyeron ${archivos.length}`);

  const problemas = archivos.flatMap(analizar);
  assert.deepStrictEqual(
    problemas,
    [],
    'Hooks detrás de un return anticipado (esto cierra la app en release):\n  '
      + problemas.join('\n  ')
  );
});

test('el analizador detecta el caso que cerró la app al entrar a una sala', () => {
  // Se reconstruye el error original para que el analizador no pueda
  // "aprobar" por haberse roto sin que nadie se entere.
  const ejemplo = `
    import React, { useState } from 'react';
    export const Pantalla = ({ onBack }) => {
      const [abierto, setAbierto] = useState(false);
      const { sala, cargando } = useDetalles();

      if (cargando && !sala) {
        return <Rueda />;
      }

      React.useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
        return () => sub.remove();
      }, [onBack]);

      return <Vista sala={sala} abierto={abierto} />;
    };
  `;
  const ast = parser.parse(ejemplo, { sourceType: 'module', plugins: ['jsx'] });
  const problemas = [];
  for (const { cuerpo } of cuerposDeComponentes(ast)) {
    let primerReturn = null;
    for (const sentencia of cuerpo.body) {
      const linea = returnQueCorta(sentencia);
      if (linea && primerReturn === null) primerReturn = linea;
      if (primerReturn === null) continue;
      for (const hook of hooksEn(sentencia)) {
        if (hook.linea > primerReturn) problemas.push(hook.nombre);
      }
    }
  }
  assert.deepStrictEqual(problemas, ['React.useEffect']);
});
