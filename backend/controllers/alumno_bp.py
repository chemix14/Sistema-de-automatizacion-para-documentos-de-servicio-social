import os
import re
import io
import json
import base64
from datetime import datetime, date
from flask import Blueprint, jsonify, request, send_file
from werkzeug.utils import secure_filename
import jwt
import openpyxl
from openpyxl.drawing.image import Image as OpenpyxlImage
from database import Database
from config import Config
from controllers.email_service import send_graph_email_with_attachment

alumno_bp = Blueprint('alumno_bp', __name__)

PLANTILLAS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'plantillas')
GENERADOS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'generados')
os.makedirs(PLANTILLAS_DIR, exist_ok=True)
os.makedirs(GENERADOS_DIR, exist_ok=True)

def get_db():
    db = Database()
    return db.get_connection()

def mes_texto(mes_num):
    meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return meses[mes_num - 1] if 1 <= mes_num <= 12 else str(mes_num)

def safe_set_cell(ws, coord, value):
    if not coord or value is None:
        return
    coord = str(coord).strip().upper()
    if coord == 'XX' or not re.match(r'^[A-Z]+[0-9]+$', coord):
        return
    try:
        cell = ws[coord]
        target_cell = cell
        if isinstance(cell, openpyxl.cell.cell.MergedCell):
            for merge_range in ws.merged_cells.ranges:
                if coord in merge_range:
                    target_cell = ws.cell(row=merge_range.min_row, column=merge_range.min_col)
                    break
        
        # Si la celda original de la plantilla contiene un prefijo numerado (ej. "1.- ", "1 . ", "1. ")
        # y el nuevo valor no comienza con numeración, conservar el prefijo para la plantilla oficial
        val_str = str(value).strip()
        orig_val = target_cell.value
        if isinstance(orig_val, str) and orig_val.strip():
            prefix_match = re.match(r'^([0-9]+\s*[\.\-]+\s*)', orig_val)
            if prefix_match:
                prefix = prefix_match.group(1).rstrip() + ' '
                if not re.match(r'^[0-9]+\s*[\.\-]', val_str):
                    val_str = f"{prefix}{val_str}"

        target_cell.value = val_str
    except Exception:
        pass

def get_current_user_from_token():
    auth_header = request.headers.get('Authorization')
    token = None
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    elif request.args.get('token'):
        token = request.args.get('token')
        
    if not token:
        return None
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return None

def resolve_student_context(cursor, user):
    """
    Obtiene los datos completos del alumno, su proyecto activo, dependencia y actividades.
    """
    correo = user.get('correo') if user else None
    no_control = user.get('no_control') if user else None
    id_usuario = user.get('id_usuario') if user else None
    
    alumno = None
    if no_control:
        cursor.execute("""
            SELECT a.*, c.nombre as nombre_carrera, COALESCE(u.nombre_completo, a.nombre) as usuario_nombre
            FROM alumnos a
            LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            WHERE a.no_control = %s
        """, (no_control,))
        alumno = cursor.fetchone()
        
    if not alumno and (correo or id_usuario):
        cursor.execute("""
            SELECT a.*, c.nombre as nombre_carrera, COALESCE(u.nombre_completo, a.nombre) as usuario_nombre
            FROM alumnos a
            LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            WHERE LOWER(TRIM(a.correo_institucional)) = LOWER(TRIM(%s))
               OR LOWER(TRIM(a.correo_personal)) = LOWER(TRIM(%s))
               OR a.id_usuario = %s
               OR LOWER(TRIM(u.correo)) = LOWER(TRIM(%s))
        """, (correo or '', correo or '', id_usuario or -1, correo or ''))
        alumno = cursor.fetchone()
        
    if not alumno:
        cursor.execute("""
            SELECT a.*, c.nombre as nombre_carrera, a.nombre as usuario_nombre
            FROM alumnos a
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            LIMIT 1
        """)
        alumno = cursor.fetchone()
        
    if not alumno:
        return None, None, None, []

    # Obtener proyecto y dependencia
    cursor.execute("""
        SELECT p.*, per.nombre_oficial as nombre_periodo,
               d.nombre as nombre_dependencia, d.titular as titular_dependencia, d.cargo_titular as cargo_titular_dependencia,
               d.calle as dep_calle, d.numero_ext_int as dep_numero, d.colonia as dep_colonia,
               d.municipio as dep_municipio, d.estado as dep_estado, d.codigo_postal as dep_cp,
               d.telefono as dep_telefono, d.correo as dep_correo
        FROM proyectos_servicio p
        LEFT JOIN periodos per ON p.id_periodo = per.id_periodo
        LEFT JOIN dependencias d ON p.id_dependencia = d.id_dependencia
        WHERE p.no_control = %s AND p.estatus != 'CANCELADO'
        ORDER BY p.id_proyecto DESC
        LIMIT 1
    """, (alumno['no_control'],))
    proyecto = cursor.fetchone()

    dependencia = None
    if proyecto and proyecto.get('id_dependencia'):
        cursor.execute("SELECT * FROM dependencias WHERE id_dependencia = %s", (proyecto['id_dependencia'],))
        dependencia = cursor.fetchone()
    if not dependencia:
        cursor.execute("SELECT * FROM dependencias ORDER BY id_dependencia ASC LIMIT 1")
        dependencia = cursor.fetchone()

    actividades = []
    if proyecto and proyecto.get('id_proyecto'):
        cursor.execute("""
            SELECT orden, descripcion FROM actividades_proyecto 
            WHERE id_proyecto = %s ORDER BY orden ASC LIMIT 10
        """, (proyecto['id_proyecto'],))
        rows = cursor.fetchall()
        act_dict = {r['orden']: r['descripcion'] for r in rows if r.get('orden') is not None}
        actividades = [
            act_dict.get(1) or (rows[0]['descripcion'] if len(rows) > 0 else ''),
            act_dict.get(2) or (rows[1]['descripcion'] if len(rows) > 1 else ''),
            act_dict.get(3) or (rows[2]['descripcion'] if len(rows) > 2 else '')
        ]

    return alumno, proyecto, dependencia, actividades

@alumno_bp.route('/me', methods=['GET'])
def get_my_profile():
    user = get_current_user_from_token()
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    
    try:
        alumno, proyecto, dependencia, actividades = resolve_student_context(cursor, user)
        if not alumno:
            return jsonify({"error": "Perfil de alumno no encontrado"}), 404
            
        return jsonify({
            "alumno": alumno,
            "proyecto": proyecto,
            "dependencia": dependencia,
            "actividades": actividades
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@alumno_bp.route('/expediente', methods=['GET'])
def get_expediente_alumno():
    """
    Devuelve la matriz de documentos que el alumno debe entregar a lo largo de su servicio social,
    junto con su estado actual (Pendiente, En Revisión, Aprobado, Observado, Bloqueado) y si tiene formulario digital activo.
    """
    user = get_current_user_from_token()
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    
    try:
        alumno, proyecto, dependencia, _ = resolve_student_context(cursor, user)
        no_control = alumno['no_control'] if alumno else '23TE0037'
        id_proyecto = proyecto['id_proyecto'] if proyecto else None
        
        # Obtener catálogo de documentos con sus formularios vinculados
        cursor.execute("""
            SELECT d.id_documento, d.clave_formato as clave, 
                   COALESCE(d.nombre, d.nombre_documento) as nombre_documento, 
                   d.etapa,
                   d.activo,
                   f.id_formulario,
                   (CASE WHEN f.id_formulario IS NOT NULL AND EXISTS (SELECT 1 FROM formulario_campos fc WHERE fc.id_formulario = f.id_formulario) THEN 1 ELSE 0 END) as tiene_formulario,
                   (CASE WHEN (d.plantilla_excel IS NOT NULL AND d.plantilla_excel != '') OR (d.ruta_archivo_excel IS NOT NULL AND d.ruta_archivo_excel != '') THEN 1 ELSE 0 END) as plantilla_existe
            FROM catalogo_documentos d
            LEFT JOIN formularios f ON d.id_documento = f.id_documento
            ORDER BY d.id_documento ASC
        """)
        docs = cursor.fetchall()
        
        # Obtener entregas registradas
        entregas_map = {}
        if no_control:
            cursor.execute("""
                SELECT id_entrega, id_documento, estado, ruta_archivo as archivo_subido, fecha_subida as fecha_entrega, observaciones 
                FROM expediente_entregas 
                WHERE no_control = %s OR (id_proyecto IS NOT NULL AND id_proyecto = %s)
            """, (no_control, id_proyecto or -1))
            entregas = cursor.fetchall()
            for e in entregas:
                entregas_map[e['id_documento']] = e

        # Obtener periodo activo oficial para determinar plazos de entrega oficiales
        cursor.execute("SELECT * FROM periodos WHERE activo = 1 ORDER BY id_periodo DESC LIMIT 1")
        periodo = cursor.fetchone() or {}
        
        hoy = date.today()
        def parse_date(val):
            if not val:
                return None
            if isinstance(val, datetime):
                return val.date()
            if isinstance(val, date):
                return val
            if isinstance(val, str):
                try:
                    return datetime.strptime(val.split('T')[0], '%Y-%m-%d').date()
                except Exception:
                    return None
            return None

        fechas_oficiales = {
            'APERTURA': parse_date(periodo.get('cierre_expediente')) or parse_date(periodo.get('apertura_expediente')),
            'BIMESTRE 1': parse_date(periodo.get('limite_entrega_bim_1')) or parse_date(periodo.get('fin_bimestre_1')),
            'BIMESTRE 2': parse_date(periodo.get('limite_entrega_bim_2')) or parse_date(periodo.get('fin_bimestre_2')),
            'BIMESTRE 3': parse_date(periodo.get('limite_entrega_bim_3')) or parse_date(periodo.get('fin_bimestre_3')),
            'LIBERACION': parse_date(periodo.get('cierre_expediente_final')) or parse_date(periodo.get('apertura_expediente_final')),
            'FINAL': parse_date(periodo.get('cierre_expediente_final')) or parse_date(periodo.get('apertura_expediente_final')),
        }

        def resolver_fecha_limite(etp_name):
            if not etp_name:
                return None
            etp_upper = etp_name.strip().upper()
            for key, fval in fechas_oficiales.items():
                if key in etp_upper or (key == 'LIBERACION' and ('FINAL' in etp_upper or 'TERMINACION' in etp_upper or 'CIERRE' in etp_upper)):
                    return fval
            return None
                
        for d in docs:
            etp_doc = d.get('etapa') or 'General'
            flim = resolver_fecha_limite(etp_doc)
            is_vencido = bool(flim and hoy > flim)
            d['fecha_limite'] = str(flim) if flim else None
            d['fecha_limite_formato'] = flim.strftime('%d/%m/%Y') if flim else None
            d['plazo_vencido'] = is_vencido

            e = entregas_map.get(d['id_documento'])
            if e and e.get('estado'):
                estado_actual = e['estado']
                # Si el plazo oficial venció y no está aprobado/rechazado/en revisión, queda en PENDIENTE
                if is_vencido and estado_actual in ['BLOQUEADO', 'DISPONIBLE']:
                    estado_actual = 'PENDIENTE'
                d['estado'] = estado_actual
                d['archivo_subido'] = e.get('archivo_subido')
                d['fecha_entrega'] = str(e.get('fecha_entrega')) if e.get('fecha_entrega') else None
                d['id_entrega'] = e.get('id_entrega')
                d['observaciones'] = e.get('observaciones')
            else:
                # Si el formato está desvinculado por el admin (activo = 0), queda bloqueado.
                # Si el plazo oficial venció o está activo, pasa a PENDIENTE
                if d.get('activo') == 0:
                    d['estado'] = 'BLOQUEADO'
                elif is_vencido:
                    d['estado'] = 'PENDIENTE'
                else:
                    d['estado'] = 'PENDIENTE'
                d['archivo_subido'] = None
                d['fecha_entrega'] = None
                
        return jsonify({
            "no_control": no_control,
            "id_proyecto": id_proyecto,
            "periodo": {
                "id_periodo": periodo.get('id_periodo'),
                "nombre_oficial": periodo.get('nombre_oficial')
            },
            "documentos": docs
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@alumno_bp.route('/formatos/autollenar/<int:id_formulario>', methods=['GET'])
def autollenar_formato(id_formulario):
    """
    Devuelve los datos precargados de la base de datos para el alumno autenticado,
    mapeados a los nombres de variables del formulario para auto-llenar los inputs.
    """
    user = get_current_user_from_token()
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de base de datos"}), 500
    cursor = conn.cursor(dictionary=True)
    
    try:
        alumno, proyecto, dependencia, actividades = resolve_student_context(cursor, user)
        if not alumno:
            return jsonify({"error": "Alumno no encontrado"}), 404
            
        cursor.execute("SELECT * FROM formulario_campos WHERE id_formulario = %s", (id_formulario,))
        campos = cursor.fetchall()
        
        # Obtener configuración del sistema y periodo oficial
        cursor.execute("SELECT * FROM configuracion_sistema WHERE id = 1 LIMIT 1")
        sistema_cfg = cursor.fetchone() or {}
        
        cursor.execute("SELECT * FROM periodos WHERE activo = 1 ORDER BY id_periodo DESC LIMIT 1")
        periodo_obj = cursor.fetchone() or {}
        
        # Construir mapa de datos de la base de datos
        f_inicio = proyecto.get('fecha_inicio') if proyecto else None
        f_fin = proyecto.get('fecha_fin') if proyecto else None
        f_inicio_str = f"{f_inicio.day} de {mes_texto(f_inicio.month)} de {f_inicio.year}" if f_inicio and hasattr(f_inicio, 'day') else (str(f_inicio) if f_inicio else "")
        f_fin_str = f"{f_fin.day} de {mes_texto(f_fin.month)} de {f_fin.year}" if f_fin and hasattr(f_fin, 'day') else (str(f_fin) if f_fin else "")
        
        domicilio_alu = f"{alumno.get('calle') or ''} {alumno.get('colonia') or ''}".strip() or (alumno.get('domicilio') or '')
        domicilio_dep = ""
        if dependencia:
            domicilio_dep = f"{dependencia.get('calle') or ''} {dependencia.get('num_ext_int') or dependencia.get('numero_ext_int') or ''} {dependencia.get('colonia') or ''}".strip()
        elif proyecto:
            domicilio_dep = f"{proyecto.get('dep_calle') or ''} {proyecto.get('dep_numero') or ''} {proyecto.get('dep_colonia') or ''}".strip()
        
        db_map = {
            # Datos Alumno
            'nombre_alumno': alumno.get('nombre') or alumno.get('usuario_nombre') or '',
            'nombre': alumno.get('nombre') or alumno.get('usuario_nombre') or '',
            'sexo': alumno.get('sexo') or '',
            'telefono': alumno.get('telefono') or '',
            'domicilio': domicilio_alu,
            'calle': alumno.get('calle') or '',
            'colonia': alumno.get('colonia') or '',
            'ciudad': alumno.get('ciudad') or 'Teziutlán',
            'estado': alumno.get('estado') or 'Puebla',
            'correo_inst': alumno.get('correo_institucional') or '',
            'correo_institucional': alumno.get('correo_institucional') or '',
            'correo_per': alumno.get('correo_personal') or '',
            'correo_personal': alumno.get('correo_personal') or '',
            'no_control': alumno.get('no_control') or '',
            'carrera': alumno.get('nombre_carrera') or alumno.get('carrera') or '',
            'semestre': str(alumno.get('semestre') or '7'),
            'modalidad': (alumno.get('modalidad') or (proyecto.get('modalidad') if proyecto else '')) or 'ESCOLARIZADA',
            'periodos_cursados': str(alumno.get('periodos_cursados') or '6'),
            'creditos_aprobados': str(alumno.get('creditos_aprobados') or '180'),
            'periodo': (proyecto.get('nombre_periodo') if proyecto else '') or periodo_obj.get('nombre_oficial') or sistema_cfg.get('periodo_oficial') or 'Enero - Junio 2026',
            
            # Datos Proyecto
            'nombre_proyecto': (proyecto.get('nombre_proyecto') if proyecto else '') or '',
            'objetivo': (proyecto.get('objetivo') if proyecto else '') or '',
            'programa_institucional': (proyecto.get('programa_institucional') if proyecto else '') or '',
            'tipo_programa': (proyecto.get('tipo_programa') if proyecto else '') or '',
            'fecha_inicio': f_inicio_str,
            'fecha_fin': f_fin_str,
            'resp_proy': (proyecto.get('responsable_nombre') or proyecto.get('responsable_proyecto') if proyecto else '') or '',
            'responsable_nombre': (proyecto.get('responsable_nombre') or proyecto.get('responsable_proyecto') if proyecto else '') or '',
            'cargo_resp': (proyecto.get('responsable_cargo') or proyecto.get('cargo_responsable') if proyecto else '') or '',
            'responsable_cargo': (proyecto.get('responsable_cargo') or proyecto.get('cargo_responsable') if proyecto else '') or '',
            'sup_proy': (proyecto.get('supervisor_nombre') or proyecto.get('supervisor_proyecto') if proyecto else '') or '',
            'supervisor_nombre': (proyecto.get('supervisor_nombre') or proyecto.get('supervisor_proyecto') if proyecto else '') or '',
            'cargo_sup': (proyecto.get('supervisor_cargo') or proyecto.get('cargo_supervisor') if proyecto else '') or '',
            'supervisor_cargo': (proyecto.get('supervisor_cargo') or proyecto.get('cargo_supervisor') if proyecto else '') or '',
            
            # Datos Dependencia
            'nombre_dep': (dependencia.get('nombre') if dependencia else '') or (proyecto.get('nombre_dependencia') if proyecto else '') or '',
            'nombre_dependencia': (dependencia.get('nombre') if dependencia else '') or (proyecto.get('nombre_dependencia') if proyecto else '') or '',
            'titular_dep': (dependencia.get('titular') if dependencia else '') or (proyecto.get('titular_dependencia') if proyecto else '') or '',
            'titular': (dependencia.get('titular') if dependencia else '') or (proyecto.get('titular_dependencia') if proyecto else '') or '',
            'cargo_titular': (dependencia.get('cargo_titular') if dependencia else '') or (proyecto.get('cargo_titular_dependencia') if proyecto else '') or '',
            'tel_dep': (dependencia.get('telefono') if dependencia else '') or (proyecto.get('dep_telefono') if proyecto else '') or '',
            'dom_dep': domicilio_dep,
            'calle_dep': (dependencia.get('calle') if dependencia else '') or (proyecto.get('dep_calle') if proyecto else '') or '',
            'ciu_dep': (dependencia.get('ciudad') or dependencia.get('municipio') if dependencia else '') or (proyecto.get('dep_municipio') if proyecto else '') or 'Teziutlán',
            'est_dep': (dependencia.get('estado') if dependencia else '') or (proyecto.get('dep_estado') if proyecto else '') or 'Puebla',
            'cor_dep': (dependencia.get('correo') if dependencia else '') or (proyecto.get('dep_correo') if proyecto else '') or '',
            
            # Actividades
            'act1': actividades[0] if len(actividades) > 0 else '',
            'act2': actividades[1] if len(actividades) > 1 else '',
            'act3': actividades[2] if len(actividades) > 2 else '',
            'actividad_1': actividades[0] if len(actividades) > 0 else '',
            'actividad_2': actividades[1] if len(actividades) > 1 else '',
            'actividad_3': actividades[2] if len(actividades) > 2 else '',
            'actividad1': actividades[0] if len(actividades) > 0 else '',
            'actividad2': actividades[1] if len(actividades) > 1 else '',
            'actividad3': actividades[2] if len(actividades) > 2 else '',
        }
        
        prefill = {}
        for campo in campos:
            var = campo.get('nombre_variable')
            cid = campo.get('id_campo')
            
            # Si tiene fuente específica de base de datos (Smart Data)
            val = None
            if campo.get('columna_origen'):
                col = (campo['columna_origen'] or '').strip()
                tab_raw = (campo.get('tabla_origen') or '').strip().upper()
                
                # 1. ALUMNO
                if tab_raw in ['ALUMNO', 'ALUMNOS']:
                    if alumno and col in alumno and alumno[col] is not None:
                        val = alumno[col]
                    elif col == 'carrera' and alumno:
                        val = alumno.get('nombre_carrera') or alumno.get('carrera')
                    elif col == 'nombre' and alumno:
                        val = alumno.get('nombre') or alumno.get('usuario_nombre')
                    elif col == 'domicilio' and alumno:
                        val = domicilio_alu
                        
                # 2. PROYECTO
                elif tab_raw in ['PROYECTO', 'PROYECTOS', 'PROYECTOS_SERVICIO']:
                    if proyecto and col in proyecto and proyecto[col] is not None:
                        val = proyecto[col]
                    elif col == 'responsable_nombre' and proyecto:
                        val = proyecto.get('responsable_nombre') or proyecto.get('responsable_proyecto')
                    elif col == 'responsable_cargo' and proyecto:
                        val = proyecto.get('responsable_cargo') or proyecto.get('cargo_responsable')
                    elif col == 'supervisor_nombre' and proyecto:
                        val = proyecto.get('supervisor_nombre') or proyecto.get('supervisor_proyecto')
                    elif col == 'supervisor_cargo' and proyecto:
                        val = proyecto.get('supervisor_cargo') or proyecto.get('cargo_supervisor')
                    elif col == 'fecha_inicio' and proyecto and f_inicio_str:
                        val = f_inicio_str
                    elif col == 'fecha_fin' and proyecto and f_fin_str:
                        val = f_fin_str
                        
                # 3. DEPENDENCIA
                elif tab_raw in ['DEPENDENCIA', 'DEPENDENCIAS']:
                    if dependencia and col in dependencia and dependencia[col] is not None:
                        val = dependencia[col]
                    elif proyecto:
                        dep_alias = {
                            'nombre': 'nombre_dependencia',
                            'titular': 'titular_dependencia',
                            'cargo_titular': 'cargo_titular_dependencia',
                            'calle': 'dep_calle',
                            'num_ext_int': 'dep_numero',
                            'numero_ext_int': 'dep_numero',
                            'colonia': 'dep_colonia',
                            'municipio': 'dep_municipio',
                            'ciudad': 'dep_municipio',
                            'estado': 'dep_estado',
                            'codigo_postal': 'dep_cp',
                            'telefono': 'dep_telefono',
                            'correo': 'dep_correo'
                        }
                        alias_k = dep_alias.get(col)
                        if alias_k and alias_k in proyecto and proyecto[alias_k] is not None:
                            val = proyecto[alias_k]
                            
                # 4. PERIODO
                elif tab_raw in ['PERIODO', 'PERIODOS']:
                    if periodo_obj and col in periodo_obj and periodo_obj[col] is not None:
                        val = periodo_obj[col]
                    elif proyecto and col == 'nombre_oficial':
                        val = proyecto.get('nombre_periodo')
                        
                # 5. SISTEMA
                elif tab_raw in ['SISTEMA', 'CONFIGURACION', 'CONFIGURACION_SISTEMA']:
                    if sistema_cfg and col in sistema_cfg and sistema_cfg[col] is not None:
                        val = sistema_cfg[col]

                # 6. ACTIVIDADES (o dentro de PROYECTO)
                elif tab_raw in ['ACTIVIDADES', 'ACTIVIDAD', 'ACTIVIDADES_PROYECTO', 'PROGRAMA_ACTIVIDADES'] or (tab_raw in ['PROYECTO', 'PROYECTOS', 'PROYECTOS_SERVICIO'] and col in ['actividad_1', 'actividad_2', 'actividad_3', 'act1', 'act2', 'act3', 'actividad1', 'actividad2', 'actividad3']):
                    if col in ['actividad_1', 'act1', 'actividad1'] and len(actividades) > 0:
                        val = actividades[0]
                    elif col in ['actividad_2', 'act2', 'actividad2'] and len(actividades) > 1:
                        val = actividades[1]
                    elif col in ['actividad_3', 'act3', 'actividad3'] and len(actividades) > 2:
                        val = actividades[2]
                        
                # Fallback por nombre de columna si no se encontró en la tabla específica
                if val is None and col in db_map:
                    val = db_map[col]
                    
            if val is None and var in db_map:
                val = db_map[var]
                
            if val is not None:
                # Normalizar fechas y números
                if hasattr(val, 'strftime'):
                    val = val.strftime('%Y-%m-%d')
                val_str = str(val)
                prefill[str(cid)] = val_str
                if var:
                    prefill[var] = val_str
                if campo.get('columna_origen'):
                    prefill[campo['columna_origen']] = val_str
                    
        return jsonify({
            "prefill": prefill,
            "alumno": alumno,
            "proyecto": proyecto,
            "dependencia": dependencia
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@alumno_bp.route('/formatos/entregar/<int:id_formulario>', methods=['POST'])
def entregar_formato(id_formulario):
    """
    Procesa la entrega de un formato llenado por el alumno:
    1. Sincroniza bidireccionalmente los datos en la base de datos (alumnos, dependencias, proyectos).
    2. Localiza la plantilla Excel vinculada y rellena las celdas mapeadas (celda_excel).
    3. Guarda una copia del Excel generado en el servidor.
    4. Lee el correo configurado por el administrador para recepción de formatos.
    5. Envía el Excel como archivo adjunto mediante Microsoft Graph API al correo de recepción.
    6. Registra la entrega en el expediente del alumno con estatus 'EN_REVISION'.
    7. Devuelve el archivo en Base64 para su descarga inmediata automática en el navegador del alumno.
    """
    user = get_current_user_from_token()
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión con la base de datos"}), 500
    cursor = conn.cursor(dictionary=True)
    
    try:
        data = request.json or {}
        form_data = data.get('formData') or data
        
        # 1. Identificar Alumno, Proyecto y Dependencia
        alumno, proyecto, dependencia, actividades = resolve_student_context(cursor, user)
        if not alumno:
            return jsonify({"error": "No se encontró el registro del alumno"}), 404
            
        no_control = alumno['no_control']
        id_proyecto = proyecto['id_proyecto'] if proyecto else None
        id_dependencia = (dependencia.get('id_dependencia') if dependencia else None) or (proyecto.get('id_dependencia') if proyecto else None)
        
        # 2. Obtener información del formulario y su documento asociado
        cursor.execute("""
            SELECT f.*, d.id_documento, d.clave_formato, 
                   COALESCE(d.nombre, d.nombre_documento) as nombre_documento,
                   d.plantilla_excel, d.ruta_archivo_excel
            FROM formularios f
            JOIN catalogo_documentos d ON f.id_documento = d.id_documento
            WHERE f.id_formulario = %s
        """, (id_formulario,))
        form_info = cursor.fetchone()
        
        if not form_info:
            return jsonify({"error": "El formulario especificado no existe"}), 404
            
        id_documento = form_info['id_documento']
        clave_formato = (form_info.get('clave_formato') or 'FORMATO').upper()
        nombre_documento = form_info.get('nombre_documento') or form_info.get('nombre')
        
        # 3. Obtener campos configurados del formulario
        cursor.execute("""
            SELECT * FROM formulario_campos 
            WHERE id_formulario = %s 
            ORDER BY orden ASC
        """, (id_formulario,))
        campos = cursor.fetchall()
        
        # ----------------------------------------------------------------------
        # NUEVO: SINCRONIZACIÓN BIDIRECCIONAL HACIA LA BASE DE DATOS
        # Los datos ingresados por el alumno en campos vinculados a Smart Data
        # se persisten inmediatamente en las tablas correspondientes.
        # ----------------------------------------------------------------------
        SAFE_ALUMNO_COLS = {
            'nombre', 'semestre', 'modalidad', 'sexo', 'telefono', 'calle', 
            'colonia', 'ciudad', 'estado', 'domicilio', 'correo_personal', 
            'correo_institucional', 'periodos_cursados', 'creditos_aprobados'
        }
        SAFE_DEP_COLS = {
            'nombre', 'titular', 'cargo_titular', 'calle', 'num_ext_int', 
            'numero_ext_int', 'colonia', 'municipio', 'ciudad', 'estado', 
            'codigo_postal', 'telefono', 'correo'
        }
        SAFE_PROY_COLS = {
            'nombre_proyecto', 'objetivo', 'modalidad', 'programa_institucional', 
            'tipo_programa', 'responsable_nombre', 'responsable_cargo', 
            'supervisor_nombre', 'supervisor_cargo', 'responsable_proyecto', 
            'cargo_responsable', 'supervisor_proyecto', 'cargo_supervisor', 
            'fecha_inicio', 'fecha_fin'
        }
        
        SAFE_ACT_COLS = {
            'actividad_1', 'actividad_2', 'actividad_3',
            'act1', 'act2', 'act3',
            'actividad1', 'actividad2', 'actividad3'
        }
        
        alumno_sync = {}
        dep_sync = {}
        proyecto_sync = {}
        actividades_sync = {}
        
        for campo in campos:
            tab_raw = (campo.get('tabla_origen') or '').strip().upper()
            col_raw = (campo.get('columna_origen') or '').strip()
            var_name = campo.get('nombre_variable')
            cid_str = str(campo.get('id_campo'))
            
            # Obtener valor enviado por el alumno
            val = form_data.get(var_name)
            if val is None or str(val).strip() == '':
                val = form_data.get(cid_str)
            if (val is None or str(val).strip() == '') and col_raw:
                val = form_data.get(col_raw)
                
            if val is not None and str(val).strip() != '':
                val_clean = str(val).strip()
                if tab_raw in ['ALUMNO', 'ALUMNOS'] and col_raw in SAFE_ALUMNO_COLS:
                    alumno_sync[col_raw] = val_clean
                elif tab_raw in ['DEPENDENCIA', 'DEPENDENCIAS'] and col_raw in SAFE_DEP_COLS:
                    dep_sync[col_raw] = val_clean
                elif tab_raw in ['PROYECTO', 'PROYECTOS', 'PROYECTOS_SERVICIO'] and col_raw in SAFE_PROY_COLS:
                    proyecto_sync[col_raw] = val_clean

                # Actividades vinculadas por Smart Data
                if (tab_raw in ['ACTIVIDADES', 'ACTIVIDAD', 'ACTIVIDADES_PROYECTO', 'PROGRAMA_ACTIVIDADES'] or tab_raw in ['PROYECTO', 'PROYECTOS', 'PROYECTOS_SERVICIO']) and col_raw in SAFE_ACT_COLS:
                    if col_raw in ['actividad_1', 'act1', 'actividad1']:
                        actividades_sync[1] = val_clean
                    elif col_raw in ['actividad_2', 'act2', 'actividad2']:
                        actividades_sync[2] = val_clean
                    elif col_raw in ['actividad_3', 'act3', 'actividad3']:
                        actividades_sync[3] = val_clean

            # Detección complementaria por nombre de variable
            if var_name in SAFE_ACT_COLS:
                v_act = form_data.get(var_name)
                if v_act is not None and str(v_act).strip() != '':
                    if var_name in ['actividad_1', 'act1', 'actividad1']:
                        actividades_sync[1] = str(v_act).strip()
                    elif var_name in ['actividad_2', 'act2', 'actividad2']:
                        actividades_sync[2] = str(v_act).strip()
                    elif var_name in ['actividad_3', 'act3', 'actividad3']:
                        actividades_sync[3] = str(v_act).strip()
                    
        # Aplicar actualizaciones en la base de datos
        try:
            # A) Actualizar Alumno
            if alumno_sync and no_control:
                set_parts = [f"`{k}` = %s" for k in alumno_sync.keys()]
                sql_alu = f"UPDATE alumnos SET {', '.join(set_parts)} WHERE no_control = %s"
                cursor.execute(sql_alu, list(alumno_sync.values()) + [no_control])
                
            # B) Actualizar o Crear Dependencia
            if dep_sync:
                if id_dependencia:
                    set_parts = [f"`{k}` = %s" for k in dep_sync.keys()]
                    sql_dep = f"UPDATE dependencias SET {', '.join(set_parts)} WHERE id_dependencia = %s"
                    cursor.execute(sql_dep, list(dep_sync.values()) + [id_dependencia])
                else:
                    dep_nombre = dep_sync.get('nombre') or 'Dependencia Oficial de Servicio Social'
                    if 'nombre' not in dep_sync:
                        dep_sync['nombre'] = dep_nombre
                    cols = list(dep_sync.keys())
                    placeholders = ", ".join(["%s"] * len(cols))
                    col_names = ", ".join([f"`{c}`" for c in cols])
                    cursor.execute(f"INSERT INTO dependencias ({col_names}) VALUES ({placeholders})", list(dep_sync.values()))
                    id_dependencia = cursor.lastrowid
                    if id_proyecto:
                        cursor.execute("UPDATE proyectos_servicio SET id_dependencia = %s WHERE id_proyecto = %s", (id_dependencia, id_proyecto))
                        
            # C) Actualizar o Crear Proyecto de Servicio Social
            if proyecto_sync:
                # Sincronizar sinónimos de responsables y supervisores
                if 'responsable_nombre' in proyecto_sync and 'responsable_proyecto' not in proyecto_sync:
                    proyecto_sync['responsable_proyecto'] = proyecto_sync['responsable_nombre']
                if 'responsable_cargo' in proyecto_sync and 'cargo_responsable' not in proyecto_sync:
                    proyecto_sync['cargo_responsable'] = proyecto_sync['responsable_cargo']
                if 'supervisor_nombre' in proyecto_sync and 'supervisor_proyecto' not in proyecto_sync:
                    proyecto_sync['supervisor_proyecto'] = proyecto_sync['supervisor_nombre']
                if 'supervisor_cargo' in proyecto_sync and 'cargo_supervisor' not in proyecto_sync:
                    proyecto_sync['cargo_supervisor'] = proyecto_sync['supervisor_cargo']
                    
                if id_proyecto:
                    set_parts = [f"`{k}` = %s" for k in proyecto_sync.keys()]
                    sql_proy = f"UPDATE proyectos_servicio SET {', '.join(set_parts)} WHERE id_proyecto = %s"
                    cursor.execute(sql_proy, list(proyecto_sync.values()) + [id_proyecto])
                else:
                    proy_nombre = proyecto_sync.get('nombre_proyecto') or 'Servicio Social Institucional'
                    if 'no_control' not in proyecto_sync:
                        proyecto_sync['no_control'] = no_control
                    if 'id_dependencia' not in proyecto_sync and id_dependencia:
                        proyecto_sync['id_dependencia'] = id_dependencia
                    if 'nombre_proyecto' not in proyecto_sync:
                        proyecto_sync['nombre_proyecto'] = proy_nombre
                    cols = list(proyecto_sync.keys())
                    placeholders = ", ".join(["%s"] * len(cols))
                    col_names = ", ".join([f"`{c}`" for c in cols])
                    cursor.execute(f"INSERT INTO proyectos_servicio ({col_names}) VALUES ({placeholders})", list(proyecto_sync.values()))
                    id_proyecto = cursor.lastrowid

            # D) Actualizar o Guardar Actividades del Proyecto en actividades_proyecto
            if actividades_sync and (id_proyecto or no_control):
                if not id_proyecto:
                    cursor.execute("SELECT id_proyecto FROM proyectos_servicio WHERE no_control = %s ORDER BY id_proyecto DESC LIMIT 1", (no_control,))
                    p_row = cursor.fetchone()
                    if p_row:
                        id_proyecto = p_row['id_proyecto']
                    else:
                        cursor.execute("INSERT INTO proyectos_servicio (no_control, id_dependencia, nombre_proyecto) VALUES (%s, %s, %s)", (no_control, id_dependencia, 'Servicio Social Institucional'))
                        id_proyecto = cursor.lastrowid
                
                if id_proyecto:
                    for orden, desc in actividades_sync.items():
                        cursor.execute("""
                            SELECT id_actividad FROM actividades_proyecto 
                            WHERE id_proyecto = %s AND orden = %s 
                            LIMIT 1
                        """, (id_proyecto, orden))
                        act_existente = cursor.fetchone()
                        if act_existente:
                            cursor.execute("""
                                UPDATE actividades_proyecto 
                                SET descripcion = %s 
                                WHERE id_actividad = %s
                            """, (desc, act_existente['id_actividad']))
                        else:
                            cursor.execute("""
                                INSERT INTO actividades_proyecto 
                                (id_proyecto, orden, descripcion, tipo, b1, b2, b3)
                                VALUES (%s, %s, %s, 'actividad', 1, 1, 1)
                            """, (id_proyecto, orden, desc))

                    # Actualizar lista de actividades en memoria para relleno de Excel
                    while len(actividades) < 3:
                        actividades.append('')
                    if 1 in actividades_sync:
                        actividades[0] = actividades_sync[1]
                    if 2 in actividades_sync:
                        actividades[1] = actividades_sync[2]
                    if 3 in actividades_sync:
                        actividades[2] = actividades_sync[3]

            conn.commit()
        except Exception as sync_err:
            print(f"Advertencia al sincronizar base de datos desde formato: {sync_err}")
            # Continuamos con la generación del documento para no bloquear la entrega
            
        # 4. Localizar la plantilla Excel
        plantilla_candidata = form_info.get('plantilla_excel') or form_info.get('ruta_archivo_excel')
        plantilla_path = None
        
        if plantilla_candidata:
            direct_path = os.path.join(PLANTILLAS_DIR, plantilla_candidata)
            if os.path.exists(direct_path):
                plantilla_path = direct_path
                
        # Búsqueda inteligente por clave si no se encontró por nombre exacto
        if not plantilla_path and os.path.exists(PLANTILLAS_DIR):
            for fname in os.listdir(PLANTILLAS_DIR):
                if not fname.endswith(('.xlsx', '.xlsm')):
                    continue
                clean_fname = fname.upper().replace(' ', '').replace('-', '').replace('_', '')
                clean_clave = clave_formato.replace('-', '').replace('_', '')
                if clean_clave in clean_fname:
                    plantilla_path = os.path.join(PLANTILLAS_DIR, fname)
                    break
                    
        # Cargar libro Excel o crear uno nuevo si no existe plantilla
        if plantilla_path and os.path.exists(plantilla_path):
            wb = openpyxl.load_workbook(plantilla_path)
            ws = wb.active
        else:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = clave_formato
            ws['A1'] = f"INSTITUTO TECNOLÓGICO SUPERIOR DE TEZIUTLÁN - {nombre_documento}"
            ws['A2'] = f"Alumno: {alumno.get('nombre')} ({no_control})"
        # 4.5. Aplicar reglas de Lógica Condicional (Llenado) si existen
        for campo in campos:
            reglas_raw = campo.get('reglas_transformacion')
            if not reglas_raw:
                continue
            try:
                config_llenado = json.loads(reglas_raw) if isinstance(reglas_raw, str) else reglas_raw
            except Exception:
                config_llenado = None
                
            if config_llenado and (config_llenado.get('habilitar') in (1, True, '1')) and isinstance(config_llenado.get('reglas'), list):
                var_name = campo.get('nombre_variable')
                cid_str = str(campo.get('id_campo'))
                val_sel = form_data.get(var_name)
                if val_sel is None or str(val_sel).strip() == '':
                    val_sel = form_data.get(cid_str)
                    
                if val_sel is not None and str(val_sel).strip() != '':
                    val_norm = str(val_sel).strip().lower()
                    for r in config_llenado.get('reglas', []):
                        if str(r.get('opcion', '')).strip().lower() == val_norm and r.get('texto'):
                            target_var = config_llenado.get('campo_objetivo')
                            if target_var and target_var != 'self':
                                form_data[target_var] = r.get('texto')
                            else:
                                form_data[var_name] = r.get('texto')
                                form_data[cid_str] = r.get('texto')
                            break

        # 5. Rellenar celdas del Excel con los datos enviados y de la BD
        for campo in campos:
            celda = campo.get('celda_excel')
            mapeo_adv = campo.get('mapeo_excel_avanzado')
            modo_mapeo = campo.get('modo_mapeo_excel') or ('individual' if (mapeo_adv and not celda) else 'unica')
            
            # Si no hay celda de destino ni mapeo avanzado, no hay nada que llenar
            if (not celda or celda == 'XX') and not mapeo_adv:
                continue
                
            var_name = campo.get('nombre_variable')
            cid_str = str(campo.get('id_campo'))
            col_origen = campo.get('columna_origen')
            
            # Prioridad 1: valor enviado en el formulario
            val = form_data.get(var_name)
            if val is None or str(val).strip() == '':
                val = form_data.get(cid_str)
            if (val is None or str(val).strip() == '') and col_origen:
                val = form_data.get(col_origen)
                
            # Prioridad 2: datos sincronizados en memoria o de la base de datos
            if val is None or str(val).strip() == '':
                if var_name == 'nombre_alumno': val = alumno.get('nombre')
                elif var_name == 'no_control': val = no_control
                elif var_name == 'carrera': val = alumno.get('nombre_carrera') or alumno.get('carrera')
                elif var_name == 'telefono': val = alumno.get('telefono')
                elif var_name == 'correo_inst': val = alumno.get('correo_institucional')
                elif var_name == 'correo_per': val = alumno.get('correo_personal')
                elif var_name == 'ciudad': val = alumno.get('ciudad')
                elif var_name == 'estado': val = alumno.get('estado')
                elif var_name == 'nombre_proyecto' and proyecto: val = proyecto.get('nombre_proyecto')
                elif var_name == 'nombre_dep': val = (dependencia.get('nombre') if dependencia else '') or (proyecto.get('nombre_dependencia') if proyecto else '')
                elif var_name == 'titular_dep': val = (dependencia.get('titular') if dependencia else '') or (proyecto.get('titular_dependencia') if proyecto else '')
                elif var_name == 'cargo_titular': val = (dependencia.get('cargo_titular') if dependencia else '') or (proyecto.get('cargo_titular_dependencia') if proyecto else '')
                elif var_name == 'resp_proy' and proyecto: val = proyecto.get('responsable_nombre')
                elif var_name == 'cargo_resp' and proyecto: val = proyecto.get('responsable_cargo')
                elif var_name == 'sup_proy' and proyecto: val = proyecto.get('supervisor_nombre')
                elif var_name == 'cargo_sup' and proyecto: val = proyecto.get('supervisor_cargo')
                elif (var_name in ['act1', 'actividad_1', 'actividad1'] or col_origen in ['act1', 'actividad_1', 'actividad1']) and len(actividades) > 0: val = actividades[0]
                elif (var_name in ['act2', 'actividad_2', 'actividad2'] or col_origen in ['act2', 'actividad_2', 'actividad2']) and len(actividades) > 1: val = actividades[1]
                elif (var_name in ['act3', 'actividad_3', 'actividad3'] or col_origen in ['act3', 'actividad_3', 'actividad3']) and len(actividades) > 2: val = actividades[2]
                
            # Parsear mapeo avanzado si existe
            parsed_adv = []
            if mapeo_adv:
                if isinstance(mapeo_adv, str):
                    try:
                        parsed_adv = json.loads(mapeo_adv)
                    except Exception:
                        parsed_adv = []
                elif isinstance(mapeo_adv, list):
                    parsed_adv = mapeo_adv

            # Modo Mapeo Individual por Opción
            if modo_mapeo == 'individual' and parsed_adv:
                if val is not None and str(val).strip() != '':
                    selected_list = val if isinstance(val, list) else [str(val).strip()]
                    selected_normalized = [str(x).strip().lower() for x in selected_list]

                    for map_item in parsed_adv:
                        opt_val = str(map_item.get('valor_opcion', '')).strip().lower()
                        target_cell = map_item.get('celda_excel')
                        texto_marca = map_item.get('texto_excel') or 'X'

                        if target_cell and target_cell != 'XX' and opt_val in selected_normalized:
                            safe_set_cell(ws, target_cell, str(texto_marca))
            else:
                # Modo Casilla Única o Inserción de Imagen
                tipo_c = campo.get('tipo_campo')
                if tipo_c in ['file', 'image', 'imagen'] and celda and celda != 'XX' and val:
                    try:
                        img_b64 = None
                        if isinstance(val, dict):
                            img_b64 = val.get('dataUrl') or val.get('base64') or val.get('data')
                        elif isinstance(val, str):
                            img_b64 = val

                        if img_b64 and 'base64,' in img_b64:
                            img_b64 = img_b64.split('base64,')[1]

                        if img_b64:
                            img_bytes = base64.b64decode(img_b64)
                            img_buf = io.BytesIO(img_bytes)
                            
                            ancho = int(float(campo.get('ancho_imagen') or 150))
                            alto = int(float(campo.get('alto_imagen') or 120))
                            
                            from PIL import Image as PILImage
                            pil_img = PILImage.open(img_buf)
                            if pil_img.mode in ('RGBA', 'LA') or (pil_img.mode == 'P' and 'transparency' in pil_img.info):
                                pil_img = pil_img.convert('RGBA')
                            else:
                                pil_img = pil_img.convert('RGB')
                                
                            pil_img = pil_img.resize((ancho, alto), PILImage.Resampling.LANCZOS)
                            resized_buf = io.BytesIO()
                            pil_img.save(resized_buf, format='PNG')
                            resized_buf.seek(0)
                            
                            xl_img = OpenpyxlImage(resized_buf)
                            xl_img.width = ancho
                            xl_img.height = alto
                            
                            target_cell = celda.strip().upper()
                            ws.add_image(xl_img, target_cell)
                    except Exception as img_err:
                        print(f"Error al incrustar imagen en plantilla Excel (celda {celda}): {img_err}")
                elif celda and celda != 'XX' and val is not None:
                    safe_set_cell(ws, celda, str(val))
                
        # 6. Guardar archivo Excel generado en disco
        timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_clave = re.sub(r'[^A-Za-z0-9_]', '', clave_formato)
        filename_generado = f"{no_control}_{safe_clave}_{timestamp_str}.xlsx"
        full_dest_path = os.path.join(GENERADOS_DIR, filename_generado)
        
        wb.save(full_dest_path)
        
        # Leer bytes del archivo para descarga y correo
        with open(full_dest_path, 'rb') as f:
            file_bytes = f.read()
        file_base64 = base64.b64encode(file_bytes).decode('utf-8')
        
        # 7. Obtener correo de recepción configurado por el Administrador
        cursor.execute("SELECT correo_recepcion_formatos FROM configuracion_sistema WHERE id = 1 LIMIT 1")
        cfg_row = cursor.fetchone()
        correo_recepcion = (cfg_row.get('correo_recepcion_formatos') if cfg_row else None) or 'serviciosocial@teziutlan.tecnm.mx'
        
        # 8. Enviar correo con el archivo Excel adjunto mediante Microsoft Graph API
        nombre_completo_alu = alumno.get('nombre') or alumno.get('usuario_nombre') or no_control
        carrera_alu = alumno.get('nombre_carrera') or alumno.get('carrera') or 'N/A'
        correo_alu = alumno.get('correo_institucional') or alumno.get('correo_personal') or 'No registrado'
        fecha_hora_str = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        
        subject = f"[Servicio Social] Entrega de Formato: {clave_formato} - {no_control} {nombre_completo_alu}"
        
        html_content = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #022c22 0%, #064e3b 100%); color: #ffffff; padding: 24px; text-align: center;">
                <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700;">Instituto Tecnológico Superior de Teziutlán</h2>
                <p style="margin: 0; font-size: 14px; color: #a7f3d0;">Departamento de Servicio Social y Residencias Profesionales</p>
            </div>
            
            <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
                <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px;">
                    <strong style="color: #065f46; font-size: 15px;">Nueva entrega de formato recibida</strong>
                    <p style="margin: 4px 0 0 0; color: #047857; font-size: 13px;">El alumno ha completado el formulario digital y se adjunta la copia oficial en formato Excel (.xlsx) para su revisión y cotejo.</p>
                </div>
                
                <h3 style="color: #0f172a; font-size: 16px; margin: 16px 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">Ficha de la Entrega</h3>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; width: 35%; border-bottom: 1px solid #e2e8f0;">Formato:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{nombre_documento} ({clave_formato})</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Nombre del Alumno:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><strong>{nombre_completo_alu}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Número de Control:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 700;">{no_control}</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Carrera:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{carrera_alu}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Correo de Contacto:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{correo_alu}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Fecha y Hora:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{fecha_hora_str}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Archivo Adjunto:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #047857;">{filename_generado}</td>
                    </tr>
                </table>
                
                <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
                    Este es un correo automático generado por el Sistema de Automatización para Documentos de Servicio Social del ITST.
                </p>
            </div>
        </div>
        """
        
        user_id_val = (user.get('id_usuario') if user else None) or alumno.get('id_usuario')
        envio_status, error_envio = send_graph_email_with_attachment(
            to_email=correo_recepcion,
            to_name="Recepción de Servicio Social",
            subject=subject,
            html_content=html_content,
            attachment_filename=filename_generado,
            attachment_bytes=file_bytes,
            id_usuario=user_id_val
        )
        
        # 9. Actualizar o Registrar entrega en expediente_entregas
        cursor.execute("""
            SELECT id_entrega FROM expediente_entregas 
            WHERE id_documento = %s AND (no_control = %s OR (id_proyecto IS NOT NULL AND id_proyecto = %s))
            LIMIT 1
        """, (id_documento, no_control, id_proyecto or -1))
        existing_entrega = cursor.fetchone()
        
        obs_texto = f"Entregado digitalmente el {fecha_hora_str}. Correo Outlook: {envio_status} a {correo_recepcion}."
        
        if existing_entrega:
            cursor.execute("""
                UPDATE expediente_entregas 
                SET estado = 'EN_REVISION',
                    ruta_archivo = %s,
                    fecha_subida = CURRENT_TIMESTAMP,
                    observaciones = %s,
                    no_control = %s,
                    id_proyecto = %s
                WHERE id_entrega = %s
            """, (filename_generado, obs_texto, no_control, id_proyecto, existing_entrega['id_entrega']))
            id_entrega = existing_entrega['id_entrega']
        else:
            cursor.execute("""
                INSERT INTO expediente_entregas 
                (no_control, id_proyecto, id_documento, estado, ruta_archivo, fecha_subida, observaciones)
                VALUES (%s, %s, %s, 'EN_REVISION', %s, CURRENT_TIMESTAMP, %s)
            """, (no_control, id_proyecto, id_documento, filename_generado, obs_texto))
            id_entrega = cursor.lastrowid
            
        conn.commit()
        
        return jsonify({
            "success": True,
            "message": "Formato generado, guardado y enviado al buzón de recepción con éxito",
            "id_entrega": id_entrega,
            "filename": filename_generado,
            "file_base64": file_base64,
            "correo_destino": correo_recepcion,
            "envio_status": envio_status,
            "error_envio": error_envio,
            "estado": "EN_REVISION"
        }), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@alumno_bp.route('/formatos/descargar-generado/<int:id_entrega>', methods=['GET'])
def descargar_generado(id_entrega):
    """
    Permite al alumno descargar la copia de un formato entregado previamente.
    """
    user = get_current_user_from_token()
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        alumno, _, _, _ = resolve_student_context(cursor, user)
        no_control = alumno['no_control'] if alumno else None
        
        cursor.execute("SELECT ruta_archivo, no_control FROM expediente_entregas WHERE id_entrega = %s", (id_entrega,))
        entrega = cursor.fetchone()
        
        if not entrega or not entrega.get('ruta_archivo'):
            return jsonify({"error": "Archivo no encontrado"}), 404
            
        filename = entrega['ruta_archivo']
        full_path = os.path.join(GENERADOS_DIR, filename)
        if not os.path.exists(full_path):
            full_path = filename
            
        if not os.path.exists(full_path):
            return jsonify({"error": "El archivo físico no se encuentra en el servidor"}), 404
            
        return send_file(full_path, as_attachment=True, download_name=os.path.basename(full_path))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@alumno_bp.route('/formatos/documento-info/<int:id_documento>', methods=['GET'])
def get_documento_info(id_documento):
    """
    Devuelve los metadatos de un formato del catálogo para la interfaz de entrega directa por archivo,
    incluyendo detalles de la plantilla oficial y el historial de entrega del alumno autenticado.
    """
    user = get_current_user_from_token()
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        alumno, proyecto, dependencia, _ = resolve_student_context(cursor, user)
        no_control = alumno['no_control'] if alumno else None
        id_proyecto = proyecto['id_proyecto'] if proyecto else None

        cursor.execute("""
            SELECT d.id_documento, d.clave_formato as clave, 
                   COALESCE(d.nombre, d.nombre_documento) as nombre_documento,
                   d.etapa, d.plantilla_excel, d.ruta_archivo_excel, d.activo,
                   f.id_formulario,
                   (CASE WHEN f.id_formulario IS NOT NULL AND EXISTS (SELECT 1 FROM formulario_campos fc WHERE fc.id_formulario = f.id_formulario) THEN 1 ELSE 0 END) as tiene_formulario,
                   (CASE WHEN (d.plantilla_excel IS NOT NULL AND d.plantilla_excel != '') OR (d.ruta_archivo_excel IS NOT NULL AND d.ruta_archivo_excel != '') THEN 1 ELSE 0 END) as plantilla_existe
            FROM catalogo_documentos d
            LEFT JOIN formularios f ON d.id_documento = f.id_documento
            WHERE d.id_documento = %s
        """, (id_documento,))
        doc = cursor.fetchone()

        if not doc:
            return jsonify({"error": "Documento no encontrado en el catálogo"}), 404

        # Consultar si el alumno ya realizó una entrega previa
        entrega = None
        if no_control:
            cursor.execute("""
                SELECT id_entrega, estado, ruta_archivo, fecha_subida, observaciones
                FROM expediente_entregas
                WHERE id_documento = %s AND (no_control = %s OR (id_proyecto IS NOT NULL AND id_proyecto = %s))
                ORDER BY id_entrega DESC LIMIT 1
            """, (id_documento, no_control, id_proyecto or -1))
            entrega = cursor.fetchone()
            if entrega and hasattr(entrega.get('fecha_subida'), 'strftime'):
                entrega['fecha_subida'] = entrega['fecha_subida'].strftime('%Y-%m-%d %H:%M:%S')

        # Obtener correo de recepción configurado
        cursor.execute("SELECT correo_recepcion_formatos FROM configuracion_sistema WHERE id = 1 LIMIT 1")
        cfg_row = cursor.fetchone()
        correo_recepcion = (cfg_row.get('correo_recepcion_formatos') if cfg_row else None) or 'serviciosocial@teziutlan.tecnm.mx'

        return jsonify({
            "documento": doc,
            "entrega": entrega,
            "alumno": {
                "no_control": no_control,
                "nombre": alumno.get('nombre') if alumno else None,
                "carrera": alumno.get('nombre_carrera') or alumno.get('carrera') if alumno else None,
                "correo": alumno.get('correo_institucional') or alumno.get('correo_personal') if alumno else None
            },
            "correo_recepcion": correo_recepcion
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@alumno_bp.route('/formatos/descargar-plantilla/<int:id_documento>', methods=['GET'])
def descargar_plantilla_documento(id_documento):
    """
    Descarga el archivo físico de plantilla oficial (.xlsx, .docx, etc.) asociado al documento en el catálogo.
    Si no existe una plantilla vinculada, genera un libro base limpio en Excel con membrete del ITST.
    """
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id_documento, clave_formato, 
                   COALESCE(nombre, nombre_documento) as nombre_documento,
                   plantilla_excel, ruta_archivo_excel
            FROM catalogo_documentos
            WHERE id_documento = %s
        """, (id_documento,))
        doc = cursor.fetchone()
        if not doc:
            return jsonify({"error": "Documento no encontrado"}), 404

        clave = (doc.get('clave_formato') or f"DOC_{id_documento}").strip()
        plantilla_cand = doc.get('plantilla_excel') or doc.get('ruta_archivo_excel')
        plantilla_path = None

        if plantilla_cand:
            p_full = os.path.join(PLANTILLAS_DIR, plantilla_cand)
            if os.path.exists(p_full):
                plantilla_path = p_full

        # Búsqueda inteligente por nombre o clave en PLANTILLAS_DIR
        if not plantilla_path and os.path.exists(PLANTILLAS_DIR):
            clean_clave = re.sub(r'[^A-Za-z0-9]', '', clave.upper())
            for fname in os.listdir(PLANTILLAS_DIR):
                clean_f = re.sub(r'[^A-Za-z0-9]', '', fname.upper())
                if clean_clave in clean_f:
                    plantilla_path = os.path.join(PLANTILLAS_DIR, fname)
                    break

        if plantilla_path and os.path.exists(plantilla_path):
            ext = os.path.splitext(plantilla_path)[1]
            download_name = f"Plantilla_{clave}{ext}"
            return send_file(plantilla_path, as_attachment=True, download_name=download_name)
        else:
            # Si no hay plantilla física, generar un archivo Excel base oficial limpio
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = clave[:31]
            ws['A1'] = "INSTITUTO TECNOLÓGICO SUPERIOR DE TEZIUTLÁN"
            ws['A2'] = f"DEPARTAMENTO DE SERVICIO SOCIAL - {doc.get('nombre_documento')}"
            ws['A3'] = f"Clave Oficial: {clave}"
            ws['A5'] = "Instrucciones: Complete este documento con la información solicitada y recabe las firmas correspondientes."
            
            temp_path = os.path.join(GENERADOS_DIR, f"Plantilla_Base_{clave}.xlsx")
            wb.save(temp_path)
            return send_file(temp_path, as_attachment=True, download_name=f"Plantilla_{clave}.xlsx")
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@alumno_bp.route('/formatos/entregar-archivo/<int:id_documento>', methods=['POST'])
def entregar_archivo_formato(id_documento):
    """
    Procesa la entrega directa de un formato mediante carga de archivo (.pdf, .xlsx, .docx, imágenes):
    1. Guarda el archivo en el servidor con nombre oficial y timestamp.
    2. Registra o actualiza la entrega en expediente_entregas en estado 'EN_REVISION'.
    3. Envía el archivo por correo electrónico mediante Microsoft Graph API / Outlook al buzón de recepción oficial.
    4. Devuelve el estado actualizado para reflejarlo en la interfaz del alumno.
    """
    user = get_current_user_from_token()
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        alumno, proyecto, dependencia, _ = resolve_student_context(cursor, user)
        if not alumno:
            return jsonify({"error": "No se encontró el registro del alumno"}), 404

        no_control = alumno['no_control']
        id_proyecto = proyecto['id_proyecto'] if proyecto else None

        cursor.execute("""
            SELECT id_documento, clave_formato,
                   COALESCE(nombre, nombre_documento) as nombre_documento,
                   etapa
            FROM catalogo_documentos
            WHERE id_documento = %s
        """, (id_documento,))
        doc = cursor.fetchone()
        if not doc:
            return jsonify({"error": "Documento no encontrado"}), 404

        clave_formato = (doc.get('clave_formato') or f"DOC_{id_documento}").upper()
        nombre_documento = doc.get('nombre_documento') or clave_formato

        # Recibir archivo (FormData multipart o JSON base64)
        file_bytes = None
        filename_orig = None
        observaciones_alumno = ""

        if 'archivo' in request.files:
            uploaded_file = request.files['archivo']
            if uploaded_file.filename == '':
                return jsonify({"error": "No se seleccionó ningún archivo"}), 400
            filename_orig = secure_filename(uploaded_file.filename)
            file_bytes = uploaded_file.read()
            observaciones_alumno = request.form.get('observaciones', '').strip()
        elif request.is_json:
            data = request.json or {}
            b64_content = data.get('archivo_base64') or data.get('base64') or data.get('data')
            filename_orig = secure_filename(data.get('filename') or f"{clave_formato}.pdf")
            observaciones_alumno = str(data.get('observaciones') or '').strip()
            if b64_content:
                if 'base64,' in b64_content:
                    b64_content = b64_content.split('base64,')[1]
                file_bytes = base64.b64decode(b64_content)

        if not file_bytes:
            return jsonify({"error": "No se recibió el contenido del archivo a entregar"}), 400

        # Guardar archivo en disco
        ext = os.path.splitext(filename_orig)[1] or '.pdf'
        timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_clave = re.sub(r'[^A-Za-z0-9_]', '', clave_formato)
        saved_filename = f"{no_control}_{safe_clave}_{timestamp_str}{ext}"
        saved_path = os.path.join(GENERADOS_DIR, saved_filename)

        with open(saved_path, 'wb') as f:
            f.write(file_bytes)

        # Leer correo de recepción configurado
        cursor.execute("SELECT correo_recepcion_formatos FROM configuracion_sistema WHERE id = 1 LIMIT 1")
        cfg_row = cursor.fetchone()
        correo_recepcion = (cfg_row.get('correo_recepcion_formatos') if cfg_row else None) or 'serviciosocial@teziutlan.tecnm.mx'

        # Preparar correo institucional por Outlook
        nombre_completo_alu = alumno.get('nombre') or alumno.get('usuario_nombre') or no_control
        carrera_alu = alumno.get('nombre_carrera') or alumno.get('carrera') or 'N/A'
        correo_alu = alumno.get('correo_institucional') or alumno.get('correo_personal') or 'No registrado'
        fecha_hora_str = datetime.now().strftime('%d/%m/%Y %H:%M:%S')

        subject = f"[Servicio Social] Entrega de Formato: {clave_formato} - {no_control} {nombre_completo_alu}"

        obs_html = f"""
        <tr>
            <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Notas del Alumno:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><em>{observaciones_alumno}</em></td>
        </tr>
        """ if observaciones_alumno else ""

        html_content = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #022c22 0%, #064e3b 100%); color: #ffffff; padding: 24px; text-align: center;">
                <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700;">Instituto Tecnológico Superior de Teziutlán</h2>
                <p style="margin: 0; font-size: 14px; color: #a7f3d0;">Departamento de Servicio Social y Residencias Profesionales</p>
            </div>
            
            <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
                <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px;">
                    <strong style="color: #065f46; font-size: 15px;">Nueva entrega de documento oficial recibida</strong>
                    <p style="margin: 4px 0 0 0; color: #047857; font-size: 13px;">El alumno ha cargado su formato requisitado y firmado para su respectiva validación.</p>
                </div>
                
                <h3 style="color: #0f172a; font-size: 16px; margin: 16px 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">Ficha de la Entrega</h3>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; width: 35%; border-bottom: 1px solid #e2e8f0;">Formato:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{nombre_documento} ({clave_formato})</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Nombre del Alumno:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><strong>{nombre_completo_alu}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Número de Control:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;"><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 700;">{no_control}</span></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Carrera:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{carrera_alu}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Correo de Contacto:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{correo_alu}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Fecha y Hora:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{fecha_hora_str}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background-color: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Archivo Entregado:</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #047857;">{saved_filename}</td>
                    </tr>
                    {obs_html}
                </table>
                
                <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
                    Este es un correo automático generado por el Sistema de Automatización para Documentos de Servicio Social del ITST.
                </p>
            </div>
        </div>
        """

        user_id_val = (user.get('id_usuario') if user else None) or alumno.get('id_usuario')
        envio_status, error_envio = send_graph_email_with_attachment(
            to_email=correo_recepcion,
            to_name="Recepción de Servicio Social",
            subject=subject,
            html_content=html_content,
            attachment_filename=saved_filename,
            attachment_bytes=file_bytes,
            id_usuario=user_id_val
        )

        # Registrar o Actualizar en expediente_entregas
        cursor.execute("""
            SELECT id_entrega FROM expediente_entregas
            WHERE id_documento = %s AND (no_control = %s OR (id_proyecto IS NOT NULL AND id_proyecto = %s))
            LIMIT 1
        """, (id_documento, no_control, id_proyecto or -1))
        existing_entrega = cursor.fetchone()

        obs_texto = f"Entregado mediante archivo digital el {fecha_hora_str}. Correo Outlook: {envio_status} a {correo_recepcion}."
        if observaciones_alumno:
            obs_texto += f" Nota del alumno: {observaciones_alumno}"

        if existing_entrega:
            cursor.execute("""
                UPDATE expediente_entregas
                SET estado = 'EN_REVISION',
                    ruta_archivo = %s,
                    fecha_subida = CURRENT_TIMESTAMP,
                    observaciones = %s,
                    no_control = %s,
                    id_proyecto = %s
                WHERE id_entrega = %s
            """, (saved_filename, obs_texto, no_control, id_proyecto, existing_entrega['id_entrega']))
            id_entrega = existing_entrega['id_entrega']
        else:
            cursor.execute("""
                INSERT INTO expediente_entregas
                (no_control, id_proyecto, id_documento, estado, ruta_archivo, fecha_subida, observaciones)
                VALUES (%s, %s, %s, 'EN_REVISION', %s, CURRENT_TIMESTAMP, %s)
            """, (no_control, id_proyecto, id_documento, saved_filename, obs_texto))
            id_entrega = cursor.lastrowid

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Formato entregado, guardado y enviado al buzón de recepción con éxito",
            "id_entrega": id_entrega,
            "filename": saved_filename,
            "correo_destino": correo_recepcion,
            "envio_status": envio_status,
            "error_envio": error_envio,
            "estado": "EN_REVISION"
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

