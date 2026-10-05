// ==================================================
// HOBBIER - Textos legales (Política de Privacidad y Términos de Uso)
//
// Viven aquí y no en es.json / en.json porque son documentos largos con
// secciones: en el JSON de la interfaz serían decenas de claves sueltas. Igual
// que el resto de la app, NO están fijos en la pantalla: LegalDocumentModal elige
// la versión según el idioma activo.
//
// Están redactados a partir de lo que la app hace DE VERDAD (qué datos guarda,
// a qué servicios los envía). Si se añade una función que recoja datos nuevos
// (ubicación, pagos, analítica...), hay que actualizar estos textos y subir
// LEGAL_VERSION para que quede constancia de qué versión aceptó cada persona.
// ==================================================

import { MIN_AGE } from '../features/auth/validation';

// Versión de los documentos. Se guarda junto con la aceptación en el registro.
export const LEGAL_VERSION = '2026-10-05';

// TODO: sustituir por el correo real de contacto del proyecto antes de publicar.
export const LEGAL_CONTACT_EMAIL = 'privacidad@hobbier.app';

const es = {
  privacy: {
    title: 'Política de Privacidad',
    updated: `Última actualización: 5 de octubre de 2026 · Versión ${LEGAL_VERSION}`,
    sections: [
      {
        heading: '1. Quiénes somos',
        body:
          'Hobbier es una aplicación para descubrir aficiones, completar retos y compartirlos con tus amigos. ' +
          'Es un proyecto académico desarrollado en Costa Rica. Esta política explica qué datos recogemos, ' +
          'para qué los usamos y qué derechos tienes sobre ellos.',
      },
      {
        heading: '2. Qué datos recogemos',
        body:
          '• Datos de cuenta: nombre completo, nombre de usuario, correo electrónico, contraseña (guardada cifrada; nunca la vemos) y fecha de nacimiento.\n' +
          '• Perfil y preferencias: foto de perfil, gustos, intereses y los objetos que indicas tener disponibles.\n' +
          '• Contenido que publicas: fotos de tus actividades, reacciones, salas de reto, mensajes de sala y mensajes directos.\n' +
          '• Actividad social: tus amistades, solicitudes e invitaciones.\n' +
          '• Reportes: si reportas una publicación, el motivo y el texto que escribas.\n' +
          '• Estado de conexión: mientras usas la app, otros usuarios con sesión iniciada pueden saber que estás en línea.\n\n' +
          'No recogemos tu ubicación, tus contactos del teléfono ni datos de pago.',
      },
      {
        heading: '3. Para qué los usamos',
        body:
          '• Crear y proteger tu cuenta.\n' +
          '• Recomendarte actividades según tus gustos, intereses y edad.\n' +
          '• Mostrar tus publicaciones a tus amigos y permitir el chat y las salas de reto.\n' +
          '• Moderar el contenido y atender los reportes.\n\n' +
          'No vendemos tus datos ni los usamos para publicidad.',
      },
      {
        heading: '4. Con quién los compartimos',
        body:
          '• Supabase: aloja la base de datos, los archivos y el inicio de sesión de la app.\n' +
          '• Groq (inteligencia artificial): para generar recomendaciones enviamos SOLO los nombres de tus gustos, ' +
          'intereses y objetos disponibles, y para moderar actividades creadas por usuarios, su título y descripción. ' +
          'Nunca enviamos tu nombre, correo, fotos ni mensajes.\n' +
          '• Otros usuarios: tu nombre, usuario, foto de perfil y publicaciones son visibles para tus amigos; ' +
          'tu nombre de usuario puede aparecer en búsquedas.\n\n' +
          'Estos proveedores pueden procesar los datos fuera de Costa Rica.',
      },
      {
        heading: '5. Cuánto tiempo los guardamos',
        body:
          'Mientras tu cuenta exista. Las publicaciones que eliminas dejan de mostrarse de inmediato a todo el mundo, ' +
          'pero se conserva un registro interno marcado como eliminado (por ejemplo, para poder atender reportes). ' +
          'Si eliminamos tu cuenta, se borran tus datos.',
      },
      {
        heading: '6. Tus derechos',
        body:
          'De acuerdo con la Ley 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales ' +
          '(Costa Rica) y, si vives en la Unión Europea, con el Reglamento General de Protección de Datos (GDPR), puedes:\n' +
          '• Acceder a tus datos y pedir una copia.\n' +
          '• Corregirlos (puedes editar tu perfil desde la app).\n' +
          '• Pedir que eliminemos tu cuenta y tus datos.\n' +
          '• Oponerte a un tratamiento o retirar tu consentimiento.\n\n' +
          `Escríbenos a ${LEGAL_CONTACT_EMAIL} y responderemos en un plazo máximo de 30 días.`,
      },
      {
        heading: '7. Menores de edad',
        body:
          `Hobbier no está dirigida a menores de ${MIN_AGE} años y la app no permite registrarse por debajo de esa edad. ` +
          'Si crees que un menor nos ha dado sus datos, escríbenos y los eliminaremos.',
      },
      {
        heading: '8. Almacenamiento local y cookies',
        body:
          'La app guarda en tu dispositivo (o en el navegador, en la versión web) solo lo necesario para funcionar: ' +
          'tu sesión iniciada y el idioma elegido. No usamos cookies de publicidad ni de analítica.',
      },
      {
        heading: '9. Seguridad',
        body:
          'Las contraseñas se guardan cifradas, las conexiones van por HTTPS y las reglas de la base de datos ' +
          'impiden que un usuario lea o modifique los datos privados de otro.',
      },
      {
        heading: '10. Cambios en esta política',
        body:
          'Si cambiamos esta política de forma importante, te lo avisaremos en la app antes de que el cambio aplique.',
      },
    ],
  },
  terms: {
    title: 'Términos de Uso',
    updated: `Última actualización: 5 de octubre de 2026 · Versión ${LEGAL_VERSION}`,
    sections: [
      {
        heading: '1. Aceptación',
        body:
          'Al crear una cuenta en Hobbier aceptas estos Términos de Uso y la Política de Privacidad. ' +
          'Si no estás de acuerdo, no utilices la app.',
      },
      {
        heading: '2. Requisitos',
        body:
          `Debes tener al menos ${MIN_AGE} años. Eres responsable de que los datos de tu cuenta sean reales ` +
          'y de mantener tu contraseña en secreto.',
      },
      {
        heading: '3. Tu contenido',
        body:
          'Las fotos y mensajes que publicas siguen siendo tuyos. Nos das permiso para guardarlos y mostrarlos ' +
          'a las personas con las que eliges compartirlos, solo para que la app funcione. Puedes eliminar tus ' +
          'publicaciones cuando quieras.',
      },
      {
        heading: '4. Normas de convivencia',
        body:
          'No está permitido publicar contenido ofensivo, violento, sexual, de acoso o spam; suplantar a otra ' +
          'persona; ni publicar fotos de terceros sin su permiso. Cualquier usuario puede reportar una publicación ' +
          'y el equipo de moderación puede ocultarla.',
      },
      {
        heading: '5. Retos y actividades',
        body:
          'Las actividades sugeridas son ideas de ocio. Realízalas con sentido común y bajo tu propia ' +
          'responsabilidad, respetando tus límites físicos y las normas del lugar donde estés.',
      },
      {
        heading: '6. Suspensión de cuentas',
        body:
          'Podemos suspender o eliminar cuentas que incumplan estas normas de forma grave o repetida.',
      },
      {
        heading: '7. Disponibilidad',
        body:
          'Hobbier es un proyecto académico y se ofrece "tal cual", sin garantía de que esté siempre disponible ' +
          'o libre de errores.',
      },
      {
        heading: '8. Ley aplicable y contacto',
        body:
          `Estos términos se rigen por las leyes de la República de Costa Rica. Para cualquier consulta: ${LEGAL_CONTACT_EMAIL}.`,
      },
    ],
  },
};

const en = {
  privacy: {
    title: 'Privacy Policy',
    updated: `Last updated: October 5, 2026 · Version ${LEGAL_VERSION}`,
    sections: [
      {
        heading: '1. Who we are',
        body:
          'Hobbier is an app to discover hobbies, complete challenges and share them with your friends. ' +
          'It is an academic project developed in Costa Rica. This policy explains what data we collect, ' +
          'why we use it and what rights you have over it.',
      },
      {
        heading: '2. What data we collect',
        body:
          '• Account data: full name, username, email address, password (stored encrypted; we never see it) and date of birth.\n' +
          '• Profile and preferences: profile photo, likes, interests and the items you say you have available.\n' +
          '• Content you post: activity photos, reactions, challenge rooms, room messages and direct messages.\n' +
          '• Social activity: your friendships, requests and invitations.\n' +
          '• Reports: if you report a post, the reason and any text you write.\n' +
          '• Online status: while you use the app, other signed-in users can tell that you are online.\n\n' +
          'We do not collect your location, your phone contacts or payment data.',
      },
      {
        heading: '3. How we use it',
        body:
          '• To create and protect your account.\n' +
          '• To recommend activities based on your likes, interests and age.\n' +
          '• To show your posts to your friends and enable chat and challenge rooms.\n' +
          '• To moderate content and handle reports.\n\n' +
          'We do not sell your data or use it for advertising.',
      },
      {
        heading: '4. Who we share it with',
        body:
          '• Supabase: hosts the app’s database, files and sign-in.\n' +
          '• Groq (artificial intelligence): to generate recommendations we send ONLY the names of your likes, ' +
          'interests and available items, and to moderate user-created activities, their title and description. ' +
          'We never send your name, email, photos or messages.\n' +
          '• Other users: your name, username, profile photo and posts are visible to your friends; ' +
          'your username may appear in searches.\n\n' +
          'These providers may process data outside Costa Rica.',
      },
      {
        heading: '5. How long we keep it',
        body:
          'For as long as your account exists. Posts you delete stop being shown to everyone immediately, ' +
          'but an internal record marked as deleted is kept (for example, to handle reports). ' +
          'If we delete your account, your data is erased.',
      },
      {
        heading: '6. Your rights',
        body:
          'Under Costa Rica’s Law 8968 on the Protection of Individuals regarding the Processing of their Personal Data ' +
          'and, if you live in the European Union, the General Data Protection Regulation (GDPR), you can:\n' +
          '• Access your data and request a copy.\n' +
          '• Correct it (you can edit your profile in the app).\n' +
          '• Ask us to delete your account and your data.\n' +
          '• Object to processing or withdraw your consent.\n\n' +
          `Write to us at ${LEGAL_CONTACT_EMAIL} and we will reply within 30 days.`,
      },
      {
        heading: '7. Minors',
        body:
          `Hobbier is not intended for children under ${MIN_AGE} and the app does not allow sign-up below that age. ` +
          'If you believe a minor has given us their data, contact us and we will delete it.',
      },
      {
        heading: '8. Local storage and cookies',
        body:
          'The app stores on your device (or in your browser, on the web version) only what it needs to work: ' +
          'your signed-in session and your chosen language. We do not use advertising or analytics cookies.',
      },
      {
        heading: '9. Security',
        body:
          'Passwords are stored encrypted, connections use HTTPS and database rules prevent one user from ' +
          'reading or changing another user’s private data.',
      },
      {
        heading: '10. Changes to this policy',
        body:
          'If we change this policy in a significant way, we will let you know in the app before the change applies.',
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    updated: `Last updated: October 5, 2026 · Version ${LEGAL_VERSION}`,
    sections: [
      {
        heading: '1. Acceptance',
        body:
          'By creating a Hobbier account you accept these Terms of Use and the Privacy Policy. ' +
          'If you do not agree, do not use the app.',
      },
      {
        heading: '2. Requirements',
        body:
          `You must be at least ${MIN_AGE} years old. You are responsible for keeping your account details ` +
          'truthful and your password secret.',
      },
      {
        heading: '3. Your content',
        body:
          'The photos and messages you post remain yours. You give us permission to store them and show them ' +
          'to the people you choose to share them with, only so the app can work. You can delete your posts ' +
          'at any time.',
      },
      {
        heading: '4. Community rules',
        body:
          'You may not post offensive, violent, sexual, harassing or spam content; impersonate someone else; ' +
          'or post photos of other people without their permission. Any user can report a post and the ' +
          'moderation team may hide it.',
      },
      {
        heading: '5. Challenges and activities',
        body:
          'Suggested activities are leisure ideas. Do them with common sense and at your own risk, respecting ' +
          'your physical limits and the rules of wherever you are.',
      },
      {
        heading: '6. Account suspension',
        body:
          'We may suspend or delete accounts that seriously or repeatedly break these rules.',
      },
      {
        heading: '7. Availability',
        body:
          'Hobbier is an academic project and is provided "as is", with no guarantee that it will always be ' +
          'available or error-free.',
      },
      {
        heading: '8. Governing law and contact',
        body:
          `These terms are governed by the laws of the Republic of Costa Rica. For any questions: ${LEGAL_CONTACT_EMAIL}.`,
      },
    ],
  },
};

const LEGAL_CONTENT = { es, en };

/** Devuelve el documento ('privacy' | 'terms') en el idioma pedido, con español de respaldo. */
export const getLegalDocument = (doc, language) =>
  (LEGAL_CONTENT[language] || LEGAL_CONTENT.es)[doc] || LEGAL_CONTENT.es[doc];
