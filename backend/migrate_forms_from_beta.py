import sys
import json
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import Database

secciones = [
    (13,1,'1. DATOS PERSONALES',1),
    (14,1,'2. ESCOLARIDAD',2),
    (15,1,'3. DATOS DEL PROYECTO',3),
    (16,1,'4. DATOS DE LA INSTITUCIÓN/DEPENDENCIA (UBICACIÓN)',4),
    (17,1,'5. TIPO DE PROGRAMA',5),
    (18,1,'6. PARA USO EXCLUSIVO DEL DEPARTAMENTO',6)
]

campos = [
(191,1,'Nombre Completo','nombre_alumno','text','C12',1,'alumnos','nombre',13,'col-md-8',None,'Apellido Paterno Materno Nombres',None,0,None,None,None,None),
(192,1,'Sexo','sexo','select','I12',2,'alumnos','sexo',13,'col-md-4','["HOMBRE", "MUJER"]',None,None,0,None,None,None,None),
(193,1,'Teléfono','telefono','text','B13',3,'alumnos','telefono',13,'col-md-4',None,'10 dígitos',None,0,None,None,None,None),
(194,1,'Domicilio (Calle, Número, Colonia)','domicilio','text','E13',4,'alumnos','calle',13,'col-md-8',None,'Calle, Número y Colonia',None,0,None,None,None,None),
(195,1,'Ciudad/Pueblo','ciudad','text','C14',5,'alumnos','ciudad',13,'col-md-8',None,None,None,0,None,None,None,None),
(196,1,'Estado','estado','text','F14',6,'alumnos','estado',13,'col-md-4',None,'Ej: Puebla',None,0,None,None,None,None),
(197,1,'Correo Institucional (Automático)','correo_inst','text','H14',7,'alumnos','correo_institucional',13,'col-md-6',None,None,None,1,None,None,None,None),
(198,1,'Correo Personal','correo_per','text','B15',8,'alumnos','correo_personal',13,'col-md-6',None,'correo@ejemplo.com',None,0,None,None,None,None),
(199,1,'Número de Control','no_control','text','B18',1,'alumnos','no_control',14,'col-md-4',None,'Ej: 23TE0037',None,1,None,None,None,None),
(200,1,'Carrera','carrera','select','E18',2,'alumnos','carrera',14,'col-md-8','["INFORMÁTICA", "SISTEMAS COMPUTACIONALES", "INDUSTRIAL", "GESTIÓN EMPRESARIAL", "MECATRÓNICA", "INDUSTRIAS ALIMENTARIAS", "ANIMACIÓN DIGITAL", "TURISMO"]','Selecciona la carrera...',None,0,None,None,None,None),
(201,1,'Semestre','semestre','select','E19',3,'alumnos','semestre',14,'col-md-6','["7", "8", "9", "10", "11", "12"]',None,None,0,None,None,None,None),
(202,1,'Periodo','periodo','text','B19',4,'proyectos_servicio','periodo',14,'col-md-6',None,'Ej: AGO-DIC 2025',None,0,None,None,None,None),
(203,1,'Nombre del Proyecto','nombre_proyecto','text','C21',1,'proyectos_servicio','nombre_proyecto',15,'col-12',None,'Nombre oficial del proyecto','Tal cual aparece en tu carta de aceptación.',0,None,None,None,None),
(204,1,'Nombre de la Dependencia (Oficial)','nombre_dep','text','C26',2,'dependencias','nombre',15,'col-md-6',None,'Ej: H. Ayuntamiento de Teziutlán',None,0,None,None,None,None),
(205,1,'Titular de la Dependencia','titular_dep','text','C27',3,'dependencias','titular',15,'col-md-6',None,'Nombre con grado (Lic., Ing.)',None,0,None,None,None,None),
(206,1,'Cargo del Titular','cargo_titular','text','C28',4,'dependencias','cargo_titular',15,'col-md-6',None,'Ej: Director General',None,0,None,None,None,None),
(207,1,'Responsable del Programa (Jefe directo)','resp_proy','text','C30',5,'proyectos_servicio','responsable_proyecto',15,'col-md-6',None,'Nombre completo',None,0,None,None,None,None),
(208,1,'Cargo del Responsable del Programa','cargo_resp','text','C31',6,'proyectos_servicio','cargo_responsable',15,'col-md-6',None,'Cargo del jefe directo',None,0,None,None,None,None),
(209,1,'Nombre del Supervisor del Programa','sup_proy','text','C32',7,'proyectos_servicio','supervisor_proyecto',15,'col-md-6',None,'Nombre con grado (Lic., Ing.)',None,0,None,None,None,None),
(210,1,'Cargo del Supervisor del Programa','cargo_sup','text','C33',8,'proyectos_servicio','cargo_supervisor',15,'col-md-6',None,'Cargo del supervisor',None,0,None,None,None,None),
(211,1,'Modalidad de Servicio Social','modalidad','select','XX',9,'proyectos_servicio','modalidad',15,'col-md-6','["Presencial", "Educación a distancia"]',None,None,0,None,None,None,None),
(212,1,'Fecha de Inicio','fecha_inicio','date','C23',10,'proyectos_servicio','fecha_inicio',15,'col-md-6',None,None,None,0,None,None,None,None),
(213,1,'Fecha de Fin','fecha_fin','date','C24',11,'proyectos_servicio','fecha_fin',15,'col-md-6',None,None,None,0,None,None,None,None),
(214,1,'Actividad 1','act1','text','A35',12,'actividades_proyecto','1',15,'col-12',None,'Describe la primera actividad...',None,0,None,None,None,None),
(215,1,'Actividad 2','act2','text','A36',13,'actividades_proyecto','2',15,'col-12',None,'Describe la segunda actividad...',None,0,None,None,None,None),
(216,1,'Actividad 3','act3','text','A37',14,'actividades_proyecto','3',15,'col-12',None,'Describe la tercera actividad...',None,0,None,None,None,None),
(217,1,'Teléfono de la Dependencia','tel_dep','text','C34',1,'dependencias','telefono',16,'col-md-6',None,'Ej: 2311234567',None,0,None,None,None,None),
(218,1,'Domicilio de la Dependencia','dom_dep','text','C35',2,'dependencias','calle',16,'col-md-6',None,'Calle, Número y Colonia',None,0,None,None,None,None),
(219,1,'Ciudad o Municipio de la Dependencia','ciu_dep','text','C36',3,'dependencias','municipio',16,'col-md-6',None,None,None,0,None,None,None,None),
(220,1,'Estado de la Dependencia','est_dep','text','C37',4,'dependencias','estado',16,'col-md-6',None,'Ej: Puebla',None,0,None,None,None,None),
(221,1,'Correo de la Dependencia','cor_dep','text','C38',5,'dependencias','correo',16,'col-md-6',None,'correo@ejemplo.com',None,0,None,None,None,None),
(222,1,'Seleccione a qué programa pertenece el proyecto','tipo_prog','select','C39',1,'proyectos_servicio','programa_institucional',17,'col-md-6','["ALFABETIZATEC", "EDUCACIÓN PARA ADULTOS", "ACTIVIDADES CÍVICAS", "ACTIVIDADES CULTURALES", "ACTIVIDADES DEPORTIVAS", "APOYO A LA SALUD", "DESARROLLO SUSTENTABLE", "MEDIO AMBIENTE", "DESARROLLO DE COMUNIDAD", "Otro (Especificar)"]','Selecciona el programa...',None,0,None,'HABILITAR','Otro (Especificar)','otro_prog'),
(223,1,'Especifique otro programa','otro_prog','text','D48',2,None,None,17,'col-md-6',None,'Escribe aquí el programa...',None,0,None,None,None,None),
(224,1,'¿ACEPTADO(A)?','aceptado','radio','B51',1,None,None,18,'col-md-6','["SI", "NO"]',None,None,0,'{"SI":"SI ( X )  NO (  )", "NO":"SI (  )  NO ( X )"}','HABILITAR','NO','motivos'),
(225,1,'Motivos (Sólo si la respuesta es NO)','motivos','text','E51',2,None,None,18,'col-md-6',None,None,None,0,None,None,None,None)
]

db = Database()
conn = db.get_connection()
cursor = conn.cursor()

# Insert into formularios (assuming document 1 is FRPS01)
cursor.execute("SELECT id_documento FROM catalogo_documentos WHERE clave_formato = 'FRPS01'")
row = cursor.fetchone()
if not row:
    print("FRPS01 not found in catalogo_documentos")
    sys.exit(1)
id_doc = row[0]

cursor.execute("SELECT id_formulario FROM formularios WHERE id_documento = %s", (id_doc,))
existing = cursor.fetchone()
if existing:
    print("Formulario for FRPS01 already exists, deleting it to recreate from beta...")
    cursor.execute("DELETE FROM formularios WHERE id_documento = %s", (id_doc,))

cursor.execute("INSERT INTO formularios (id_documento, nombre, descripcion, tipo_formulario) VALUES (%s, %s, %s, %s)", (id_doc, 'Solicitud de Servicio Social (FRPS01)', 'Importado de versión beta', 'CON_CAMPOS'))
id_form = cursor.lastrowid

sec_map = {}
for sec in secciones:
    old_id = sec[0]
    titulo = sec[2]
    orden = sec[3]
    cursor.execute("INSERT INTO formulario_secciones (id_formulario, titulo, orden) VALUES (%s, %s, %s)", (id_form, titulo, orden))
    sec_map[old_id] = cursor.lastrowid

for c in campos:
    id_seccion_old = c[9]
    etiqueta = c[2]
    nombre_var = c[3]
    tipo = c[4]
    celda = c[5]
    orden = c[6]
    ancho = c[10]
    opciones = c[11]
    placeholder = c[12]
    texto_ayuda = c[13]
    solo_lectura = c[14]
    
    id_seccion_new = sec_map.get(id_seccion_old)
    
    cursor.execute("""
        INSERT INTO formulario_campos 
        (id_formulario, id_seccion, nombre_variable, etiqueta, tipo_campo, placeholder, texto_ayuda, solo_lectura, orden, ancho_columna, opciones_json, celda_excel)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (id_form, id_seccion_new, nombre_var, etiqueta, tipo, placeholder, texto_ayuda, solo_lectura, orden, ancho, opciones, celda))

conn.commit()
cursor.close()
conn.close()
print("Migración completada exitosamente")
