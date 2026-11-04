"""Genera la documentación escrita conservando la plantilla de la primera entrega.
Solo requiere la biblioteca estándar de Python.
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from copy import deepcopy
import re
import xml.etree.ElementTree as E

SOURCE = Path(r'C:\Users\ortiz\Downloads\Defensa Proyecto Final - Aplicacion.docx')
TARGET = Path(__file__).parent / 'Hobbier_Documentacion_Escrita_Final_2026.docx'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
def q(x): return '{'+W+'}'+x
archive = ZipFile(SOURCE)
raw = archive.read('word/document.xml').decode('utf-8')
for prefix, uri in re.findall(r'xmlns:([\w]+)="([^"]+)"', raw):
    E.register_namespace(prefix, uri)
root = E.fromstring(raw)
body = root.find(q('body'))
original = list(body)
section = deepcopy(body.find(q('sectPr')))
for item in original[21:]: body.remove(item)

def paragraph(text, bold=False, center=False, size=24, parent=None):
    node = E.SubElement(body if parent is None else parent, q('p'))
    pr = E.SubElement(node,q('pPr'))
    E.SubElement(pr,q('spacing'),{q('after'):'120',q('line'):'360',q('lineRule'):'auto'})
    E.SubElement(pr,q('jc'),{q('val'):'center' if center else 'both'})
    if bold: E.SubElement(pr,q('keepNext'))
    run = E.SubElement(node,q('r')); rp = E.SubElement(run,q('rPr'))
    E.SubElement(rp,q('rFonts'),{q('ascii'):'Times New Roman',q('hAnsi'):'Times New Roman'})
    E.SubElement(rp,q('sz'),{q('val'):str(size)})
    E.SubElement(rp,q('lang'),{q('val'):'es-CR'})
    if bold: E.SubElement(rp,q('b'))
    E.SubElement(run,q('t')).text=text
    return node
def h(text): paragraph(text,True)
def p(text): paragraph(text)
def page():
    node=E.SubElement(body,q('p')); run=E.SubElement(node,q('r')); E.SubElement(run,q('br'),{q('type'):'page'})
def table(headers, rows, widths=None):
    cols=len(headers); widths=widths or [int(8838/cols)]*cols
    t=E.SubElement(body,q('tbl')); pr=E.SubElement(t,q('tblPr'))
    E.SubElement(pr,q('tblW'),{q('w'):str(sum(widths)),q('type'):'dxa'})
    E.SubElement(pr,q('tblLayout'),{q('type'):'fixed'})
    borders=E.SubElement(pr,q('tblBorders'))
    for side in ['top','left','bottom','right','insideH','insideV']:
        E.SubElement(borders,q(side),{q('val'):'single',q('sz'):'4',q('color'):'000000'})
    grid=E.SubElement(t,q('tblGrid'))
    for width in widths: E.SubElement(grid,q('gridCol'),{q('w'):str(width)})
    for idx,row in enumerate([headers]+list(rows)):
        tr=E.SubElement(t,q('tr')); trpr=E.SubElement(tr,q('trPr')); E.SubElement(trpr,q('cantSplit'))
        if idx==0: E.SubElement(trpr,q('tblHeader'))
        for width,text in zip(widths,row):
            cell=E.SubElement(tr,q('tc')); cp=E.SubElement(cell,q('tcPr'))
            E.SubElement(cp,q('tcW'),{q('w'):str(width),q('type'):'dxa'})
            if idx==0: E.SubElement(cp,q('shd'),{q('fill'):'E7E6E6'})
            paragraph(text,idx==0,size=21,parent=cell)
    paragraph('')

paragraph('Proyecto final: Documentación escrita de la aplicación Hobbier',True,True)
p('Curso: EIF-409 Aplicaciones Informáticas Globales. Segundo semestre de 2026.')
p('Este documento desarrolla el origen y la justificación de Hobbier, define el alcance actualizado, especifica los requerimientos del sistema y presenta los wireframes de sus principales interfaces. Su contenido corresponde a la implementación disponible en el proyecto al 2 de noviembre de 2026 y actualiza la propuesta de la primera entrega.')
h('1. Nombre y descripción general de la aplicación')
p('Hobbier es una aplicación orientada a ayudar a las personas a aprovechar su tiempo libre mediante el descubrimiento y la realización de actividades relacionadas con sus preferencias. La persona configura su edad, gustos, intereses y recursos disponibles; a partir de esa información, el sistema le propone actividades que puede aceptar y completar. La realización se registra mediante una evidencia fotográfica y se acompaña de puntos como elemento de motivación.')
p('La aplicación también integra una dimensión social: permite establecer amistades, compartir publicaciones de actividades realizadas, reaccionar, conversar mediante mensajes directos y participar en salas con retos grupales. La administración dispone de herramientas para gestionar el catálogo, revisar reportes, atender consultas y administrar publicidad patrocinada.')
h('2. Origen de la idea')
p('La idea de Hobbier surgió a partir de un video de TikTok y del interés del equipo por contribuir al cumplimiento de metas personales. Esta inspiración llevó a considerar una situación cotidiana: muchas personas disponen de momentos libres, pero no siempre encuentran una actividad concreta que les resulte interesante y que puedan realizar con los recursos que tienen a su alcance.')
p('En lugar de limitar la propuesta a una lista de pasatiempos, el equipo planteó una aplicación que relacionara las características del usuario con actividades posibles. Desde su concepción, Hobbier vinculó el descubrimiento de hobbies con el registro de logros y la interacción entre amigos, de manera que la experiencia no terminara al recibir una sugerencia, sino que continuara con su realización y seguimiento.')
h('3. Justificación y motivación para el desarrollo')
h('3.1. ¿Qué impulsó el desarrollo de esta idea?')
p('El desarrollo fue impulsado por la necesidad de facilitar decisiones sobre cómo utilizar el tiempo libre. Elegir una actividad puede resultar difícil cuando las opciones son numerosas, genéricas o poco compatibles con la realidad de una persona. En esas circunstancias, se tiende a repetir la misma rutina o a dedicar el tiempo a consumir contenido sin avanzar en los intereses que se desea cultivar.')
p('Hobbier propone convertir esa intención general en una acción concreta. Para ello reúne el perfil de preferencias, la recomendación, el registro de actividades y el componente social en una misma aplicación. Esta organización permite acompañar al usuario desde la búsqueda de una idea hasta la publicación de un logro.')
h('3.2. ¿Qué problema resuelve?')
p('El problema central es la dificultad de encontrar actividades adecuadas para realizar en el tiempo libre considerando la edad, los gustos, los intereses y los recursos disponibles. Una recomendación puede resultar atractiva, pero dejar de ser útil si exige materiales que el usuario no posee o si se aleja de sus preferencias. Hobbier aborda esa dificultad mediante un proceso de selección que utiliza los datos del perfil y las características del catálogo.')
p('También atiende la necesidad de registrar lo realizado y compartirlo dentro de una comunidad. Las evidencias fotográficas, los puntos, las amistades y las salas permiten dar continuidad a las actividades. El propósito es apoyar la participación y la motivación; no se presenta como un tratamiento de salud ni se afirma que se haya medido una reducción del sedentarismo.')
h('3.3. ¿Qué solución o ventaja aporta?')
p('La principal ventaja es ofrecer propuestas contextualizadas sin exigir que el usuario busque manualmente entre múltiples fuentes. Por ejemplo, una persona interesada en arte que declara materiales de dibujo puede recibir una actividad relacionada con esa preferencia, mientras otra persona con gustos y recursos diferentes recibe una propuesta distinta. El filtrado de recursos busca que las actividades seleccionadas sean realizables con lo declarado en el perfil.')
p('La implementación combina reglas en la base de datos con inteligencia artificial. Primero se obtienen actividades compatibles; posteriormente, el servicio de IA puede seleccionar entre los candidatos o generar una propuesta cuando corresponde. El usuario conserva la decisión de aceptar la actividad y puede registrar su realización mediante una fotografía. Los puntos y el historial permiten visualizar sus avances, mientras que las funciones sociales facilitan compartirlos.')
h('3.4. ¿Qué la diferencia de las demás?')
p('La propuesta diferenciadora de Hobbier consiste en integrar personalización, ejecución y comunidad. No se limita a presentar ideas: conecta las preferencias del usuario con una actividad, permite aceptarla, registrar evidencia y compartir el resultado. Además, las salas incorporan retos compartidos, conversación y clasificación de participantes, ampliando el uso individual hacia una experiencia grupal.')
p('Otro elemento distintivo es la combinación de criterios controlados en servidor con IA para apoyar las recomendaciones. Las reglas de edad, recursos y estado de las actividades se mantienen separadas de la interpretación que realiza el modelo. Esta descripción expresa el valor del producto desarrollado; no supone que se haya efectuado una comparación exhaustiva ni que se haya demostrado superioridad frente a otras aplicaciones.')
h('3.5. ¿Por qué el público la querrá?')
p('Hobbier puede resultar atractiva para quienes desean variar su rutina, descubrir hobbies o retomar intereses y no saben por dónde empezar. La recomendación reduce el esfuerzo de elegir; los recursos declarados acercan las propuestas a las posibilidades de cada persona; y el registro de evidencias ofrece una forma de conservar lo realizado.')
p('La posibilidad de participar con amigos, reaccionar a sus logros y compartir retos en salas añade razones para regresar a la aplicación. Los puntos ofrecen una señal de progreso dentro del sistema. Estas características representan motivos de interés previstos por el equipo y deben distinguirse de resultados de adopción o satisfacción, para los cuales no se incorporan mediciones en este documento.')

page(); h('4. Público meta')
p('El público principal está compuesto por adolescentes y personas adultas que desean aprovechar mejor su tiempo libre y participar en actividades recreativas, creativas, de aprendizaje o de movimiento. La propuesta inicial priorizaba el rango de 15 a 55 años; la implementación contempla una edad mínima de registro de 13 años. La existencia de esa validación no implica que se haya comprobado la adecuación del producto para todos los grupos de edad.')
p('Un segundo grupo corresponde a personas, negocios u organizadores de eventos que desean difundir contenido patrocinado. Este segmento utiliza las solicitudes de anuncios y la comunicación con el equipo administrador. Los administradores constituyen un rol operativo encargado de mantener el catálogo y gestionar la convivencia, el soporte y la publicidad.')
h('5. Objetivos del sistema')
h('5.1. Objetivo general')
p('Desarrollar una aplicación que facilite el descubrimiento y la realización de actividades personalizadas a partir de la edad, los gustos, los intereses y los recursos disponibles del usuario, incorporando el registro de avances y la participación social.')
h('5.2. Objetivos específicos')
for text in [
'Permitir la creación de cuentas y la configuración de perfiles con preferencias y recursos disponibles.',
'Proporcionar recomendaciones mediante reglas de compatibilidad en servidor e integración con IA.',
'Registrar actividades aceptadas y completadas, evidencias fotográficas y puntos asociados al progreso.',
'Facilitar la interacción mediante amistades, publicaciones, reacciones, mensajes y salas con retos compartidos.',
'Proporcionar herramientas administrativas para gestionar actividades, usuarios, reportes, soporte y anuncios.',
'Ofrecer opciones de idioma y presentación que apoyen el uso por personas con preferencias diferentes.'
]: p('• '+text)
h('6. Definición del alcance actualizado')
p('El alcance comprende el ciclo completo de uso: registro, configuración de preferencias, recomendación, aceptación, realización y registro de una actividad. Incluye las funciones sociales y administrativas que respaldan ese ciclo, así como la gestión de anuncios patrocinados. El sistema utiliza servicios en la nube para autenticación, persistencia, archivos y comunicación; por tanto, sus operaciones centrales requieren conexión a Internet.')
p('Durante el desarrollo se incorporaron funciones que la propuesta inicial dejaba fuera del MVP: IA generativa, mensajes, reacciones, salas, ubicación para publicidad y simulación de pago publicitario. En esta versión esas funciones se documentan de acuerdo con el código disponible y dejan de figurar como exclusiones generales.')
table(['Módulo','Funcionalidad incluida'],[
('Autenticación','Registro, inicio y cierre de sesión, persistencia de sesión y recuperación o cambio de contraseña.'),
('Perfil y preferencias','Consulta y edición del perfil, selección de gustos, intereses y recursos; fecha de nacimiento y visualización del progreso.'),
('Catálogo y recomendaciones','Actividades con metadatos y relaciones a preferencias; filtrado SQL, selección con IA, generación y mecanismos de respaldo.'),
('Actividades del usuario','Aceptación y seguimiento, finalización mediante fotografía, puntos e historial. Se permite repetir actividades.'),
('Publicaciones y amistades','Feed, reacciones, búsqueda de usuarios, solicitudes y gestión de amistades; acceso a contenido según permisos.'),
('Mensajería y salas','Conversaciones directas; salas con invitaciones, chat, evidencias y ranking. Salida de participantes y gestión por anfitrión.'),
('Moderación y soporte','Reportes de publicaciones y perfiles, revisión administrativa, sanciones con motivo y comunicación de apelación o soporte.'),
('Publicidad','Solicitudes y conversación con el equipo; revisión, creación y gestión de anuncios; segmentación por gustos y ciudad; registro de impresiones y clics.'),
('Preferencias de interfaz y avisos','Español e inglés, formato de fechas según idioma, tema claro u oscuro, avisos internos e integración de notificaciones push.')],[2400,6438])
h('6.1. Roles y responsabilidades')
p('El usuario registrado configura su perfil, utiliza recomendaciones, completa actividades e interactúa con su comunidad. Cuando solicita publicidad, actúa como solicitante dentro de la misma aplicación: prepara el contenido y consulta el estado de su solicitud. El administrador gestiona el catálogo, revisa usuarios y publicaciones, atiende soporte y administra anuncios. El anfitrión de una sala dispone de acciones específicas sobre esa sala, sin que ello le otorgue permisos generales de administración.')
h('6.2. Límites del alcance')
p('No se incluyen videos como evidencia, calendario personal de actividades, suscripciones, canje monetario de puntos ni una pasarela bancaria real. El formulario de pago publicitario es una simulación académica. La presencia de una cuota de anuncios no debe interpretarse como garantía de detención automática al agotarla.')
p('No se identificó integración meteorológica ni un modelo clínico de capacidades físicas. La ubicación se utiliza para obtener la ciudad en publicidad, no para afirmar recomendaciones basadas en clima. La evidencia fotográfica es aportada por el usuario y no certifica automáticamente que haya realizado la actividad.')
p('La aplicación dispone de infraestructura de traducción español/inglés, pero persisten textos en español en algunos módulos. Los anuncios se expresan en colones costarricenses: no se incorpora conversión de moneda. El funcionamiento integral sin conexión y una validación completa de accesibilidad quedan fuera de lo acreditado por esta documentación.')

page(); h('7. Requerimientos funcionales')
p('Los siguientes requerimientos describen las funciones de la versión documentada. Cada identificador permite relacionar una necesidad del sistema con su módulo y con una comprobación funcional. Los criterios de aceptación indican qué observar al validar la aplicación; no constituyen resultados de pruebas ya ejecutadas.')
requirements=[
('RF-01','Gestión de acceso','El sistema debe permitir registrar cuentas, iniciar y cerrar sesión y recuperar o cambiar la contraseña.','Una cuenta válida accede; una sesión cerrada vuelve al acceso y las entradas inválidas reciben un mensaje.'),
('RF-02','Configuración inicial','Una cuenta nueva debe completar el asistente de preferencias antes del flujo principal.','Se registran fecha de nacimiento, gustos, intereses y recursos y se habilita el ingreso al flujo principal.'),
('RF-03','Edición de perfil','El usuario debe consultar y actualizar sus datos y preferencias dentro de los permisos de su cuenta.','Los cambios se conservan al volver a abrir el perfil y no alteran directamente los puntos.'),
('RF-04','Recomendación compatible','El sistema debe solicitar al servidor actividades filtradas por perfil, recursos y estado.','La opción presentada corresponde a un candidato admitido por las reglas del servidor o a una alternativa validada.'),
('RF-05','Integración de IA','La recomendación debe integrar selección o generación con IA y controlar su salida.','Una opción elegida pertenece a la lista enviada; una respuesta inválida o un fallo activa el manejo de respaldo previsto.'),
('RF-06','Seguimiento de actividades','El usuario debe aceptar una actividad, consultar sus pendientes y registrar su finalización.','Una actividad aceptada aparece en seguimiento y una completada queda registrada en el historial.'),
('RF-07','Evidencia fotográfica','El sistema debe permitir seleccionar, ajustar y subir una fotografía para completar una actividad.','La evidencia queda asociada al registro correspondiente o se comunica un fallo de subida.'),
('RF-08','Puntos e historial','El sistema debe otorgar puntos mediante lógica de servidor y conservar el registro de actividades, incluidas repeticiones.','La operación de progreso actualiza el registro y los puntos según las reglas aplicables.'),
('RF-09','Publicaciones y reacciones','El usuario debe consultar publicaciones autorizadas y reaccionar a ellas.','El contenido se muestra según permisos y la reacción se refleja en la publicación.'),
('RF-10','Amistades','El usuario debe buscar personas y enviar, aceptar, rechazar o eliminar relaciones de amistad.','El estado de la relación cambia de acuerdo con la acción y se evitan relaciones duplicadas.'),
('RF-11','Mensajes directos','El sistema debe permitir conversar entre participantes autorizados y responder a mensajes.','Los participantes consultan el intercambio y una respuesta mantiene referencia al mensaje seleccionado.'),
('RF-12','Salas y retos','El usuario debe crear o integrar salas, gestionar invitaciones y participar en retos, chat y evidencias.','Una invitación aceptada permite participar; la sala muestra mensajes, miembros y resultados disponibles.'),
('RF-13','Reportes y sanciones','El sistema debe permitir reportar contenido o perfiles y al administrador revisar y sancionar con motivo.','El reporte queda disponible para gestión y una sanción conserva el motivo correspondiente.'),
('RF-14','Soporte y apelación','El usuario debe disponer de comunicación con soporte, incluida la apelación de sanciones.','El caso y los mensajes pueden ser consultados por las partes autorizadas.'),
('RF-15','Administración','El administrador debe acceder a resumen, soporte, usuarios, publicaciones, catálogo y anuncios.','Las acciones administrativas se presentan al rol correspondiente y los datos respetan las restricciones del servidor.'),
('RF-16','Solicitudes de anuncios','El usuario debe enviar contenido publicitario con fechas y presupuesto y consultar su revisión y conversación.','Una solicitud válida queda pendiente; su propietario puede consultar el estado y escribir al equipo.'),
('RF-17','Publicación patrocinada','El administrador debe crear, editar y pausar anuncios y seleccionar su segmentación.','Los anuncios elegibles se recuperan mediante las reglas de vigencia, actividad y segmentación.'),
('RF-18','Presupuesto y pago simulado','El prototipo debe calcular presupuesto CPC/CPM y representar una confirmación de pago de prueba.','La simulación confirma la operación sin cargo bancario; los datos guardados requieren el esquema de publicidad actualizado.'),
('RF-19','Idioma y tema','El usuario debe cambiar entre español e inglés y seleccionar tema claro u oscuro.','La preferencia se conserva y los componentes que la implementan se actualizan.'),
('RF-20','Avisos y ubicación','El sistema debe gestionar avisos y, con permiso, obtener la ciudad para publicidad.','La negativa al permiso no impide el flujo principal; los avisos se producen según configuración y compatibilidad del entorno.')]
for code,name,definition,criterion in requirements:
    h(code+'. '+name); p(definition); p('Criterio de aceptación: '+criterion)

page(); h('8. Requerimientos no funcionales y reglas de negocio')
p('Los requerimientos no funcionales establecen condiciones de calidad y restricciones técnicas. Se describen a partir de las decisiones del proyecto; cuando no existen mediciones, se mantienen como criterios de validación y no como garantías cuantitativas.')
table(['Identificador y requisito','Definición'],[
('RNF-01. Control de acceso','Autenticar a los usuarios y aplicar permisos en la base de datos mediante RLS y controles de servidor, además de las restricciones visuales.'),
('RNF-02. Protección de secretos','Mantener la clave de IA en funciones de servidor y evitar incluir credenciales privadas en el cliente o la documentación.'),
('RNF-03. Integridad','Gestionar estados, relaciones y asignación de puntos con operaciones de servidor y restricciones del modelo de datos.'),
('RNF-04. Usabilidad','Presentar navegación, mensajes y acciones consistentes; informar errores y estados de carga sin perder innecesariamente el contexto.'),
('RNF-05. Localización','Separar textos traducibles y utilizar el idioma seleccionado para fechas; revisar los textos literales que aún no usan los catálogos.'),
('RNF-06. Lectura y presentación','Admitir temas y escalado de texto hasta el límite configurado de 1,3. Esta medida no equivale a una certificación de accesibilidad.'),
('RNF-07. Gestión de recursos','Utilizar paginación, caché y tratamiento de imágenes para evitar consultas o cargas innecesarias. No se fija un tiempo de respuesta sin mediciones.'),
('RNF-08. Tolerancia a fallos','Manejar errores de conexión y servicios externos; aplicar validaciones y tiempos límite en la integración con IA.'),
('RNF-09. Mantenibilidad','Separar pantallas por funcionalidad, acceso a datos en servicios y configuración compartida en contextos y tema.'),
('RNF-10. Compatibilidad','Mantener una base Expo/React Native con consideraciones para móvil y web; comprobar cada entorno antes de declarar compatibilidad completa.')],[2700,6138])
h('8.1. Reglas de negocio')
for text in [
'La edad mínima de registro establecida en el proyecto es de 13 años.',
'Las recomendaciones deben considerar actividades activas, edad, recursos requeridos, afinidad y actividades en curso según las reglas SQL.',
'Los puntos se otorgan mediante operaciones de progreso en servidor; no son un saldo monetario ni un campo libremente editable por el usuario.',
'La repetición de actividades está permitida y debe conservar su trazabilidad en el historial.',
'La visualización de publicaciones, conversaciones y perfiles está sujeta a permisos y relaciones autorizadas; no se define como un feed público irrestricto.',
'Las sanciones administrativas requieren un motivo y cuentan con un canal de comunicación para soporte o apelación.',
'La solicitud de publicidad inicia pendiente de revisión; su envío no equivale a publicar automáticamente un anuncio. El SQL contempla un máximo de tres solicitudes pendientes por persona.',
'Los valores del prototipo publicitario son ₡50 por clic en CPC y ₡2 por visualización en CPM, equivalente a ₡2.000 por mil. El pago es simulado.',
'La generación de actividades mediante IA está limitada en el código a tres por usuario y día. Cada llamada a Groq dispone de un tiempo límite configurado de ocho segundos.'
]: p('• '+text)
h('8.2. Dependencias del funcionamiento')
p('El sistema depende de Supabase para autenticación, base de datos, almacenamiento y otras capacidades del servidor. Las funciones que utilizan IA requieren la configuración de Groq en las Edge Functions. Las notificaciones push requieren permisos y una compilación o entorno compatible. La funcionalidad de publicidad CPC/CPM y estado de pago requiere aplicar la migración correspondiente al esquema utilizado. Estas dependencias forman parte del alcance técnico y no se sustituyen por la presencia de una pantalla en el cliente.')

page(); h('9. Estructura técnica de soporte al alcance')
p('La interfaz está desarrollada con React Native y Expo SDK 58. El proyecto utiliza principalmente JavaScript, con algunos archivos TypeScript, y organiza el código por funcionalidades. Las pantallas se apoyan en servicios para consultar o modificar información, mientras los contextos comparten estados como sesión, idioma y tema.')
p('Supabase proporciona autenticación, PostgreSQL, almacenamiento y funciones de servidor. El modelo de datos relaciona perfiles con gustos, intereses y recursos mediante tablas intermedias; el catálogo de actividades posee relaciones equivalentes. Las actividades del usuario registran el progreso, y otros grupos de tablas respaldan publicaciones, amistades, mensajes, salas, soporte y anuncios.')
p('Las Edge Functions conectan el servidor con Groq para recomendaciones y moderación. Esta separación permite mantener la clave de IA fuera de la aplicación y validar las respuestas antes de utilizarlas. El filtrado SQL conserva las restricciones de compatibilidad; la IA complementa la selección e interpretación de actividades.')
h('10. Prototipado de interfaces y navegación')
p('Los wireframes siguientes representan la organización de las principales interfaces de Hobbier. Se elaboraron como esquemas de baja fidelidad a partir de las pantallas de la versión actual para documentar su estructura y la relación entre acciones. No se presentan como los archivos históricos de Figma ni como capturas exactas de la aplicación; omiten colores, imágenes finales y detalles visuales secundarios.')
p('El flujo principal es: acceso → configuración inicial, cuando corresponda → inicio y recomendación → actividad pendiente → evidencia y finalización → historial y publicación. Desde la navegación se accede a comunidad, salas, mensajes y perfil. El rol administrador dispone de navegación propia para sus módulos de gestión.')

def wire(title, left, right, explanation):
    page(); h(title)
    table(['Distribución de la pantalla','Acciones y propósito'],list(zip(left,right)),[4400,4438])
    p(explanation)

wire('10.1. Wireframe: acceso y configuración inicial',
['HOBBIER\nIdentidad de la aplicación','Correo: [________________]\nContraseña: [____________]','[Iniciar sesión]\n[Crear cuenta]  [Recuperar acceso]','CONFIGURACIÓN INICIAL\nFecha de nacimiento [____]','Buscar [_______________]\nGustos [ ] [ ]   Intereses [ ] [ ]\nRecursos [ ] [ ]','[Siguiente] / [Guardar preferencias]'],
['Identificar el sistema antes del ingreso.','Introducir los datos requeridos por la autenticación.','Acceder a la cuenta o iniciar los flujos alternativos.','Solicitar la información de edad para el perfil.','Elegir elementos de los catálogos que alimentan las recomendaciones.','Completar el asistente y continuar al flujo principal.'],
'Este esquema agrupa dos etapas consecutivas y no implica que todos los campos aparezcan en una única pantalla. El acceso conduce al asistente cuando faltan preferencias iniciales; una cuenta configurada continúa hacia el inicio. Se relaciona con RF-01, RF-02 y RF-03.')
wire('10.2. Wireframe: inicio y recomendación',
['INICIO\nSaludo / datos del usuario','PROPUESTA PRINCIPAL\n[Sorpréndeme]','ACTIVIDAD RECOMENDADA\nTítulo de la actividad\nDescripción / motivo\nPuntos','[Aceptar actividad] / [Cerrar]','ACTIVIDADES EN CURSO\nTarjeta del reto pendiente','NAVEGACIÓN PRINCIPAL\nInicio | Comunidad | Salas | Mensajes | Perfil'],
['Situar a la persona en su cuenta.','Solicitar al servidor una propuesta personalizada.','Presentar la información necesaria para decidir.','Registrar la aceptación o descartar el diálogo.','Retomar una actividad que ya fue aceptada.','Acceder a las áreas principales; los nombres son esquemáticos.'],
'La recomendación se representa como un diálogo asociado al inicio. El botón principal inicia una solicitud, no un cálculo completo dentro de la pantalla. Al aceptar, la actividad queda disponible para seguimiento. Se relaciona con RF-04, RF-05 y RF-06.')
wire('10.3. Wireframe: actividad y evidencia fotográfica',
['ACTIVIDAD PENDIENTE\nTítulo y descripción','PROGRESO\nEstado / puntos asociados','EVIDENCIA\n[Seleccionar fotografía]','VISTA PREVIA DE IMAGEN\n[Área de encuadre]','[Confirmar evidencia]\n[Completar actividad]','RESULTADO\nConfirmación / puntos / historial'],
['Consultar qué actividad se aceptó.','Identificar el estado y la recompensa interna.','Elegir el archivo que documenta la realización.','Ajustar la fotografía antes de su subida.','Enviar la evidencia y registrar el progreso.','Visualizar el resultado de la operación del servidor.'],
'El ajuste de imagen y la confirmación pueden presentarse en componentes o diálogos separados. El objetivo del wireframe es representar la secuencia de evidencia y finalización. La fotografía no equivale a una verificación automática del cumplimiento. Se relaciona con RF-06, RF-07 y RF-08.')
wire('10.4. Wireframe: comunidad y mensajes',
['COMUNIDAD\nListado de publicaciones','PUBLICACIÓN\nUsuario / actividad / fecha','[Fotografía de evidencia]\nDescripción del logro','[Reacción]   [Opciones / Reportar]','AMISTADES\nBuscar [________]\nSolicitudes / listado','MENSAJES\nConversación\n[Responder]  [Escribir mensaje] [Enviar]'],
['Explorar los logros disponibles según permisos.','Reconocer la persona y actividad de la publicación.','Mostrar el contenido compartido.','Participar o comunicar un incidente.','Gestionar las relaciones entre usuarios.','Mantener una conversación autorizada.'],
'El esquema reúne interfaces relacionadas, sin plantear una sola pantalla con todos los elementos. Las relaciones de amistad y las políticas de servidor delimitan la información que puede consultarse. Se relaciona con RF-09, RF-10, RF-11 y RF-13.')
wire('10.5. Wireframe: salas y retos compartidos',
['SALAS\n[Crear sala]   Invitaciones','TARJETA DE SALA\nNombre / reto / participantes','DETALLE DE SALA\nActividad y miembros','CHAT\nMensajes del grupo\n[Escribir] [Enviar]','EVIDENCIAS Y RANKING\nParticipante / progreso / puntos','ACCIONES\n[Invitar] / [Salir]\nGestión del anfitrión'],
['Entrar a un reto o crear una experiencia grupal.','Elegir una sala del listado.','Consultar el objetivo y quienes participan.','Coordinar y compartir mensajes con el grupo.','Consultar los resultados y evidencias registrados.','Ejecutar acciones según la condición de participante o anfitrión.'],
'La lista conduce al detalle de una sala. Las invitaciones y las acciones de gestión varían según el rol dentro del grupo y el estado del reto. Se relaciona con RF-12.')
wire('10.6. Wireframe: solicitud publicitaria',
['SOLICITAR ANUNCIO\nAnunciante / tipo','CONTENIDO\nTítulo [_______]\nDescripción / imagen / enlace','VIGENCIA\nInicio [____]  Fin [____]','PRESUPUESTO\n[CPM] [CPC]\nCuota / monto calculado','[Pago simulado] / [Enviar solicitud]','MIS SOLICITUDES\nEstado / motivo de revisión\n[Abrir conversación]'],
['Identificar el contenido que se desea difundir.','Recoger los datos del anuncio y, cuando corresponda, del evento.','Definir el periodo solicitado.','Elegir la modalidad y visualizar el cálculo.','Representar una operación de prueba y remitir la solicitud para revisión.','Consultar la respuesta y comunicarse con el equipo.'],
'La simulación de pago no procesa una transacción bancaria ni publica el anuncio por sí misma. La revisión y creación del anuncio corresponden a la administración. Se relaciona con RF-16, RF-17 y RF-18.')
wire('10.7. Wireframe: panel administrativo',
['ADMINISTRACIÓN\n[Volver a la app]','SECCIONES\nResumen | Soporte | Usuarios\nPosts | Catálogo | Anuncios','LISTADO DEL MÓDULO\nTarjetas / estados / información','[Ver detalle]   [Gestionar]','DETALLE / DIÁLOGO\nContenido / motivo / acciones','[Guardar / Confirmar] [Cancelar]\n[Página anterior] [Página siguiente]'],
['Identificar el modo de gestión y permitir su salida.','Seleccionar el área administrativa.','Consultar registros y su situación.','Abrir las acciones permitidas para cada elemento.','Revisar antes de modificar, sancionar o publicar.','Confirmar la gestión y recorrer listas paginadas.'],
'Las acciones concretas dependen de la sección elegida. La edición del catálogo, la revisión de reportes y la aprobación de publicidad comparten una organización de listado y detalle, aunque utilizan componentes distintos. Se relaciona con RF-13, RF-14, RF-15 y RF-17.')
wire('10.8. Wireframe: perfil y preferencias de presentación',
['PERFIL\nFoto / nombre / usuario','PROGRESO\nPuntos e historial','[Editar perfil]\n[Modificar preferencias]','CONFIGURACIÓN\nIdioma [Español / English]','APARIENCIA\nTema [Claro / Oscuro]','CUENTA\n[Cambiar contraseña] [Cerrar sesión]'],
['Mostrar la identidad de la cuenta.','Consultar los avances registrados.','Actualizar datos y preferencias de actividades.','Seleccionar el idioma disponible.','Cambiar la presentación visual.','Acceder a operaciones de la cuenta.'],
'Este wireframe agrupa perfil y ajustes como áreas relacionadas; no reproduce una captura literal. La selección de idioma modifica los componentes que utilizan los catálogos y el formateo correspondiente. Se relaciona con RF-03 y RF-19.')

page(); h('11. Relación entre requerimientos, prototipos e implementación')
p('La siguiente relación permite ubicar en el proyecto las funciones descritas y los wireframes que las representan. Su finalidad es mantener coherencia entre la documentación de alcance y la solución desarrollada.')
table(['Requerimientos','Wireframes','Componentes o áreas del proyecto'],[
('RF-01 a RF-03','10.1 y 10.8','src/features/auth, onboarding y profile; src/context/AuthContext.js.'),
('RF-04 y RF-05','10.2','src/features/recommendations; supabase/functions/recommend-activity; funciones de recomendación en SQL.'),
('RF-06 a RF-08','10.3','src/features/user_activities; src/services/activityService.js; funciones de progreso en SQL.'),
('RF-09 a RF-11','10.4','src/features/feed, friends y messages; servicios socialService y directMessagesService.'),
('RF-12','10.5','src/features/rooms; src/services/roomsService.js; migraciones de salas.'),
('RF-13 a RF-15','10.4 y 10.7','src/features/admin; servicios adminService y supportService; funciones de moderación.'),
('RF-16 a RF-18','10.6 y 10.7','AdRequestModal; AdminAdRequests; adsService; SimulatedPaymentModal; migración 20261102_ad_pricing_and_payment.sql.'),
('RF-19 y RF-20','10.8 y áreas con avisos','LanguageContext, ThemeContext, dateFormat, pushService y lógica de ubicación de adsService.')],[1750,1550,5538])
h('12. Consideraciones finales del alcance')
p('La versión actual conserva el propósito que dio origen a Hobbier: ayudar a decidir qué hacer con el tiempo libre según cada persona. El desarrollo amplió esa propuesta con recomendaciones asistidas por IA, comunicación y retos grupales, manteniendo el registro de actividades y evidencias como parte central de la experiencia.')
p('La documentación distingue las funciones implementadas de las simulaciones y de los aspectos pendientes de validación. La publicación comercial, los cobros reales, la localización completa y la comprobación integral en plataformas requieren trabajo adicional. El alcance descrito se refiere al código disponible y supone configurar correctamente los servicios y las migraciones que utiliza cada módulo.')
h('Referencias de la documentación')
p('Equipo Hobbier. Defensa del Proyecto Final: propuesta de la aplicación a desarrollar. Primera entrega del curso EIF-409, 2026. Documento utilizado como referencia de formato, origen y alcance inicial.')
p('Benavides Vargas, J. Lineamientos para la presentación final de la aplicación desarrollada. Curso EIF-409 Aplicaciones Informáticas Globales, segundo semestre de 2026. Referencia para los apartados de origen, justificación y documentación propia del desarrollo.')
p('Equipo Hobbier. Código fuente y esquema de datos del proyecto, versión local revisada el 2 de noviembre de 2026. Repositorio: https://github.com/Ortiz0022/hobbier_app.')

body.append(section)
# Conservar las declaraciones originales: los valores mc:Ignorable y otras
# referencias de compatibilidad pueden usar prefijos que ElementTree omite.
serialized=E.tostring(root,encoding='unicode')
start=re.search(r'<w:document\b[^>]*>',raw).group(0)
serialized=re.sub(r'<w:document\b[^>]*>',lambda m:start,serialized,count=1)
with ZipFile(TARGET,'w',ZIP_DEFLATED) as out:
    for info in archive.infolist():
        out.writestr(info, ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+serialized).encode() if info.filename=='word/document.xml' else archive.read(info.filename))
with ZipFile(TARGET) as check:
    assert check.testzip() is None
    for name in check.namelist():
        if name.endswith('.xml'): E.fromstring(check.read(name))
    content=E.fromstring(check.read('word/document.xml'))
    assert len(content.findall('.//'+q('tbl'))) == 11
    assert all(code in serialized for code in ['RF-01','RF-20','RNF-10','10.8.'])
print(TARGET.resolve())
print('DOCX validado: formato original, 20 requerimientos funcionales, 10 no funcionales y 8 wireframes.')
