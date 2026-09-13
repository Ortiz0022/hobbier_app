import { useState, useRef, useCallback } from 'react';
import { roomsService } from '../../../services/roomsService';

// Generador simple de UUID v4 para entornos donde crypto no está disponible
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useEvidenceUploader = (roomId) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  // Mantenemos el requestId entre reintentos fallidos para aprovechar la idempotencia del backend
  const activeRequestId = useRef(null);

  const submitEvidence = useCallback(async (localUri) => {
    if (!roomId || !localUri) return;
    
    // Si no hay un request activo o si el anterior fue exitoso (y lo limpiamos), generamos uno nuevo.
    if (!activeRequestId.current) {
      activeRequestId.current = generateUUID();
    }
    
    const requestId = activeRequestId.current;

    try {
      setUploading(true);
      setError(null);
      
      let imagePath;
      
      // Intentamos subir la imagen. 
      // Si ya existe en Storage (reintento), Storage nos puede dar error o no. 
      // Para evitar abortar, atrapamos el error de storage específicamente si es de conflicto, 
      // pero dado que pusimos upsert: false, podría fallar.
      // Según requerimiento: "Si la fotografía ya existe en Storage, continúa con submit_room_evidence".
      try {
        imagePath = await roomsService.uploadEvidencePhoto(roomId, requestId, localUri);
      } catch (uploadErr) {
        // En Supabase si upsert es false y el archivo existe, lanza error 'Duplicate'
        // Verificamos si el error indica que ya existe
        if (uploadErr.message?.toLowerCase().includes('duplicate') || uploadErr.error === 'Duplicate') {
          // Ya se subió en el intento anterior
          const { data: { session } } = await require('../../../config/supabase').supabase.auth.getSession();
          imagePath = `${roomId}/${session?.user?.id}/${requestId}.jpg`;
        } else {
          // Otro error de red o permisos
          throw uploadErr;
        }
      }

      // Llamamos al RPC, que es idempotente (busca el request_id y no duplica si ya existe)
      const messageId = await roomsService.submitRoomEvidence(roomId, imagePath, requestId);
      
      // Si llegó hasta aquí con éxito, limpiamos el requestId para el siguiente avance (nueva foto)
      activeRequestId.current = null;
      
      return messageId;
    } catch (err) {
      setError(err);
      
      // Si falló en la fase de RPC después de subir la imagen (ej: error de red), NO limpiamos 
      // activeRequestId.current, así el usuario puede darle "Reintentar" y se usará el mismo ID.
      // El backend manejará la idempotencia adecuadamente.
      throw err;
    } finally {
      setUploading(false);
    }
  }, [roomId]);

  return { submitEvidence, uploading, error };
};
