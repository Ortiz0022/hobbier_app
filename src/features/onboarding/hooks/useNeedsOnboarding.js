import { useState, useEffect, useCallback } from 'react';
import { hasCompletedOnboarding } from '../../../services/catalogService';

/**
 * ¿Hay que mandar a esta cuenta al asistente de preferencias antes de dejarla
 * entrar a la app?
 *
 * Una cuenta recién creada no tiene gustos, intereses ni recursos, así que el
 * motor de recomendación no tiene con qué trabajar y "Sorpréndeme" solo puede
 * ofrecerle comodines. Por eso el asistente va ANTES de la app, no escondido
 * dentro de un menú.
 *
 * Devuelve 'comprobando' | 'falta' | 'listo'. Mientras comprueba no se pinta
 * nada: entrar al feed y que la pantalla salte al asistente un segundo después
 * se ve como un error.
 */
export const useNeedsOnboarding = (userId) => {
  const [estado, setEstado] = useState('comprobando');

  const comprobar = useCallback(async () => {
    if (!userId) {
      setEstado('comprobando');
      return;
    }
    const completado = await hasCompletedOnboarding(userId);
    setEstado(completado ? 'listo' : 'falta');
  }, [userId]);

  useEffect(() => {
    comprobar();
  }, [comprobar]);

  /** Tras terminar el asistente, sin volver a preguntar a la base. */
  const marcarCompletado = useCallback(() => setEstado('listo'), []);

  return { estado, marcarCompletado, comprobar };
};
