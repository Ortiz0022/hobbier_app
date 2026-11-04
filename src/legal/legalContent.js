// ==================================================
// HOBBIER - Textos legales (Política de Privacidad, Términos de Uso y
// Condiciones de Publicidad)
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
export const LEGAL_VERSION = '2026-11-04';

// TODO: sustituir por el correo real de contacto del proyecto antes de publicar.
export const LEGAL_CONTACT_EMAIL = 'privacidad@hobbier.app';

const es = {
  privacy: {
    title: 'Política de Privacidad',
    updated: `Última actualización: 4 de noviembre de 2026 · Versión ${LEGAL_VERSION}`,
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
          '• Reportes: si reportas una publicación o un perfil, el motivo y el texto que escribas.\n' +
          '• Estado de conexión: mientras usas la app, otros usuarios con sesión iniciada pueden saber que estás en línea.\n' +
          '• Anuncios: tu cantón o ciudad, solo si das permiso de ubicación en el teléfono, y qué anuncios ves o tocas.\n' +
          '• Solicitudes de anuncio: si pides anunciarte desde Descubre, guardamos en la solicitud el nombre del negocio o persona, ' +
          'el tipo de anuncio, el título, la descripción, la foto que adjuntes, el enlace de destino, las fechas que pides, ' +
          'los datos del evento (fecha y lugar), qué cuenta envió la solicitud, el modelo de cobro elegido (CPM o CPC), ' +
          'la meta de visualizaciones o clics (`target_quota`), el estado del pago simulado (`PENDIENTE` o `PAGADO`), ' +
          'el código de referencia de la transacción simulada (`transaction_id`) y los mensajes que intercambies con el equipo. ' +
          'Si el anuncio se aprueba, en la tabla de anuncios se guarda además el monto calculado (`price_paid`).\n\n' +
          'De la ubicación solo guardamos el nombre de tu cantón o ciudad: nunca tus coordenadas ni tu recorrido. ' +
          'Si usas Hobbier desde el navegador, para saber el nombre del lugar enviamos tus coordenadas aproximadas ' +
          '(redondeadas a cerca de 1 km) a OpenStreetMap (Nominatim), que no las asocia a tu cuenta. ' +
          'El pago dentro de la app es simulado con fines académicos: no realizamos cobros reales ni enviamos o guardamos ' +
          'los datos de tarjeta que escribas en el formulario de prueba.',
      },
      {
        heading: '3. Para qué los usamos',
        body:
          '• Crear y proteger tu cuenta.\n' +
          '• Recomendarte actividades según tus gustos, intereses y edad.\n' +
          '• Mostrar tus publicaciones a tus amigos y permitir el chat y las salas de reto.\n' +
          '• Moderar el contenido (incluyendo moderación automática con IA) y atender los reportes.\n' +
          '• Mostrarte anuncios discretos de negocios y actividades relacionados con tus gustos y tu ciudad. ' +
          'El cruce se hace en nuestros servidores: el anunciante nunca recibe tus datos, solo cifras totales ' +
          '(cuántas personas vieron o tocaron su anuncio). Los anuncios para todo el país se muestran siempre; ' +
          'si das permiso de ubicación, además verás primero los de tu zona. Puedes quitar ese permiso cuando ' +
          'quieras en los ajustes del teléfono o del navegador y borraremos tu ciudad guardada.\n' +
          '• Si pides un anuncio: registrar tu solicitud y su pago simulado, enviarte un comprobante simulado por correo ' +
          'cuando el servicio de correo está disponible en el servidor, revisar la solicitud, comunicarnos contigo por ' +
          'los mensajes de la app y, si se aprueba, publicar el anuncio. Esos mensajes solo los ven tú y el equipo de ' +
          'administración; en el anuncio publicado solo aparecen el nombre del negocio, el texto, la foto y el enlace.\n\n' +
          'No vendemos tus datos.',
      },
      {
        heading: '4. Con quién los compartimos',
        body:
          '• Supabase: aloja la base de datos, los archivos, las funciones de servidor (incluyendo el envío del comprobante simulado cuando el servicio de correo está configurado) y el inicio de sesión de la app.\n' +
          '• Groq (inteligencia artificial): para generar recomendaciones enviamos SOLO los nombres de tus gustos, ' +
          'intereses y objetos disponibles; y para moderar actividades y mensajes de chat o salas, únicamente el texto necesario para verificar que no sea dañino. ' +
          'Nunca enviamos tu nombre, correo ni fotos a Groq.\n' +
          '• Otros usuarios: tu nombre, usuario, foto de perfil y publicaciones son visibles para tus amigos; ' +
          'tu nombre de usuario puede aparecer en búsquedas.\n\n' +
          'Estos proveedores pueden procesar los datos fuera de Costa Rica.',
      },
      {
        heading: '5. Cuánto tiempo los guardamos',
        body:
          'Mientras tu cuenta exista. Las publicaciones que eliminas dejan de mostrarse de inmediato a todo el mundo, ' +
          'pero se conserva un registro interno marcado como eliminado (por ejemplo, para poder atender reportes). ' +
          'Si eliminamos tu cuenta, se borran tus datos.\n\n' +
          'Las solicitudes de anuncio, su código de transacción simulada y sus mensajes se guardan mientras exista tu cuenta, como registro ' +
          'de lo solicitado. Si una solicitud se rechaza, borramos la foto que adjuntaste en ese momento. Puedes pedirnos ' +
          'que borremos tus solicitudes escribiéndonos.',
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
          'tu sesión iniciada, el tema visual y el idioma elegido. No usamos cookies de publicidad ni de analítica.',
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
    updated: `Última actualización: 4 de noviembre de 2026 · Versión ${LEGAL_VERSION}`,
    sections: [
      {
        heading: '1. Aceptación',
        body:
          'Al crear una cuenta en Hobbier aceptas estos Términos de Uso, la Política de Privacidad y, si solicitas un anuncio, ' +
          'las Condiciones de Publicidad. Si no estás de acuerdo, no utilices la app.',
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
        heading: '4. Normas de convivencia y moderación',
        body:
          'No está permitido publicar contenido ofensivo, violento, sexual, de acoso o spam; suplantar a otra ' +
          'persona; ni publicar fotos de terceros sin su permiso. Las actividades personalizadas y los mensajes ' +
          'pasan por un filtro automático de moderación y cualquier usuario puede reportar una publicación o un perfil.',
      },
      {
        heading: '5. Retos y actividades',
        body:
          'Las actividades sugeridas o creadas en salas grupales son ideas de ocio. Realízalas con sentido común y bajo tu propia ' +
          'responsabilidad, respetando tus límites físicos y las normas del lugar donde estés.',
      },
      {
        heading: '6. Publicidad patrocinada y pago simulado',
        body:
          'Los usuarios pueden solicitar espacios de publicidad patrocinada desde la sección Descubre eligiendo un modelo ' +
          'de cobro por visualizaciones (CPM: ₡2 por impresión) o por clics (CPC: ₡50 por clic) y completando un pago simulado ' +
          'con fines académicos antes de enviar la solicitud:\n' +
          '• No se realiza ningún cobro bancario real ni se guardan datos de tarjeta; solo se genera un código de referencia (`transaction_id`) ' +
          'y, cuando el servicio de correo está disponible en el servidor, se envía un comprobante simulado al correo del usuario.\n' +
          '• En la pantalla de aprobación del panel de administración, los datos enviados en la solicitud se muestran en modo de solo lectura ' +
          'para que el administrador solo asigne los gustos afines y notas internas.\n' +
          '• El anuncio pasa por revisión de contenido antes de publicarse y se rige por las Condiciones de Publicidad.',
      },
      {
        heading: '7. Suspensión de cuentas',
        body:
          'Podemos suspender cuentas que incumplan estas normas indicando siempre el motivo de la sanción. ' +
          'La persona sancionada dispone de un chat de soporte dentro de la app para presentar su apelación.',
      },
      {
        heading: '8. Disponibilidad',
        body:
          'Hobbier es un proyecto académico y se ofrece "tal cual", sin garantía de que esté siempre disponible ' +
          'o libre de errores.',
      },
      {
        heading: '9. Ley aplicable y contacto',
        body:
          `Estos términos se rigen por las leyes de la República de Costa Rica. Para cualquier consulta: ${LEGAL_CONTACT_EMAIL}.`,
      },
    ],
  },
  ads: {
    title: 'Condiciones de Publicidad',
    updated: `Última actualización: 4 de noviembre de 2026 · Versión ${LEGAL_VERSION}`,
    sections: [
      {
        heading: '1. Cómo funciona',
        body:
          'Cualquier persona con cuenta puede solicitar un anuncio patrocinado desde Descubre completando los datos ' +
          'del anuncio (negocio o evento, título, descripción, imagen, enlace de destino, ubicación y fechas de vigencia), ' +
          'eligiendo su modelo de cobro (CPM o CPC) y completando el paso de pago simulado. ' +
          'Cuando el servicio de correo está disponible en el servidor, se envía un comprobante simulado al correo registrado y la solicitud ' +
          'queda pendiente de revisión por el equipo de Hobbier. Toda la comunicación sobre la solicitud se hace en Perfil → Mis solicitudes de anuncio. ' +
          'Los anuncios aprobados aparecen en el feed marcados como "Patrocinado" con el botón "Más información".',
      },
      {
        heading: '2. Modelos de cobro, tarifas y pago simulado',
        body:
          'El formulario calcula el presupuesto estimado según el modelo y la meta que elija el anunciante:\n' +
          '• Modelo CPM (Costo por Visualización): tarifa de ₡2 por cada visualización en el feed (con paquetes predefinidos de 500 vistas por ₡1.000, 1.000 vistas por ₡2.000, 2.500 vistas por ₡5.000, o una meta personalizada).\n' +
          '• Modelo CPC (Costo por Clic): tarifa de ₡50 por cada clic en el botón "Más información" (con paquetes predefinidos de 20 clics por ₡1.000, 50 clics por ₡2.500, 100 clics por ₡5.000, o una meta personalizada).\n\n' +
          'Al tratarse de un proyecto académico, el pago con tarjeta es completamente simulado: no se efectúa ningún cargo real, ' +
          'no se almacenan datos de tarjeta y no se emite factura electrónica fiscal. Solo se registra el estado (`PAGADO`), ' +
          'la meta elegida (`target_quota`) y un código de referencia (`transaction_id`), y se envía un comprobante simulado cuando el servicio de correo está disponible.\n\n' +
          'Al revisar y aprobar una solicitud desde el formulario del panel, los datos enviados por el anunciante se muestran bloqueados en pantalla ' +
          'para que el administrador solo elija las etiquetas de gustos afines y añada notas internas.',
      },
      {
        heading: '3. Qué no se puede anunciar',
        body:
          '• Alcohol, tabaco, vapeadores ni productos relacionados.\n' +
          '• Apuestas, casinos, loterías no oficiales ni juegos de azar.\n' +
          '• Contenido sexual o servicios para adultos.\n' +
          '• Armas, municiones ni explosivos.\n' +
          '• Productos de salud, dietas o tratamientos con promesas milagrosas o sin respaldo.\n' +
          '• Estafas, pirámides, esquemas de dinero fácil o inversiones con ganancias garantizadas.\n' +
          '• Cualquier producto, servicio o evento ilegal en Costa Rica, o que discrimine, engañe o ponga en riesgo a las personas.\n\n' +
          `Hobbier tiene usuarios desde los ${MIN_AGE} años, así que los anuncios deben ser adecuados para ese público.`,
      },
      {
        heading: '4. Revisión, vigencia y retiro',
        body:
          'El anuncio aprobado se muestra en el feed durante las fechas indicadas mientras esté activo y no haya alcanzado su meta de visualizaciones (CPM) o clics (CPC). ' +
          'Hobbier puede rechazar cualquier solicitud, o pausar o retirar un anuncio ya publicado, si incumple estas condiciones, recibe reportes o la información resulta falsa.',
      },
      {
        heading: '5. Reembolsos',
        body:
          'Como el flujo de pago es una simulación académica y no existe ningún cobro real de dinero en la aplicación, ' +
          'no aplica ningún proceso de devolución o reembolso monetario en caso de rechazo, pausa o retiro de un anuncio.',
      },
      {
        heading: '6. Responsabilidad del anunciante',
        body:
          'El anunciante es el único responsable de lo que anuncia: de que la información sea real y no engañosa, ' +
          'de cumplir la ley (incluida la Ley 7472 de Defensa del Consumidor) y de tener derecho a usar el nombre, ' +
          'las marcas y la imagen que envía. Hobbier solo muestra el anuncio: no organiza, vende ni garantiza el ' +
          'evento o servicio anunciado, y cualquier reclamo sobre él debe dirigirse al anunciante.',
      },
      {
        heading: '7. Datos personales',
        body:
          'Los datos de la solicitud se tratan como explica la Política de Privacidad. El anunciante nunca recibe ' +
          'datos personales de los usuarios que ven su anuncio, solo cifras totales de impresiones y clics.',
      },
      {
        heading: '8. Contacto',
        body:
          'Cualquier consulta sobre un anuncio o su estado se hace por los mensajes de la solicitud, en Perfil → ' +
          'Mis solicitudes de anuncio.',
      },
    ],
  },
};

const en = {
  privacy: {
    title: 'Privacy Policy',
    updated: `Last updated: November 4, 2026 · Version ${LEGAL_VERSION}`,
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
          '• Reports: if you report a post or profile, the reason and any text you write.\n' +
          '• Online status: while you use the app, other signed-in users can tell that you are online.\n' +
          '• Ads: your canton or city, only if you grant location permission on your phone, and which ads you see or tap.\n' +
          '• Ad requests: if you ask to advertise from Discover, we store on the request the business or person name, ' +
          'the ad type, title, description, attached photo, destination link, requested dates, event details (date and place), ' +
          'which account sent the request, the chosen billing model (CPM or CPC), the target view or click quota (`target_quota`), ' +
          'the simulated payment status (`PENDIENTE` or `PAGADO`), the simulated transaction reference ID (`transaction_id`) ' +
          'and the messages you exchange with the team. If the ad is approved, the calculated amount (`price_paid`) is stored on the published ad record.\n\n' +
          'From your location we only store the name of your canton or city: never your coordinates or movements. ' +
          'If you use Hobbier in a web browser, to find the place name we send your approximate coordinates ' +
          '(rounded to about 1 km) to OpenStreetMap (Nominatim), which does not link them to your account. ' +
          'In-app payment is simulated for academic purposes: we do not process real charges or send or store any card details typed into the test form.',
      },
      {
        heading: '3. How we use it',
        body:
          '• To create and protect your account.\n' +
          '• To recommend activities based on your likes, interests and age.\n' +
          '• To show your posts to your friends and enable chat and challenge rooms.\n' +
          '• To moderate content (including automated AI moderation) and handle reports.\n' +
          '• To show you discreet ads from businesses and activities related to your likes and your city. ' +
          'The matching happens on our servers: advertisers never receive your data, only totals ' +
          '(how many people saw or tapped their ad). Nationwide ads are always shown; if you grant ' +
          'location permission, ads from your area are shown first. You can remove that permission at any ' +
          'time in your phone or browser settings and we will delete your stored city.\n' +
          '• If you request an ad: to record your request and simulated payment, send you a simulated receipt by email ' +
          'when the email service is available on the server, review the request, message you in the app and, ' +
          'if approved, publish the ad. Only you and the admin team can see those messages; the published ad only shows ' +
          'the business name, text, photo and link.\n\n' +
          'We do not sell your data.',
      },
      {
        heading: '4. Who we share it with',
        body:
          '• Supabase: hosts the app’s database, files, server functions (including sending the simulated receipt when the email service is configured) and sign-in.\n' +
          '• Groq (artificial intelligence): to generate recommendations we send ONLY the names of your likes, ' +
          'interests and available items; and to moderate user-created activities and chat/room messages, only the text needed to check for harmful content. ' +
          'We never send your name, email or photos to Groq.\n' +
          '• Other users: your name, username, profile photo and posts are visible to your friends; ' +
          'your username may appear in searches.\n\n' +
          'These providers may process data outside Costa Rica.',
      },
      {
        heading: '5. How long we keep it',
        body:
          'For as long as your account exists. Posts you delete stop being shown to everyone immediately, ' +
          'but an internal record marked as deleted is kept (for example, to handle reports). ' +
          'If we delete your account, your data is erased.\n\n' +
          'Ad requests, their simulated transaction ID and their messages are kept for as long as your account exists, as a record of what was ' +
          'requested. If a request is rejected, we delete the photo you attached at that moment. You can ask us to delete ' +
          'your requests by writing to us.',
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
          'your signed-in session, visual theme and your chosen language. We do not use advertising or analytics cookies.',
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
    updated: `Last updated: November 4, 2026 · Version ${LEGAL_VERSION}`,
    sections: [
      {
        heading: '1. Acceptance',
        body:
          'By creating a Hobbier account you accept these Terms of Use, the Privacy Policy and, if you request an ad, ' +
          'the Advertising Terms. If you do not agree, do not use the app.',
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
        heading: '4. Community rules and moderation',
        body:
          'You may not post offensive, violent, sexual, harassing or spam content; impersonate someone else; ' +
          'or post photos of other people without their permission. Custom activities and chat messages pass ' +
          'through an automated moderation filter, and any user can report a post or profile.',
      },
      {
        heading: '5. Challenges and activities',
        body:
          'Suggested activities or challenges created in group rooms are leisure ideas. Do them with common sense and at your own risk, respecting ' +
          'your physical limits and the rules of wherever you are.',
      },
      {
        heading: '6. Sponsored advertising and simulated payment',
        body:
          'Users can request sponsored ad placements from the Discover section by selecting an impression-based ' +
          '(CPM: ₡2 per view) or click-based (CPC: ₡50 per click) billing model and completing a simulated payment ' +
          'for academic purposes before submitting the request:\n' +
          '• No real bank charge is made and no card details are stored; only a reference code (`transaction_id`) is generated ' +
          'and, when the email service is available on the server, a simulated receipt is sent to the user’s email.\n' +
          '• On the admin panel approval screen, the fields submitted in the request are shown as read-only ' +
          'so the administrator only assigns matching interest tags and internal notes.\n' +
          '• The ad undergoes content review prior to publication and is governed by the Advertising Terms.',
      },
      {
        heading: '7. Account suspension',
        body:
          'We may suspend accounts that break these rules, always stating the reason for the sanction. ' +
          'Suspended users have access to an in-app support chat to submit an appeal.',
      },
      {
        heading: '8. Availability',
        body:
          'Hobbier is an academic project and is provided "as is", with no guarantee that it will always be ' +
          'available or error-free.',
      },
      {
        heading: '9. Governing law and contact',
        body:
          `These terms are governed by the laws of the Republic of Costa Rica. For any questions: ${LEGAL_CONTACT_EMAIL}.`,
      },
    ],
  },
  ads: {
    title: 'Advertising Terms',
    updated: `Last updated: November 4, 2026 · Version ${LEGAL_VERSION}`,
    sections: [
      {
        heading: '1. How it works',
        body:
          'Anyone with an account can request a sponsored ad from Discover by filling in the ad details ' +
          '(business or event, title, description, image, destination link, location and active dates), choosing ' +
          'a billing model (CPM or CPC) and completing the simulated payment step. When the email service is available ' +
          'on the server, a simulated receipt is sent to the registered email and the request awaits review by the ' +
          'Hobbier team. All communication about the request takes place in Profile → My ad requests. ' +
          'Approved ads appear in the feed marked as "Sponsored" with the "Learn more" button.',
      },
      {
        heading: '2. Billing models, rates and simulated payment',
        body:
          'The form calculates the estimated budget based on the model and target quota chosen by the advertiser:\n' +
          '• CPM Model (Cost per Impression): rate of ₡2 per feed view (with preset packages of 500 views for ₡1,000, 1,000 views for ₡2,000, 2,500 views for ₡5,000, or a custom target quota).\n' +
          '• CPC Model (Cost per Click): rate of ₡50 per click on the "Learn more" button (with preset packages of 20 clicks for ₡1,000, 50 clicks for ₡2,500, 100 clicks for ₡5,000, or a custom target quota).\n\n' +
          'Because Hobbier is an academic project, card payment is completely simulated: no real charge is made, ' +
          'no card details are stored and no fiscal electronic invoice is issued. Only the status (`PAGADO`), ' +
          'chosen quota (`target_quota`) and a reference code (`transaction_id`) are recorded, and a simulated receipt is sent when the email service is available.\n\n' +
          'When reviewing and approving a request in the admin panel form, the details submitted by the advertiser are shown locked on screen ' +
          'so the administrator only selects matching interest tags and adds internal notes.',
      },
      {
        heading: '3. What cannot be advertised',
        body:
          '• Alcohol, tobacco, vapes or related products.\n' +
          '• Betting, casinos, unofficial lotteries or gambling.\n' +
          '• Sexual content or adult services.\n' +
          '• Weapons, ammunition or explosives.\n' +
          '• Health products, diets or treatments with miracle or unsupported claims.\n' +
          '• Scams, pyramid schemes, easy-money schemes or investments with guaranteed returns.\n' +
          '• Any product, service or event that is illegal in Costa Rica, or that discriminates, misleads or puts people at risk.\n\n' +
          `Hobbier has users from age ${MIN_AGE}, so ads must be suitable for that audience.`,
      },
      {
        heading: '4. Review, duration and removal',
        body:
          'Approved ads are displayed in the feed during the indicated dates while active and until reaching their view (CPM) or click (CPC) quota. ' +
          'Hobbier may reject any request, or pause or remove a published ad, if it breaks these terms, receives reports or the information turns out to be false.',
      },
      {
        heading: '5. Refunds',
        body:
          'Because the payment flow is an academic simulation and no real money is charged in the app, ' +
          'no monetary refund or reimbursement applies if an ad is rejected, paused or removed.',
      },
      {
        heading: '6. Advertiser responsibility',
        body:
          'The advertiser is solely responsible for what they advertise: that the information is true and not ' +
          'misleading, that it complies with the law (including Costa Rica’s Consumer Protection Law 7472) and that ' +
          'they have the right to use the name, brands and image they send. Hobbier only displays the ad: it does ' +
          'not organise, sell or guarantee the advertised event or service, and any claim about it must be made to ' +
          'the advertiser.',
      },
      {
        heading: '7. Personal data',
        body:
          'Request data is handled as explained in the Privacy Policy. The advertiser never receives personal data about ' +
          'the users who see their ad, only total impressions and clicks.',
      },
      {
        heading: '8. Contact',
        body: 'Any question about an ad or its status is handled through the request messages, in Profile → My ad requests.',
      },
    ],
  },
};

const LEGAL_CONTENT = { es, en };

/** Devuelve el documento ('privacy' | 'terms' | 'ads') en el idioma pedido, con español de respaldo. */
export const getLegalDocument = (doc, language) =>
  (LEGAL_CONTENT[language] || LEGAL_CONTENT.es)[doc] || LEGAL_CONTENT.es[doc];
