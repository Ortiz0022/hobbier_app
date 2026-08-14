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
| **4** | **Integración con IA (Groq)**             | Integración de la API **Groq** (`generateGoalNow`, `getAiRecommendation`) para generar metas diarias personalizadas y obtener recomendaciones más dinámicas basadas en intereses y contexto. AUN NO ESTA FUNCIONADO, SE BLOQUEO PARA APLICAR A FUTURO.                |

## 🎨 Paleta de Colores

Por definir

## 📋 Características Principales

1.  **Autenticación Segura**: Registro e inicio de sesión con correo electrónico/contraseña o mediante cuenta de Google (`Google OAuth`).
2.  **Perfil Personalizado**:
    - Ingreso de datos básicos (nombre, edad, género).
    - Selección de intereses mediante un sistema de tags intuitivo.
    - Configuración de nivel de condición física.
3.  **Motor de Recomendación Inteligente**:
    - Generación de metas diarias personalizadas mediante IA.
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
