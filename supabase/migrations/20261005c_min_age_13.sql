-- ==================================================
-- Edad mínima de 13 años, garantizada en la base de datos
-- ==================================================
-- La app ya impide elegir una fecha de nacimiento de menos de 13 años (el
-- calendario las deshabilita y validateBirthDate las rechaza), pero eso vive
-- en el cliente: una llamada directa a la API se lo saltaría. Este trigger es
-- la garantía real.
--
-- Por qué 13: por debajo de esa edad las leyes de privacidad (COPPA, GDPR,
-- Ley 8968 de Costa Rica) exigen consentimiento verificable de los padres, que
-- Hobbier no gestiona. Los Términos de Uso citan esta misma edad.
--
-- Se aplica al CREAR un perfil (registro, vía handle_new_user) y al CAMBIAR la
-- fecha de nacimiento. Los perfiles que ya existen no se tocan: el trigger solo
-- actúa cuando se escribe la fecha.
--
-- Es seguro ejecutarla más de una vez.

CREATE OR REPLACE FUNCTION public.enforce_min_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL
     AND NEW.birth_date > (CURRENT_DATE - INTERVAL '13 years') THEN
    RAISE EXCEPTION 'Debes tener al menos 13 años para usar Hobbier.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_profiles_min_age ON public.profiles;
CREATE TRIGGER trg_profiles_min_age
  BEFORE INSERT OR UPDATE OF birth_date ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_min_age();
