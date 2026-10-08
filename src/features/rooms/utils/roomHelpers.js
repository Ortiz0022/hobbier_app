export const isRoomClosed = (room) => {
  if (!room) return false;
  if (room.status === 'CLOSED') return true;
  if (room.end_at && new Date(room.end_at) <= new Date()) return true;
  return false;
};

/**
 * ¿La invitación es a una sala que ya terminó?
 *
 * accept_room_invitation rechaza las salas que no están ACTIVE o que ya pasaron
 * su fecha, así que esta invitación no se puede aceptar: se muestra como aviso
 * ("esta sala ya finalizó") en vez de como solicitud.
 *
 * `room_status` lo completa roomsService.getPendingInvitations leyendo la sala
 * (la RLS deja ver una sala a quien tiene invitación pendiente en ella), o lo
 * trae ya la RPC si se aplicó supabase/invitaciones_salas_estado.sql. Si por lo
 * que sea no llega, aún se detectan las salas vencidas por fecha.
 */
export const isInvitationFinished = (invitation) =>
  isRoomClosed({ status: invitation?.room_status, end_at: invitation?.room_end_at });
