from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.document-tools'))
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = Path(__file__).resolve().parent
doc = Document()
sec = doc.sections[0]
sec.top_margin = sec.bottom_margin = Inches(.75)
sec.left_margin = sec.right_margin = Inches(.8)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(7)
normal.paragraph_format.line_spacing = 1.12
for name in ['Title', 'Heading 1', 'Heading 2']:
    doc.styles[name].font.color.rgb = RGBColor.from_string('0C8AA6')
sec.header.paragraphs[0].text = 'HOBBIER  |  EIF-409  |  Defensa final'
footer = sec.footer.paragraphs[0]
footer.alignment = 2
footer.add_run('Página ')
field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), 'PAGE'); footer._p.append(field)

def p(text): doc.add_paragraph(text)
def h(text, level=1): doc.add_heading(text, level)
def page(title): doc.add_page_break(); h(title)
def table(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers)); t.style = 'Light Shading Accent 1'
    for c, text in zip(t.rows[0].cells, headers): c.text = text
    for row in rows:
        for c, text in zip(t.add_row().cells, row): c.text = text
    for row in t.rows:
        for c in row.cells:
            for para in c.paragraphs:
                for run in para.runs: run.font.size = Pt(9)

doc.add_paragraph('UNIVERSIDAD NACIONAL DE COSTA RICA', 'Subtitle')
p('Sede Regional Chorotega · Campus Nicoya')
doc.add_paragraph('HOBBIER', 'Title')
doc.add_paragraph('Defensa final de la aplicación desarrollada', 'Subtitle')
p('EIF-409 · Aplicaciones Informáticas Globales\nSegundo semestre de 2026')
h('Profesor', 2); p('Ing. José Abraham Benavides Vargas')
h('Estudiantes', 2)
p('Angélica María Ortiz Barrantes\nGreilyn María Esquivel Salazar\nKatheryn Méndez Quirós\nKrystel Fabiana Salazar Chavarría')
p('Documento de apoyo para la exposición y demostración funcional.\nCorte de revisión del proyecto: 2 de noviembre de 2026.')
p('Preparado con los lineamientos de presentación final y el código local disponible. La defensa anterior se utiliza como contexto de la propuesta; sus exclusiones no describen por sí solas el alcance actual.')

page('Ruta de la defensa')
p('La presentación explica la solución construida y reserva la mayor parte del tiempo para demostrarla. Este documento sirve como base para las diapositivas y para preparar respuestas; no está pensado para leerse completo durante la exposición.')
table(['Bloque', 'Duración', 'Contenido'], [
('1. Contexto', '5 min', 'Nombre, origen, justificación, descripción, público meta y modelo de ingresos.'),
('2. Estructura y globalidad', '4 min', 'Arquitectura, herramientas, base de datos, pilares implementados y pendientes.'),
('3. Demostración funcional', '12 min', 'Recorrido central con usuarios y datos preparados; comunidad, administración y globalidad.'),
('4. Evolución y experiencias', '4 min', 'Cambios frente a la propuesta, seguimientos, retos y aprendizajes.'),
('5. Preguntas', '10 min', 'Respuestas del equipo sustentadas en la aplicación y el repositorio.')])
h('Criterio de evidencia', 2)
p('“Implementado” significa que se encontró código de interfaz, servicios o SQL que respalda la función. Esta revisión documental no certifica que todas las migraciones estén aplicadas en Supabase ni que cada función esté desplegada o probada en dispositivos. Antes de exponer debe comprobarse el entorno que se usará en vivo.')
p('No se incorporan métricas de usuarios, ingresos, impacto en hábitos, Lighthouse o rendimiento que no estén documentadas. Las experiencias personales y el cumplimiento por seguimiento deben ser confirmados por las integrantes.')
h('Correspondencia con los lineamientos', 2)
p('Las secciones 1 a 4 desarrollan nombre, origen, solución y negocio; las secciones 5 y 6 cubren estructura técnica y globalidad; las secciones 7 a 9 cubren demostración, evolución y experiencias. Los anexos reúnen preparación, entrega y evidencias.')

page('1. Nombre, origen y justificación')
p('Hobbier es una aplicación para descubrir actividades acordes con cada persona, realizarlas y compartir sus logros con su comunidad. Su propuesta conecta el aprovechamiento del tiempo libre con preferencias personales, recursos disponibles y motivación social.')
h('Origen de la idea', 2)
p('La propuesta inicial nació a partir de un video de TikTok y del interés del equipo por ayudar a las personas a cumplir metas personales. El punto de partida fue observar que disponer de tiempo libre no siempre significa saber cómo aprovecharlo: es fácil repetir rutinas o consumir contenido sin encontrar una actividad concreta que resulte atractiva y posible.')
h('Problema que atiende', 2)
p('Las listas generales de actividades suelen ignorar diferencias de edad, gustos, intereses y objetos disponibles. Hobbier busca reducir esa dificultad de elección mediante un perfil de preferencias y un proceso de recomendación que utiliza información del usuario.')
h('Solución y propuesta de valor', 2)
p('La persona registra sus preferencias y solicita una recomendación con “Sorpréndeme”. Puede aceptar una actividad, completarla con evidencia fotográfica y recibir puntos. Las amistades, las reacciones y los retos en salas añaden una dimensión compartida a esa experiencia.')
p('La diferenciación propuesta está en reunir personalización, realización de actividades, evidencia y comunidad en un mismo flujo. Es una descripción del producto construido; no implica que se haya demostrado superioridad frente a competidores mediante un estudio comparativo.')
h('Por qué podría interesar al público', 2)
p('El usuario obtiene una propuesta concreta sin tener que buscar entre muchas ideas. Los recursos declarados ayudan a evitar recomendaciones que exijan objetos que no posee, mientras que los puntos y la participación de amigos pueden apoyar su motivación. El proyecto no cuenta en esta revisión con mediciones que demuestren cambios de conducta o reducción del sedentarismo.')

page('2. Descripción general y alcance actual')
table(['Módulo', 'Funcionalidad respaldada por el repositorio'], [
('Cuenta y perfil', 'Registro, inicio y cierre de sesión, recuperación/cambio de contraseña, perfil y preferencias. Validación de edad mínima de 13 años en el proyecto.'),
('Preferencias', 'Fecha de nacimiento; selección de gustos, intereses u objetivos y recursos mediante catálogos.'),
('Recomendación', 'Filtrado SQL y Edge Function con Groq para elegir candidatos, generar una actividad si corresponde y recurrir a alternativas de respaldo.'),
('Actividades y puntos', 'Aceptación y seguimiento de retos, evidencia fotográfica, historial y otorgamiento de puntos mediante lógica de servidor. Se permite repetir actividades.'),
('Comunidad', 'Feed, reacciones, solicitudes de amistad, consulta de perfiles y mensajería directa con respuestas a mensajes.'),
('Salas', 'Creación de retos compartidos, invitaciones, participantes, chat, evidencias y ranking; salida de participantes y eliminación por anfitrión.'),
('Administración', 'Resumen, soporte, usuarios, publicaciones, catálogo y anuncios. Gestión de reportes, sanciones y apelaciones.'),
('Publicidad', 'Solicitudes de anuncios, conversación con el equipo, revisión, anuncios segmentados por gustos y ciudad y registro de impresiones/clics.'),
('Experiencia', 'Español e inglés, formatos de fecha, temas claro/oscuro, ajuste de fotos, avisos y código de notificaciones push.')])
h('Límites que deben explicarse', 2)
p('La selección de actividades utiliza preferencias y recursos; no se encontró integración meteorológica ni un modelo clínico de movilidad. La ubicación se utiliza para publicidad por ciudad. Una fotografía es evidencia aportada por la persona, no una verificación automática de que realizó la actividad.')
p('Las notificaciones push requieren configuración y un entorno compatible. La interfaz tiene traducciones al español e inglés, aunque existen textos literales en español, especialmente en cambios recientes de anuncios; no debe afirmarse una traducción completa de todas las pantallas.')

page('3. Público meta y modelo de ingresos')
h('Público meta', 2)
p('El segmento principal propuesto sigue siendo el de adolescentes y personas adultas que desean aprovechar mejor su tiempo libre, especialmente entre 15 y 55 años, como se planteó en la defensa inicial. El registro actual establece un mínimo de 13 años; esa regla técnica no equivale a afirmar que el producto fue validado con todos los grupos de edad.')
p('Como segundo segmento se contemplan anunciantes, organizadores de eventos y negocios que desean difundir propuestas relacionadas con gustos de los usuarios o con una ciudad. El administrador gestiona solicitudes y contenido patrocinado.')
h('Modelo de negocio desarrollado', 2)
p('La vía de ingreso representada en el producto es la publicidad patrocinada. El anunciante prepara una solicitud con contenido, fechas y presupuesto; puede comunicarse con el equipo mediante el chat de la solicitud. La administración revisa y, si procede, crea el anuncio para su publicación.')
p('El código local incorpora dos modalidades: CPC a ₡50 por clic y CPM equivalente a ₡2.000 por mil visualizaciones. Estas cifras son parámetros del prototipo, no tarifas validadas comercialmente. Por ejemplo, 20 clics equivalen a ₡1.000 y 1.000 visualizaciones a ₡2.000 según el cálculo actual.')
p('La pantalla de pago es una simulación académica: genera una confirmación y un identificador simulado. No procesa cargos bancarios. La migración del 2 de noviembre agrega modelo de cobro, cuota y estado de pago; su presencia no acredita que ya esté aplicada al entorno remoto. Registrar una cuota tampoco demuestra una detención automática del anuncio al alcanzarla.')
h('Síntesis del modelo', 2)
table(['Elemento', 'Planteamiento'], [('Valor al usuario', 'Descubrir actividades personalizadas y compartir avances.'), ('Valor al anunciante', 'Difundir contenido patrocinado relacionado con preferencias o ciudad.'), ('Canal', 'Aplicación y tarjetas patrocinadas dentro del feed.'), ('Recursos y costos', 'Desarrollo, mantenimiento, Supabase, IA, almacenamiento y moderación; sin costos medidos en esta revisión.'), ('Validación pendiente', 'Disposición a pagar, demanda, conversión, costos reales y conexión con una pasarela de pago real.')])

page('4. Cómo se utiliza Hobbier')
p('El recorrido central empieza con la cuenta y termina con una actividad realizada y registrada. La demostración debe mostrar ese ciclo completo antes de recorrer funciones complementarias.')
for title, text in [
('Paso 1. Registrarse o iniciar sesión', 'La persona accede con correo y contraseña. Una cuenta nueva completa el asistente de preferencias antes de entrar al flujo principal.'),
('Paso 2. Configurar el perfil', 'Registra su fecha de nacimiento y selecciona gustos, intereses y recursos disponibles. Estas selecciones se almacenan como relaciones con los catálogos.'),
('Paso 3. Solicitar una recomendación', 'Desde “Sorpréndeme”, el cliente solicita una actividad al servidor. La recomendación se presenta para que la persona decida si la acepta.'),
('Paso 4. Realizar y completar la actividad', 'La actividad aceptada queda en seguimiento. La persona adjunta una fotografía, puede ajustar el encuadre y confirma su progreso; la lógica de servidor registra la finalización y los puntos.'),
('Paso 5. Compartir y participar', 'El logro puede verse en las publicaciones permitidas por las reglas de acceso. Las amistades pueden reaccionar; también existen mensajes directos y salas para retos compartidos.'),
('Paso 6. Gestionar incidentes', 'Los reportes y la administración permiten revisar contenido y cuentas. Las personas sancionadas disponen de un canal de apelación o soporte.')]:
    h(title, 2); p(text)
p('El feed y los perfiles no deben describirse como públicos sin restricciones. Su acceso depende de las políticas de la base de datos y de las relaciones entre usuarios. Para la defensa se recomienda mostrar una cuenta amiga y comprobar con una cuenta ajena qué contenido puede consultar.')

page('5. Estructura técnica y decisiones de diseño')
h('Arquitectura', 2)
p('Interfaz React Native / Expo → contextos y servicios de la aplicación → Supabase Auth, consultas/RPC y Storage. Para recomendaciones y moderación: servicios → Edge Functions → Groq. Para actualizaciones de conversación y otros eventos se utilizan capacidades Realtime; los avisos push cuentan con una función de servidor propia.')
table(['Capa', 'Implementación y propósito'], [('Cliente', 'Expo SDK 58, React Native 0.88.1 y React 19.3.0. Código principalmente JavaScript, con algunos archivos TypeScript; no es un proyecto íntegramente TypeScript.'), ('Organización', 'src/features agrupa las funciones; src/services concentra acceso a datos; src/context administra sesión, idioma, tema y otros estados.'), ('Datos', 'PostgreSQL en Supabase. Tablas relacionales para perfiles, preferencias, actividades, progreso, publicaciones, amistades y módulos posteriores.'), ('Autenticación y permisos', 'Supabase Auth y políticas RLS. Las operaciones sensibles también emplean funciones SQL y controles en servidor.'), ('Archivos', 'Supabase Storage para fotografías y material asociado, con rutas y permisos definidos en SQL.'), ('IA', 'Groq mediante Edge Functions recommend-activity, moderate-activity y moderate-message. La clave de IA pertenece al servidor.'), ('Experiencia y rendimiento', 'AsyncStorage para preferencias locales, utilidades de caché, paginación y componentes compartidos de tema y texto.')])
h('Motor de recomendación', 2)
p('El SQL filtra por disponibilidad de la actividad, rango de edad, recursos requeridos, afinidad y estado del usuario. La Edge Function presenta candidatos a Groq y valida que la selección corresponda a la lista recibida. Si no hay una opción nueva adecuada, intenta crear una actividad y dispone de rutas de respaldo, incluida la repetición. No debe prometerse que nunca fallará ante una caída de servicios.')
p('El código limita a tres las actividades generadas por usuario y día, y establece un tiempo límite de ocho segundos por llamada a Groq. Son controles para moderar consumo y espera, no resultados de una prueba de rendimiento.')
h('Decisiones que conviene defender', 2)
p('El filtrado en servidor concentra reglas de negocio; RLS limita acceso a registros; las funciones de progreso evitan depender de un número de puntos enviado por el cliente. Separar interfaz, servicios y servidor facilita mantener módulos. Expo permite compartir base de código, aunque cada plataforma necesita validación propia.')

page('6. Estrategia de globalidad')
table(['Pilar', 'Estado y evidencia', 'Límite o pendiente'], [
('Idiomas', 'LanguageContext y catálogos es.json/en.json; selección persistida en AsyncStorage.', 'Cobertura parcial: revisar textos literales, administración y publicidad antes de afirmar traducción total.'),
('Contenido traducible', 'translationService contempla traducción español/inglés para contenido mediante servicio externo.', 'Calidad y disponibilidad dependen del servicio; no todos los contenidos se originan en ambos idiomas.'),
('Fechas y horas', 'dateFormat.js utiliza Intl y el idioma de la aplicación; el huso horario de visualización es el del dispositivo.', 'Verificar pantallas recientes y fechas sin hora; no se adjunta una matriz de pruebas entre regiones.'),
('Moneda y números', 'Publicidad expresada en colones con formato es-CR en el formulario.', 'No hay multimoneda ni conversión cambiaria implementada en lo revisado.'),
('Diversidad de perfiles', 'Catálogos de gustos, intereses y recursos, y filtrado por edad.', 'No hay validación cultural por país ni adaptación clínica a condiciones de movilidad.'),
('Ubicación', 'Permiso de ubicación y ciudad para anuncios; geocodificación según plataforma.', 'No representa recomendaciones por clima ni un sistema completo de localización internacional.'),
('Usabilidad y accesibilidad', 'Tema claro/oscuro y envoltorio de texto con tope de escalado de 1,3.', 'No constituye certificación de accesibilidad; faltan evidencias con lectores de pantalla y usuarios.'),
('Plataformas', 'Base Expo/React Native con dependencias y lógica para móvil y web.', 'No se acredita aquí certificación en tiendas ni validación integral de Android, iOS y web.')])
h('Evidencia para mostrar', 2)
p('Cambiar el idioma y observar etiquetas y fechas en una pantalla que use dateFormat; cambiar el tema; mostrar que el anuncio mantiene colones al cambiar a inglés. Este último punto permite explicar con honestidad que idioma y moneda son dimensiones distintas y que la multimoneda está pendiente.')
p('No se encontraron informes de Lighthouse ni benchmarking en los materiales revisados. Si se ejecutan antes de la entrega, adjuntar fecha, URL o versión, dispositivo, condiciones y resultado. Un análisis de Lighthouse de la versión web no sustituye la evaluación del rendimiento nativo.')

page('7. Guion de demostración funcional · 12 minutos')
table(['Tiempo', 'Acción en vivo', 'Qué debe quedar demostrado'], [
('0:00–1:00', 'Entrar con cuenta preparada y abrir preferencias.', 'Identidad del usuario y datos que alimentan la personalización.'),
('1:00–3:00', 'Pulsar “Sorpréndeme”, explicar la actividad y aceptarla.', 'Solicitud al servidor y recomendación relacionada con el perfil.'),
('3:00–5:00', 'Abrir el reto pendiente, adjuntar una imagen preparada y completar.', 'Evidencia, finalización, historial y actualización de puntos.'),
('5:00–6:30', 'Mostrar el logro desde la cuenta amiga y reaccionar.', 'Flujo social y relación de amistad. Evitar iniciar el registro de otra cuenta.'),
('6:30–8:00', 'Abrir una sala preparada, mostrar participantes, chat y ranking.', 'Reto compartido, comunicación y evidencias grupales.'),
('8:00–9:00', 'Cambiar idioma y tema; observar etiquetas y una fecha.', 'Globalidad implementada y adaptación de interfaz.'),
('9:00–10:15', 'Abrir una solicitud publicitaria y su conversación.', 'Modelo de ingreso; explicar CPC/CPM y mostrar pago únicamente como simulación.'),
('10:15–12:00', 'Entrar al panel con administrador y revisar contenido o solicitud.', 'Control por rol, catálogo/moderación y gestión publicitaria.')])
h('Datos que deben estar listos', 2)
p('Preparar una cuenta usuaria, una cuenta amiga y una administradora; preferencias y actividades compatibles; una actividad pendiente de respaldo; una imagen sin datos personales; una sala con integrantes, mensajes y evidencias; una solicitud de anuncio. Mantener sesiones preparadas en dispositivos o perfiles separados para reducir cambios de cuenta.')
h('Plan B', 2)
p('Grabar previamente un recorrido de la misma versión y guardar capturas de los pasos críticos. Si falla IA, comprobar antes del evento la alternativa SQL; si falla la red, presentar el video identificado como respaldo y explicar qué paso no pudo ejecutarse en vivo. Los datos precargados no convierten a la aplicación en una solución sin conexión.')
p('Ensayar con cronómetro sobre el entorno real de exposición. Los lineamientos piden basarse en el ensayo del Seguimiento #5; el material de ese ensayo no estuvo disponible en esta revisión, por lo que debe contrastarse con este guion.')

page('8. Evolución frente a la propuesta inicial')
p('La idea original ya definía preferencias, recomendación por SQL, evidencia fotográfica, puntos, amistades y administración. La implementación amplió esa base con IA, comunicación y publicidad. Estos cambios deben presentarse como ampliaciones del alcance durante el desarrollo.')
table(['Propuesta inicial', 'Estado observado al corte'], [('Selección aleatoria entre compatibles', 'Filtrado SQL complementado por selección y generación con Groq y rutas de respaldo.'), ('Sin chat ni mensajería privada', 'Mensajes directos y chat en salas; conversaciones de soporte y de solicitudes publicitarias.'), ('Sin reacciones', 'Reacciones en publicaciones mediante componentes y servicios sociales.'), ('Sin funciones sociales adicionales', 'Salas con invitaciones, retos, evidencias y ranking.'), ('Sin IA generativa ni integraciones externas', 'Funciones de IA con Groq y servicio de traducción; otros servicios de infraestructura.'), ('Sin geolocalización', 'Detección de ciudad para segmentación de anuncios con permiso.'), ('Sin pagos', 'Simulación académica de pago publicitario; sin pasarela bancaria real.'), ('Idiomas como posibilidad futura', 'Catálogos español/inglés y formato de fechas por idioma, con cobertura pendiente de completar.'), ('TypeScript como tecnología propuesta', 'Implementación mayormente JavaScript con archivos TypeScript puntuales.')])
h('Cumplimiento por seguimiento', 2)
p('Los lineamientos exigen indicar qué se cumplió y qué no en cada seguimiento. El estado actual del código no permite atribuir entregables a una evaluación específica sin revisar actas, tarjetas o entregas de esas fechas. La siguiente matriz debe completarse con el tablero y los documentos del equipo antes de entregar.')
table(['Seguimiento', 'Compromiso y resultado', 'Evidencia que debe vincularse'], [('1', 'Por confirmar con la entrega del equipo.', 'Tarjetas, entrega y commit o versión.'), ('2', 'Por confirmar con la entrega del equipo.', 'Tarjetas, entrega y commit o versión.'), ('3', 'Por confirmar con la entrega del equipo.', 'Tarjetas, entrega y commit o versión.'), ('4', 'Por confirmar con la entrega del equipo.', 'Tarjetas, entrega y commit o versión.'), ('5', 'Por confirmar; contrastar el ensayo de demostración.', 'Video/guion del ensayo y ajustes realizados.')])
p('Repositorio: https://github.com/Ortiz0022/hobbier_app\nTablero indicado en la propuesta: https://dev.azure.com/katherynmendezquiros0663/HOBBIER\nEl enlace del tablero procede del documento inicial; su acceso y vigencia deben verificarse.')

page('9. Retos técnicos y experiencias del equipo')
h('Retos sustentados en el código', 2)
table(['Reto', 'Respuesta encontrada y aprendizaje que se puede explicar'], [('Permisos y privacidad', 'Una migración documenta la corrección de recursión en políticas de amistades mediante una función auxiliar. Aprendizaje: los permisos deben revisarse junto con las consultas que dependen de ellos.'), ('Dependencia de IA', 'Validación de respuestas, tiempo límite, límite diario de generación y alternativas. Aprendizaje: la IA necesita controles y no debe ser el único camino funcional.'), ('Fotos y conectividad', 'Ajuste de encuadre, reducción y subida de imágenes, y manejo de errores. Aprendizaje: completar una actividad exige resolver archivos y estados además de diseñar un formulario.'), ('Estado y navegación', 'Caché e invalidación, paginación, manejo del botón de retroceso y pantallas con estado. Aprendizaje: la coherencia después de una acción forma parte de la experiencia.'), ('Globalidad', 'Fechas ligadas al idioma de la app y catálogos de traducción; quedan textos literales. Aprendizaje: traducir etiquetas no basta para localizar toda la experiencia.'), ('Ampliación del alcance', 'Más módulos que en el MVP inicial. Aprendizaje: cada ampliación exige actualizar documentación, permisos y preparación de la demostración.')])
h('Participación y experiencias personales', 2)
p('Propuesta de distribución para el ensayo: Angélica presenta contexto y negocio; Greilyn explica arquitectura y globalidad; Katheryn conduce el flujo central de la demostración; Krystel muestra administración y cierra con evolución y retos. Es una distribución sugerida para equilibrar la exposición, no una atribución del trabajo de desarrollo.')
p('Cada integrante debe añadir un ejemplo propio: qué tarea realizó, cuál fue la dificultad, qué cambió y qué aprendió. No se asignan experiencias individuales sin confirmación. Todas deben poder explicar el flujo principal, los permisos, la recomendación y los límites del pago simulado.')
h('Cierre oral sugerido', 2)
p('“Hobbier materializa la idea de convertir el tiempo libre en actividades acordes con cada persona. El proyecto integra preferencias, recomendaciones, evidencias y comunidad, y amplía la propuesta inicial con salas, comunicación y administración. Los próximos pasos son validar mejor la experiencia, completar la localización y medir el funcionamiento antes de un uso más amplio.”')

page('Anexo A. Preguntas para preparar la defensa')
for question, answer in [
('¿Qué aporta la IA si ya existe filtrado SQL?', 'SQL determina compatibilidad y restricciones. La IA compara el contenido de candidatos y puede generar una alternativa; el servidor valida la salida y conserva caminos de respaldo.'),
('¿El usuario puede asignarse puntos?', 'El flujo de finalización llama a funciones SQL como log_activity_progress y complete_activity. La defensa debe mostrar esa lógica y sus permisos, no atribuir la seguridad solo al bloqueo visual del campo.'),
('¿La aplicación está completamente traducida?', 'Tiene infraestructura y catálogos español/inglés, fechas localizadas y traducción de contenido; todavía hay textos literales. Se demostrará el alcance real en las pantallas comprobadas.'),
('¿Cómo se generan ingresos?', 'El prototipo representa publicidad segmentada y cálculo CPC/CPM. El pago actual es simulado y no acredita transacciones ni ingresos reales.'),
('¿Se comprueba que la persona hizo la actividad?', 'Se registra una fotografía como evidencia aportada por el usuario. No se identificó una verificación automática del cumplimiento físico.'),
('¿Funciona sin internet?', 'Las funciones centrales dependen de Supabase y algunas de servicios externos. El almacenamiento local mejora preferencias y ciertos estados, pero no equivale a funcionamiento integral sin conexión.'),
('¿Cómo protegen información y contenido?', 'Con autenticación, políticas RLS, funciones de servidor, roles y mecanismos de reporte y moderación. Estos controles requieren validación; no se afirma una auditoría de seguridad completa.'),
('¿Por qué ampliaron lo que estaba fuera del MVP?', 'El código evidencia ampliaciones funcionales. El equipo debe explicar sus motivos y priorización con el tablero, y distinguir lo terminado de lo que sigue en validación.'),
('¿Qué falta para un lanzamiento más amplio?', 'Validar plataformas y permisos, completar traducciones, medir accesibilidad y rendimiento, comprobar despliegue y migraciones, y sustituir la simulación si se decide cobrar realmente.')]:
    h(question, 2); p(answer)

page('Anexo B. Entrega y preparación final')
h('Documentos solicitados por el curso', 2)
table(['Elemento', 'Situación y acción'], [('Alcance o requerimientos y prototipado', 'Adjuntar documentos y wireframes del equipo; la defensa anterior aporta el alcance original, pero debe acompañarse de sus cambios.'), ('Backlog final', 'Exportar o adjuntar el estado real del tablero. La matriz de evolución de este documento no sustituye el backlog.'), ('Repositorio y tablero', 'Incluir enlaces y verificar permisos de acceso para el docente.'), ('Manual de usuario', 'Adjuntar un manual o un video con su enlace. El guion de demo de este documento no reemplaza ese entregable.'), ('README de ejecución', 'Existe en el repositorio. Comprobar sus pasos desde un entorno preparado y explicar la configuración necesaria.'), ('Pruebas y evidencias', 'Conservar resultados de ensayo, pruebas y capturas; adjuntar métricas solo cuando se hayan obtenido.')])
h('Preparación técnica', 2)
p('Comprobar conexión, energía, proyección y acceso a las cuentas. Verificar que el esquema y las migraciones utilizadas estén aplicados; que las Edge Functions y sus secretos estén configurados; que Storage permita las operaciones del recorrido; y que las notificaciones funcionen en la compilación elegida. No mostrar claves ni datos personales durante la exposición.')
p('En anuncios, verificar específicamente la migración 20261102_ad_pricing_and_payment.sql y la compatibilidad entre formulario, administración y base de datos. Usar exclusivamente datos de prueba en la simulación de pago.')
h('Fechas indicadas en los lineamientos', 2)
p('Exposiciones: 5 y 12 de noviembre de 2026, a la 1:00 p. m., con orden por sorteo. El PDF señala el 04/11/2026 a las 11:59 p. m. como límite común de entrega y lo denomina “martes”. Hay una discrepancia: el 4 de noviembre de 2026 corresponde a miércoles. Confirmar la fecha con el aula virtual o el docente; no asumir un cambio de plazo por esta inconsistencia.')
h('Aspectos que requieren completar el equipo', 2)
p('Antes de entregar: completar la matriz de seguimientos con evidencias; confirmar la vigencia del tablero; añadir el enlace al manual y al prototipo; incorporar experiencias personales; comprobar la versión que se demostrará y ensayar el guion de 25 minutos. Estos datos no se inventaron a partir del código.')

page('Anexo C. Fuentes y trazabilidad de la revisión')
p('Fuentes principales: Lineamientos_Presentacion_Final_2026.pdf, páginas 1–3, para estructura, tiempos, evaluación y entrega; Defensa Proyecto Final - Aplicacion.docx.pdf, páginas 1–7, para identidad académica, origen, alcance inicial y tablero. Las instrucciones de la propuesta inicial se interpretaron como contexto histórico, no como restricciones vigentes del producto.')
table(['Tema', 'Archivos de respaldo en el repositorio'], [('Tecnologías y estructura', 'package.json; App.js; README.md; src/features; src/context; src/services.'), ('Perfil, edad y preferencias', 'src/features/auth/validation.js; src/features/onboarding; supabase/migrations/20261005c_min_age_13.sql.'), ('Recomendaciones e IA', 'supabase/schema.sql; supabase/functions/recommend-activity/index.ts; src/services/activityService.js.'), ('Actividades y comunidad', 'src/features/user_activities; src/services/socialService.js; src/services/directMessagesService.js; src/services/roomsService.js; migraciones correspondientes.'), ('Moderación y administración', 'src/features/admin; src/services/adminService.js; src/services/supportService.js; supabase/functions/moderate-activity y moderate-message.'), ('Publicidad y pago simulado', 'src/services/adsService.js; src/components/SimulatedPaymentModal.js; src/features/admin/sections/AdminAdRequests.js; supabase/migrations/20261102_ad_pricing_and_payment.sql.'), ('Globalidad y presentación', 'src/context/LanguageContext.js; src/i18n/locales/es.json y en.json; src/utils/dateFormat.js; src/services/translationService.js; src/components/scaledText.tsx.'), ('Push y pruebas disponibles', 'src/services/pushService.js; supabase/functions/send-push/index.ts; tests/queryCache.test.cjs; tests/navigationLoading.test.cjs. La existencia de pruebas no implica que se ejecutaran para esta revisión documental.')])
p('Referencia técnica consultada según AGENTS.md: documentación versionada de Expo SDK 58, https://docs.expo.dev/versions/v58.0.0/. Las versiones atribuidas a Hobbier proceden de package.json.')
p('Alcance de la revisión: lectura de documentos y del código local al 2 de noviembre de 2026. Se incluyeron los cambios locales presentes, incluso los de publicidad aún sin confirmar en el repositorio remoto. No se modificó el código de la aplicación ni se ejecutó una prueba funcional integral.')

doc.core_properties.title = 'Hobbier · Defensa final de la aplicación desarrollada'
doc.core_properties.subject = 'EIF-409 · Presentación final 2026'
doc.core_properties.author = 'Equipo Hobbier'
OUT.mkdir(exist_ok=True)
target = OUT / 'Hobbier_Defensa_Final_2026.docx'
doc.save(target)
check = Document(target)
assert len(check.tables) == 11, len(check.tables)
assert len(check.paragraphs) > 100
print(str(target))
print(f'Validado: {len(check.paragraphs)} párrafos y {len(check.tables)} tablas.')
