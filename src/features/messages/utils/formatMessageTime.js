/**
 * Hora corta para la bandeja de mensajes, como en Instagram:
 * hoy -> "14:32", esta semana -> "lun", antes -> "3 sept".
 *
 * Solo la hora no basta: un mensaje de hace tres días se leería igual que uno de
 * hoy. Se usa el locale y la zona horaria del dispositivo.
 */
export const formatMessageTime = (isoDate, now = new Date()) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  if (date >= startOfWeek) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
};
