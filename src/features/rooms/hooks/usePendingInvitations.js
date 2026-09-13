import { useState, useEffect, useCallback } from 'react';
import { roomsService } from '../../../services/roomsService';

export const usePendingInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomsService.getPendingInvitations();
      setInvitations(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const acceptInvitation = async (invitationId) => {
    await roomsService.acceptRoomInvitation(invitationId);
    setInvitations(prev => prev.filter(inv => inv.invitation_id !== invitationId));
  };

  const rejectInvitation = async (invitationId) => {
    await roomsService.rejectRoomInvitation(invitationId);
    setInvitations(prev => prev.filter(inv => inv.invitation_id !== invitationId));
  };

  return { invitations, loading, error, refetch: fetchInvitations, acceptInvitation, rejectInvitation };
};
