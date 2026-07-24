from flask import Blueprint, request, jsonify
from database import Database
import json

forms_bp = Blueprint('forms_bp', __name__)

def get_db():
    db = Database()
    return db.get_connection()

@forms_bp.route('/', methods=['GET'])
def index():
    return jsonify([]), 200

@forms_bp.route('/catalog', methods=['GET'])
def catalog():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                c.id_documento, 
                c.clave_formato as clave, 
                c.nombre as nombre_documento, 
                c.etapa,
                c.plantilla_excel,
                CASE WHEN c.plantilla_excel IS NOT NULL THEN 1 ELSE 0 END as plantilla_existe,
                CASE WHEN f.id_formulario IS NOT NULL THEN 1 ELSE 0 END as tiene_formulario,
                f.id_formulario
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

@forms_bp.route('/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def get_form(id):
    if request.method == 'DELETE':
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("DELETE FROM formularios WHERE id_formulario = %s", (id,))
            conn.commit()
            return jsonify({"message": "Formulario desvinculado"}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

    if request.method == 'GET':
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM formularios WHERE id_formulario = %s", (id,))
            form = cursor.fetchone()
            if not form:
                return jsonify({"error": "Formulario no encontrado"}), 404

            cursor.execute("SELECT * FROM formulario_secciones WHERE id_formulario = %s ORDER BY orden", (id,))
            secciones = cursor.fetchall()
            
            cursor.execute("SELECT * FROM formulario_campos WHERE id_formulario = %s ORDER BY orden", (id,))
            campos = cursor.fetchall()

            secciones_dict = {}
            form['secciones'] = []
            form['campos_sin_seccion'] = []

            for sec in secciones:
                sec['campos'] = []
                secciones_dict[sec['id_seccion']] = sec
                form['secciones'].append(sec)

            for campo in campos:
                if campo.get('id_seccion'):
                    if campo['id_seccion'] in secciones_dict:
                        secciones_dict[campo['id_seccion']]['campos'].append(campo)
                    else:
                        form['campos_sin_seccion'].append(campo)
                else:
                    form['campos_sin_seccion'].append(campo)

            return jsonify(form), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    # PUT would be the update logic, leaving skeleton for now since react app handles POST on root instead
    return jsonify({}), 200

@forms_bp.route('/catalog/<int:id_documento>/upload_template', methods=['POST'])
def upload_template(id_documento):
    # Skeleton implementation for uploading templates
    return jsonify({"message": "Template uploaded"}), 200

@forms_bp.route('/plan_trabajo', methods=['POST'])
def save_plan_trabajo():
    data = request.json
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
            INSERT INTO planes_trabajo (id_proyecto, antecedentes, objetivo_general, objetivos_particulares, alcances)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            antecedentes = VALUES(antecedentes),
            objetivo_general = VALUES(objetivo_general),
            objetivos_particulares = VALUES(objetivos_particulares),
            alcances = VALUES(alcances)
        """, (id_proyecto, antecedentes, objetivo_general, objetivos_particulares, alcances))
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
    data = request.json
    id_proyecto = data.get('id_proyecto')
    bimestre = data.get('bimestre')
    resumen_actividades = data.get('resumen_actividades')
    horas_reporte = data.get('horas_reporte')
    horas_acumuladas = data.get('horas_acumuladas')

    if not all([id_proyecto, bimestre, resumen_actividades, horas_reporte is not None, horas_acumuladas is not None]):
        return jsonify({"error": "Faltan campos requeridos"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO reportes_bimestrales (id_proyecto, bimestre, resumen_actividades, horas_reporte, horas_acumuladas)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            resumen_actividades = VALUES(resumen_actividades),
            horas_reporte = VALUES(horas_reporte),
            horas_acumuladas = VALUES(horas_acumuladas)
        """, (id_proyecto, bimestre, resumen_actividades, horas_reporte, horas_acumuladas))
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
    data = request.json
    id_proyecto = data.get('id_proyecto')
    bimestre = data.get('bimestre')
    tipo_evaluador = data.get('tipo_evaluador') # 'ALUMNO' o 'DEPENDENCIA'
    calificaciones_json = data.get('calificaciones_json') # dict guardado como json string
    observaciones = data.get('observaciones')
    respuestas_impacto_json = data.get('respuestas_impacto_json') # solo si ALUMNO

    if not all([id_proyecto, bimestre, tipo_evaluador, calificaciones_json]):
        return jsonify({"error": "Faltan campos requeridos"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        if isinstance(calificaciones_json, dict):
            calificaciones_json = json.dumps(calificaciones_json)
        if respuestas_impacto_json and isinstance(respuestas_impacto_json, dict):
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
