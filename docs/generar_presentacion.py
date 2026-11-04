from pathlib import Path
import os, sys
sys.path.insert(0, str(Path(os.environ['TEMP']) / 'hobbier-pptx-tools'))
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
prs=Presentation(); prs.slide_width=Inches(13.333); prs.slide_height=Inches(7.5)
C={'bg':'F7FAFB','ink':'121B22','muted':'526572','teal':'0C8AA6','dark':'053E4A','soft':'EAF7FA','orange':'FF8F21','white':'FFFFFF'}
def rect(s,x,y,w,h,color,radius=False):
    sh=s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE, Inches(x),Inches(y),Inches(w),Inches(h))
    sh.fill.solid(); sh.fill.fore_color.rgb=RGBColor.from_string(C.get(color,color)); sh.line.fill.background()
    if radius:
        sh.adjustments[0]=.12
    return sh
def text(s,x,y,w,h,txt,size=20,color='ink',bold=False):
    sh=s.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h)); tf=sh.text_frame; tf.word_wrap=True
    tf.margin_left=tf.margin_right=Inches(.02); tf.margin_top=tf.margin_bottom=0
    for i,line in enumerate(txt.split('\n')):
        p=tf.paragraphs[0] if i==0 else tf.add_paragraph(); p.text=line; p.font.name='Aptos'; p.font.size=Pt(size); p.font.bold=bold; p.font.color.rgb=RGBColor.from_string(C.get(color,color)); p.space_after=Pt(9)
    return sh
def base(n,title,label,time):
    s=prs.slides.add_slide(prs.slide_layouts[6]); s.background.fill.solid(); s.background.fill.fore_color.rgb=RGBColor.from_string(C['bg'])
    rect(s,0,0,.15,7.5,'teal'); text(s,.55,.3,10,.35,label.upper(),12,'teal',True)
    text(s,.55,.85,12, .7,title,32,'dark',True)
    rect(s,.55,6.98,12.2,.014,'teal'); text(s,.55,7.12,10,.2,'HOBBIER  /  EIF-409 · UNA · II semestre 2026',10,'muted')
    text(s,11.3,7.08,1.5,.25,f'{time}  |  {n:02}',11,'muted')
    return s
def card(s,x,y,w,h,title,body):
    rect(s,x,y,w,h,'white',True); rect(s,x+.2,y+.25,.06,.4,'orange')
    text(s,x+.4,y+.2,w-.65,.45,title,21,'teal',True); text(s,x+.3,y+.73,w-.6,h-.8,body,18)
def notes(s,txt): s.notes_slide.notes_text_frame.text=txt

s=base(1,'Hobbier: origen y solución','01 / La idea', '3 min')
text(s,.6,1.7,8,.8,'Descubre actividades, comparte experiencias\ny aprovecha tu tiempo libre.',24,'teal',True)
logo=ROOT/'assets/Logo.png'
im=Image.open(logo); ratio=im.width/im.height
w=min(2.1,1.1*ratio); hh=w/ratio
s.shapes.add_picture(str(logo),Inches(10.1),Inches(1.65),width=Inches(w),height=Inches(hh))
for x,y,t,b in [(.6,2.8,'Origen','Un video de TikTok y el interés por apoyar el cumplimiento de metas personales.'),(6.85,2.8,'Problema','Encontrar actividades acordes con gustos, edad y recursos disponibles.'),(.6,4.6,'Solución','Recomendar actividades, registrar evidencias fotográficas y compartir logros.'),(6.85,4.6,'Diferenciación','Personalización, seguimiento y comunidad en una misma aplicación.')]:
    card(s,x,y,5.9,1.65,t,b)
text(s,.65,6.4,12,.45,'Angélica Ortiz · Greilyn Esquivel · Katheryn Méndez · Krystel Salazar',14,'muted')
notes(s,'Tiempo: 3 minutos. Universidad Nacional, Sede Chorotega, Campus Nicoya. Curso EIF-409, Aplicaciones Informáticas Globales. Profesor: José Abraham Benavides Vargas.\nEquipo: Angélica María Ortiz Barrantes, Greilyn María Esquivel Salazar, Katheryn Méndez Quirós y Krystel Fabiana Salazar Chavarría.\nExplicar el origen y la dificultad de decidir qué hacer. La propuesta reúne descubrimiento, realización y comunidad. No atribuir mejoras de hábitos que no se hayan medido.')

s=base(2,'Público meta y modelo de ingresos','02 / Usuarios y sostenibilidad','2 min')
card(s,.6,1.85,5.9,3.8,'Para quienes quieren hacer algo distinto','Adolescentes y adultos interesados en hobbies y en variar su rutina.\nSegmento planteado: 15–55 años.\nRegistro permitido desde los 13 años.')
card(s,6.85,1.85,5.9,3.8,'Publicidad patrocinada','Negocios, actividades y eventos.\nSegmentación por gustos y ciudad.\nSolicitudes revisadas por administración.\nPresupuestos CPC / CPM.')
rect(s,.65,5.95,12.05,.65,'soft',True); text(s,.9,6.09,11.5,.4,'Valor: facilitar la elección y participar con amigos. Pago publicitario: simulado.',18,'dark',True)
notes(s,'Tiempo: 2 minutos. Diferenciar público objetivo y regla de edad mínima. El valor es reducir el esfuerzo de elegir una actividad y compartir experiencias. El prototipo contempla ₡50 por clic y ₡2 por visualización (₡2.000 por mil), sin validación comercial. El pago es académico y simulado: no hay cargos bancarios reales ni ingresos acreditados.')

s=base(3,'Arquitectura y globalidad','03 / Cómo está construida','4 min')
rect(s,.6,1.8,12.1,.82,'dark',True); text(s,.85,2.01,11.6,.45,'React Native + Expo  →  Supabase  →  PostgreSQL · Auth · Storage',23,'white',True)
text(s,.7,2.85,5.7,.45,'Reglas y servicios',23,'teal',True)
text(s,.7,3.5,5.55,2.6,'• Edge Functions + Groq: recomendación y moderación.\n• Filtrado y puntos en servidor.\n• Autenticación, roles y políticas RLS.\n• IA validada y alternativas de respaldo.',21)
text(s,6.65,2.85,6,.4,'Implementado → pendiente',23,'teal',True)
for y,a,b in [(3.55,'Español / inglés parcial','Completar traducciones'),(4.18,'Fechas según idioma','Pruebas entre regiones'),(4.81,'Colones costarricenses','Multimoneda'),(5.44,'Temas y ajustes de texto','Evaluar accesibilidad')]:
    rect(s,6.6,y,6.05,.53,'soft',True); text(s,6.75,y+.08,2.7,.4,a,16,'dark',True); text(s,9.53,y+.08,3,.4,b,16,'muted')
notes(s,'Tiempo: 4 minutos. Expo SDK 58, React Native 0.88.1, React 19.3.0. Código principalmente JavaScript con archivos TypeScript puntuales. Explicar cliente → servicios → Supabase y Edge Functions → Groq. SQL filtra por edad, recursos, afinidad y estado. IA selecciona o genera y se valida. Los puntos usan lógica de servidor; RLS restringe registros. Globalidad: traducción parcial, fechas según idioma, moneda fija. No afirmar traducción completa ni certificación de accesibilidad. Incorporar Lighthouse o benchmarking únicamente si se obtienen evidencias; no hay métricas incluidas en esta presentación.')

s=base(4,'Demostración en vivo','04 / La aplicación en acción','12 min')
text(s,.7,1.85,11.8,.65,'De una preferencia a una experiencia compartida',26,'teal',True)
steps=[('01','Preferencias'),('02','Recomendación'),('03','Actividad\ncompletada'),('04','Comunidad'),('05','Administración')]
for i,(num,label) in enumerate(steps):
    x=.7+i*2.5; rect(s,x,3,2.28,2.15,'dark' if i==2 else 'white',True)
    text(s,x+.2,3.2,1.8,.6,num,32,'orange',True); text(s,x+.16,4,2, .85,label,20,'white' if i==2 else 'dark',True)
text(s,.75,5.85,11.9,.5,'Personalización  ·  Evidencias y puntos  ·  Amigos y salas  ·  Gestión del sistema',19,'muted')
notes(s,'Tiempo total: 12 minutos. Pasar a la aplicación.\n0:00–5:00: preferencias, Sorpréndeme, aceptar, fotografía preparada, completar y consultar puntos/historial.\n5:00–8:00: abrir publicación desde cuenta amiga, reaccionar, entrar a sala con chat y ranking.\n8:00–9:00: cambiar idioma, observar fecha y tema.\n9:00–12:00: solicitud publicitaria, presupuesto y pago identificado como simulado; abrir administración y revisar solicitud o contenido.\nPreparar sesiones, cuenta amiga, administrador, datos y fotografía. Verificar migraciones, funciones y permisos del entorno. Tener un video del mismo recorrido como plan B. Si se usa, identificarlo como grabación de respaldo. El almacenamiento local no implica funcionamiento completo sin Internet.')

s=base(5,'Evolución y cumplimiento','05 / Del planteamiento a la implementación','2 min')
text(s,.65,1.7,12,.45,'Ampliaciones: IA · Mensajería · Reacciones · Salas grupales · Publicidad',20,'teal',True)
tbl=s.shapes.add_table(6,3, Inches(.65),Inches(2.45), Inches(12), Inches(2.85)).table
tbl.columns[0].width=Inches(1.5); tbl.columns[1].width=Inches(6); tbl.columns[2].width=Inches(4.5)
rows=[['Seguimiento','Qué se cumplió','Qué quedó pendiente']]+[[str(i),'Completar con la entrega real' if i<5 else 'Completar con el ensayo y los ajustes reales','Completar con el resultado real'] for i in range(1,6)]
for i,row in enumerate(rows):
    for j,value in enumerate(row):
        cell=tbl.cell(i,j); cell.text=value; cell.fill.solid(); cell.fill.fore_color.rgb=RGBColor.from_string(C['dark' if i==0 else ('white' if i%2 else 'soft')])
        cell.margin_left=Inches(.15); cell.margin_top=Inches(.08)
        for p in cell.text_frame.paragraphs:
            p.font.name='Aptos'; p.font.size=Pt(16); p.font.bold=i==0; p.font.color.rgb=RGBColor.from_string(C['white'] if i==0 else C['ink'])
text(s,.7,5.65,12,.4,'Completar la tabla con las entregas y evidencias de cada seguimiento.',17,'muted')
for y,label,url in [(6.17,'Repositorio · GitHub','https://github.com/Ortiz0022/hobbier_app'),(6.55,'Tablero · Azure DevOps','https://dev.azure.com/katherynmendezquiros0663/HOBBIER')]:
    sh=text(s,.7,y,11,.3,label,16,'teal',True); sh.text_frame.paragraphs[0].runs[0].hyperlink.address=url
notes(s,'Tiempo: 2 minutos. Antes de presentar, completar las cinco filas según entregas, tarjetas y evidencias reales. No deducir el cumplimiento de cada seguimiento a partir del código actual. La propuesta inicial excluía IA, mensajes y reacciones; la implementación amplió esos módulos e incorporó salas y publicidad. Los enlaces son clicables. Verificar acceso y vigencia del tablero antes de la exposición.')

s=base(6,'Retos, aprendizajes y cierre','06 / Lo que nos deja el proyecto','2 min')
for x,y,title,body in [(.65,1.85,'Permisos','Mantener acceso correcto entre usuarios, amistades y administración.'),(6.85,1.85,'Inteligencia artificial','Validar respuestas y manejar fallos de servicios externos.'),(.65,3.75,'Experiencia de uso','Gestionar fotografías, navegación y actualización de datos.'),(6.85,3.75,'Aprendizaje','Cada función requiere coherencia entre interfaz, datos y reglas del servidor.')]:
    card(s,x,y,5.85,1.7,title,body)
rect(s,.65,5.8,12.05,.84,'dark',True); text(s,.9,5.99,11.55,.55,'De no saber qué hacer a descubrir, realizar y compartir un logro.',23,'white',True)
notes(s,'Tiempo: 2 minutos, seguido de 10 minutos de preguntas. Cada integrante puede aportar una experiencia concreta y breve que realmente haya vivido. Cierre: Hobbier permite pasar de no saber qué hacer a descubrir una actividad, realizarla y compartir el logro. La versión desarrollada integra personalización, seguimiento y comunidad. Preparar respuestas sobre SQL frente a IA, puntos en servidor, límites de traducción, pago simulado y dependencia de Internet.')

prs.core_properties.title='Hobbier · Presentación final'
prs.core_properties.subject='EIF-409 · Seis diapositivas · Demostración en vivo'
prs.core_properties.author='Equipo Hobbier'
target=ROOT/'docs'/'Hobbier_Presentacion_Final_2026.pptx'; prs.save(target)
check=Presentation(target)
assert len(check.slides)==6
assert all(s.has_notes_slide for s in check.slides)
for slide in check.slides:
    for shape in slide.shapes:
        assert shape.left>=0 and shape.top>=0
        assert shape.left+shape.width<=prs.slide_width+1000
        assert shape.top+shape.height<=prs.slide_height+1000
print(target)
print('Validado: 6 diapositivas, notas de exposición, enlaces y tabla editable.')
