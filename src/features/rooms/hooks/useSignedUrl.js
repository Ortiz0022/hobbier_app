import { useState, useEffect } from 'react';
import { roomsService } from '../../../services/roomsService';

export const useSignedUrl = (bucket, path) => {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Se vacía al cambiar de ruta: en listas que reciclan componentes (FlashList),
    // la foto anterior se vería en otro mensaje hasta que llegara la URL nueva.
    setUrl(null);
    const fetchUrl = async () => {
      if (!path) {
        if (mounted) setUrl(null);
        return;
      }
      try {
        setLoading(true);
        const signedUrl = await roomsService.getSignedUrl(bucket, path);
        if (mounted) setUrl(signedUrl);
      } catch (err) {
        console.log(`Error fetching signed URL for ${path}:`, err);
        if (mounted) setUrl(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchUrl();
    return () => { mounted = false; };
  }, [bucket, path]);

  return { url, loading };
};
