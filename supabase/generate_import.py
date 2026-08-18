"""
Regenera supabase/import_metas.sql desde el catálogo de mockapi.io.

Se ejecuta a mano cuando el catálogo de la API cambie:

    python supabase/generate_import.py

Después hay que pegar el SQL resultante en el SQL Editor de Supabase.

La identidad de cada actividad es `external_id` (el id que trae la API), NO el
título: si alguien corrige una errata en mockapi.io, la actividad sigue siendo la
misma y no se duplica. Por eso tanto el anti-duplicados como las relaciones
cruzan por `external_id`.
"""
import json, io, urllib.request

URL = "https://6a84625153754283b0b86fa4.mockapi.io/metas"
SALIDA = r"c:/Users/kathe/OneDrive/Documentos/Hobbier/hobbier_app/supabase/import_metas.sql"

crudo = json.load(urllib.request.urlopen(URL))


def aplanar(items):
    """
    Devuelve una lista plana de metas.

    El catálogo se edita a mano en mockapi.io, y al pegar varias metas de golpe
    es fácil que queden como un ARRAY dentro de un solo registro en vez de como
    registros sueltos. Sin esto, el script reventaba con
    "'list' object has no attribute 'get'" y perdía todo ese bloque.
    """
    salida = []
    for item in items:
        if isinstance(item, dict):
            salida.append(item)
        elif isinstance(item, list):
            salida.extend(aplanar(item))
        # cualquier otra cosa (texto, número suelto) se ignora en silencio:
        # no es una meta y no hay nada que importar de ahí
    return salida


metas = aplanar(crudo)
anidadas = len(metas) - sum(1 for x in crudo if isinstance(x, dict))


def q(v):
    """Literal SQL seguro: escapa comillas simples."""
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def n(v):
    return "NULL" if v is None else str(int(v))


# Sin `id` no hay forma de identificar la actividad de manera estable, así que se
# descarta en vez de insertarla sin external_id y crear un duplicado al día
# siguiente.
sin_id = [m for m in metas if not str(m.get("id") or "").strip()]
metas = [m for m in metas if str(m.get("id") or "").strip()]

# --- Actividades ---
filas = []
for m in metas:
    filas.append(
        "    (%s, %s, %s, %s, %s, %s, %s)"
        % (q(str(m["id"])), q(m["title"]), q(m["description"]), q(m.get("category")),
           n(m.get("min_age")), n(m.get("max_age")), n(m.get("points") or 10))
    )


# --- Relaciones, cruzadas por external_id ---
def rel(campo):
    out = []
    for m in metas:
        for nombre in (m.get(campo) or []):
            out.append("    (%s, %s)" % (q(str(m["id"])), q(nombre)))
    return out


likes = rel("likes")
intereses = rel("interests")
recursos = rel("resources")

sql = f"""-- ==================================================
-- HOBBIER - Importación del catálogo de metas (mockapi.io -> Supabase)
-- Generado desde {URL}
-- {len(metas)} metas · {len(likes)} gustos · {len(intereses)} intereses · {len(recursos)} recursos
-- ==================================================
--
-- Pega este archivo completo en el SQL Editor y ejecútalo.
--
-- Es SEGURO ejecutarlo más de una vez: la identidad de cada actividad es su
-- `external_id`, así que una que ya esté importada se salta aunque le hayan
-- corregido el título en la API. Las relaciones van con ON CONFLICT DO NOTHING.
--
-- Requiere que `activities` tenga las columnas `external_id` y `source`.
--
-- Las metas quedan como actividades normales, así que se pueden aceptar,
-- completar, dan puntos y generan publicación igual que las del catálogo propio.

BEGIN;

-- 1. LAS METAS COMO ACTIVIDADES
-- La categoría llega por NOMBRE desde la API y se resuelve contra
-- activity_categories con LEFT JOIN: si no coincide con ninguna, la actividad
-- entra con category_id NULL (la interfaz la muestra como "Libre") en lugar de
-- perderse. Un INNER JOIN aquí descartaría actividades en silencio.
INSERT INTO public.activities
  (external_id, source, title, description, category_id, min_age, max_age, points_awarded, is_active)
-- Casts explícitos: si TODAS las metas traen el mismo campo en NULL (hoy pasa
-- con max_age), Postgres deduce esa columna del VALUES como `text` y el INSERT
-- falla contra la columna integer de la tabla.
SELECT v.external_id, 'mockapi', v.title, v.description, c.id,
       v.min_age::int, v.max_age::int, v.points::int, TRUE
FROM (VALUES
{",\n".join(filas)}
) AS v(external_id, title, description, category, min_age, max_age, points)
LEFT JOIN public.activity_categories c ON c.name = v.category
WHERE NOT EXISTS (
  SELECT 1 FROM public.activities a WHERE a.external_id = v.external_id
);

-- 2. GUSTOS DE CADA ACTIVIDAD
-- Sin estas relaciones el motor de recomendación no puede medir afinidad: una
-- actividad sin etiquetas encaja con todo el mundo por igual y las sugerencias
-- se vuelven aleatorias.
INSERT INTO public.activity_likes (activity_id, like_id)
SELECT a.id, l.id
FROM (VALUES
{",\n".join(likes)}
) AS v(external_id, name)
JOIN public.activities a ON a.external_id = v.external_id
JOIN public.likes l ON l.name = v.name
ON CONFLICT DO NOTHING;

-- 3. INTERESES DE CADA ACTIVIDAD
INSERT INTO public.activity_interests (activity_id, interest_id)
SELECT a.id, i.id
FROM (VALUES
{",\n".join(intereses)}
) AS v(external_id, name)
JOIN public.activities a ON a.external_id = v.external_id
JOIN public.interests i ON i.name = v.name
ON CONFLICT DO NOTHING;

-- 4. RECURSOS QUE REQUIERE CADA ACTIVIDAD
INSERT INTO public.activity_resources (activity_id, resource_id)
SELECT a.id, r.id
FROM (VALUES
{",\n".join(recursos)}
) AS v(external_id, name)
JOIN public.activities a ON a.external_id = v.external_id
JOIN public.resources r ON r.name = v.name
ON CONFLICT DO NOTHING;

COMMIT;

-- 5. COMPROBACIÓN
SELECT
  count(*) FILTER (WHERE source = 'mockapi') AS importadas,
  count(*) FILTER (WHERE source = 'catalog') AS propias,
  count(*) FILTER (WHERE category_id IS NULL) AS sin_categoria_libre,
  count(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM public.activity_interests ai WHERE ai.activity_id = a.id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.activity_likes al WHERE al.activity_id = a.id
  )) AS comodines_sin_etiquetas
FROM public.activities a
WHERE a.is_active;
"""

io.open(SALIDA, "w", encoding="utf-8").write(sql)
print("generado:", SALIDA)
print("metas: %d | likes: %d | intereses: %d | recursos: %d"
      % (len(metas), len(likes), len(intereses), len(recursos)))
if anidadas:
    print("AVISO: %d metas venian dentro de un array anidado en la API." % anidadas)
    print("       Se recuperaron igual, pero conviene arreglarlo en mockapi.io")
    print("       para que cada meta sea un registro suelto.")
if sin_id:
    print("DESCARTADAS por no traer id:", len(sin_id))
    for m in sin_id:
        print("   -", m.get("title"))
