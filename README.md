# Hobbier App

**Nombre del proyecto:** Hobbier
**Semestre:** IIC 2026
**Curso:** Aplicaciones Informáticas Globales

Hobbier es una aplicación móvil diseñada para combatir el sedentarismo y el aburrimiento, especialmente entre jóvenes y adultos con limitaciones de movilidad. Su objetivo principal es recomendar actividades personalizadas basadas en las capacidades físicas del usuario, sus intereses y el contexto circundante (clima, ubicación, objetos disponibles), facilitando un estilo de vida más activo y conectado.

## 🔄 Evolución del Projeto (Hitos)

El desarrollo del proyecto siguió una metodología iterativa, priorizando la experiencia del usuario (UX) y la escalabilidad técnica.

| Fase  | Hito                                      | Descripción                                                                                                                                                                                                                                                           |
| ----- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Planteamiento y Diseño UX**             | Definición de usuarios (`adolescentes`, `adultos`, `adultos mayores`) y criterios de validación. Creación de mockups con **Figma** (pantallas iniciales y de perfil) y diseño del modelo de datos relacional (`users`, `interests`, `activities`, `user_activities`). |
| **2** | **Inicio del Desarrollo y Autenticación** | Configuración del proyecto con **Expo** y **TypeScript**. Implementación del sistema de autenticación (`signUp`, `signIn`) con **Supabase Auth** y gestión de perfiles usando **React Context** y componentes React Native.                                           |
| **3** | **Motor de Recomendaciones**              | Desarrollo de la lógica central (`RecommendationEngine`) para sugerir actividades. Implementación inicial de un sistema de puntos (`ActivityPoints`), validación de intereses y filtrado de actividades (edad, capacidad física).                                     |
| **4** | **Integración con IA**                    | Posible implementación a futuro. Todavía no se sabe qué papel tendría.                                                                                                                                                                                               |

## 🎨 Paleta de Colores

Por definir

## 📋 Características Principales

1.  **Autenticación Segura**: Registro e inicio de sesión con correo electrónico/contraseña o mediante cuenta de Google (`Google OAuth`).
2.  **Perfil Personalizado**:
    - Ingreso de datos básicos (nombre, edad, género).
    - Selección de intereses mediante un sistema de tags intuitivo.
    - Configuración de nivel de condición física.
3.  **Motor de Recomendación Inteligente**:
    - Recomendaciones basadas en intereses, edad y nivel de actividad.
    - Sistema de puntos (`150, 100, 50`) para motivar la actividad física.
    - Manejo de rechazos: si el usuario rechaza una actividad, se le muestra una nueva opción.
4.  **Registro de Actividades**:
    - Registro manual con fotografía y descripción.
    - Registro automático de actividades aceptadas (pendientes).
5.  **Interfaz de Usuario (UI)**:
    - Diseño moderno con tarjetas, iconos vibrantes y animaciones sutiles.
    - Navegación fluida entre pantallas (Home, Perfil, Recomendaciones, Actividades Pendientes).
    - Modo oscuro automático (según configuración del sistema).

## 🎯 Cómo se eligen las recomendaciones

Cuando el usuario pulsa **"Sorpréndeme"**, la app **no filtra nada**: llama a la
función `get_recommended_activity` en Postgres y muestra la actividad que le
devuelve. Todo el criterio vive en `supabase/schema.sql`, en un solo sitio.

La función se queda con las actividades que cumplen **todo** esto:

1. Están activas (`is_active`).
2. Son del catálogo (`created_by IS NULL`) o las creó el propio usuario.
3. La edad del usuario entra en el rango `min_age` / `max_age`.
4. El usuario tiene **todos** los recursos que la actividad exige. Si pide uno
   que no marcó en sus preferencias, la actividad no aparece.
5. No la tiene **en curso** (`user_activities.status = 'PENDING'`).

Y encaja con el usuario por **alguna** de estas vías:

- está etiquetada con uno de sus gustos, o
- está etiquetada con uno de sus objetivos, o
- su categoría empieza con el nombre de un gusto suyo (`Lectura` →
  `Lectura y Aprendizaje`), o
- no tiene categoría (se muestra como **"Libre"**), o
- no tiene ninguna etiqueta, en cuyo caso vale como comodín.

### Lo ya hecho va al final, no se descarta

De las que sobreviven se elige una sola, con este orden:

1. Las que el usuario **nunca hizo** (al azar entre ellas).
2. Si no queda ninguna nueva, las ya completadas, empezando por la que **hace
   más tiempo que no hace**.

Las completadas no se excluyen del todo **a propósito**: repetir una actividad
es una función del producto —`log_activity_progress` guarda el historial de
fotos de cada repetición— y excluirlas dejaría "Sorpréndeme" sin nada que
ofrecer en cuanto se acabara el catálogo.

> **Antes de este cambio** la función no miraba `user_activities`, así que
> sorteaba entre todo el catálogo apto, incluida la actividad que el usuario ya
> tenía pendiente en la pantalla de inicio. De ahí venía la sensación de que
> "Sorpréndeme" devolvía siempre lo mismo.

### Cómo aplicar cambios en la base

Los despliegues de Supabase de este proyecto son **manuales**: no hay CLI
enlazada. Para aplicar un cambio hay que pegar el archivo correspondiente de
`supabase/migrations/` en el **SQL Editor** de Supabase y ejecutarlo. El último
es `20260820_recomendacion_sin_repetir.sql`.

El catálogo de metas se genera aparte, con `python supabase/generate_import.py`,
que reescribe `supabase/import_metas.sql` desde mockapi.io. También se pega a
mano y es seguro ejecutarlo más de una vez: la identidad de cada actividad es su
`external_id`, no su título.

## ♿ Accesibilidad: tamaño de letra del sistema

Android e iOS dejan al usuario agrandar el texto del sistema hasta el 200%, y con
los ajustes de accesibilidad todavía más. React Native aplica ese factor a **todo**
`<Text>` por defecto, así que sin control la interfaz se rompe: los botones se
salen de la pantalla, los títulos desbordan las tarjetas y las filas se desarman.

### Cómo está resuelto

Toda la app escribe texto a través de `src/components/scaledText.js`, que envuelve
`Text` y `TextInput` de React Native aplicando un tope de escalado:

```js
export const MAX_FONT_SCALE = 1.3;
```

Es un **tope, no un tamaño fijo**. Si el usuario tiene el sistema al 110%, ve el
110%; solo se recorta a partir del 130%. Quien necesita letra grande la obtiene, y
ninguna pantalla se rompe.

**Regla para el equipo:** nunca importes `Text` ni `TextInput` desde
`react-native`. Impórtalos siempre desde el envoltorio:

```js
// ❌ el texto crecerá sin límite y romperá el diseño
import { Text, TextInput } from 'react-native';

// ✅
import { Text, TextInput } from '../../components/scaledText';
```

El JSX no cambia: los componentes se llaman igual.

### Dos decisiones y por qué

**No se usa `allowFontScaling={false}`.** Desactivar el escalado dejaría el diseño
intacto, pero haría la app inutilizable para quien no ve bien: su preferencia se
ignoraría por completo. El tope respeta la preferencia dentro de un margen seguro.

**No se usa `Text.defaultProps`.** Es el patrón que aparece en la mayoría de
tutoriales, pero **React 19 eliminó `defaultProps` en componentes de función**.
Asignarlo no da error: simplemente no hace nada, y el problema seguiría ahí sin que
nadie lo note. Por eso son componentes envoltorio.

### Al escribir pantallas nuevas

El tope evita lo peor, pero el diseño también tiene que ceder:

- **Sin alturas fijas** en contenedores con texto. Usa `paddingVertical` y deja
  que la altura la marque el contenido.
- **Filas de botones o etiquetas con `flexWrap: 'wrap'`**, para que bajen de línea
  en vez de salirse.
- **`flex: 1` o `flexShrink: 1`** en el texto que convive con un icono, para que
  pueda partirse en dos líneas en lugar de empujar al icono fuera.
- **`numberOfLines` solo donde recortar es aceptable** (títulos de tarjeta), nunca
  en mensajes de error o instrucciones.

### Cómo probarlo

Sin necesidad de un dispositivo real:

- **Android:** Ajustes → Pantalla → Tamaño de fuente, al máximo.
- **iOS:** Ajustes → Accesibilidad → Pantalla y tamaño del texto → Texto más
  grande, al máximo.
- **Web:** las herramientas de desarrollo del navegador, aumentando el zoom.

Recorre login, registro, preferencias, el panel de administración y el modal de
recomendación: son las pantallas con más texto por fila.
