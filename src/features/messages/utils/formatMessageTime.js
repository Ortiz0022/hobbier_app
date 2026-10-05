import { formatRelativeShort } from '../../../utils/dateFormat';

/**
 * Hora corta para la bandeja de mensajes, como en Instagram:
 * hoy -> "14:32", esta semana -> "lun", antes -> "3 sept".
 *
 * Solo la hora no basta: un mensaje de hace tres días se leería igual que uno de
 * hoy. Usa el idioma de la app y la zona horaria del dispositivo.
 */
export const formatMessageTime = (isoDate, language, now = new Date()) =>
  formatRelativeShort(isoDate, language, now);
