import io
import os
import re
from datetime import date, datetime
from flask import Blueprint, jsonify, request, send_file
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from database import Database

reportes_bp = Blueprint('reportes_bp', __name__)

def get_db():
    db = Database()
    return db.get_connection()

def format_fecha_es(fecha):
    if not fecha:
        return ""
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    try:
        return f"{fecha.day} de {meses[fecha.month - 1]} {fecha.year}"
    except Exception:
        return str(fecha)

def format_rango_es(f1, f2, default_text=""):
    if not f1 and not f2:
        return default_text
    meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"]
    try:
        if f1 and f2:
            return f"{f1.day} {meses[f1.month - 1]} al {f2.day} {meses[f2.month - 1]} {f2.year}"
        elif f1:
            return f"Desde {f1.day} {meses[f1.month - 1]} {f1.year}"
        elif f2:
            return f"Hasta {f2.day} {meses[f2.month - 1]} {f2.year}"
    except Exception:
        return default_text
    return default_text

def parse_date_val(val):
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

def get_doc_headers(d):
    clave = d.get('clave_formato', '') or ''
    nombre = d.get('nombre', '') or ''
    etapa = d.get('etapa', '') or ''
    
    m = re.search(r'([DF]-RPS-\d+)', nombre + ' ' + clave, re.IGNORECASE)
    code = m.group(1).upper() if m else ''
    
    clean_title = nombre
    clean_title = re.sub(r'\(?[DF]-RPS-\d+\)?', '', clean_title, flags=re.IGNORECASE).strip()
    clean_title = re.sub(r'\(?\d+(?:er|do|to)?\s+bimestre\)?', '', clean_title, flags=re.IGNORECASE).strip()
    clean_title = re.sub(r'\s+', ' ', clean_title).strip()
    
    if 'BASES' in nombre.upper():
        if not code: code = 'F-RPS-08'
        short_title = 'Bases de Concertación'
    elif 'COMPROMISO' in nombre.upper():
        if not code: code = 'F-RPS-03'
        short_title = 'Carta Compromiso'
    elif 'ACEPTACION' in nombre.upper():
        if not code: code = 'CARTA ACEPT.'
        short_title = 'Carta de Aceptación'
    elif 'PLAN' in nombre.upper():
        if not code: code = 'D-RPS-01'
        short_title = 'Plan de Trabajo'
    elif 'REPORTE BIMESTRAL' in nombre.upper() or 'REPORT' in clave.upper():
        if not code: code = 'F-RPS-04'
        if '1' in etapa or '1' in nombre:
            short_title = 'Reporte Bimestral 1'
        elif '2' in etapa or '2' in nombre:
            short_title = 'Reporte Bimestral 2'
        elif '3' in etapa or '3' in nombre:
            short_title = 'Reporte Bimestral 3'
        else:
            short_title = 'Reporte Bimestral'
    elif 'AUTOEVALUACION' in nombre.upper() or 'AUTOEV' in clave.upper():
        if not code: code = 'F-RPS-05'
        if '1' in etapa or '1' in nombre:
            short_title = 'Autoeval. Bimestre 1'
        elif '2' in etapa or '2' in nombre:
            short_title = 'Autoeval. Bimestre 2'
        elif '3' in etapa or '3' in nombre:
            short_title = 'Autoeval. Bimestre 3'
        else:
            short_title = 'Autoevaluación'
    elif 'FINAL' in nombre.upper() or 'LIBERACION' in etapa.upper():
        if not code: code = 'D-RPS-02'
        short_title = 'Reporte Final'
    else:
        if not code: code = clave
        short_title = clean_title[:25]
        
    return code, short_title

def resolver_fecha_limite_etapa(etp_name, fechas_oficiales):
    if not etp_name:
        return None
    etp_upper = etp_name.strip().upper()
    for key, fval in fechas_oficiales.items():
        if key in etp_upper or (key == 'LIBERACION' and ('FINAL' in etp_upper or 'TERMINACION' in etp_upper or 'CIERRE' in etp_upper)):
            return fval
    return None

@reportes_bp.route('/carreras', methods=['GET'])
def get_reporte_carreras():
    conn = get_db()
    if not conn:
        return jsonify([]), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id_carrera, clave, nombre FROM carreras WHERE activa = 1 ORDER BY nombre ASC")
        carreras = cursor.fetchall()
        return jsonify(carreras), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@reportes_bp.route('/bitacora-seguimiento', methods=['GET'])
def get_bitacora_data():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    carrera = request.args.get('carrera', '').strip()
    titulo_depto = request.args.get('titulo_departamento', '').strip() or "DEPARTAMENTO DE RESIDENCIAS PROFESIONALES Y SERVICIO SOCIAL"
    titulo_rep = request.args.get('titulo_reporte', '').strip() or "BITÁCORA DE SEGUIMIENTO AL PRESTANTE DE SERVICIO SOCIAL"
    
    try:
        # 1. Obtener periodo oficial activo desde el Calendario Oficial
        cursor.execute("SELECT * FROM periodos WHERE activo = 1 ORDER BY id_periodo DESC LIMIT 1")
        periodo_rec = cursor.fetchone()
        
        if periodo_rec and periodo_rec.get('nombre_oficial'):
            periodo_nombre = periodo_rec['nombre_oficial']
        else:
            cursor.execute("SELECT periodo_oficial FROM configuracion_sistema LIMIT 1")
            cfg = cursor.fetchone()
            periodo_nombre = cfg['periodo_oficial'] if cfg and cfg.get('periodo_oficial') else "FEBRERO – JUNIO 2026"
            
        f_inicial = format_fecha_es(periodo_rec.get('cierre_expediente')) if periodo_rec and periodo_rec.get('cierre_expediente') else "29 de noviembre 2025"
        f_bim1 = format_rango_es(periodo_rec.get('inicio_bimestre_1'), periodo_rec.get('fin_bimestre_1'), "nov 2025 al 6 enero 2026") if periodo_rec else "nov 2025 al 6 enero 2026"
        f_bim2 = format_rango_es(periodo_rec.get('inicio_bimestre_2'), periodo_rec.get('fin_bimestre_2'), "28 de julio al 27 de sept") if periodo_rec else "28 de julio al 27 de sept"
        f_bim3 = format_rango_es(periodo_rec.get('inicio_bimestre_3'), periodo_rec.get('fin_bimestre_3'), "29 de sept al 28 de nov") if periodo_rec else "29 de sept al 28 de nov"
        f_final = format_fecha_es(periodo_rec.get('cierre_expediente_final')) if periodo_rec and periodo_rec.get('cierre_expediente_final') else ""

        fechas_fases = {
            "inicial": f_inicial,
            "bim_1": f_bim1,
            "bim_2": f_bim2,
            "bim_3": f_bim3,
            "final": f_final
        }
        
        hoy = date.today()
        fechas_oficiales = {
            'APERTURA': parse_date_val(periodo_rec.get('cierre_expediente')) or parse_date_val(periodo_rec.get('apertura_expediente')) if periodo_rec else None,
            'BIMESTRE 1': parse_date_val(periodo_rec.get('limite_entrega_bim_1')) or parse_date_val(periodo_rec.get('fin_bimestre_1')) if periodo_rec else None,
            'BIMESTRE 2': parse_date_val(periodo_rec.get('limite_entrega_bim_2')) or parse_date_val(periodo_rec.get('fin_bimestre_2')) if periodo_rec else None,
            'BIMESTRE 3': parse_date_val(periodo_rec.get('limite_entrega_bim_3')) or parse_date_val(periodo_rec.get('fin_bimestre_3')) if periodo_rec else None,
            'LIBERACION': parse_date_val(periodo_rec.get('cierre_expediente_final')) or parse_date_val(periodo_rec.get('apertura_expediente_final')) if periodo_rec else None,
            'FINAL': parse_date_val(periodo_rec.get('cierre_expediente_final')) or parse_date_val(periodo_rec.get('apertura_expediente_final')) if periodo_rec else None,
        }
        
        # 2. Consultar todos los documentos activos en catalogo_documentos
        cursor.execute("""
            SELECT id_documento, clave_formato, COALESCE(nombre, nombre_documento) AS nombre, etapa, orden_en_etapa
            FROM catalogo_documentos
            WHERE activo = 1
            ORDER BY 
                CASE 
                    WHEN etapa = 'APERTURA' THEN 1
                    WHEN etapa = 'BIMESTRE 1' THEN 2
                    WHEN etapa = 'BIMESTRE 2' THEN 3
                    WHEN etapa = 'BIMESTRE 3' THEN 4
                    WHEN etapa = 'LIBERACION' OR etapa = 'FINAL' THEN 5
                    ELSE 6
                END,
                CASE
                    WHEN clave_formato LIKE '%REPORT%' THEN 1
                    WHEN clave_formato LIKE '%AUTOEV%' THEN 2
                    ELSE 3
                END,
                orden_en_etapa ASC,
                id_documento ASC
        """)
        docs_catalogo = cursor.fetchall()
        for d in docs_catalogo:
            code, short_title = get_doc_headers(d)
            d['code'] = code
            d['short_title'] = short_title
            
        # Agrupar etapas
        etapas_agrupadas = []
        etapa_dict = {}
        for d in docs_catalogo:
            etp = d['etapa'] or 'GENERAL'
            if etp not in etapa_dict:
                if etp == 'APERTURA':
                    tit = 'Expediente Inicial / Apertura'
                    fch = f_inicial
                elif etp == 'BIMESTRE 1':
                    tit = 'Bimestre 1'
                    fch = f_bim1
                elif etp == 'BIMESTRE 2':
                    tit = 'Bimestre 2'
                    fch = f_bim2
                elif etp == 'BIMESTRE 3':
                    tit = 'Bimestre 3'
                    fch = f_bim3
                elif etp in ['LIBERACION', 'FINAL']:
                    tit = 'Reporte Final / Liberación'
                    fch = f_final
                else:
                    tit = etp
                    fch = ''
                entry = {'etapa': etp, 'titulo': tit, 'fecha': fch, 'documentos': []}
                etapa_dict[etp] = entry
                etapas_agrupadas.append(entry)
            etapa_dict[etp]['documentos'].append(d)
            
        # 3. Consultar alumnos con filtros de carrera
        sql_alumnos = """
            SELECT a.no_control, a.nombre, COALESCE(c.nombre, a.carrera) AS carrera,
                   p.id_proyecto, p.nombre_proyecto, p.supervisor_nombre, p.responsable_nombre,
                   p.supervisor_proyecto, p.responsable_proyecto
            FROM alumnos a
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control AND p.estatus != 'CANCELADO'
        """
        params = []
        if carrera and carrera.upper() != 'TODAS':
            sql_alumnos += " WHERE (a.carrera = %s OR c.nombre = %s OR c.clave = %s)"
            params.extend([carrera, carrera, carrera])
            
        sql_alumnos += " ORDER BY carrera ASC, a.no_control ASC"
        cursor.execute(sql_alumnos, tuple(params))
        alumnos_rows = cursor.fetchall()
        
        # 4. Entregas registradas
        cursor.execute("SELECT no_control, id_proyecto, id_documento, estado FROM expediente_entregas")
        entregas = cursor.fetchall()
        
        status_map = {
            'APROBADO': 'APROBADO', 'Aprobado': 'APROBADO',
            'RECHAZADO': 'RECHAZADO', 'Rechazado': 'RECHAZADO',
            'EN_REVISION': 'EN_REVISION', 'En Revisión': 'EN_REVISION', 'En Revision': 'EN_REVISION',
            'DISPONIBLE': 'DISPONIBLE', 'Disponible': 'DISPONIBLE',
            'PENDIENTE': 'PENDIENTE', 'Pendiente': 'PENDIENTE',
            'BLOQUEADO': 'BLOQUEADO', 'Bloqueado': 'BLOQUEADO'
        }
        
        entregas_by_ctrl = {}
        entregas_by_proy = {}
        for e in entregas:
            norm_st = status_map.get(e['estado'], (e['estado'] or '').upper())
            if e.get('no_control'):
                if e['no_control'] not in entregas_by_ctrl:
                    entregas_by_ctrl[e['no_control']] = {}
                entregas_by_ctrl[e['no_control']][e['id_documento']] = norm_st
            if e.get('id_proyecto'):
                if e['id_proyecto'] not in entregas_by_proy:
                    entregas_by_proy[e['id_proyecto']] = {}
                entregas_by_proy[e['id_proyecto']][e['id_documento']] = norm_st

        # 5. Armar reporte con todos los formularios dinámicos y alumnos con al menos 1 pendiente
        reporte_alumnos = []
        for al in alumnos_rows:
            nc = al['no_control']
            pid = al.get('id_proyecto')
            proy_name = al.get('nombre_proyecto') or "AUN SIN REGISTRAR PROYECTO"
            sup_name = al.get('supervisor_nombre') or al.get('responsable_nombre') or al.get('supervisor_proyecto') or al.get('responsable_proyecto') or ""
            
            p_entregas = {}
            if nc in entregas_by_ctrl:
                p_entregas.update(entregas_by_ctrl[nc])
            elif pid and pid in entregas_by_proy:
                p_entregas.update(entregas_by_proy[pid])
                
            doc_status = {}
            tiene_al_menos_un_pendiente = False
            
            for d in docs_catalogo:
                did = d['id_documento']
                c_formato = d['clave_formato']
                st = p_entregas.get(did, '')
                flim = resolver_fecha_limite_etapa(d['etapa'], fechas_oficiales)
                is_vencido = bool(flim and hoy > flim)
                
                is_pendiente = (st == 'PENDIENTE') or (is_vencido and st not in ['APROBADO', 'EN_REVISION', 'RECHAZADO'])
                if is_pendiente:
                    tiene_al_menos_un_pendiente = True
                    
                doc_info = {
                    "id_documento": did,
                    "clave_formato": c_formato,
                    "entregado": (st == 'APROBADO'),
                    "texto": "NO" if is_pendiente else "",
                    "estado": "PENDIENTE" if is_pendiente else (st or "BLOQUEADO"),
                    "es_pendiente": is_pendiente
                }
                doc_status[str(did)] = doc_info
                doc_status[str(c_formato)] = doc_info
                
            if tiene_al_menos_un_pendiente:
                alumno_item = {
                    "no": len(reporte_alumnos) + 1,
                    "nombre": (al['nombre'] or '').upper(),
                    "no_control": al['no_control'],
                    "carrera": al['carrera'],
                    "nombre_proyecto": proy_name,
                    "supervisor": sup_name,
                    "documentos": doc_status,
                    "tiene_pendientes": True
                }
                reporte_alumnos.append(alumno_item)
                
        return jsonify({
            "titulo_departamento": titulo_depto,
            "titulo_reporte": titulo_rep,
            "periodo": periodo_nombre,
            "fechas_fases": fechas_fases,
            "carrera": carrera or "TODAS",
            "total_alumnos": len(reporte_alumnos),
            "documentos_catalogo": docs_catalogo,
            "etapas_agrupadas": etapas_agrupadas,
            "alumnos": reporte_alumnos
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@reportes_bp.route('/bitacora-seguimiento/excel', methods=['GET'])
def export_bitacora_excel():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    carrera = request.args.get('carrera', '').strip()
    titulo_depto = request.args.get('titulo_departamento', '').strip() or "DEPARTAMENTO DE RESIDENCIAS PROFESIONALES Y SERVICIO SOCIAL"
    titulo_rep = request.args.get('titulo_reporte', '').strip() or "BITÁCORA DE SEGUIMIENTO AL PRESTANTE DE SERVICIO SOCIAL"
    
    try:
        # 1. Obtener periodo oficial activo desde el Calendario Oficial
        cursor.execute("SELECT * FROM periodos WHERE activo = 1 ORDER BY id_periodo DESC LIMIT 1")
        periodo_rec = cursor.fetchone()
        
        if periodo_rec and periodo_rec.get('nombre_oficial'):
            periodo_nombre = periodo_rec['nombre_oficial']
        else:
            cursor.execute("SELECT periodo_oficial FROM configuracion_sistema LIMIT 1")
            cfg = cursor.fetchone()
            periodo_nombre = cfg['periodo_oficial'] if cfg and cfg.get('periodo_oficial') else "FEBRERO – JUNIO 2026"
            
        f_inicial = format_fecha_es(periodo_rec.get('cierre_expediente')) if periodo_rec and periodo_rec.get('cierre_expediente') else "29 de noviembre 2025"
        f_bim1 = format_rango_es(periodo_rec.get('inicio_bimestre_1'), periodo_rec.get('fin_bimestre_1'), "nov 2025 al 6 enero 2026") if periodo_rec else "nov 2025 al 6 enero 2026"
        f_bim2 = format_rango_es(periodo_rec.get('inicio_bimestre_2'), periodo_rec.get('fin_bimestre_2'), "28 de julio al 27 de sept") if periodo_rec else "28 de julio al 27 de sept"
        f_bim3 = format_rango_es(periodo_rec.get('inicio_bimestre_3'), periodo_rec.get('fin_bimestre_3'), "29 de sept al 28 de nov") if periodo_rec else "29 de sept al 28 de nov"
        f_final = format_fecha_es(periodo_rec.get('cierre_expediente_final')) if periodo_rec and periodo_rec.get('cierre_expediente_final') else ""

        fechas_fases = {
            "inicial": f_inicial,
            "bim_1": f_bim1,
            "bim_2": f_bim2,
            "bim_3": f_bim3,
            "final": f_final
        }
        
        hoy = date.today()
        fechas_oficiales = {
            'APERTURA': parse_date_val(periodo_rec.get('cierre_expediente')) or parse_date_val(periodo_rec.get('apertura_expediente')) if periodo_rec else None,
            'BIMESTRE 1': parse_date_val(periodo_rec.get('limite_entrega_bim_1')) or parse_date_val(periodo_rec.get('fin_bimestre_1')) if periodo_rec else None,
            'BIMESTRE 2': parse_date_val(periodo_rec.get('limite_entrega_bim_2')) or parse_date_val(periodo_rec.get('fin_bimestre_2')) if periodo_rec else None,
            'BIMESTRE 3': parse_date_val(periodo_rec.get('limite_entrega_bim_3')) or parse_date_val(periodo_rec.get('fin_bimestre_3')) if periodo_rec else None,
            'LIBERACION': parse_date_val(periodo_rec.get('cierre_expediente_final')) or parse_date_val(periodo_rec.get('apertura_expediente_final')) if periodo_rec else None,
            'FINAL': parse_date_val(periodo_rec.get('cierre_expediente_final')) or parse_date_val(periodo_rec.get('apertura_expediente_final')) if periodo_rec else None,
        }
        
        # 2. Consultar todos los documentos activos en catalogo_documentos
        cursor.execute("""
            SELECT id_documento, clave_formato, COALESCE(nombre, nombre_documento) AS nombre, etapa, orden_en_etapa
            FROM catalogo_documentos
            WHERE activo = 1
            ORDER BY 
                CASE 
                    WHEN etapa = 'APERTURA' THEN 1
                    WHEN etapa = 'BIMESTRE 1' THEN 2
                    WHEN etapa = 'BIMESTRE 2' THEN 3
                    WHEN etapa = 'BIMESTRE 3' THEN 4
                    WHEN etapa = 'LIBERACION' OR etapa = 'FINAL' THEN 5
                    ELSE 6
                END,
                CASE
                    WHEN clave_formato LIKE '%REPORT%' THEN 1
                    WHEN clave_formato LIKE '%AUTOEV%' THEN 2
                    ELSE 3
                END,
                orden_en_etapa ASC,
                id_documento ASC
        """)
        docs_catalogo = cursor.fetchall()
        for d in docs_catalogo:
            code, short_title = get_doc_headers(d)
            d['code'] = code
            d['short_title'] = short_title
            
        # Agrupar etapas para Excel
        etapas_agrupadas = []
        etapa_dict = {}
        for d in docs_catalogo:
            etp = d['etapa'] or 'GENERAL'
            if etp not in etapa_dict:
                if etp == 'APERTURA':
                    tit = 'Expediente Inicial / Apertura'
                    fch = f_inicial
                elif etp == 'BIMESTRE 1':
                    tit = 'Bimestre 1'
                    fch = f_bim1
                elif etp == 'BIMESTRE 2':
                    tit = 'Bimestre 2'
                    fch = f_bim2
                elif etp == 'BIMESTRE 3':
                    tit = 'Bimestre 3'
                    fch = f_bim3
                elif etp in ['LIBERACION', 'FINAL']:
                    tit = 'Reporte Final / Liberación'
                    fch = f_final
                else:
                    tit = etp
                    fch = ''
                entry = {'etapa': etp, 'titulo': tit, 'fecha': fch, 'documentos': []}
                etapa_dict[etp] = entry
                etapas_agrupadas.append(entry)
            etapa_dict[etp]['documentos'].append(d)
        
        # 3. Consultar alumnos con filtros de carrera
        sql_alumnos = """
            SELECT a.no_control, a.nombre, COALESCE(c.nombre, a.carrera) AS carrera,
                   p.id_proyecto, p.nombre_proyecto, p.supervisor_nombre, p.responsable_nombre,
                   p.supervisor_proyecto, p.responsable_proyecto
            FROM alumnos a
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control AND p.estatus != 'CANCELADO'
        """
        params = []
        if carrera and carrera.upper() != 'TODAS':
            sql_alumnos += " WHERE (a.carrera = %s OR c.nombre = %s OR c.clave = %s)"
            params.extend([carrera, carrera, carrera])
            
        sql_alumnos += " ORDER BY carrera ASC, a.no_control ASC"
        cursor.execute(sql_alumnos, tuple(params))
        alumnos_rows = cursor.fetchall()
        
        # 4. Entregas registradas
        cursor.execute("SELECT no_control, id_proyecto, id_documento, estado FROM expediente_entregas")
        entregas = cursor.fetchall()
        
        status_map = {
            'APROBADO': 'APROBADO', 'Aprobado': 'APROBADO',
            'RECHAZADO': 'RECHAZADO', 'Rechazado': 'RECHAZADO',
            'EN_REVISION': 'EN_REVISION', 'En Revisión': 'EN_REVISION', 'En Revision': 'EN_REVISION',
            'DISPONIBLE': 'DISPONIBLE', 'Disponible': 'DISPONIBLE',
            'PENDIENTE': 'PENDIENTE', 'Pendiente': 'PENDIENTE',
            'BLOQUEADO': 'BLOQUEADO', 'Bloqueado': 'BLOQUEADO'
        }
        
        entregas_by_ctrl = {}
        entregas_by_proy = {}
        for e in entregas:
            norm_st = status_map.get(e['estado'], (e['estado'] or '').upper())
            if e.get('no_control'):
                if e['no_control'] not in entregas_by_ctrl:
                    entregas_by_ctrl[e['no_control']] = {}
                entregas_by_ctrl[e['no_control']][e['id_documento']] = norm_st
            if e.get('id_proyecto'):
                if e['id_proyecto'] not in entregas_by_proy:
                    entregas_by_proy[e['id_proyecto']] = {}
                entregas_by_proy[e['id_proyecto']][e['id_documento']] = norm_st
            
        # 5. Armar reporte con todos los formularios dinámicos y alumnos con al menos 1 pendiente
        reporte_alumnos = []
        for al in alumnos_rows:
            nc = al['no_control']
            pid = al.get('id_proyecto')
            proy_name = al.get('nombre_proyecto') or "AUN SIN REGISTRAR PROYECTO"
            sup_name = al.get('supervisor_nombre') or al.get('responsable_nombre') or al.get('supervisor_proyecto') or al.get('responsable_proyecto') or ""
            
            p_entregas = {}
            if nc in entregas_by_ctrl:
                p_entregas.update(entregas_by_ctrl[nc])
            elif pid and pid in entregas_by_proy:
                p_entregas.update(entregas_by_proy[pid])
                
            doc_status = {}
            tiene_al_menos_un_pendiente = False
            
            for d in docs_catalogo:
                did = d['id_documento']
                c_formato = d['clave_formato']
                st = p_entregas.get(did, '')
                flim = resolver_fecha_limite_etapa(d['etapa'], fechas_oficiales)
                is_vencido = bool(flim and hoy > flim)
                
                is_pendiente = (st == 'PENDIENTE') or (is_vencido and st not in ['APROBADO', 'EN_REVISION', 'RECHAZADO'])
                if is_pendiente:
                    tiene_al_menos_un_pendiente = True
                    
                doc_info = {
                    "id_documento": did,
                    "clave_formato": c_formato,
                    "entregado": (st == 'APROBADO'),
                    "texto": "NO" if is_pendiente else "",
                    "estado": "PENDIENTE" if is_pendiente else (st or "BLOQUEADO"),
                    "es_pendiente": is_pendiente
                }
                doc_status[str(did)] = doc_info
                doc_status[str(c_formato)] = doc_info
                
            if tiene_al_menos_un_pendiente:
                alumno_item = {
                    "no": len(reporte_alumnos) + 1,
                    "nombre": (al['nombre'] or '').upper(),
                    "no_control": al['no_control'],
                    "carrera": al['carrera'],
                    "nombre_proyecto": proy_name,
                    "supervisor": sup_name,
                    "documentos": doc_status,
                    "tiene_pendientes": True
                }
                reporte_alumnos.append(alumno_item)
            
        # 6. Crear Workbook de Excel Dinámico
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Bitácora de Seguimiento"
        ws.views.sheetView[0].showGridLines = True
        
        font_title = Font(name="Calibri", size=13, bold=True)
        font_subtitle = Font(name="Calibri", size=12, bold=True)
        font_periodo = Font(name="Calibri", size=10, bold=True)
        font_header_black = Font(name="Calibri", size=9, bold=True, color="FFFFFF")
        font_header_doc = Font(name="Calibri", size=8, bold=True)
        font_data = Font(name="Calibri", size=9)
        font_no = Font(name="Calibri", size=9, bold=True, color="000000")
        
        fill_black = PatternFill(start_color="000000", end_color="000000", fill_type="solid")
        fill_gray_phase = PatternFill(start_color="808080", end_color="808080", fill_type="solid")
        fill_yellow_no = PatternFill(start_color="FFFF00", end_color="FFFF00", fill_type="solid")
        
        thin_side = Side(border_style="thin", color="000000")
        border_box = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        dotted_side = Side(border_style="thin", color="D3D3D3")
        border_dotted = Border(left=dotted_side, right=dotted_side, top=dotted_side, bottom=dotted_side)
        
        align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
        align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
        
        total_cols = max(5 + len(docs_catalogo), 11)
        
        # 1. Títulos Editables
        ws.merge_cells(start_row=1, start_column=3, end_row=1, end_column=total_cols)
        ws.cell(row=1, column=3, value=titulo_depto.upper()).font = font_title
        ws.cell(row=1, column=3).alignment = align_center
        
        ws.merge_cells(start_row=3, start_column=3, end_row=3, end_column=total_cols)
        ws.cell(row=3, column=3, value=titulo_rep.upper()).font = font_subtitle
        ws.cell(row=3, column=3).alignment = align_center
        
        # 2. Periodo y Carrera en Fila 5
        ws.merge_cells("A5:E5")
        if carrera and carrera.upper() != 'TODAS':
            carrera_label = f"PERIODO: {periodo_nombre.upper()}  |  CARRERA: {carrera.upper()}"
        else:
            carrera_label = f"PERIODO: {periodo_nombre.upper()}  |  TODAS LAS CARRERAS"
        ws["A5"] = carrera_label
        ws["A5"].font = font_periodo
        ws["A5"].alignment = Alignment(horizontal="left", vertical="center")
        
        # Fila 5 Bloques de Fase Dinámicos
        current_col = 6
        for stage in etapas_agrupadas:
            num_docs = len(stage['documentos'])
            col_end = current_col + num_docs - 1
            if col_end > current_col:
                ws.merge_cells(start_row=5, start_column=current_col, end_row=5, end_column=col_end)
            for c in range(current_col, col_end + 1):
                c_cell = ws.cell(row=5, column=c)
                c_cell.fill = fill_gray_phase
                c_cell.font = font_header_black
                c_cell.border = border_box
                c_cell.alignment = align_center
            date_str = f"\n{stage['fecha']}" if stage['fecha'] else ""
            ws.cell(row=5, column=current_col).value = f"{stage['titulo']}{date_str}"
            current_col = col_end + 1
            
        ws.row_dimensions[5].height = 40
        
        # 3. Fila 6 - Cabeceras de Columnas
        headers_info = [
            (1, "No."),
            (2, "NOMBRE"),
            (3, "No. de\nControl"),
            (4, "NOMBRE DEL PROYECTO"),
            (5, "Nombre del Supervisor\ndel Proyecto en la\ndependencia")
        ]
        for col_num, text in headers_info:
            cell = ws.cell(row=6, column=col_num, value=text)
            cell.fill = fill_black
            cell.font = font_header_black
            cell.alignment = align_center
            cell.border = border_box
            
        for i, doc in enumerate(docs_catalogo):
            col_num = 6 + i
            cell = ws.cell(row=6, column=col_num, value=f"{doc['code']}\n{doc['short_title']}")
            cell.font = font_header_doc
            cell.alignment = align_center
            cell.border = border_box
            
        ws.row_dimensions[6].height = 50
        
        # 4. Datos de Alumnos (Fila 7 en adelante)
        current_row = 7
        student_idx = 1
        for al in reporte_alumnos:
            ws.cell(row=current_row, column=1, value=student_idx).alignment = align_center
            ws.cell(row=current_row, column=2, value=al['nombre']).alignment = align_left
            ws.cell(row=current_row, column=3, value=al['no_control']).alignment = align_center
            ws.cell(row=current_row, column=4, value=al['nombre_proyecto']).alignment = align_center
            ws.cell(row=current_row, column=5, value=al['supervisor'].upper()).alignment = align_center
            
            for c_idx in range(1, 6):
                ws.cell(row=current_row, column=c_idx).border = border_dotted
                ws.cell(row=current_row, column=c_idx).font = font_data
                
            for i, doc in enumerate(docs_catalogo):
                col_num = 6 + i
                d_cell = ws.cell(row=current_row, column=col_num)
                d_cell.alignment = align_center
                d_cell.border = border_dotted
                
                st_info = al['documentos'].get(str(doc['id_documento'])) or al['documentos'].get(str(doc['clave_formato'])) or {}
                if st_info.get('es_pendiente'):
                    d_cell.value = "NO"
                    d_cell.font = font_no
                    d_cell.fill = fill_yellow_no
                else:
                    d_cell.value = ""
                    d_cell.font = font_data
                    
            ws.row_dimensions[current_row].height = 28
            current_row += 1
            student_idx += 1
            
        # 5. Ajustar anchos de columna
        ws.column_dimensions['A'].width = 6
        ws.column_dimensions['B'].width = 32
        ws.column_dimensions['C'].width = 15
        ws.column_dimensions['D'].width = 35
        ws.column_dimensions['E'].width = 25
        for c in range(6, total_cols + 1):
            col_letter = openpyxl.utils.get_column_letter(c)
            ws.column_dimensions[col_letter].width = 16
            
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        carrera_slug = (carrera or "TODAS").replace(" ", "_")
        filename = f"Bitacora_Seguimiento_Incumplidos_{carrera_slug}.xlsx"
        
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@reportes_bp.route('/alumnos-tec', methods=['GET'])
def get_alumnos_tec():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    carrera = request.args.get('carrera', '').strip()
    search = request.args.get('search', '').strip().lower()
    
    try:
        cursor.execute("SELECT nombre_oficial FROM periodos WHERE activo = 1 LIMIT 1")
        per_rec = cursor.fetchone()
        periodo_nombre = per_rec['nombre_oficial'] if per_rec and per_rec.get('nombre_oficial') else "FEBRERO – JUNIO 2026"

        query = """
            SELECT a.no_control, 
                   a.nombre, 
                   COALESCE(c.nombre, a.carrera) AS carrera,
                   c.clave AS clave_carrera,
                   p.id_proyecto, 
                   p.nombre_proyecto, 
                   COALESCE(p.supervisor_nombre, p.supervisor_proyecto, p.responsable_nombre, p.responsable_proyecto, '') AS supervisor_proyecto,
                   p.supervisor_cargo,
                   d.id_dependencia,
                   COALESCE(d.nombre, 'Instituto Tecnológico Superior de Teziutlán') AS dependencia_nombre
            FROM alumnos a
            JOIN proyectos_servicio p ON a.no_control = p.no_control
            LEFT JOIN dependencias d ON p.id_dependencia = d.id_dependencia
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            WHERE (p.estatus IS NULL OR p.estatus != 'Cancelado')
              AND (
                  p.id_dependencia = 1
                  OR d.id_dependencia = 1
                  OR p.id_dependencia IS NULL
                  OR LOWER(COALESCE(d.nombre, '')) LIKE '%tecnol%'
                  OR LOWER(COALESCE(d.nombre, '')) LIKE '%itst%'
                  OR LOWER(COALESCE(d.nombre, '')) LIKE '%tecnm%'
              )
        """
        params = []
        if carrera and carrera.upper() != 'TODAS':
            query += " AND (a.carrera = %s OR c.nombre = %s OR c.clave = %s)"
            params.extend([carrera, carrera, carrera])
            
        query += " ORDER BY carrera ASC, a.nombre ASC"
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        filtered = []
        for r in rows:
            nombre = (r['nombre'] or '').upper()
            nc = r['no_control'] or ''
            carr = r['carrera'] or ''
            proy = (r['nombre_proyecto'] or '').upper()
            sup = (r['supervisor_proyecto'] or '').upper()
            
            if search:
                if (search not in nombre.lower() and 
                    search not in nc.lower() and 
                    search not in carr.lower() and 
                    search not in proy.lower() and 
                    search not in sup.lower()):
                    continue
                    
            filtered.append({
                "no": len(filtered) + 1,
                "nombre_alumno": nombre,
                "no_control": nc,
                "carrera": carr,
                "clave_carrera": r.get('clave_carrera'),
                "nombre_proyecto": proy,
                "supervisor_proyecto": sup,
                "supervisor_cargo": r.get('supervisor_cargo') or '',
                "dependencia": r['dependencia_nombre']
            })
            
        return jsonify({
            "periodo": periodo_nombre,
            "carrera": carrera or "TODAS",
            "total": len(filtered),
            "alumnos": filtered
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@reportes_bp.route('/alumnos-tec/excel', methods=['GET'])
def export_alumnos_tec_excel():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    carrera = request.args.get('carrera', '').strip()
    
    try:
        query = """
            SELECT a.no_control, 
                   a.nombre, 
                   COALESCE(c.nombre, a.carrera) AS carrera,
                   p.nombre_proyecto, 
                   COALESCE(p.supervisor_nombre, p.supervisor_proyecto, p.responsable_nombre, p.responsable_proyecto, '') AS supervisor_proyecto,
                   d.nombre AS dependencia_nombre
            FROM alumnos a
            JOIN proyectos_servicio p ON a.no_control = p.no_control
            LEFT JOIN dependencias d ON p.id_dependencia = d.id_dependencia
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            WHERE (p.estatus IS NULL OR p.estatus != 'Cancelado')
              AND (
                  p.id_dependencia = 1
                  OR d.id_dependencia = 1
                  OR p.id_dependencia IS NULL
                  OR LOWER(COALESCE(d.nombre, '')) LIKE '%tecnol%'
                  OR LOWER(COALESCE(d.nombre, '')) LIKE '%itst%'
                  OR LOWER(COALESCE(d.nombre, '')) LIKE '%tecnm%'
              )
        """
        params = []
        if carrera and carrera.upper() != 'TODAS':
            query += " AND (a.carrera = %s OR c.nombre = %s OR c.clave = %s)"
            params.extend([carrera, carrera, carrera])
            
        query += " ORDER BY carrera ASC, a.nombre ASC"
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        # Generar Excel con diseño idéntico al formato oficial
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Servicio Social en Tec"
        
        # Mostrar líneas de cuadrícula en Excel
        ws.views.sheetView[0].showGridLines = True
        
        # Estilos
        fill_black = PatternFill(start_color="000000", end_color="000000", fill_type="solid")
        font_header = Font(name="Arial", size=10, bold=True, color="FFFFFF")
        font_data = Font(name="Arial", size=9, bold=False, color="000000")
        font_data_bold = Font(name="Arial", size=9, bold=True, color="000000")
        
        align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
        
        border_solid_thin = Side(style='thin', color='000000')
        border_dotted_thin = Side(style='dotted', color='000000')
        
        border_header = Border(
            left=border_solid_thin, right=border_solid_thin,
            top=border_solid_thin, bottom=border_solid_thin
        )
        
        # Borde para la columna NO: borde derecho punteado
        border_col_no = Border(
            left=border_solid_thin, right=border_dotted_thin,
            top=border_solid_thin, bottom=border_solid_thin
        )
        
        # Borde para las columnas normales
        border_normal = Border(
            left=border_solid_thin, right=border_solid_thin,
            top=border_solid_thin, bottom=border_solid_thin
        )
        
        # Cabecera oficial Fila 1
        headers = [
            ("A1", "NO."),
            ("B1", "NOMBRE DEL ALUMNO"),
            ("C1", "CONTROL"),
            ("D1", "NOMBRE DEL PROYECTO"),
            ("E1", "SUPERVISOR DEL PROYECTO")
        ]
        
        ws.row_dimensions[1].height = 32
        for cell_ref, title in headers:
            cell = ws[cell_ref]
            cell.value = title
            cell.fill = fill_black
            cell.font = font_header
            cell.alignment = align_center
            cell.border = border_header
            
        # Llenar datos (mínimo 10 filas para respetar la cuadrícula del formato oficial)
        total_rows = max(len(rows), 10)
        
        for idx in range(total_rows):
            row_num = idx + 2
            ws.row_dimensions[row_num].height = 38
            
            # Celda A: NO.
            cell_a = ws.cell(row=row_num, column=1)
            cell_a.value = idx + 1
            cell_a.font = font_data_bold
            cell_a.alignment = align_center
            cell_a.border = border_col_no
            
            if idx < len(rows):
                r = rows[idx]
                nombre = (r['nombre'] or '').upper()
                nc = (r['no_control'] or '').upper()
                proy = (r['nombre_proyecto'] or '').upper()
                sup = (r['supervisor_proyecto'] or '').upper()
                
                # B: Nombre del Alumno
                cell_b = ws.cell(row=row_num, column=2, value=nombre)
                cell_b.font = font_data_bold
                cell_b.alignment = align_center
                cell_b.border = border_normal
                
                # C: Control
                cell_c = ws.cell(row=row_num, column=3, value=nc)
                cell_c.font = font_data_bold
                cell_c.alignment = align_center
                cell_c.border = border_normal
                
                # D: Nombre del Proyecto
                cell_d = ws.cell(row=row_num, column=4, value=proy)
                cell_d.font = font_data
                cell_d.alignment = align_center
                cell_d.border = border_normal
                
                # E: Supervisor del Proyecto
                cell_e = ws.cell(row=row_num, column=5, value=sup)
                cell_e.font = font_data
                cell_e.alignment = align_center
                cell_e.border = border_normal
            else:
                # Fila vacía para conservar formato
                for col_idx in range(2, 6):
                    c = ws.cell(row=row_num, column=col_idx, value="")
                    c.font = font_data
                    c.alignment = align_center
                    c.border = border_normal
                    
        # Anchos de columna optimizados
        ws.column_dimensions['A'].width = 8
        ws.column_dimensions['B'].width = 34
        ws.column_dimensions['C'].width = 16
        ws.column_dimensions['D'].width = 52
        ws.column_dimensions['E'].width = 30
        
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        carrera_slug = (carrera or "TODAS").replace(" ", "_")
        filename = f"Alumnos_Servicio_Social_Tec_{carrera_slug}.xlsx"
        
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@reportes_bp.route('/alumnos-periodo', methods=['GET'])
def get_alumnos_periodo():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    carrera = request.args.get('carrera', '').strip()
    search = request.args.get('search', '').strip().lower()
    tipo_dep = request.args.get('tipo_dependencia', 'TODAS').strip().upper()
    id_periodo_arg = request.args.get('id_periodo', '').strip()
    
    try:
        if id_periodo_arg:
            cursor.execute("SELECT id_periodo, nombre_oficial, clave FROM periodos WHERE id_periodo = %s LIMIT 1", (id_periodo_arg,))
        else:
            cursor.execute("SELECT id_periodo, nombre_oficial, clave FROM periodos WHERE activo = 1 LIMIT 1")
        per_rec = cursor.fetchone()
        
        if per_rec:
            periodo_id = per_rec['id_periodo']
            periodo_nombre = per_rec['nombre_oficial']
        else:
            periodo_id = None
            periodo_nombre = "FEBRERO – JUNIO 2026"
            
        # Consulta de alumnos que cursan servicio social en el periodo actual
        query = """
            SELECT a.no_control, 
                   a.nombre, 
                   COALESCE(c.nombre, a.carrera) AS carrera,
                   c.clave AS clave_carrera,
                   p.id_proyecto, 
                   p.nombre_proyecto, 
                   COALESCE(p.modalidad, a.modalidad, 'PRESENCIAL') AS modalidad,
                   COALESCE(p.supervisor_nombre, p.supervisor_proyecto, p.responsable_nombre, p.responsable_proyecto, '') AS supervisor_proyecto,
                   p.supervisor_cargo,
                   p.estatus AS estatus_proyecto,
                   d.id_dependencia,
                   COALESCE(d.nombre, 'Instituto Tecnológico Superior de Teziutlán') AS dependencia_nombre
            FROM alumnos a
            JOIN proyectos_servicio p ON a.no_control = p.no_control
            LEFT JOIN dependencias d ON p.id_dependencia = d.id_dependencia
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            WHERE (p.estatus IS NULL OR p.estatus != 'Cancelado')
        """
        params = []
        if periodo_id is not None:
            query += " AND (p.id_periodo = %s OR p.id_periodo IS NULL)"
            params.append(periodo_id)
            
        if carrera and carrera.upper() != 'TODAS':
            query += " AND (a.carrera = %s OR c.nombre = %s OR c.clave = %s)"
            params.extend([carrera, carrera, carrera])
            
        query += " ORDER BY carrera ASC, a.nombre ASC"
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        filtered = []
        count_tec = 0
        count_ext = 0
        
        for r in rows:
            nombre = (r['nombre'] or '').upper()
            nc = (r['no_control'] or '').upper()
            carr = r['carrera'] or ''
            proy = (r['nombre_proyecto'] or '').upper()
            sup = (r['supervisor_proyecto'] or '').upper()
            dep = r['dependencia_nombre'] or 'Instituto Tecnológico Superior de Teziutlán'
            dep_lower = dep.lower()
            
            es_en_tec = (
                r.get('id_dependencia') == 1 or
                'tecnol' in dep_lower or
                'itst' in dep_lower or
                'tecnm' in dep_lower
            )
            
            if es_en_tec:
                count_tec += 1
            else:
                count_ext += 1
                
            if tipo_dep == 'INTERNA_TEC' and not es_en_tec:
                continue
            if tipo_dep == 'EXTERNA' and es_en_tec:
                continue
                
            if search:
                if (search not in nombre.lower() and 
                    search not in nc.lower() and 
                    search not in carr.lower() and 
                    search not in proy.lower() and 
                    search not in sup.lower() and
                    search not in dep.lower()):
                    continue
                    
            filtered.append({
                "no": len(filtered) + 1,
                "nombre_alumno": nombre,
                "no_control": nc,
                "carrera": carr,
                "clave_carrera": r.get('clave_carrera'),
                "nombre_proyecto": proy,
                "supervisor_proyecto": sup,
                "supervisor_cargo": r.get('supervisor_cargo') or '',
                "dependencia": dep,
                "es_en_tec": es_en_tec,
                "modalidad": (r.get('modalidad') or 'PRESENCIAL').upper(),
                "estatus": r.get('estatus_proyecto') or 'Activo'
            })
            
        return jsonify({
            "periodo": periodo_nombre,
            "id_periodo": periodo_id,
            "carrera": carrera or "TODAS",
            "tipo_dependencia": tipo_dep,
            "total": len(filtered),
            "total_periodo": len(rows),
            "total_tec": count_tec,
            "total_externos": count_ext,
            "alumnos": filtered
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@reportes_bp.route('/alumnos-periodo/excel', methods=['GET'])
def export_alumnos_periodo_excel():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    carrera = request.args.get('carrera', '').strip()
    tipo_dep = request.args.get('tipo_dependencia', 'TODAS').strip().upper()
    id_periodo_arg = request.args.get('id_periodo', '').strip()
    
    try:
        if id_periodo_arg:
            cursor.execute("SELECT id_periodo, nombre_oficial FROM periodos WHERE id_periodo = %s LIMIT 1", (id_periodo_arg,))
        else:
            cursor.execute("SELECT id_periodo, nombre_oficial FROM periodos WHERE activo = 1 LIMIT 1")
        per_rec = cursor.fetchone()
        periodo_nombre = per_rec['nombre_oficial'] if per_rec and per_rec.get('nombre_oficial') else "FEBRERO – JUNIO 2026"
        periodo_id = per_rec['id_periodo'] if per_rec else None

        query = """
            SELECT a.no_control, 
                   a.nombre, 
                   COALESCE(c.nombre, a.carrera) AS carrera,
                   p.nombre_proyecto, 
                   COALESCE(p.modalidad, a.modalidad, 'PRESENCIAL') AS modalidad,
                   COALESCE(p.supervisor_nombre, p.supervisor_proyecto, p.responsable_nombre, p.responsable_proyecto, '') AS supervisor_proyecto,
                   d.id_dependencia,
                   COALESCE(d.nombre, 'Instituto Tecnológico Superior de Teziutlán') AS dependencia_nombre
            FROM alumnos a
            JOIN proyectos_servicio p ON a.no_control = p.no_control
            LEFT JOIN dependencias d ON p.id_dependencia = d.id_dependencia
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            WHERE (p.estatus IS NULL OR p.estatus != 'Cancelado')
        """
        params = []
        if periodo_id is not None:
            query += " AND (p.id_periodo = %s OR p.id_periodo IS NULL)"
            params.append(periodo_id)
            
        if carrera and carrera.upper() != 'TODAS':
            query += " AND (a.carrera = %s OR c.nombre = %s OR c.clave = %s)"
            params.extend([carrera, carrera, carrera])
            
        query += " ORDER BY carrera ASC, a.nombre ASC"
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        
        final_rows = []
        for r in rows:
            dep = r['dependencia_nombre'] or 'Instituto Tecnológico Superior de Teziutlán'
            dep_lower = dep.lower()
            es_en_tec = (
                r.get('id_dependencia') == 1 or
                'tecnol' in dep_lower or
                'itst' in dep_lower or
                'tecnm' in dep_lower
            )
            if tipo_dep == 'INTERNA_TEC' and not es_en_tec:
                continue
            if tipo_dep == 'EXTERNA' and es_en_tec:
                continue
            r['es_en_tec'] = es_en_tec
            final_rows.append(r)
            
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Padrón Servicio Social"
        ws.views.sheetView[0].showGridLines = True
        
        # Estilos
        font_title_main = Font(name="Arial", size=12, bold=True, color="0F172A")
        font_sub = Font(name="Arial", size=10, bold=True, color="334155")
        font_info = Font(name="Arial", size=9, bold=True, color="475569")
        font_header = Font(name="Arial", size=9, bold=True, color="FFFFFF")
        font_cell = Font(name="Arial", size=9, bold=False, color="000000")
        font_cell_bold = Font(name="Arial", size=9, bold=True, color="000000")
        
        fill_navy = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        fill_info = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        
        align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
        align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
        
        border_thin = Side(style='thin', color='CBD5E1')
        border_dark = Side(style='thin', color='000000')
        
        box_border = Border(left=border_dark, right=border_dark, top=border_dark, bottom=border_dark)
        data_border = Border(left=border_thin, right=border_thin, top=border_thin, bottom=border_thin)
        
        # 1. Encabezado institucional
        ws.merge_cells("A1:H1")
        ws["A1"] = "INSTITUTO TECNOLÓGICO SUPERIOR DE TEZIUTLÁN"
        ws["A1"].font = font_title_main
        ws["A1"].alignment = align_center
        ws.row_dimensions[1].height = 24
        
        ws.merge_cells("A2:H2")
        ws["A2"] = "DEPARTAMENTO DE RESIDENCIAS PROFESIONALES Y SERVICIO SOCIAL"
        ws["A2"].font = font_sub
        ws["A2"].alignment = align_center
        ws.row_dimensions[2].height = 20
        
        ws.merge_cells("A3:H3")
        ws["A3"] = f"PADRÓN GENERAL DE PRESTANTES DE SERVICIO SOCIAL — PERIODO: {periodo_nombre.upper()}"
        ws["A3"].font = font_sub
        ws["A3"].alignment = align_center
        ws.row_dimensions[3].height = 20
        
        carrera_label = f"CARRERA: {carrera.upper()}" if carrera and carrera.upper() != 'TODAS' else "CARRERA: TODAS LAS CARRERAS"
        tipo_label = "DEPENDENCIAS: TODAS" if tipo_dep == 'TODAS' else ("DEPENDENCIAS: SOLO INTERNAS (TEC)" if tipo_dep == 'INTERNA_TEC' else "DEPENDENCIAS: SOLO EXTERNAS")
        
        ws.merge_cells("A4:H4")
        ws["A4"] = f"{carrera_label}   |   {tipo_label}   |   TOTAL PRESTANTES: {len(final_rows)}"
        ws["A4"].font = font_info
        ws["A4"].fill = fill_info
        ws["A4"].alignment = align_center
        ws.row_dimensions[4].height = 22
        
        ws.row_dimensions[5].height = 10
        
        headers = [
            ("A6", "NO."),
            ("B6", "NOMBRE DEL ALUMNO"),
            ("C6", "NO. CONTROL"),
            ("D6", "CARRERA"),
            ("E6", "DEPENDENCIA / INSTITUCIÓN"),
            ("F6", "NOMBRE DEL PROYECTO"),
            ("G6", "SUPERVISOR DEL PROYECTO"),
            ("H6", "MODALIDAD")
        ]
        
        ws.row_dimensions[6].height = 30
        for cell_ref, title in headers:
            cell = ws[cell_ref]
            cell.value = title
            cell.fill = fill_navy
            cell.font = font_header
            cell.alignment = align_center
            cell.border = box_border
            
        for idx, r in enumerate(final_rows):
            row_num = idx + 7
            ws.row_dimensions[row_num].height = 36
            
            nombre = (r['nombre'] or '').upper()
            nc = (r['no_control'] or '').upper()
            carr = (r['carrera'] or '').upper()
            dep = (r['dependencia_nombre'] or '').upper()
            proy = (r['nombre_proyecto'] or '').upper()
            sup = (r['supervisor_proyecto'] or '').upper()
            mod = (r.get('modalidad') or 'PRESENCIAL').upper()
            
            row_values = [
                (1, idx + 1, font_cell_bold, align_center),
                (2, nombre, font_cell_bold, align_left),
                (3, nc, font_cell_bold, align_center),
                (4, carr, font_cell, align_left),
                (5, dep, font_cell, align_left),
                (6, proy, font_cell, align_left),
                (7, sup, font_cell, align_left),
                (8, mod, font_cell, align_center)
            ]
            
            for col_num, val, fnt, algn in row_values:
                cell = ws.cell(row=row_num, column=col_num, value=val)
                cell.font = fnt
                cell.alignment = algn
                cell.border = data_border
                
        col_widths = {
            'A': 6,
            'B': 32,
            'C': 16,
            'D': 28,
            'E': 34,
            'F': 46,
            'G': 28,
            'H': 16
        }
        for col_letter, width in col_widths.items():
            ws.column_dimensions[col_letter].width = width
            
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        slug_carrera = (carrera or "TODAS").replace(" ", "_")
        slug_periodo = (periodo_nombre or "ACTUAL").replace(" ", "_").replace("–", "-")
        filename = f"Padron_Prestantes_Servicio_Social_{slug_periodo}_{slug_carrera}.xlsx"
        
        return send_file(
            output,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
