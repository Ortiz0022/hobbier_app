/**
 * A dónde lleva una notificación cuando se toca.
 *
 * La Edge Function manda `data: { tipo, ...contexto }`. Aquí se traduce ese
 * tipo al sitio de la app que le corresponde, y nada más: quién navega es
 * App.js, y quién abre el chat o la sala concreta es la pantalla de Comunidad.
 *
 * El destino se guarda en vez de usarse al vuelo porque el toque puede llegar
 * con la app cerrada: para cuando el aviso se procesa, la pantalla que tiene
 * que abrirse todavía no existe. Se queda esperando hasta que alguien lo recoja.
 */

/** Secciones de la barra inferior, tal como las nombra App.js. */
export const SECCION = {
  COMUNIDAD: 'friends',
  PERFIL: 'profile',
  PANEL: 'admin',
};

/**
 * Traduce el `data` de un aviso a un destino.
 *
 * Devuelve null para los avisos que no llevan a ningún sitio concreto: en ese
 * caso basta con que la app se abra donde estaba.
 */
export const destinoDeAviso = (data) => {
  const tipo = data && data.tipo;
  if (!tipo) return null;

  const texto = (valor) => (valor === undefined || valor === null ? null : String(valor));

  switch (tipo) {
    // Un mensaje directo abre esa conversación. Viene el id de la conversación,
    // no el de la persona; la pantalla de Comunidad lo resuelve con la bandeja.
    case 'mensaje_directo':
      return { seccion: SECCION.COMUNIDAD, conversacion: texto(data.conversacionId) };

    // Un mensaje de sala o una invitación abren esa sala.
    case 'mensaje_sala':
    case 'sala_invitacion':
      return { seccion: SECCION.COMUNIDAD, pestana: 'rooms', sala: texto(data.salaId) };

    case 'amistad_solicitud':
      return { seccion: SECCION.COMUNIDAD, pestana: 'requests' };

    case 'amistad_aceptada':
      return { seccion: SECCION.COMUNIDAD, pestana: 'friends' };

    // Lo de la cuenta y el soporte vive en Perfil.
    case 'soporte_respuesta':
    case 'cuenta_sancionada':
    case 'cuenta_reactivada':
    case 'anuncio_estado':
    case 'anuncio_mensaje':
      return { seccion: SECCION.PERFIL };

    // Avisos del panel: solo los ve quien es administrador.
    case 'admin_soporte':
      return { seccion: SECCION.PANEL, panel: 'support' };
    case 'admin_reporte':
      return { seccion: SECCION.PANEL, panel: 'posts' };
    case 'admin_solicitud_anuncio':
      return { seccion: SECCION.PANEL, panel: 'ads' };

    default:
      return null;
  }
};

// ---------------------------------------------------------------
// El destino que está esperando a que alguien lo atienda
// ---------------------------------------------------------------
let pendiente = null;
const oyentes = new Set();

/** Guarda un destino y avisa a quien esté escuchando. */
export const anotarDestino = (destino) => {
  if (!destino) return;
  pendiente = destino;
  for (const oyente of [...oyentes]) {
    try {
      oyente(destino);
    } catch (error) {
      console.warn('Un oyente de avisos falló:', error.message);
    }
  }
};

/** Devuelve el destino pendiente y lo da por atendido. */
export const recogerDestino = () => {
  const destino = pendiente;
  pendiente = null;
  return destino;
};

/** Se suscribe a los destinos que vayan llegando. Devuelve cómo darse de baja. */
export const escucharDestino = (oyente) => {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
};

/** Solo para las pruebas: deja el módulo como recién cargado. */
export const olvidarTodo = () => {
  pendiente = null;
  oyentes.clear();
};
