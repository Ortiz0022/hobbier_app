import { supabase } from '../config/supabase';

export const roomsService = {
  // ----------------------------------------------------
  // RPC: CREACIÓN Y GESTIÓN DE SALAS
  // ----------------------------------------------------
  async createRoom({ name, activityId, endAt, imagePath }) {
    const { data, error } = await supabase.rpc('create_room_with_owner', {
      p_name: name,
      p_activity_id: activityId,
      p_end_at: endAt || null,
      p_image_path: imagePath || null,
    });
    if (error) throw error;
    return data; // Retorna el room_id UUID
  },

  async closeRoom(roomId) {
    const { data, error } = await supabase.rpc('close_room', {
      p_room_id: roomId,
    });
    if (error) throw error;
    return data;
  },

  async deleteRoom(roomId) {
    const { data, error } = await supabase.rpc('delete_room', {
      p_room_id: roomId,
    });
    if (error) throw error;
    return data;
  },

  async setRoomImagePath(roomId, imagePath) {
    const { data, error } = await supabase.rpc('set_room_image_path', {
      p_room_id: roomId,
      p_image_path: imagePath,
    });
    if (error) throw error;
    return data;
  },

  // ----------------------------------------------------
  // RPC: INVITACIONES
  // ----------------------------------------------------
  async inviteFriendToRoom(roomId, receiverId) {
    const { data, error } = await supabase.rpc('invite_friend_to_room', {
      p_room_id: roomId,
      p_receiver_id: receiverId,
    });
    if (error) throw error;
    return data; // Retorna invitation_id
  },

  async acceptRoomInvitation(invitationId) {
    const { data, error } = await supabase.rpc('accept_room_invitation', {
      p_invitation_id: invitationId,
    });
    if (error) throw error;
    return data;
  },

  async rejectRoomInvitation(invitationId) {
    const { data, error } = await supabase.rpc('reject_room_invitation', {
      p_invitation_id: invitationId,
    });
    if (error) throw error;
    return data;
  },

  async getPendingInvitations() {
    const { data, error } = await supabase.rpc('get_pending_room_invitations');
    if (error) throw error;
    return data || [];
  },

  // ----------------------------------------------------
  // RPC: EVIDENCIA Y PUNTOS
  // ----------------------------------------------------
  async submitRoomEvidence(roomId, imagePath, requestId) {
    const { data, error } = await supabase.rpc('submit_room_evidence', {
      p_room_id: roomId,
      p_image_path: imagePath,
      p_request_id: requestId,
    });
    if (error) throw error;
    return data; // Retorna message_id
  },

  async getRoomRanking(roomId) {
    const { data, error } = await supabase.rpc('get_room_ranking', {
      p_room_id: roomId,
    });
    if (error) throw error;
    return data || [];
  },

  // ----------------------------------------------------
  // CONSULTAS DIRECTAS (Respaldadas por RLS)
  // ----------------------------------------------------
  async getMyRooms() {
    // La política RLS de `rooms` ya filtra devolviendo solo donde el usuario es miembro
    // o tiene invitación pendiente. Filtraremos explícitamente los que ya unió.
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No user authenticated');

    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        challenge:activities(title, points_awarded),
        members:room_members(user_id, role)
      `)
      .neq('status', 'DELETED')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Filtramos solo en las que es miembro (descartando las que solo ve por tener invitación pendiente)
    return (data || []).filter(room => 
      room.members?.some(m => m.user_id === userId)
    );
  },

  async getRoomDetails(roomId) {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        challenge:activities(id, title, description, points_awarded),
        members:room_members(
          role,
          joined_at,
          profile:profiles(id, username, full_name, avatar_url)
        )
      `)
      .eq('id', roomId)
      .single();

    if (error) throw error;
    return data;
  },

  async getRoomMessages(roomId, { limit = 30, offset = 0 } = {}) {
    const { data, error } = await supabase
      .from('room_messages')
      .select(`
        *,
        sender:profiles(id, username, avatar_url),
        evidence:room_evidence(id, image_path, points_awarded)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false }) // Cargamos descendente para paginar desde lo más reciente
      .range(offset, offset + limit - 1);

    if (error) throw error;
    // Invertimos para que en la UI se vea cronológico (antiguo arriba, nuevo abajo) si así se requiere, o lo maneja la flatlist inverted
    return data || [];
  },

  async sendTextMessage(roomId, content) {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('No user authenticated');

    const trimmedContent = (content || '').trim();
    if (!trimmedContent) throw new Error('Message content cannot be empty');

    const { data, error } = await supabase
      .from('room_messages')
      .insert({
        room_id: roomId,
        sender_id: userId,
        message_type: 'TEXT',
        content: trimmedContent
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ----------------------------------------------------
  // STORAGE (EVIDENCIA E IMÁGENES)
  // ----------------------------------------------------
  
  // Sube la foto de la portada al bucket 'room-images'
  async uploadRoomCover(roomId, localUri) {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('No auth session');
    
    // Fetch blob
    const response = await fetch(localUri);
    const blob = await response.blob();
    
    // Usar cover.jpg con upsert true para no acumular indefinidamente
    const path = `${roomId}/cover.jpg`;

    console.log('COVER DEBUG', {
      userId: uid,
      roomId,
      path
    });
    
    const { data, error } = await supabase.storage
      .from('room-images')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });
      
    if (error) {
      console.error('ROOM COVER UPLOAD ERROR', {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
        details: error.details,
        fullError: error
      });
      throw error;
    }
    
    // Si se quiere bypassear caché en UI, se puede retornar path + "?t=" + Date.now() en la vista
    return data.path; 
  },

  // Sube la foto de evidencia al bucket 'room-evidence'
  async uploadEvidencePhoto(roomId, requestId, localUri) {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('No auth session');
    
    const response = await fetch(localUri);
    const blob = await response.blob();
    
    // Según requerimiento: {room_id}/{auth.uid()}/{request_id}.jpg
    const path = `${roomId}/${uid}/${requestId}.jpg`;
    
    const { data, error } = await supabase.storage
      .from('room-evidence')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false // El RLS de insert ya lo bloquea o la DB, upsert false por seguridad
      });

    if (error) {
      console.error('EVIDENCE PHOTO UPLOAD ERROR', {
        statusCode: error.statusCode,
        error: error.error,
        message: error.message,
        details: error.details,
        fullError: error
      });
      throw error;
    }
    return data.path;
  },

  // Elimina evidencia en caso de que falle la RPC submit_room_evidence
  async deleteEvidencePhoto(path) {
    const { error } = await supabase.storage
      .from('room-evidence')
      .remove([path]);
    
    if (error) console.error("Error eliminando evidencia huérfana:", error);
  },

  // Obtiene URL firmada para poder renderizar las imágenes privadas
  async getSignedUrl(bucket, path, expiresIn = 3600) {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
      
    if (error) throw error;
    return data.signedUrl;
  },

  // ----------------------------------------------------
  // REALTIME
  // ----------------------------------------------------
  subscribeToRoomMessages(roomId, onNewMessage) {
    const channel = supabase
      .channel(`room_messages_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          // El payload.new solo trae la fila plana, necesitamos hidratarla con las relaciones
          const { data, error } = await supabase
            .from('room_messages')
            .select(`
              *,
              sender:profiles(id, username, avatar_url),
              evidence:room_evidence(id, image_path, points_awarded)
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            onNewMessage(data);
          } else {
            // Si hay error hidratando, enviar el raw al menos
            onNewMessage(payload.new);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
