import os
import json
import re
import shutil
import time
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from database import Database

forms_bp = Blueprint('forms_bp', __name__)

PLANTILLAS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'plantillas')
os.makedirs(PLANTILLAS_DIR, exist_ok=True)

def get_db():
    db = Database()
    return db.get_connection()

def ensure_json_str(val, default=None):
    if val is None:
        return default
    if isinstance(val, str):
        return val
    try:
        return json.dumps(val)
    except Exception:
        return default

@forms_bp.route('/', methods=['GET'])
def index():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT f.*, c.clave_formato, c.etapa, c.plantilla_excel
            FROM formularios f
            JOIN catalogo_documentos c ON f.id_documento = c.id_documento
            ORDER BY f.id_formulario DESC
        """)
        return jsonify(cursor.fetchall()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/catalog', methods=['GET'])
def catalog():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                c.id_documento, 
                c.clave_formato as clave, 
                COALESCE(c.nombre, c.nombre_documento) as nombre_documento, 
                c.etapa,
                c.plantilla_excel,
                CASE WHEN c.plantilla_excel IS NOT NULL AND c.plantilla_excel != '' THEN 1 ELSE 0 END as plantilla_existe,
                CASE WHEN f.id_formulario IS NOT NULL AND EXISTS (SELECT 1 FROM formulario_campos fc WHERE fc.id_formulario = f.id_formulario) THEN 1 ELSE 0 END as tiene_formulario,
                f.id_formulario,
                COALESCE(c.activo, 1) as activo
            FROM catalogo_documentos c
            LEFT JOIN formularios f ON c.id_documento = f.id_documento
            ORDER BY c.etapa, c.orden_en_etapa
        """)
        catalog_list = cursor.fetchall()
        return jsonify(catalog_list), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/', methods=['POST'])
def create_form():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        nombre = request.form.get('nombre', 'Nuevo Formulario')
        etapa_raw = (request.form.get('etapa') or 'APERTURA').strip().upper()
        etapas_validas = ['APERTURA', 'BIMESTRE 1', 'BIMESTRE 2', 'BIMESTRE 3', 'LIBERACION']
        etapa = etapa_raw if etapa_raw in etapas_validas else 'APERTURA'
        id_documento = request.form.get('id_documento')
        esquema_str = request.form.get('esquema', '{}')
        plantilla_file = request.files.get('plantilla')
        
        try:
            esquema = json.loads(esquema_str)
        except Exception:
            esquema = {}
            
        descripcion = esquema.get('descripcion', '')
        tipo_formulario = esquema.get('tipo_formulario', 'CON_CAMPOS')
        
        # 1. Resolver Documento Oficial
        nombre_archivo_plantilla = None
        if plantilla_file and plantilla_file.filename:
            nombre_archivo_plantilla = secure_filename(plantilla_file.filename)
            plantilla_file.save(os.path.join(PLANTILLAS_DIR, nombre_archivo_plantilla))
        
        if id_documento:
            id_doc = int(id_documento)
            if nombre_archivo_plantilla:
                cursor.execute("UPDATE catalogo_documentos SET plantilla_excel=%s, ruta_archivo_excel=%s, etapa=%s WHERE id_documento=%s",
                               (nombre_archivo_plantilla, nombre_archivo_plantilla, etapa, id_doc))
            else:
                cursor.execute("UPDATE catalogo_documentos SET etapa=%s WHERE id_documento=%s", (etapa, id_doc))
        else:
            import time
            clean_prefix = re.sub(r'[^a-zA-Z0-9]', '', nombre).upper()[:6] or "DOC"
            clean_clave = f"{clean_prefix}_{int(time.time()*1000)%1000000}"
            cursor.execute("""
                INSERT INTO catalogo_documentos (clave_formato, nombre, nombre_documento, etapa, plantilla_excel, ruta_archivo_excel)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (clean_clave, nombre, nombre, etapa, nombre_archivo_plantilla, nombre_archivo_plantilla))
            id_doc = cursor.lastrowid
            
        # 2. Crear Formulario
        cursor.execute("SELECT id_formulario FROM formularios WHERE id_documento = %s", (id_doc,))
        existing = cursor.fetchone()
        if existing:
            id_form = existing['id_formulario']
            cursor.execute("UPDATE formularios SET nombre=%s, descripcion=%s, tipo_formulario=%s WHERE id_formulario=%s",
                           (nombre, descripcion, tipo_formulario, id_form))
            cursor.execute("DELETE FROM formulario_campos WHERE id_formulario=%s", (id_form,))
            cursor.execute("DELETE FROM formulario_secciones WHERE id_formulario=%s", (id_form,))
        else:
            cursor.execute("""
                INSERT INTO formularios (id_documento, nombre, descripcion, tipo_formulario)
                VALUES (%s, %s, %s, %s)
            """, (id_doc, nombre, descripcion, tipo_formulario))
            id_form = cursor.lastrowid
            
        # 3. Guardar Secciones y Campos
        secciones = esquema.get('secciones', [])
        for s_idx, sec in enumerate(secciones, start=1):
            titulo_sec = sec.get('titulo', f'Sección {s_idx}')
            orden_sec = sec.get('orden', s_idx)
            cursor.execute("INSERT INTO formulario_secciones (id_formulario, titulo, orden) VALUES (%s, %s, %s)",
                           (id_form, titulo_sec, orden_sec))
            id_sec = cursor.lastrowid
            
            for c_idx, campo in enumerate(sec.get('campos', []), start=1):
                tipo_c = campo.get('tipo_campo', 'text')
                nombre_var = str(campo.get('nombre_variable') or f'var_{c_idx}').strip()[:200]
                etiqueta = campo.get('etiqueta') or ('Título de Sección' if tipo_c == 'heading' else nombre_var)
                placeholder = campo.get('placeholder')
                texto_ayuda = campo.get('texto_ayuda')
                tamano_texto = campo.get('tamano_texto', 'h2')
                solo_lectura = 1 if campo.get('solo_lectura') else 0
                requerido = 1 if campo.get('requerido') else 0
                ancho = 'col-12' if tipo_c == 'heading' else (campo.get('ancho_columna') or 'col-md-6')
                celda = campo.get('celda_excel')
                opciones = ensure_json_str(campo.get('opciones'), None)
                alineacion = campo.get('alineacion_opciones') or ('horizontal' if tipo_c == 'radio' else 'vertical')
                tabla_origen = campo.get('fuente_contexto') or campo.get('tabla_origen')
                columna_origen = campo.get('fuente_columna') or campo.get('columna_origen')
                ext_permitidas = campo.get('extensiones_permitidas')
                tam_max = campo.get('tamano_max_mb')
                usar_hoy = 1 if campo.get('usar_fecha_actual') else 0
                f_min = campo.get('fecha_minima') or None
                f_max = campo.get('fecha_maxima') or None
                hab_cond = 1 if campo.get('habilitar_condicion') else 0
                c_campo = campo.get('condicion_campo')
                c_op = campo.get('condicion_operador', 'igual')
                c_val = campo.get('condicion_valor')
                c_acc = campo.get('condicion_accion', 'mostrar')
                mapeo_adv = ensure_json_str(campo.get('mapeo_excel_avanzado'), None)
                modo_mapeo = campo.get('modo_mapeo_excel', 'unica')
                reglas_trans = ensure_json_str(campo.get('reglas_transformacion'), None)
                campo_obj = campo.get('campo_objetivo')
                ancho_img = campo.get('ancho_imagen') or 150
                alto_img = campo.get('alto_imagen') or 120
                
                cursor.execute("""
                    INSERT INTO formulario_campos 
                    (id_formulario, id_seccion, nombre_variable, etiqueta, tipo_campo, placeholder, texto_ayuda, 
                     tamano_texto, solo_lectura, requerido, orden, ancho_columna, opciones_json, alineacion_opciones,
                     celda_excel, tabla_origen, columna_origen, extensiones_permitidas, tamano_max_mb,
                     usar_fecha_actual, fecha_minima, fecha_maxima, habilitar_condicion, condicion_campo,
                     condicion_operador, condicion_valor, condicion_accion, mapeo_excel_avanzado, modo_mapeo_excel,
                     reglas_transformacion, campo_objetivo, ancho_imagen, alto_imagen)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (id_form, id_sec, nombre_var, etiqueta, tipo_c, placeholder, texto_ayuda,
                      tamano_texto, solo_lectura, requerido, c_idx, ancho, opciones, alineacion,
                      celda, tabla_origen, columna_origen, ext_permitidas, tam_max,
                      usar_hoy, f_min, f_max, hab_cond, c_campo,
                      c_op, c_val, c_acc, mapeo_adv, modo_mapeo,
                      reglas_trans, campo_obj, ancho_img, alto_img))
                      
        conn.commit()
        return jsonify({"message": "Formulario creado exitosamente", "id_formulario": id_form}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def get_or_modify_form(id):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'DELETE':
        try:
            cursor.execute("DELETE FROM formulario_campos WHERE id_formulario = %s", (id,))
            cursor.execute("DELETE FROM formulario_secciones WHERE id_formulario = %s", (id,))
            cursor.execute("DELETE FROM formularios WHERE id_formulario = %s", (id,))
            conn.commit()
            return jsonify({"message": "Formulario desvinculado exitosamente"}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    if request.method == 'GET':
        try:
            cursor.execute("""
                SELECT f.*, c.clave_formato, c.etapa, c.plantilla_excel, 
                       COALESCE(c.nombre, c.nombre_documento) as nombre_documento
                FROM formularios f
                LEFT JOIN catalogo_documentos c ON f.id_documento = c.id_documento
                WHERE f.id_formulario = %s
            """, (id,))
            form = cursor.fetchone()
            if not form:
                return jsonify({"error": "Formulario no encontrado"}), 404

            cursor.execute("SELECT * FROM formulario_secciones WHERE id_formulario = %s ORDER BY orden", (id,))
            secciones = cursor.fetchall()
            
            cursor.execute("SELECT * FROM formulario_campos WHERE id_formulario = %s ORDER BY orden", (id,))
            campos = cursor.fetchall()

            for c in campos:
                for k, v in c.items():
                    if hasattr(v, 'strftime'):
                        c[k] = v.strftime('%Y-%m-%d')

            secciones_dict = {}
            form['secciones'] = []
            form['campos_sin_seccion'] = []

            for sec in secciones:
                sec['campos'] = []
                secciones_dict[sec['id_seccion']] = sec
                form['secciones'].append(sec)

            for campo in campos:
                if campo.get('id_seccion') and campo['id_seccion'] in secciones_dict:
                    secciones_dict[campo['id_seccion']]['campos'].append(campo)
                else:
                    form['campos_sin_seccion'].append(campo)

            form['titulo'] = form['nombre']
            return jsonify(form), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    if request.method == 'PUT':
        try:
            nombre = request.form.get('nombre')
            esquema_str = request.form.get('esquema', '{}')
            plantilla_file = request.files.get('plantilla')
            
            try:
                esquema = json.loads(esquema_str)
            except Exception:
                esquema = {}
                
            descripcion = esquema.get('descripcion', '')
            tipo_formulario = esquema.get('tipo_formulario', 'CON_CAMPOS')
            
            # Verificar formulario
            cursor.execute("SELECT id_documento FROM formularios WHERE id_formulario=%s", (id,))
            form = cursor.fetchone()
            if not form:
                return jsonify({"error": "Formulario no encontrado"}), 404
                
            id_doc = form['id_documento']
            
            # Si subió plantilla nueva
            if plantilla_file and plantilla_file.filename:
                nombre_archivo_plantilla = secure_filename(plantilla_file.filename)
                plantilla_file.save(os.path.join(PLANTILLAS_DIR, nombre_archivo_plantilla))
                cursor.execute("UPDATE catalogo_documentos SET plantilla_excel=%s, ruta_archivo_excel=%s WHERE id_documento=%s",
                               (nombre_archivo_plantilla, nombre_archivo_plantilla, id_doc))
                               
            # Actualizar datos del formulario
            etapas_validas = ['APERTURA', 'BIMESTRE 1', 'BIMESTRE 2', 'BIMESTRE 3', 'LIBERACION']
            etapa_req = (request.form.get('etapa') or '').strip().upper()
            
            if nombre:
                cursor.execute("UPDATE formularios SET nombre=%s, descripcion=%s, tipo_formulario=%s WHERE id_formulario=%s",
                               (nombre, descripcion, tipo_formulario, id))
                if etapa_req in etapas_validas:
                    cursor.execute("UPDATE catalogo_documentos SET nombre=%s, nombre_documento=%s, etapa=%s WHERE id_documento=%s",
                                   (nombre, nombre, etapa_req, id_doc))
                else:
                    cursor.execute("UPDATE catalogo_documentos SET nombre=%s, nombre_documento=%s WHERE id_documento=%s",
                                   (nombre, nombre, id_doc))
            elif etapa_req in etapas_validas:
                cursor.execute("UPDATE catalogo_documentos SET etapa=%s WHERE id_documento=%s", (etapa_req, id_doc))
                               
            # Recrear secciones y campos limpios
            cursor.execute("DELETE FROM formulario_campos WHERE id_formulario=%s", (id,))
            cursor.execute("DELETE FROM formulario_secciones WHERE id_formulario=%s", (id,))
            
            secciones = esquema.get('secciones', [])
            for s_idx, sec in enumerate(secciones, start=1):
                titulo_sec = sec.get('titulo', f'Sección {s_idx}')
                orden_sec = sec.get('orden', s_idx)
                cursor.execute("INSERT INTO formulario_secciones (id_formulario, titulo, orden) VALUES (%s, %s, %s)",
                               (id, titulo_sec, orden_sec))
                id_sec = cursor.lastrowid
                
                for c_idx, campo in enumerate(sec.get('campos', []), start=1):
                    tipo_c = campo.get('tipo_campo', 'text')
                    nombre_var = str(campo.get('nombre_variable') or f'var_{c_idx}').strip()[:200]
                    etiqueta = campo.get('etiqueta') or ('Título de Sección' if tipo_c == 'heading' else nombre_var)
                    placeholder = campo.get('placeholder')
                    texto_ayuda = campo.get('texto_ayuda')
                    tamano_texto = campo.get('tamano_texto', 'h2')
                    solo_lectura = 1 if campo.get('solo_lectura') else 0
                    requerido = 1 if campo.get('requerido') else 0
                    ancho = 'col-12' if tipo_c == 'heading' else (campo.get('ancho_columna') or 'col-md-6')
                    celda = campo.get('celda_excel')
                    opciones = json.dumps(campo.get('opciones', [])) if campo.get('opciones') else None
                    alineacion = campo.get('alineacion_opciones') or ('horizontal' if tipo_c == 'radio' else 'vertical')
                    tabla_origen = campo.get('fuente_contexto') or campo.get('tabla_origen')
                    columna_origen = campo.get('fuente_columna') or campo.get('columna_origen')
                    ext_permitidas = campo.get('extensiones_permitidas')
                    tam_max = campo.get('tamano_max_mb')
                    usar_hoy = 1 if campo.get('usar_fecha_actual') else 0
                    f_min = campo.get('fecha_minima') or None
                    f_max = campo.get('fecha_maxima') or None
                    hab_cond = 1 if campo.get('habilitar_condicion') else 0
                    c_campo = campo.get('condicion_campo')
                    c_op = campo.get('condicion_operador', 'igual')
                    c_val = campo.get('condicion_valor')
                    c_acc = campo.get('condicion_accion', 'mostrar')
                    mapeo_adv = ensure_json_str(campo.get('mapeo_excel_avanzado'), None)
                    modo_mapeo = campo.get('modo_mapeo_excel', 'unica')
                    reglas_trans = ensure_json_str(campo.get('reglas_transformacion'), None)
                    campo_obj = campo.get('campo_objetivo')
                    ancho_img = campo.get('ancho_imagen') or 150
                    alto_img = campo.get('alto_imagen') or 120
                    
                    cursor.execute("""
                        INSERT INTO formulario_campos 
                        (id_formulario, id_seccion, nombre_variable, etiqueta, tipo_campo, placeholder, texto_ayuda, 
                         tamano_texto, solo_lectura, requerido, orden, ancho_columna, opciones_json, alineacion_opciones,
                         celda_excel, tabla_origen, columna_origen, extensiones_permitidas, tamano_max_mb,
                         usar_fecha_actual, fecha_minima, fecha_maxima, habilitar_condicion, condicion_campo,
                         condicion_operador, condicion_valor, condicion_accion, mapeo_excel_avanzado, modo_mapeo_excel,
                         reglas_transformacion, campo_objetivo, ancho_imagen, alto_imagen)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (id, id_sec, nombre_var, etiqueta, tipo_c, placeholder, texto_ayuda,
                          tamano_texto, solo_lectura, requerido, c_idx, ancho, opciones, alineacion,
                          celda, tabla_origen, columna_origen, ext_permitidas, tam_max,
                          usar_hoy, f_min, f_max, hab_cond, c_campo,
                          c_op, c_val, c_acc, mapeo_adv, modo_mapeo,
                          reglas_trans, campo_obj, ancho_img, alto_img))

            conn.commit()
            return jsonify({"message": "Formulario actualizado exitosamente", "id_formulario": id}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@forms_bp.route('/catalog/<int:id_documento>/upload_template', methods=['POST'])
def upload_template(id_documento):
    if 'plantilla' not in request.files:
        return jsonify({"error": "No se recibió archivo"}), 400
        
    file = request.files['plantilla']
    if not file or file.filename == '':
        return jsonify({"error": "Archivo inválido"}), 400
        
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
        
    cursor = conn.cursor()
    try:
        filename = secure_filename(file.filename)
        file.save(os.path.join(PLANTILLAS_DIR, filename))
        
        cursor.execute("UPDATE catalogo_documentos SET plantilla_excel=%s, ruta_archivo_excel=%s WHERE id_documento=%s",
                       (filename, filename, id_documento))
        conn.commit()
        return jsonify({"message": "Plantilla vinculada exitosamente", "filename": filename}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/catalog/<int:id_documento>/template', methods=['DELETE'])
def unlink_template(id_documento):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE catalogo_documentos SET plantilla_excel = NULL, ruta_archivo_excel = NULL WHERE id_documento = %s", (id_documento,))
        conn.commit()
        return jsonify({"message": "Plantilla oficial desvinculada exitosamente"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/catalog/<int:id_documento>/toggle_activo', methods=['PATCH', 'PUT'])
def toggle_formato_activo(id_documento):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT activo FROM catalogo_documentos WHERE id_documento = %s", (id_documento,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Documento no encontrado"}), 404
            
        current_activo = row.get('activo')
        new_activo = 0 if current_activo == 1 else 1
        
        cursor.execute("UPDATE catalogo_documentos SET activo = %s WHERE id_documento = %s", (new_activo, id_documento))
        conn.commit()
        return jsonify({
            "message": f"Formato {'vinculado al proceso' if new_activo == 1 else 'desvinculado del proceso'} exitosamente.",
            "activo": new_activo
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/plan_trabajo', methods=['POST'])
def save_plan_trabajo():
    data = request.json or {}
    id_proyecto = data.get('id_proyecto')
    antecedentes = data.get('antecedentes')
    objetivo_general = data.get('objetivo_general')
    objetivos_particulares = data.get('objetivos_particulares')
    alcances = data.get('alcances')

    if not all([id_proyecto, antecedentes, objetivo_general, objetivos_particulares, alcances]):
        return jsonify({"error": "Faltan campos requeridos"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO planes_trabajo (id_proyecto, objetivo_general)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE 
            objetivo_general = VALUES(objetivo_general)
        """, (id_proyecto, objetivo_general))
        conn.commit()
        return jsonify({"message": "Plan de Trabajo guardado exitosamente"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/reporte_bimestral', methods=['POST'])
def save_reporte_bimestral():
    data = request.json or {}
    id_proyecto = data.get('id_proyecto')
    bimestre = data.get('bimestre')
    resumen_actividades = data.get('resumen_actividades')
    horas_acumuladas = data.get('horas_acumuladas', 0)

    if not all([id_proyecto, bimestre, resumen_actividades]):
        return jsonify({"error": "Faltan campos requeridos"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO reportes_bimestrales (id_proyecto, bimestre, resumen_actividades, horas_acumuladas)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            resumen_actividades = VALUES(resumen_actividades),
            horas_acumuladas = VALUES(horas_acumuladas)
        """, (id_proyecto, bimestre, resumen_actividades, horas_acumuladas))
        conn.commit()
        return jsonify({"message": f"Reporte del bimestre {bimestre} guardado exitosamente"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/evaluacion_cualitativa', methods=['POST'])
def save_evaluacion_cualitativa():
    data = request.json or {}
    id_proyecto = data.get('id_proyecto')
    bimestre = data.get('bimestre')
    tipo_evaluador = data.get('tipo_evaluador')
    calificaciones_json = data.get('calificaciones_json')
    observaciones = data.get('observaciones')
    respuestas_impacto_json = data.get('respuestas_impacto_json')

    if not all([id_proyecto, bimestre, tipo_evaluador, calificaciones_json]):
        return jsonify({"error": "Faltan campos requeridos"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        if isinstance(calificaciones_json, (dict, list)):
            calificaciones_json = json.dumps(calificaciones_json)
        if respuestas_impacto_json and isinstance(respuestas_impacto_json, (dict, list)):
            respuestas_impacto_json = json.dumps(respuestas_impacto_json)

        cursor.execute("""
            INSERT INTO evaluaciones_cualitativas (id_proyecto, bimestre, tipo_evaluador, calificaciones_json, observaciones, respuestas_impacto_json)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            calificaciones_json = VALUES(calificaciones_json),
            observaciones = VALUES(observaciones),
            respuestas_impacto_json = VALUES(respuestas_impacto_json)
        """, (id_proyecto, bimestre, tipo_evaluador, calificaciones_json, observaciones, respuestas_impacto_json))
        conn.commit()
        return jsonify({"message": f"Evaluación de {tipo_evaluador} para bimestre {bimestre} guardada exitosamente"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/documento/<int:id_documento>', methods=['GET'])
@forms_bp.route('/catalog/<int:id_documento>', methods=['GET'])
def get_documento_info(id_documento):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id_documento, clave_formato as clave,
                   COALESCE(nombre, nombre_documento) as nombre_documento,
                   COALESCE(etapa, 'APERTURA') as etapa, plantilla_excel, ruta_archivo_excel, activo
            FROM catalogo_documentos
            WHERE id_documento = %s
        """, (id_documento,))
        doc = cursor.fetchone()
        if not doc:
            return jsonify({"error": "Documento no encontrado"}), 404
        if doc.get('etapa'):
            doc['etapa'] = doc['etapa'].upper()
        return jsonify(doc), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/documento/<int:id_documento>/etapa', methods=['PUT', 'PATCH'])
def update_documento_etapa(id_documento):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    data = request.json or {}
    etapa = data.get('etapa')
    
    etapas_validas = ['APERTURA', 'BIMESTRE 1', 'BIMESTRE 2', 'BIMESTRE 3', 'LIBERACION']
    if not etapa or etapa.upper() not in etapas_validas:
        return jsonify({"error": f"Etapa inválida. Debe ser una de: {', '.join(etapas_validas)}"}), 400
        
    etapa_limpia = etapa.upper()
    
    try:
        cursor.execute("UPDATE catalogo_documentos SET etapa = %s WHERE id_documento = %s", (etapa_limpia, id_documento))
        conn.commit()
        return jsonify({"message": f"Etapa actualizada a '{etapa_limpia}' exitosamente.", "etapa": etapa_limpia}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/documento/<int:id_documento>/duplicate', methods=['POST'])
@forms_bp.route('/catalog/<int:id_documento>/duplicate', methods=['POST'])
def duplicate_documento_y_formulario(id_documento):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Obtener documento original
        cursor.execute("SELECT * FROM catalogo_documentos WHERE id_documento = %s", (id_documento,))
        orig_doc = cursor.fetchone()
        if not orig_doc:
            return jsonify({"error": "Documento original no encontrado en el catálogo"}), 404
            
        data = request.json or {}
        nombre_base = orig_doc.get('nombre_documento') or orig_doc.get('nombre') or 'Formato'
        nuevo_nombre = (data.get('nuevo_nombre') or f"{nombre_base} (Copia)").strip()
        
        # Generar clave única para la copia
        clean_prefix = re.sub(r'[^a-zA-Z0-9]', '', orig_doc.get('clave_formato') or 'DOC').upper()[:6] or "DOC"
        new_clave = f"{clean_prefix}_COP_{int(time.time()*1000)%1000000}"
        
        # Duplicar plantilla en disco de forma independiente si existe
        new_plantilla_excel = None
        if orig_doc.get('plantilla_excel'):
            orig_filename = orig_doc['plantilla_excel']
            orig_path = os.path.join(PLANTILLAS_DIR, orig_filename)
            if os.path.exists(orig_path):
                ext = os.path.splitext(orig_filename)[1]
                base_clean = secure_filename(os.path.splitext(orig_filename)[0])[:25]
                new_filename = f"COPIA_{int(time.time()*1000)%1000000}_{base_clean}{ext}"
                new_path = os.path.join(PLANTILLAS_DIR, new_filename)
                try:
                    shutil.copy2(orig_path, new_path)
                    new_plantilla_excel = new_filename
                except Exception as file_err:
                    print(f"Error al copiar archivo plantilla: {file_err}")
                    new_plantilla_excel = orig_filename
            else:
                new_plantilla_excel = orig_filename
                
        etapa_doc = orig_doc.get('etapa') or 'APERTURA'
        orden_etp = (orig_doc.get('orden_en_etapa') or 0) + 1
        
        # 2. Insertar nuevo registro en catalogo_documentos
        cursor.execute("""
            INSERT INTO catalogo_documentos 
            (clave_formato, nombre, nombre_documento, etapa, ruta_archivo_excel, plantilla_excel, orden_en_etapa, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 1)
        """, (new_clave, nuevo_nombre, nuevo_nombre, etapa_doc, new_plantilla_excel, new_plantilla_excel, orden_etp))
        new_doc_id = cursor.lastrowid
        
        # 3. Duplicar formularios asociados si existen
        cursor.execute("SELECT * FROM formularios WHERE id_documento = %s", (id_documento,))
        orig_forms = cursor.fetchall()
        new_form_id = None
        
        for orig_f in orig_forms:
            new_f_nombre = nuevo_nombre
            cursor.execute("""
                INSERT INTO formularios (id_documento, nombre, descripcion, tipo_formulario)
                VALUES (%s, %s, %s, %s)
            """, (new_doc_id, new_f_nombre, orig_f.get('descripcion', ''), orig_f.get('tipo_formulario', 'CON_CAMPOS')))
            new_form_id = cursor.lastrowid
            
            # Duplicar secciones
            cursor.execute("SELECT * FROM formulario_secciones WHERE id_formulario = %s ORDER BY orden", (orig_f['id_formulario'],))
            orig_secs = cursor.fetchall()
            sec_map = {}
            for sec in orig_secs:
                old_sec_id = sec['id_seccion']
                cursor.execute("""
                    INSERT INTO formulario_secciones (id_formulario, titulo, orden)
                    VALUES (%s, %s, %s)
                """, (new_form_id, sec.get('titulo', 'Sección'), sec.get('orden', 0)))
                sec_map[old_sec_id] = cursor.lastrowid
                
            # Duplicar campos
            cursor.execute("SELECT * FROM formulario_campos WHERE id_formulario = %s ORDER BY orden", (orig_f['id_formulario'],))
            orig_campos = cursor.fetchall()
            for c in orig_campos:
                target_sec_id = sec_map.get(c.get('id_seccion'))
                cursor.execute("""
                    INSERT INTO formulario_campos 
                    (id_formulario, id_seccion, nombre_variable, etiqueta, tipo_campo, placeholder, texto_ayuda, 
                     tamano_texto, solo_lectura, requerido, orden, ancho_columna, opciones_json, alineacion_opciones,
                     celda_excel, tabla_origen, columna_origen, extensiones_permitidas, tamano_max_mb,
                     usar_fecha_actual, fecha_minima, fecha_maxima, habilitar_condicion, condicion_campo,
                     condicion_operador, condicion_valor, condicion_accion, mapeo_excel_avanzado, modo_mapeo_excel,
                     reglas_transformacion, campo_objetivo, ancho_imagen, alto_imagen)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    new_form_id, target_sec_id, c.get('nombre_variable'), c.get('etiqueta'), c.get('tipo_campo'), c.get('placeholder'), c.get('texto_ayuda'),
                    c.get('tamano_texto'), c.get('solo_lectura'), c.get('requerido'), c.get('orden'), c.get('ancho_columna'), c.get('opciones_json'), c.get('alineacion_opciones'),
                    c.get('celda_excel'), c.get('tabla_origen'), c.get('columna_origen'), c.get('extensiones_permitidas'), c.get('tamano_max_mb'),
                    c.get('usar_fecha_actual'), c.get('fecha_minima'), c.get('fecha_maxima'), c.get('habilitar_condicion'), c.get('condicion_campo'),
                    c.get('condicion_operador'), c.get('condicion_valor'), c.get('condicion_accion'), c.get('mapeo_excel_avanzado'), c.get('modo_mapeo_excel'),
                    c.get('reglas_transformacion'), c.get('campo_objetivo'), c.get('ancho_imagen'), c.get('alto_imagen')
                ))
                
        conn.commit()
        return jsonify({
            "message": f"Formato duplicado exitosamente como '{nuevo_nombre}'.",
            "id_documento": new_doc_id,
            "id_formulario": new_form_id,
            "clave": new_clave,
            "nombre": nuevo_nombre,
            "etapa": etapa_doc
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@forms_bp.route('/documento/<int:id_documento>', methods=['DELETE'])
@forms_bp.route('/catalog/<int:id_documento>', methods=['DELETE'])
def delete_documento_completo(id_documento):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Obtener id_formulario si existe y eliminar sus campos y secciones
        cursor.execute("SELECT id_formulario, nombre FROM formularios WHERE id_documento = %s", (id_documento,))
        forms = cursor.fetchall()
        for f in forms:
            id_form = f['id_formulario']
            cursor.execute("DELETE FROM formulario_campos WHERE id_formulario = %s", (id_form,))
            cursor.execute("DELETE FROM formulario_secciones WHERE id_formulario = %s", (id_form,))
            cursor.execute("DELETE FROM formularios WHERE id_formulario = %s", (id_form,))
            
        # 2. Eliminar de expediente_entregas
        cursor.execute("DELETE FROM expediente_entregas WHERE id_documento = %s", (id_documento,))
        
        # 3. Eliminar de configuracion_campos y secciones_documento si existen
        cursor.execute("DELETE FROM configuracion_campos WHERE id_documento = %s", (id_documento,))
        cursor.execute("DELETE FROM secciones_documento WHERE id_documento = %s", (id_documento,))
        
        # 4. Eliminar el documento del catálogo
        cursor.execute("SELECT clave_formato FROM catalogo_documentos WHERE id_documento = %s", (id_documento,))
        doc = cursor.fetchone()
        
        cursor.execute("DELETE FROM catalogo_documentos WHERE id_documento = %s", (id_documento,))
        conn.commit()
        
        clave = doc['clave_formato'] if doc else id_documento
        return jsonify({"message": f"Documento '{clave}' y su configuración eliminados exitosamente del catálogo."}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
