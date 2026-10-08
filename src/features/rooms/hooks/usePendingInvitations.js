import { useState, useEffect, useCallback, useMemo } from 'react';
import { roomsService } from '../../../services/roomsService';
import { isInvitationFinished } from '../utils/roomHelpers';

export const usePendingInvitations = () => {
  const [recibidas, setRecibidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomsService.getPendingInvitations();
      setRecibidas(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Las de salas ya terminadas no son solicitudes: no se pueden aceptar, solo
  // avisar de que la sala finalizó y quitarlas de en medio.
  const invitations = useMemo(() => recibidas.filter((inv) => !isInvitationFinished(inv)), [recibidas]);
  const finishedInvitations = useMemo(() => recibidas.filter(isInvitationFinished), [recibidas]);

  const quitar = (invitationId) => setRecibidas(prev => prev.filter(inv => inv.invitation_id !== invitationId));

  const acceptInvitation = async (invitationId) => {
    await roomsService.acceptRoomInvitation(invitationId);
    quitar(invitationId);
  };

  const rejectInvitation = async (invitationId) => {
    await roomsService.rejectRoomInvitation(invitationId);
    quitar(invitationId);
  };

  /**
   * Descartar el aviso de una sala terminada. Marca la invitación como
   * RECHAZADA en la base (es el único estado final disponible), así que no
   * vuelve a aparecer ni al recargar ni en otro dispositivo.
   */
  const dismissInvitation = async (invitationId) => {
    quitar(invitationId);
    try {
      await roomsService.rejectRoomInvitation(invitationId);
    } catch (err) {
      // Si falla, el aviso ya desapareció de la pantalla; volverá a salir al
      // recargar, que es mejor que dejar un error delante de una sala muerta.
      console.error('Error descartando invitación a sala terminada:', err);
    }
  };

  return {
    invitations,
    finishedInvitations,
    loading,
    error,
    refetch: fetchInvitations,
    acceptInvitation,
    rejectInvitation,
    dismissInvitation,
  };
};
