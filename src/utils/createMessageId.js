/**
 * UUID v4 generado en el dispositivo para un mensaje de chat.
 *
 * El id se decide ANTES de enviar: así el mensaje se pinta al instante con el id
 * que tendrá en la base de datos, el evento de Realtime lo reconoce como el mismo
 * y un reintento no puede duplicarlo (la clave primaria lo rechaza).
 *
 * crypto.randomUUID no existe en todos los motores ni en web servida por http
 * fuera de localhost, de ahí el respaldo. No es un secreto: basta con que no choque.
 */
export const createMessageId = () => {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
