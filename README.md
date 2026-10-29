# Hobbier App

**Nombre del proyecto:** Hobbier
**Semestre:** IIC 2026
**Curso:** Aplicaciones Informáticas Globales

Hobbier es una aplicación móvil diseñada para combatir el sedentarismo y el aburrimiento, especialmente entre jóvenes y adultos con limitaciones de movilidad. Su objetivo principal es recomendar actividades personalizadas basadas en las capacidades físicas del usuario, sus intereses y el contexto circundante (clima, ubicación, objetos disponibles), facilitando un estilo de vida más activo y conectado.

**Tecnologías:** Expo SDK 57 · React Native 0.86 · React 19 · Supabase (Postgres, Auth, Storage, Realtime y Edge Functions) · Groq para la parte de IA. El código es JavaScript, con algunos archivos TypeScript sueltos (`designTokens.ts`, `SelectableCard.tsx`, `scaledText.tsx`).

## 🔄 Evolución del proyecto (hitos)

El desarrollo siguió una metodología iterativa, priorizando la experiencia del usuario (UX) y la escalabilidad técnica.

| Fase  | Hito                                      | Descripción                                                                                                                                                                                                 |
| ----- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Planteamiento y diseño UX**             | Definición de usuarios (`adolescentes`, `adultos`, `adultos mayores`) y criterios de validación. Mockups en **Figma** y diseño del modelo de datos relacional (`profiles`, `likes`, `interests`, `activities`, `user_activities`). |
| **2** | **Desarrollo y autenticación**            | Proyecto con **Expo**. Registro e inicio de sesión con **Supabase Auth**, perfiles y estado global con **React Context**.                                                                                    |
| **3** | **Motor de recomendaciones**              | Lógica en Postgres (`get_recommended_activity`): filtrado por edad, recursos, gustos y objetivos, con sistema de puntos por actividad.                                                                       |
| **4** | **Integración con IA**                    | **En producción.** Tres Edge Functions con **Groq**: elegir o inventar la actividad recomendada, y moderar el contenido que escriben los usuarios (actividades y mensajes).                                  |
| **5** | **Comunidad**                             | Feed con reacciones, amistades, mensajes directos, salas grupales con retos y evidencias, y anuncios patrocinados segmentados por gustos y ciudad.                                                           |
| **6** | **Moderación y administración**           | Panel de administración con seis secciones, sanciones con motivo obligatorio, chat de apelación con soporte y tema claro/oscuro.                                                                             |

## 🎨 Paleta de colores

Los colores viven en `src/theme/` y **no se escriben sueltos en las pantallas**. Hay tres piezas:

### Tema claro — `src/theme/index.js`

Es la paleta principal del sistema, la que usan el feed, las salas, los mensajes, el perfil y el panel de administración.

| Token | Hex | Para qué |
| --- | --- | --- |
| `background` / `surface` | `#FFFFFF` | Fondo de pantalla y de tarjeta |
| `surfaceMuted` | `#F0F3F5` | Pastillas, separadores y **bordes** de tarjeta |
| `surfaceAccent` | `#F0F8FA` | Realce turquesa suave (vacíos, avisos tranquilos) |
| `primary` | `#0C8AA6` | Turquesa de marca: acciones y elementos activos |
| `primaryDark` | `#053E4A` | Texto sobre fondos turquesa suaves |
| `primarySoft` | `#EAF7FA` | Fondo de insignias y pastillas de marca |
| `accent` | `#FF8F21` | Naranja: puntos, destacados y avisos positivos |
| `accentSoft` / `accentDark` | `#FFAA55` / `#E67A15` | Variantes del naranja |
| `salmon` / `salmonSoft` | `#DF9C8E` / `#F1C2B8` | Acento secundario cálido |
| `text` | `#121B22` | Texto principal |
| `textMuted` | `#8A908B` | Subtítulos y texto secundario |
| `textFaint` | `#727773` | Metadatos y texto de apoyo |
| `onPrimary` | `#FFFFFF` | Texto sobre turquesa o naranja sólidos |
| `danger` | `#A94403` | Acciones destructivas y errores |
| `dangerSoft` | `#F1C2B8` | Fondo de avisos de error |
| `success` | `#2A6347` | Confirmaciones y "en línea" |

También define **radios** (`pill: 8`, `input: 16`, `card: 20`, `round: 999`), **espaciado** (`xs: 4` … `xxl: 28`), **tipografías** (`heading: Poppins_700Bold`, `display: DynaPuff`) y presets listos para usar: `card`, `input`, `sectionTitle`, `primaryButton`, `primaryButtonText`.

### Tema oscuro — `src/theme/palettes.js`

El modo oscuro **no es automático**: es un interruptor en Perfil que guarda la preferencia con `AsyncStorage` (`@hobbier/theme`) y arranca en claro.

| Token | Hex | |
| --- | --- | --- |
| `background` | `#000000` | Fondo |
| `secondary` | `#18191C` | Fondos de segundo nivel |
| `card` | `#222428` | Tarjetas |
| `selected` | `#303033` | Elemento elegido |
| `border` | `#353535` | Bordes |
| `text` / `muted` | `#F5F5F5` / `#A5A7AB` | Texto y texto secundario |
| `primary` | `#35B5CB` | Turquesa aclarado para que contraste sobre negro |
| `accent` / `onAccent` | `#FF901C` / `#000000` | Naranja y su texto |
| `danger` / `success` | `#FF9696` / `#85D6A6` | Estados, legibles sobre carbón |

Las pantallas no eligen el tema a mano: piden sus estilos con `useThemeValues(...)` y resuelven cada color con `theme.color('#0C8AA6', 'primary')`, donde el primer valor es el del tema claro y el segundo la ranura equivalente en oscuro.

### Tokens del asistente de preferencias — `src/theme/designTokens.ts`

Un segundo juego, anterior, que todavía usan el onboarding, el selector de catálogo y el modal de crear actividad: naranja `#FF6B00` como primario, cian `#00B4D8` para lo activo y una escala de grises azulados (`#F7FAFC`, `#E2E8F0`, `#718096`, `#4A5568`).

> **Pendiente conocido:** el panel de administración ya se migró a `src/theme`; el resto de pantallas que aún usan `TOKENS` deberían seguir el mismo camino para que la app tenga una sola paleta.

**Regla para el equipo:** nada de hex sueltos en una pantalla nueva. Si falta un color, se añade al tema; si hace falta que cambie en oscuro, se envuelve con `theme.color(...)`.

## 📋 Características principales

1. **Autenticación**: registro e inicio de sesión con correo y contraseña (Supabase Auth). Los errores se traducen al español (`describeAuthError`) y se muestran dentro del formulario, sin recargar la pantalla ni borrar lo escrito. El registro valida que el usuario esté libre y pide la contraseña dos veces.
2. **Preferencias**: gustos, objetivos y recursos con buscador contra Postgres, más la fecha de nacimiento. Una cuenta nueva pasa por el asistente **antes** de entrar a la app.
3. **Recomendaciones**: "Sorpréndeme" resuelve en el servidor (ver más abajo), con sistema de puntos por actividad (`points_awarded`).
4. **Actividades y evidencias**: aceptar un reto, completarlo con una foto y acumular puntos. Se puede repetir una actividad: el historial guarda cada vuelta.
5. **Feed y comunidad**: publicaciones con reacciones, amistades con solicitudes, perfiles visibles solo entre amigos y mensajes directos con respuesta a un mensaje concreto.
6. **Salas grupales**: retos compartidos con invitaciones, chat propio, evidencias y ranking. Las invitaciones a salas ya terminadas se muestran como aviso, no como solicitud.
7. **Anuncios patrocinados**: tarjetas en el feed segmentadas por gustos y ciudad, con solicitudes de anuncio gestionadas desde el panel.
8. **Panel de administración**: barra inferior propia con seis secciones — Resumen, Soporte, Usuarios, Posts, Catálogo y Anuncios — paginación en todas las listas y salida a la app en cada pantalla.
9. **Moderación**: reportes de publicaciones y de perfiles, sanciones con motivo obligatorio y chat de apelación.
10. **Interfaz**: tema claro y oscuro, español e inglés (`src/i18n/locales/`), y tope de escalado de texto para accesibilidad.

## 🎯 Cómo se eligen las recomendaciones

Cuando el usuario pulsa **"Sorpréndeme"**, la app **no filtra nada**: llama a la Edge Function `recommend-activity`, que resuelve en tres pasos y en este orden:

1. **Elegir** — SQL filtra y puntúa los candidatos; Groq escoge entre ellos.
2. **Crear** — si no queda ninguno, Groq inventa una actividad a partir de las preferencias del usuario y se guarda en el catálogo.
3. **Repetir** — si tampoco se pudo crear, se vuelve a consultar permitiendo actividades ya hechas.

El filtrado del paso 1 es la función `get_recommended_activity` de `supabase/schema.sql`, y todo el criterio vive ahí, en un solo sitio. Se queda con las actividades que cumplen **todo** esto:

1. Están activas (`is_active`).
2. Son del catálogo (`created_by IS NULL`) o las creó el propio usuario.
3. La edad del usuario entra en el rango `min_age` / `max_age`.
4. El usuario tiene **todos** los recursos que la actividad exige. Si pide uno que no marcó en sus preferencias, la actividad no aparece.
5. No la tiene **en curso** (`user_activities.status = 'PENDING'`).

Y encaja con el usuario por **alguna** de estas vías:

- está etiquetada con uno de sus gustos, o
- está etiquetada con uno de sus objetivos, o
- su categoría empieza con el nombre de un gusto suyo (`Lectura` → `Lectura y Aprendizaje`), o
- no tiene categoría (se muestra como **"Libre"**), o
- no tiene ninguna etiqueta, en cuyo caso vale como comodín.

### Lo ya hecho va al final, no se descarta

De las que sobreviven se elige una sola, con este orden:

1. Las que el usuario **nunca hizo** (al azar entre ellas).
2. Si no queda ninguna nueva, las ya completadas, empezando por la que **hace más tiempo que no hace**.

Las completadas no se excluyen del todo **a propósito**: repetir una actividad es una función del producto —`log_activity_progress` guarda el historial de fotos de cada repetición— y excluirlas dejaría "Sorpréndeme" sin nada que ofrecer en cuanto se acabara el catálogo.

> Una actividad del catálogo **sin ningún gusto asociado** solo sale como comodín: no le llega a nadie por sus preferencias. El panel avisa de cuántas hay así y permite etiquetarlas.

## 🤖 Qué hace la IA (Groq)

Tres Edge Functions en `supabase/functions/`, todas contra la API de Groq con tiempo límite de 8 segundos:

| Función | Para qué |
| --- | --- |
| `recommend-activity` | La cascada de recomendación de arriba: elegir entre candidatos o inventar una actividad nueva. |
| `moderate-activity` | Revisa el texto de las actividades que crea un usuario antes de guardarlas. |
| `moderate-message` | Revisa los mensajes directos y los de las salas antes de enviarlos. |

La clave vive en `GROQ_API_KEY`, como secreto de la función; nunca en el cliente.

## 🛡️ Moderación, sanciones y soporte

- Cualquiera puede **reportar** una publicación o un perfil. Un reporte de perfil sanciona la cuenta automáticamente.
- **Sancionar exige un motivo** (mínimo 10 caracteres). Lo exige la propia base en `admin_suspend_account`, no solo la pantalla: una comprobación que vive solo en el cliente se salta con una llamada directa a la API.
- La sanción es **permanente** hasta que un administrador reactive la cuenta.
- La persona sancionada ve el motivo en su pantalla y lo recibe escrito en su **chat de apelación**, donde puede responder. El administrador lo atiende desde la sección Soporte del panel.
- La cuenta sancionada **conserva la sesión** a propósito: sin ella no podría apelar. La app la bloquea mostrando solo la pantalla de sanción.

## 🔔 Notificaciones push

Todo lo que la app avisa dentro también llega al teléfono. La app **no redacta
el texto ni decide quién lo recibe**: manda un `tipo` y un poco de contexto a la
Edge Function `send-push`, y allí se resuelven destinatarios y redacción. Si el
texto viniera del cliente, cualquiera con una sesión podría mandarle a otro un
"tu cuenta ha sido sancionada"; los tipos que solo puede disparar un
administrador se comprueban además contra su perfil.

| Qué pasa | A quién le llega |
| --- | --- |
| Te mandan una solicitud de amistad | A quien la recibe |
| Te aceptan la solicitud | A quien la mandó |
| Mensaje directo | Al otro lado de la conversación |
| Mensaje en una sala | A los demás miembros |
| Te invitan a una sala | A quien invitan |
| Soporte responde tu apelación | A la cuenta sancionada |
| Te sancionan o te reactivan la cuenta | A esa cuenta |
| Tu anuncio se aprueba o se rechaza | A quien lo pidió |
| Mensaje sobre una solicitud de anuncio | Al otro lado (anunciante o panel) |
| **Alguien escribe a soporte** | **A todos los administradores** |
| **Reportan una publicación o un perfil** | **A todos los administradores** |
| **Llega una solicitud de anuncio** | **A todos los administradores** |

Las tres últimas son las que necesita el panel: coinciden con lo que el Resumen
marca como "Requiere atención".

Cada aparato guarda su token de Expo en `user_push_tokens` al iniciar sesión
(`pushService.registrarDispositivo`). Los tokens que Expo devuelve como
`DeviceNotRegistered` —apps desinstaladas— se borran solos.

> **Para probarlo hace falta una build de desarrollo.** Desde el SDK 53 las push
> remotas no funcionan en Expo Go en Android: `npx expo run:android` o una build
> de EAS. En web no existen y el servicio se queda callado, sin romper nada.
>
> La función hay que desplegarla como las otras (`supabase/functions/send-push`).

## 🗄️ Base de datos y despliegues

Los despliegues de Supabase de este proyecto son **manuales**: no hay CLI enlazada. Para aplicar un cambio hay que pegar el archivo correspondiente en el **SQL Editor** de Supabase y ejecutarlo.

- **Esquema base:** `supabase/schema.sql`.
- **Migraciones:** `supabase/migrations/`, por fecha. La más reciente es `20261028e_ad_request_messages.sql`.
- **Scripts sueltos** (se pegan igual, y son idempotentes):

| Archivo | Para qué |
| --- | --- |
| `suspension_cuentas.sql` | Columnas y funciones de la suspensión de cuentas |
| `sancion_con_motivo.sql` | Motivo obligatorio al sancionar y su entrega en el chat de apelación |
| `invitaciones_salas_estado.sql` | Que la RPC de invitaciones diga el estado de la sala (opcional) |
| `rpc_preferencias.sql` | Guardado transaccional de gustos, objetivos y recursos |
| `unificar_regla_gusto_categoria.sql` | Normaliza nombres para casar gusto y categoría |
| `import_gustos_wikidata.sql`, `import_categorias_wikidata.sql`, `import_metas.sql` | Catálogos |

> Si una pantalla falla con *"Could not find the function/column … in the schema cache"*, casi siempre es que falta correr uno de estos archivos. Acuérdate de que todos terminan con `NOTIFY pgrst, 'reload schema';` para que la API vea el cambio sin esperar.

El catálogo de metas se genera aparte con `python supabase/generate_import.py`, que reescribe `supabase/import_metas.sql` desde mockapi.io. Es seguro ejecutarlo más de una vez: la identidad de cada actividad es su `external_id`, no su título.

## 🧭 Pantalla de preferencias

Es el mismo componente (`OnboardingScreen`) con dos modos:

- **Primera vez**: asistente paso a paso con barra de progreso — gustos, objetivos y recursos. Es obligatorio al crear la cuenta: sin preferencias, el motor de recomendación no tiene con qué trabajar.
- **Editar preferencias**: todo en una sola pantalla, con un único botón "Guardar cambios".

Gustos y objetivos **no se descargan enteros al dispositivo**: `CatalogPicker` pide unas pocas opciones al abrir y busca en Postgres al escribir (sin distinguir mayúsculas ni acentos), así que la pantalla aguanta un catálogo de cientos de entradas. Lo ya elegido se queda fijo arriba, aunque no coincida con la búsqueda.

Las opciones se muestran como **pastillas alargadas de una fila cada una** (`SelectableCard`): icono a la izquierda, nombre al lado y tilde a la derecha cuando está elegida. La selección se marca con borde de acento, fondo claro y el tilde — nunca solo con color, y el texto no cambia de peso entre estados.

El botón principal queda fijo en el pie, fuera del `ScrollView`: se ve siempre, en cualquier paso y con el teclado abierto.

## 🔄 Tirar para recargar

Las pantallas con lista (feed, comunidad, perfil, inicio, misiones, mensajes y el panel) se recargan arrastrando hacia abajo. Dos detalles que hubo que resolver:

- El `contentContainerStyle` de cada una lleva `flexGrow: 1`. En Android, un `ScrollView` cuyo contenido no llega a desbordar no se deja arrastrar, y el gesto no se dispara nunca.
- En web el `RefreshControl` de `react-native-web` descarta `onRefresh` y no hace nada, así que esas pantallas importan el de `src/components/refrescoArrastrando.js`, que implementa el gesto con dedo y con ratón. En iOS y Android reexporta el de React Native sin tocar nada.

## ♿ Accesibilidad: tamaño de letra del sistema

Android e iOS dejan al usuario agrandar el texto del sistema hasta el 200%, y con los ajustes de accesibilidad todavía más. React Native aplica ese factor a **todo** `<Text>` por defecto, así que sin control la interfaz se rompe: los botones se salen de la pantalla, los títulos desbordan las tarjetas y las filas se desarman.

### Cómo está resuelto

Toda la app escribe texto a través de `src/components/scaledText.tsx`, que envuelve `Text` y `TextInput` de React Native aplicando un tope de escalado:

```js
export const MAX_FONT_SCALE = 1.3;
```

Es un **tope, no un tamaño fijo**. Si el usuario tiene el sistema al 110%, ve el 110%; solo se recorta a partir del 130%. Quien necesita letra grande la obtiene, y ninguna pantalla se rompe.

**Regla para el equipo:** nunca importes `Text` ni `TextInput` desde `react-native`. Impórtalos siempre desde el envoltorio:

```js
// ❌ el texto crecerá sin límite y romperá el diseño
import { Text, TextInput } from 'react-native';

// ✅
import { Text, TextInput } from '../../components/scaledText';
```

El JSX no cambia: los componentes se llaman igual.

### Dos decisiones y por qué

**No se usa `allowFontScaling={false}`.** Desactivar el escalado dejaría el diseño intacto, pero haría la app inutilizable para quien no ve bien: su preferencia se ignoraría por completo. El tope respeta la preferencia dentro de un margen seguro.

**No se usa `Text.defaultProps`.** Es el patrón que aparece en la mayoría de tutoriales, pero **React 19 eliminó `defaultProps` en componentes de función**. Asignarlo no da error: simplemente no hace nada, y el problema seguiría ahí sin que nadie lo note. Por eso son componentes envoltorio.

### Al escribir pantallas nuevas

El tope evita lo peor, pero el diseño también tiene que ceder:

- **Sin alturas fijas** en contenedores con texto. Usa `paddingVertical` y deja que la altura la marque el contenido.
- **Filas de botones o etiquetas con `flexWrap: 'wrap'`**, para que bajen de línea en vez de salirse.
- **`flex: 1` o `flexShrink: 1`** en el texto que convive con un icono, para que pueda partirse en dos líneas en lugar de empujar al icono fuera.
- **`numberOfLines` solo donde recortar es aceptable** (títulos de tarjeta), nunca en mensajes de error o instrucciones.

### Cómo probarlo

Sin necesidad de un dispositivo real:

- **Android:** Ajustes → Pantalla → Tamaño de fuente, al máximo.
- **iOS:** Ajustes → Accesibilidad → Pantalla y tamaño del texto → Texto más grande, al máximo.
- **Web:** las herramientas de desarrollo del navegador, aumentando el zoom.

Recorre login, registro, preferencias, el panel de administración y el modal de recomendación: son las pantallas con más texto por fila.

## 🗂️ Estructura del proyecto

```
App.js                  Navegación: pestañas de usuario y, en modo admin, las del panel
src/
  components/           Piezas compartidas (scaledText, modales, refrescoArrastrando)
  context/              Auth, idioma, tema, notificaciones y presencia
  features/
    admin/              Panel: secciones, modales y estilos propios
    auth/               Entrada, registro, recuperación y pantalla de sanción
    feed/ friends/      Publicaciones, amistades y comunidad
    messages/ rooms/    Mensajes directos y salas grupales
    onboarding/         Asistente y edición de preferencias
    profile/            Perfil, ajustes y tema
    recommendations/    "Sorpréndeme" y pantalla de inicio
    user_activities/    Retos aceptados y evidencias
  i18n/locales/         es.json y en.json
  services/             Todo lo que habla con Supabase
  theme/                Paleta, tokens y runtime del tema oscuro
supabase/
  schema.sql            Esquema base, políticas RLS y funciones
  migrations/           Cambios posteriores, por fecha
  functions/            Edge Functions (Groq)
```

## ▶️ Cómo ejecutarlo

```bash
npm install
npx expo start
```

Hace falta un `.env` en la raíz con:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_APP_URL=...
```

`GROQ_API_KEY` no va aquí: es un secreto de las Edge Functions, en Supabase.

> Si al arrancar aparece `PluginError: Failed to resolve plugin for module "expo-location"`, es que falta `npm install` después de traer cambios del repositorio.
