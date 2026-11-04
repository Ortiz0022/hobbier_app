from pathlib import Path
import os, sys, math
sys.path.insert(0,str(Path(os.environ['TEMP'])/'hobbier-pptx-tools'))
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

ROOT=Path(__file__).resolve().parents[1]
P=Presentation(); P.slide_width=Inches(13.333); P.slide_height=Inches(7.5)
C={'cream':'FFF9F0','white':'FFFFFF','ink':'053E4A','teal':'0C8AA6','cyan':'00B4D8','orange':'FF8F21','pink':'F1C2B8','soft':'EAF7FA','yellow':'FEFCBF','muted':'526572'}
def color(k):return RGBColor.from_string(C.get(k,k))
def shape(s,x,y,w,h,fill,kind=MSO_SHAPE.ROUNDED_RECTANGLE,rotate=0):
    a=s.shapes.add_shape(kind,Inches(x),Inches(y),Inches(w),Inches(h)); a.fill.solid(); a.fill.fore_color.rgb=color(fill);a.line.fill.background(); a.rotation=rotate
    if kind==MSO_SHAPE.ROUNDED_RECTANGLE:a.adjustments[0]=.18
    return a
def txt(s,x,y,w,h,t,size=22,fill='ink',bold=False,font='Aptos',align=None):
    a=s.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h)); f=a.text_frame;f.word_wrap=True
    f.margin_left=f.margin_right=Inches(.025);f.margin_top=f.margin_bottom=0
    for i,line in enumerate(t.split('\n')):
        p=f.paragraphs[0] if i==0 else f.add_paragraph();p.text=line;p.font.name=font;p.font.size=Pt(size);p.font.bold=bold;p.font.color.rgb=color(fill);p.space_after=Pt(6)
        if align is not None:p.alignment=align
    return a
def pill(s,x,y,w,t,fill='yellow',rotation=0):
    shape(s,x,y,w,.42,fill,rotate=rotation);txt(s,x+.12,y+.07,w-.24,.3,t,12,'ink',True)
def sparkle(s,x,y,size=.35,fill='orange',rotation=0):shape(s,x,y,size,size,fill,MSO_SHAPE.STAR_4_POINT,rotation)
def base(num,title,kicker,time,bg='cream'):
    s=P.slides.add_slide(P.slide_layouts[6]);s.background.fill.solid();s.background.fill.fore_color.rgb=color(bg)
    shape(s,11.8,.28,.85,.85,'pink',MSO_SHAPE.OVAL);sparkle(s,12.1,.48,.5,'orange',15)
    pill(s,.55,.33,2.7,kicker,'soft')
    txt(s,.55,1,11.5,.8,title,34,bold=True,font='Arial Rounded MT Bold')
    txt(s,.6,7.11,9,.2,'HOBBIER  /  EIF-409 · UNA · II semestre 2026',10,'muted')
    txt(s,10.5,7.08,2.2,.25,f'{time}   •   {num:02} / 09',11,'muted',True,align=PP_ALIGN.RIGHT)
    shape(s,.6,6.95,12.1,.025,'teal',MSO_SHAPE.RECTANGLE)
    return s
def note(s,t):s.notes_slide.notes_text_frame.text=t
def card(s,x,y,w,h,tag,title,body,fill='white'):
    shape(s,x+.06,y+.08,w,h,'pink');shape(s,x,y,w,h,fill)
    pill(s,x+.2,y+.18,1,tag,'orange');txt(s,x+.22,y+.8,w-.44,.6,title,23,bold=True);txt(s,x+.22,y+1.48,w-.44,h-1.6,body,19)

# 1. Nombre / identidad.
s=base(1,'','PROYECTO FINAL','0:30 min')
shape(s,.7,1.65,7.5,3.05,'soft',rotate=-2);txt(s,1,1.92,7,1.1,'Hobbier',66,'teal',True,'Arial Rounded MT Bold')
txt(s,1,3.13,6.5,1.25,'Descubre actividades.\nComparte experiencias.\nAprovecha tu tiempo libre.',27,bold=True)
shape(s,9.05,1.82,3.15,3.15,'orange',MSO_SHAPE.OVAL)
s.shapes.add_picture(str(ROOT/'assets/Logo.png'),Inches(8.85),Inches(1.5),width=Inches(3.5),height=Inches(3.5))
sparkle(s,8.15,1.35,.65);sparkle(s,11.9,4.9,.55,'teal');pill(s,8.65,5.12,3.45,'¡Del “qué hago” al “lo hice”!','yellow',-3)
txt(s,.85,5.12,7.4,.8,'Angélica Ortiz · Greilyn Esquivel\nKatheryn Méndez · Krystel Salazar',20,bold=True)
txt(s,.85,6.05,11.5,.55,'Universidad Nacional · Sede Chorotega, Campus Nicoya\nAplicaciones Informáticas Globales · Profesor: José Abraham Benavides Vargas',14,'muted')
note(s,'Punto 1: nombre de la aplicación. Tiempo: 30 segundos. Presentar equipo. Nombres completos: Angélica María Ortiz Barrantes; Greilyn María Esquivel Salazar; Katheryn Méndez Quirós; Krystel Fabiana Salazar Chavarría. Esta presentación contempla 25 minutos y después 10 minutos para preguntas.')

# 2. Origen / todos los componentes de justificación.
s=base(2,'¿Y si el tiempo libre empieza con una idea?','ORIGEN Y JUSTIFICACIÓN','2 min')
pill(s,.65,1.95,7.9,'La chispa: un TikTok + el interés por cumplir metas personales.','yellow')
for x,y,title,body,fill in [(.65,2.7,'El problema','Muchas ideas, pero pocas adaptadas a gustos, edad y recursos.','white'),(6.85,2.7,'La ventaja','Una propuesta concreta y compatible para empezar a actuar.','soft'),(.65,4.65,'Lo que nos distingue','Personalización + seguimiento con evidencias + comunidad.','pink'),(6.85,4.65,'Por qué usarla','Descubrir hobbies, variar la rutina y compartir retos con amigos.','white')]:
    shape(s,x,y,5.8,1.72,fill);txt(s,x+.25,y+.18,5.3,.42,title,23,bold=True);txt(s,x+.25,y+.76,5.25,.85,body,20)
note(s,'Punto 2 completo: origen, impulso, problema, ventaja, diferenciación y atractivo para el público. Tiempo: 2 minutos. El video de TikTok inspiró el proyecto y el interés del equipo por las metas personales. No afirmar que hubo un estudio de mercado o una mejora de hábitos medida. La diferenciación describe la combinación del producto, no superioridad competitiva probada.')

# 3. Descripción general.
s=base(3,'De una preferencia a un logro','QUÉ HACE HOBBIER','1 min')
items=[('01','Personaliza','Edad, gustos,\nintereses y recursos.','soft'),('02','Descubre','Recomendaciones\nasistidas por IA.','pink'),('03','Completa','Foto de evidencia,\npuntos e historial.','yellow'),('04','Comparte','Amigos, reacciones,\nmensajes y salas.','soft')]
for i,(n,t,b,f) in enumerate(items):
    x=.65+i*3.14;shape(s,x,2.3,2.86,3.3,f);txt(s,x+.2,2.52,2.4,.8,n,40,'teal',True);txt(s,x+.2,3.6,2.45,.55,t,24,bold=True);txt(s,x+.2,4.38,2.43,.95,b,19)
    if i<3:txt(s,x+2.85,3.15,.3,.5,'›',30,'orange',True)
pill(s,1.55,6.05,10.2,'También: moderación, soporte y administración para gestionar la experiencia.','white')
note(s,'Punto 3: descripción general. Tiempo: 1 minuto. Explicar el flujo completo sin abrir todavía la aplicación. La fotografía es evidencia aportada por el usuario, no verificación automática del cumplimiento. No afirmar recomendaciones clínicas ni integración meteorológica. Las salas permiten retos compartidos, chat, evidencias y ranking.')

# 4. Audiencia / ingreso.
s=base(4,'Una comunidad con una idea de negocio','PÚBLICO Y MODELO DE INGRESOS','1:30 min')
card(s,.65,2.15,5.8,3.65,'PARA','Quienes buscan algo distinto','Adolescentes y adultos interesados en hobbies.\nSegmento propuesto: 15–55 años.\nRegistro desde los 13 años.','soft')
card(s,6.85,2.15,5.8,3.65,'CÓMO','Publicidad patrocinada','Negocios, actividades y eventos.\nSegmentación por gustos y ciudad.\nRevisión administrativa; CPC / CPM.','white')
shape(s,1.35,6.1,10.6,.52,'yellow');txt(s,1.58,6.2,10.15,.3,'Pago actual: simulación académica. No se realizan cargos bancarios.',17,bold=True)
note(s,'Punto 4. Tiempo: 1 minuto 30 segundos. Público principal y segundo segmento de anunciantes. El mínimo de registro no equivale a validación del producto para todas las edades. El prototipo calcula ₡50 por clic y ₡2 por visualización, equivalente a ₡2.000 por mil; las tarifas no están validadas comercialmente. La simulación no representa cobros reales. No prometer detención automática por cuota sin evidencia de esa lógica.')

# 5. Técnica.
s=base(5,'Lo que mueve la experiencia','ARQUITECTURA Y HERRAMIENTAS','2 min')
for x,w,t,b,f in [(.65,3.65,'Aplicación','React Native + Expo SDK 58\nPrincipalmente JavaScript\nContextos + servicios','soft'),(4.85,3.65,'Supabase','PostgreSQL · Auth · Storage\nRealtime · funciones SQL\nPermisos RLS','pink'),(9.05,3.65,'IA en servidor','Edge Functions + Groq\nRecomendación\ny moderación','yellow')]:
    shape(s,x,2.25,w,2.65,f);txt(s,x+.2,2.5,w-.4,.5,t,25,bold=True);txt(s,x+.2,3.25,w-.4,1.35,b,19)
txt(s,4.38,3.25,.4,.5,'→',24,'teal',True);txt(s,8.58,3.25,.4,.5,'→',24,'teal',True)
shape(s,.7,5.3,11.95,1.06,'teal');txt(s,.95,5.5,11.45,.7,'SQL filtra la compatibilidad · IA validada y con respaldo\nPuntos en servidor · Acceso por autenticación, roles y políticas',20,'white',True)
note(s,'Punto 5. Tiempo: 2 minutos. Explicar la arquitectura cliente → servicios → Supabase. Auth gestiona sesión; PostgreSQL conserva datos; Storage fotografías. Edge Functions llaman a Groq sin exponer la clave privada al cliente. La recomendación combina filtros de edad, recursos, afinidad y estado con selección/generación validada. Existen tiempos límite y alternativas de respaldo. JavaScript es mayoritario, TypeScript puntual. La versión declarada procede del package.json revisado. No afirmar auditoría completa de seguridad.')

# 6. Globalidad.
s=base(6,'Globalidad: lo que hicimos y lo que sigue','IDIOMA · FECHAS · MONEDA · ACCESIBILIDAD','2 min')
for y,emoji,a,b,f in [(2.15,'01','Español e inglés, con cobertura parcial','Completar textos sin traducir.','soft'),(3.11,'02','Fechas según idioma y huso del dispositivo','Ampliar pruebas entre regiones.','pink'),(4.07,'03','Publicidad en colones costarricenses','Multimoneda y conversión pendientes.','yellow'),(5.03,'04','Temas claro/oscuro y escalado de texto','Evaluación integral de accesibilidad.','soft')]:
    shape(s,.65,y,.65,.65,'teal',MSO_SHAPE.OVAL);txt(s,.78,y+.16,.43,.3,emoji,16,'white',True)
    shape(s,1.55,y,11.1,.72,f);txt(s,1.75,y+.18,5.6,.4,a,18,bold=True);txt(s,7.6,y+.18,4.85,.4,b,17,'muted')
txt(s,.8,6.22,11.9,.48,'Evidencia: cambio de idioma, fecha y tema en la demo. Lighthouse / benchmarking: sin resultados adjuntos.',15,'muted')
note(s,'Punto 6. Tiempo: 2 minutos. Evidencia técnica: LanguageContext y es.json/en.json; dateFormat con Intl; precios en es-CR; ThemeContext y scaledText. Existen textos literales en español; no afirmar cobertura total. Escalado limitado a 1,3 no certifica accesibilidad. Mostrar idioma, fecha y tema durante la demo. No se dispone de informes Lighthouse ni benchmarking en la revisión. Si se obtienen, incorporar fecha, versión, dispositivo y resultado; no inventar cifras.')

# 7. Evolución.
s=base(7,'Del MVP a lo que construimos','EVOLUCIÓN POR SEGUIMIENTO','2 min')
pill(s,.65,1.95,11.95,'Ampliaciones: IA · Mensajería · Reacciones · Salas grupales · Publicidad','yellow')
t=s.shapes.add_table(6,3,Inches(.7),Inches(2.65),Inches(11.95),Inches(2.7)).table
for j,w in enumerate([1.6,5.7,4.65]):t.columns[j].width=Inches(w)
rows=[['Seguimiento','Qué se cumplió','Qué quedó pendiente']]+[[f'S{i}','Por confirmar con la entrega real','Por confirmar con la entrega real'] for i in range(1,6)]
for i,row in enumerate(rows):
    for j,val in enumerate(row):
        c=t.cell(i,j);c.text=val;c.fill.solid();c.fill.fore_color.rgb=color('teal' if i==0 else ('white' if i%2 else 'soft'));c.margin_left=Inches(.14);c.margin_top=Inches(.08)
        for p in c.text_frame.paragraphs:p.font.name='Aptos';p.font.size=Pt(16);p.font.bold=i==0;p.font.color.rgb=color('white' if i==0 else 'ink')
for x,label,url in [(.75,'Abrir repositorio ↗','https://github.com/Ortiz0022/hobbier_app'),(6.9,'Abrir tablero ↗','https://dev.azure.com/katherynmendezquiros0663/HOBBIER')]:
    shape(s,x,5.75,5.65,.58,'pink');a=txt(s,x+.2,5.91,5.2,.35,label,18,bold=True);a.text_frame.paragraphs[0].runs[0].hyperlink.address=url
txt(s,.8,6.48,11.8,.3,'Antes de exponer: sustituir las filas por resultados y evidencias del equipo.',14,'muted')
note(s,'Punto 7. Tiempo: 2 minutos. Esta tabla debe completarse con los compromisos, cumplimientos y pendientes de cada seguimiento y evidencia del tablero. No es posible asignar los módulos actuales a una entrega específica sin esos documentos. No presentar como hechos los espacios por confirmar. La propuesta inicial excluía IA, chat, reacciones, geolocalización y pagos; el código amplió esas funciones, con pago únicamente simulado y ubicación para publicidad. Los enlaces son clicables; comprobar el acceso al tablero. Esto reemplaza el cronograma.')

# 8. Demo.
s=base(8,'¡Ahora sí: Hobbier en acción!','DEMOSTRACIÓN FUNCIONAL EN VIVO','12 min','soft')
pill(s,.7,1.98,5.9,'Preferencias → reto → logro → comunidad → gestión','yellow')
for x,y,n,title,b in [(.75,2.8,'5 min','El flujo central','Preferencias → “Sorpréndeme” → aceptar\nFoto → completar → puntos e historial'),(6.9,2.8,'3 min','Con amigos','Publicación y reacción\nSala con chat, evidencias y ranking'),(.75,4.65,'1 min','Globalidad visible','Cambiar idioma, observar una fecha\ny alternar el tema'),(6.9,4.65,'3 min','Publicidad y administración','Solicitud, presupuesto y pago simulado\nRevisión desde el panel')]:
    shape(s,x,y,5.65,1.62,'white');pill(s,x+.18,y+.16,1.05,n,'orange');txt(s,x+1.43,y+.17,4,.4,title,21,bold=True);txt(s,x+.2,y+.78,5.25,.75,b,17)
txt(s,.9,6.51,11.8,.3,'Listos antes de iniciar: conexión + cuentas + datos de ejemplo + video de respaldo.',15,'muted',True)
note(s,'Punto 8. Tiempo: 12 minutos. Pasar a la aplicación. Primera parte: cuenta con preferencias y actividad compatible, fotografía de prueba y puntos iniciales conocidos. Luego cuenta amiga con sesión abierta, sala precargada y conversación. Cambio de idioma/fecha/tema en pantallas comprobadas. Últimos tres minutos: solicitud de publicidad y revisión administrativa. Identificar el pago como simulación. Verificar migración 20261102_ad_pricing_and_payment.sql, funciones y permisos. Preparar conexión, energía, proyección, sesiones y datos; no mostrar claves. Plan B: video del mismo recorrido y capturas, identificados como respaldo si se usan. Contrastar el guion con el ensayo del Seguimiento #5, cuyo material no estuvo disponible para esta preparación.')

# 9. Experiencias / cierre.
s=base(9,'Construir también fue aprender','RETOS Y EXPERIENCIAS DEL EQUIPO','2 min')
for x,title,b,f in [(.7,'Permisos','Coordinar usuarios, amistades\ny administración.','soft'),(4.92,'IA y errores','Validar respuestas y prever\nfallos de servicios externos.','pink'),(9.14,'Experiencia','Resolver fotografías, navegación\ny actualización de datos.','yellow')]:
    shape(s,x,2.2,3.5,1.85,f);txt(s,x+.2,2.42,3.1,.45,title,22,bold=True);txt(s,x+.2,3.1,3.1,.8,b,17)
txt(s,.8,4.42,11.8,.5,'Una experiencia concreta por integrante: tarea → dificultad → aprendizaje.',20,bold=True)
txt(s,.8,5.02,11.8,.55,'Angélica · Greilyn · Katheryn · Krystel',21,'teal',True)
shape(s,.75,5.84,11.85,.78,'teal');txt(s,1,6.04,11.35,.4,'Descubrir, realizar y compartir. ¿Preguntas?',26,'white',True)
note(s,'Punto 9. Tiempo: 2 minutos; después 10 minutos de preguntas. Cada integrante debe preparar su ejemplo real de tarea, dificultad y aprendizaje. No se atribuyen experiencias individuales que el equipo no confirmó. Retos documentados: permisos RLS y recursión en amistades; validación y respaldo de IA; manejo de fotografías, caché e invalidación, navegación y fechas. Añadir a estas notas los ejemplos personales antes de presentar. Todas las integrantes deben poder responder sobre el flujo principal, SQL/IA, puntos, permisos, globalidad y pago simulado. Cierre: Hobbier conecta preferencias con actividades concretas y una experiencia compartida.')

P.core_properties.title='Hobbier · Descubrir, realizar y compartir'
P.core_properties.author='Equipo Hobbier';P.core_properties.subject='Presentación final · 9 puntos · 9 diapositivas'
target=ROOT/'docs/Hobbier_Presentacion_Final_Creativa_2026.pptx';P.save(target)
check=Presentation(target);assert len(check.slides)==9
assert all(s.has_notes_slide for s in check.slides)
for s in check.slides:
    for a in s.shapes:
        assert a.left>=0 and a.top>=0
        assert a.left+a.width<=P.slide_width+1000
        assert a.top+a.height<=P.slide_height+1000
print(target)
print('Validado: 9 diapositivas, 9 puntos cubiertos en estructura, notas y enlaces. Seguimientos y experiencias personales requieren datos reales del equipo.')
