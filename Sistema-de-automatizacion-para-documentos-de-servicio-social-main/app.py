import os
import msal
import requests
import base64
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, send_file, redirect, url_for, session, flash
from openpyxl import load_workbook
from openpyxl.cell.cell import MergedCell
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side 
from openpyxl.drawing.image import Image as OpenpyxlImage
from docx import Document
import mysql.connector
from mysql.connector import Error
from werkzeug.utils import secure_filename


DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '1234567',
    'database': 'servicio_social_itst2'
}



def obtener_conexion_db():
    """Crea y retorna una conexión a la base de datos."""
    try:
        conexion = mysql.connector.connect(**DB_CONFIG)
        if conexion.is_connected():
            return conexion
    except Error as e:
        print(f"Error al conectar a MariaDB: {e}")
    return None


def redimensionar_imagen_para_excel(img_path, max_width=600):
    """Redimensiona una imagen proporcionalmente para que quepa en el Excel."""
    from PIL import Image as PILImage
    with PILImage.open(img_path) as img:
        width, height = img.size
        if width > max_width:
            ratio = max_width / float(width)
            new_height = int(float(height) * float(ratio))
            return max_width, new_height
        return width, height

app = Flask(__name__)

# --- CONFIGURACIÓN DE SESIÓN ---
app.secret_key = os.urandom(24)

# --- CONFIGURACIÓN DE AZURE ---
CLIENT_ID = ""
CLIENT_SECRET = "" 
AUTHORITY = "https://login.microsoftonline.com/common"
REDIRECT_URI = "http://localhost:5000/callback"
SCOPE = ["Mail.Send", "User.Read"]

# --- CONFIGURACIÓN DE CORREO DESTINO ---
CORREO_ADMIN = "l23te0037@teziutlan.tecnm.mx"

# --- CONFIGURACIÓN DE RUTAS ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
CARPETA_PLANTILLAS = os.path.join(BASE_DIR, 'plantillas')
CARPETA_GENERADOS = os.path.join(BASE_DIR, 'generados')

os.makedirs(CARPETA_GENERADOS, exist_ok=True)
os.makedirs(CARPETA_PLANTILLAS, exist_ok=True)

# Mapeo de Claves de Formato a Nombres de Archivo Reales
PLANTILLAS_MAP = {
    'FRPS01': 'F-RPS-01_SOLICITUD DE SERVICIO SOCIAL.xlsx',
    'FRPS03': 'F-RPS-03_ CARTA COMPROMISO.xlsx',
    'FRPS08': '6. F-RPS-08_ BASES DE CONCERTACIÓN.xlsx',
    'FRPS04': '7. F-RPS-04_ REPORTE BIMESTRAL DE SERVICIO SOCIAL_1er Bimestre.xlsx',
    'FRPS05': '8. F-RPS-05_ AUTOEVALUACION CUALITATIVA_1er Bimestre.xlsx',
    'DRPS01': '4.3 D-RPS-01 Plan de Trabajo.docx'
}

# --- DECORADOR: OBLIGAR LOGIN ---
def login_required(role=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_token' not in session:
                return redirect(url_for('login_microsoft'))
            
            # Obtener el rol actual (manejar si se usó @login_required sin paréntesis)
            target_roles = None if callable(role) else role
            
            if target_roles:
                user_role = str(session.get('rol', '')).strip().upper()
                if isinstance(target_roles, list):
                    # Check if current role is in the list (case insensitive)
                    if user_role not in [str(r).strip().upper() for r in target_roles]:
                        return "<h1>Acceso no autorizado</h1><p>No tienes permisos suficientes.</p>", 403
                else:
                    if user_role != str(target_roles).strip().upper():
                        return "<h1>Acceso no autorizado</h1><p>No tienes permisos para ver esta página.</p>", 403
                
            return f(*args, **kwargs)
        return decorated_function
        
    if callable(role):
        return decorator(role)
    return decorator


@app.route('/admin/reporte/adeudos')
def generar_reporte_adeudos():
    carrera = request.args.get('carrera')
    hoy = datetime.now().date()
    
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # 1. Traer la configuración del periodo 
    cursor.execute("SELECT * FROM configuracion_sistema WHERE id = 1")
    config = cursor.fetchone()
    
    # 2. Consultar alumnos y sus estados (Pivotando expediente_entregas)
    query = """
        SELECT a.no_control, a.nombre, p.nombre_proyecto, p.supervisor_proyecto,
               MAX(CASE WHEN c.clave_formato = 'DRPS01' THEN e.estado END) as estado_drps01,
               MAX(CASE WHEN c.clave_formato = 'FRPS08' THEN e.estado END) as estado_frps08,
               MAX(CASE WHEN c.clave_formato = 'FRPS04_1' THEN e.estado END) as estado_frps04_1,
               MAX(CASE WHEN c.clave_formato = 'FRPS04_2' THEN e.estado END) as estado_frps04_2,
               MAX(CASE WHEN c.clave_formato = 'FRPS04_3' THEN e.estado END) as estado_frps04_3,
               MAX(CASE WHEN c.clave_formato = 'DRPS02' THEN e.estado END) as estado_drps02
        FROM alumnos a
        LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control
        LEFT JOIN expediente_entregas e ON p.id_proyecto = e.id_proyecto
        LEFT JOIN catalogo_documentos c ON e.id_documento = c.id_documento
    """
    if carrera and carrera != "TODAS":
        query += " WHERE a.carrera = %s GROUP BY a.no_control"
        cursor.execute(query, (carrera,))
    else:
        query += " GROUP BY a.no_control"
        cursor.execute(query)
    alumnos = cursor.fetchall()
# ... (rest of the Excel logic stays similar but using 'a' table instead of 'p')

    # 3. Configuración del Libro de Excel 
    ruta_plantilla = os.path.join(CARPETA_PLANTILLAS, 'PLANTILLA_BITACORA.xlsx')
    
    import openpyxl
    if os.path.exists(ruta_plantilla):
        wb = load_workbook(ruta_plantilla)
        ws = wb.active
    else:
        # Modo Rescate: Crear reporte estructurado desde cero si no tienen la plantilla
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Reporte de Adeudos"
        
        ws.merge_cells('C1:K1')
        ws['C1'] = "DEPARTAMENTO DE RESIDENCIAS PROFESIONALES Y SERVICIO SOCIAL"
        ws['C1'].font = Font(bold=True)
        ws.merge_cells('C2:K2')
        ws['C2'] = "BITÁCORA DE SEGUIMIENTO AL PRESTANTE DE SERVICIO SOCIAL"
        ws['C2'].font = Font(bold=True)
        
        headers = ["No.", "NOMBRE", "No. de Control", "NOMBRE DEL PROYECTO", "Nombre del Supervisor", 
                   "D-RPS-01 Plan", "F-RPS-08 Bases", "Bim 1", "Bim 2", "Bim 3", "Reporte Final"]
        for col_idx, item in enumerate(headers, start=1):
            ws.cell(row=10, column=col_idx, value=item).font = Font(bold=True)
            
        ws.column_dimensions['B'].width = 30
        ws.column_dimensions['D'].width = 40
    
    # Estilos para el reporte 
    amarillo = PatternFill(start_color="FFFF00", end_color="FFFF00", fill_type="solid")
    centrado = Alignment(horizontal='center', vertical='center')

    # Llenar Periodo en la cabecera 
    if config and 'periodo_oficial' in config:
        ws['A4'] = f"PERIODO: {config['periodo_oficial']}"

    # 4. Procesar Filas de Alumnos
    for i, alu in enumerate(alumnos, start=1):
        row_num = 10 + i # Ajustar según tu plantilla
        
        ws.cell(row=row_num, column=1, value=i)
        ws.cell(row=row_num, column=2, value=alu['nombre'])
        ws.cell(row=row_num, column=3, value=alu['no_control'])
        ws.cell(row=row_num, column=4, value=alu['nombre_proyecto'] or "AUN SIN REGISTRAR PROYECTO")
        ws.cell(row=row_num, column=5, value=alu['supervisor_proyecto'] or "")

        # MAPEO DE VALIDACIÓN TEMPORAL 
        # Utilizamos .get() por si el LEFT JOIN devuelve nulos
        mapeo = [
            (6, alu.get('estado_drps01'), config.get('limite_expediente_inicial') if config else None),
            (7, alu.get('estado_frps08'), config.get('limite_expediente_inicial') if config else None),
            (8, alu.get('estado_frps04_1'), config.get('limite_bimestre_1') if config else None),
            (9, alu.get('estado_frps04_2'), config.get('limite_bimestre_2') if config else None),
            (10, alu.get('estado_frps04_3'), config.get('limite_bimestre_3') if config else None),
            (11, alu.get('estado_drps02'), config.get('limite_expediente_final') if config else None)
        ]

        for col, estado, fecha_limite in mapeo:
            celda = ws.cell(row=row_num, column=col)
            # LÓGICA DE ADEUDO: Si no está aprobado y ya pasó la fecha 
            if estado != 'Aprobado' and fecha_limite and hoy > fecha_limite:
                celda.value = "NO"
                celda.fill = amarillo
            elif estado == 'Aprobado':
                celda.value = "SI"
            else:
                celda.value = "PENDIENTE" # Aún no vence la fecha o está bloqueado
            
            celda.alignment = centrado

    nombre_archivo = f"Bitacora_Adeudos_{datetime.now().strftime('%Y%m%d')}.xlsx"
    ruta_guardado = os.path.join(CARPETA_GENERADOS, nombre_archivo)
    wb.save(ruta_guardado)
    
    cursor.close()
    conexion.close()
    return send_file(ruta_guardado, as_attachment=True)

# --- FUNCIONES DE AUTENTICACIÓN ---
def get_msal_app():
    return msal.ConfidentialClientApplication(CLIENT_ID, authority=AUTHORITY, client_credential=CLIENT_SECRET)

@app.route('/admin/reportes')
def admin_reportes():
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM configuracion_sistema WHERE id = 1")
    config = cursor.fetchone()
    
    def contar_adeudos(clave_formato, fecha_limite):
        if not fecha_limite: return 0
        # Buscamos alumnos con proyecto cuyo documento X no esté aprobado y ya venció
        query = """
            SELECT COUNT(DISTINCT a.no_control) as total
            FROM alumnos a
            JOIN proyectos_servicio p ON a.no_control = p.no_control
            LEFT JOIN (
                SELECT e.*, c.clave_formato 
                FROM expediente_entregas e 
                JOIN catalogo_documentos c ON e.id_documento = c.id_documento
            ) e ON p.id_proyecto = e.id_proyecto AND e.clave_formato = %s
            WHERE (e.estado != 'Aprobado' OR e.estado IS NULL) 
            AND CURRENT_DATE > %s
        """
        cursor.execute(query, (clave_formato, fecha_limite))
        res = cursor.fetchone()
        return res['total'] if res else 0

    adeudos_inicial = contar_adeudos('DRPS01', config.get('limite_expediente_inicial'))
    adeudos_bim1 = contar_adeudos('FRPS04_1', config.get('limite_bimestre_1'))
    adeudos_bim2 = contar_adeudos('FRPS04_2', config.get('limite_bimestre_2'))
    adeudos_bim3 = contar_adeudos('FRPS04_3', config.get('limite_bimestre_3'))
    adeudos_final = contar_adeudos('DRPS02', config.get('limite_expediente_final'))
    
    # Peor carrera con adeudos (Simplificado: faltas en DRPS01 o FRPS04_1)
    cursor.execute("""
        SELECT a.carrera, COUNT(*) as faltas
        FROM alumnos a
        JOIN proyectos_servicio p ON a.no_control = p.no_control
        LEFT JOIN (
            SELECT e.*, c.clave_formato 
            FROM expediente_entregas e 
            JOIN catalogo_documentos c ON e.id_documento = c.id_documento
        ) e ON p.id_proyecto = e.id_proyecto
        WHERE ( (e.clave_formato='DRPS01' AND e.estado != 'Aprobado') OR (e.clave_formato='FRPS04_1' AND e.estado != 'Aprobado') )
        GROUP BY a.carrera
        ORDER BY faltas DESC
        LIMIT 1
    """)
    peor_carrera = cursor.fetchone()
    
    cursor.close()
    conexion.close()
    return render_template('admin_reportes.html',
                           adeudos_inicial=adeudos_inicial,
                           adeudos_bim1=adeudos_bim1,
                           adeudos_bim2=adeudos_bim2,
                           adeudos_bim3=adeudos_bim3,
                           adeudos_final=adeudos_final,
                           peor_carrera=peor_carrera)

# --- RUTAS DE CONFIGURACIÓN DEL SISTEMA ---
@app.route('/admin/notificar_masivo', methods=['POST'])
@login_required(role='admin')
def notificar_masivo():
    from flask import jsonify
    import time
    
    token = session.get('user_token')
    if not token:
        return jsonify({"success": False, "error": "Sesión expirada o sin permisos de Microsoft."}), 401
        
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # Obtener configuración de fechas
    cursor.execute("SELECT * FROM configuracion_sistema WHERE id = 1")
    config = cursor.fetchone()
    
    if not config:
        cursor.close()
        conexion.close()
        return jsonify({"success": False, "error": "No hay configuración de fechas."}), 400
        
    hoy = datetime.now().date()
    
    # Obtener estatus de todos los alumnos
    cursor.execute("""
        SELECT a.no_control, a.nombre, a.correo_institucional, p.id_proyecto,
               MAX(CASE WHEN c.clave_formato = 'DRPS01' THEN e.estado END) as estado_drps01,
               MAX(CASE WHEN c.clave_formato = 'FRPS04_1' THEN e.estado END) as estado_frps04_1,
               MAX(CASE WHEN c.clave_formato = 'FRPS04_2' THEN e.estado END) as estado_frps04_2,
               MAX(CASE WHEN c.clave_formato = 'FRPS04_3' THEN e.estado END) as estado_frps04_3,
               MAX(CASE WHEN c.clave_formato = 'DRPS02' THEN e.estado END) as estado_drps02
        FROM alumnos a
        JOIN proyectos_servicio p ON a.no_control = p.no_control
        LEFT JOIN expediente_entregas e ON p.id_proyecto = e.id_proyecto
        LEFT JOIN catalogo_documentos c ON e.id_documento = c.id_documento
        GROUP BY a.no_control, p.id_proyecto
    """)
    alumnos = cursor.fetchall()
    
    cursor.close()
    conexion.close()
    
    enviados = 0
    endpoint = "https://graph.microsoft.com/v1.0/me/sendMail"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    for alu in alumnos:
        adeudos = []
        correo_destino = alu.get('correo_institucional')
        if not correo_destino: continue
            
        # Expediente Inicial
        lim_inicial = config.get('limite_expediente_inicial')
        if lim_inicial and hoy > lim_inicial and alu.get('estado_drps01') != 'Aprobado':
            adeudos.append(f"Expediente Inicial (Venció: {formatear_fecha(str(lim_inicial))})")
            
        # Bimestre 1
        lim_bim1 = config.get('limite_bimestre_1')
        if lim_bim1 and hoy > lim_bim1 and alu.get('estado_frps04_1') != 'Aprobado':
            adeudos.append(f"Reporte Bimestral 1 (Venció: {formatear_fecha(str(lim_bim1))})")
            
        # Bimestre 2
        lim_bim2 = config.get('limite_bimestre_2')
        if lim_bim2 and hoy > lim_bim2 and alu.get('estado_frps04_2') != 'Aprobado':
            adeudos.append(f"Reporte Bimestral 2 (Venció: {formatear_fecha(str(lim_bim2))})")
            
        # Bimestre 3
        lim_bim3 = config.get('limite_bimestre_3')
        if lim_bim3 and hoy > lim_bim3 and alu.get('estado_frps04_3') != 'Aprobado':
            adeudos.append(f"Reporte Bimestral 3 (Venció: {formatear_fecha(str(lim_bim3))})")
            
        # Final
        lim_fin = config.get('limite_expediente_final')
        if lim_fin and hoy > lim_fin and alu.get('estado_drps02') != 'Aprobado':
            adeudos.append(f"Expediente Final (Venció: {formatear_fecha(str(lim_fin))})")
            
        if adeudos:
            lista_html = "".join([f"<li style='margin-bottom: 5px;'><b>{doc}</b></li>" for doc in adeudos])
            
            cuerpo_html = f"""
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background-color: #1b396a; color: white; padding: 25px 20px; text-align: center;">
                    <h2 style="margin: 0; font-size: 22px;">Aviso de Servicio Social</h2>
                    <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.9;">Dpto. de Residencias y S.S. - Sistema ITST</p>
                </div>
                <div style="padding: 30px; color: #333; line-height: 1.6;">
                    <p style="font-size: 16px;">Hola <b>{alu.get('nombre', 'Estudiante')}</b>,</p>
                    <p>El sistema automático de revisión ha detectado que presentas <b>documentos pendientes o vencidos</b> en tu expediente activo de Servicio Social.</p>
                    <div style="background-color: #fff3f4; border-left: 5px solid #dc3545; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                        <h4 style="margin: 0 0 12px; color: #b02a37; font-size: 16px;">Formatos Vencidos Registrados:</h4>
                        <ul style="margin: 0; padding-left: 20px; color: #b02a37; font-size: 15px;">
                            {lista_html}
                        </ul>
                    </div>
                    <p>Para evitar la cancelación o suspensión de tu trámite, por favor ingresa a la plataforma oficial para generar los formatos faltantes y entrégalos firmados al departamento a la mayor brevedad.</p>
                    <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
                        <a href="http://localhost:5000" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Corregir mi Expediente</a>
                    </div>
                </div>
                <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e0e0e0;">
                    Este es un recordatorio automático oficial emitido por el Instituto Tecnológico Superior de Teziutlán.<br>Por favor, no respondas a este correo.
                </div>
            </div>
            """
            
            payload = {
                "message": {
                    "subject": "⚠️ AVISO IMPORTANTE: Documentos Vencidos de Servicio Social",
                    "body": {
                        "contentType": "HTML",
                        "content": cuerpo_html
                    },
                    "toRecipients": [{"emailAddress": {"address": correo_destino}}]
                }
            }
            
            try:
                resp = requests.post(endpoint, json=payload, headers=headers)
                if resp.status_code in [200, 201, 202]:
                    enviados += 1
                time.sleep(1.2) # Throttle 1.2s para evitar Rate Limiting
            except Exception as e:
                print(f"Graph API Error enviando a {correo_destino}: {e}")
                
    return jsonify({"success": True, "enviados": enviados})

@app.route('/admin/configuracion')
# @login_required(role='admin')
def admin_configuracion():
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # Obtenemos la configuración actual (siempre es el ID 1)
    cursor.execute("SELECT * FROM configuracion_sistema WHERE id = 1")
    config = cursor.fetchone()
    
    # Si por alguna razón la tabla está vacía, creamos un diccionario vacío para no romper el HTML
    if not config:
        config = {}
        
    cursor.close()
    conexion.close()
    
    return render_template('admin_configuracion.html', config=config)

@app.route('/admin/configuracion/guardar', methods=['POST'])
# @login_required(role='admin')
def guardar_configuracion():
    datos = request.form
    conexion = obtener_conexion_db()
    cursor = conexion.cursor()
    
    # Función auxiliar para convertir textos vacíos de fechas a NULL en SQL
    def parse_fecha(campo):
        valor = datos.get(campo)
        return valor if valor else None

    sql = """
        UPDATE configuracion_sistema SET 
            periodo_oficial = %s,
            limite_expediente_inicial = %s,
            inicio_bimestre_1 = %s, fin_bimestre_1 = %s, limite_bimestre_1 = %s,
            inicio_bimestre_2 = %s, fin_bimestre_2 = %s, limite_bimestre_2 = %s,
            inicio_bimestre_3 = %s, fin_bimestre_3 = %s, limite_bimestre_3 = %s,
            limite_expediente_final = %s
        WHERE id = 1
    """
    
    valores = (
        datos.get('periodo_oficial', '').upper(),
        parse_fecha('limite_expediente_inicial'),
        parse_fecha('inicio_bimestre_1'), parse_fecha('fin_bimestre_1'), parse_fecha('limite_bimestre_1'),
        parse_fecha('inicio_bimestre_2'), parse_fecha('fin_bimestre_2'), parse_fecha('limite_bimestre_2'),
        parse_fecha('inicio_bimestre_3'), parse_fecha('fin_bimestre_3'), parse_fecha('limite_bimestre_3'),
        parse_fecha('limite_expediente_final')
    )
    
    cursor.execute(sql, valores)
    conexion.commit()
    cursor.close()
    conexion.close()
    
    # Redirigimos de vuelta a la configuración (Aquí podrías usar flash messages para mostrar "Guardado con éxito")
    return redirect(url_for('admin_configuracion'))

# --- GESTIÓN DE USUARIOS ADMINISTRADORES ---
@app.route('/admin/usuarios')
# @login_required(role='admin')
def admin_usuarios():
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("SELECT * FROM administradores ORDER BY id DESC")
    usuarios = cursor.fetchall()
    cursor.close()
    conexion.close()
    return render_template('admin_usuarios.html', usuarios=usuarios)

@app.route('/admin/usuarios/guardar', methods=['POST'])
# @login_required(role='admin')
def guardar_usuario():
    nombre = request.form.get('nombre')
    correo = request.form.get('correo').lower().strip()
    rol = request.form.get('rol', 'Administrador')
    
    if not nombre or not correo:
        return "Nombre y correo son obligatorios", 400
        
    conexion = obtener_conexion_db()
    cursor = conexion.cursor()
    try:
        cursor.execute("INSERT INTO administradores (nombre, correo, rol) VALUES (%s, %s, %s)", 
                      (nombre, correo, rol))
        conexion.commit()
    except Exception as e:
        return f"Error al guardar el administrador: {str(e)}", 500
    finally:
        cursor.close()
        conexion.close()
    
    return redirect(url_for('admin_usuarios'))

@app.route('/admin/usuarios/eliminar/<int:id_admin>')
# @login_required(role='admin')
def eliminar_usuario(id_admin):
    conexion = obtener_conexion_db()
    cursor = conexion.cursor()
    try:
        # No permitir eliminar al SuperAdmin Elsa (ID 1 por defecto en el SQL)
        if id_admin == 1:
            return "No se puede eliminar la cuenta principal de SuperAdmin", 403
            
        cursor.execute("DELETE FROM administradores WHERE id = %s", (id_admin,))
        conexion.commit()
    except Exception as e:
        return f"Error al eliminar: {str(e)}", 500
    finally:
        cursor.close()
        conexion.close()
        
    return redirect(url_for('admin_usuarios'))

# --- RUTAS DEL PANEL DE ADMINISTRADOR ---
@app.route('/admin/validar')
# @login_required(role='admin')
def vista_validar():
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # Obtenemos a todos los alumnos, su proyecto y pivotamos sus estados de entrega
    # Usamos LEFT JOIN para que aparezcan aunque no hayan iniciado proyecto
    query = """
        SELECT a.no_control, a.nombre, a.carrera, p.id_proyecto, p.nombre_proyecto,
               MAX(CASE WHEN c.clave_formato = 'FRPS01' THEN e.estado END) as estado_frps01,
               MAX(CASE WHEN c.clave_formato = 'CARTA_PRES' THEN e.estado END) as estado_acuse_carta_pres,
               MAX(CASE WHEN c.clave_formato = 'CARTA_ACEPT' THEN e.estado END) as estado_carta_aceptacion,
               MAX(CASE WHEN c.clave_formato = 'FRPS03' THEN e.estado END) as estado_frps03,
               MAX(CASE WHEN c.clave_formato = 'DRPS01' THEN e.estado END) as estado_drps01,
               MAX(CASE WHEN c.clave_formato = 'FRPS08' THEN e.estado END) as estado_frps08,
               MAX(CASE WHEN c.clave_formato = 'FRPS04_1' THEN e.estado END) as estado_frps04_1,
               MAX(CASE WHEN c.clave_formato = 'FRPS05_1' THEN e.estado END) as estado_frps05_1,
               MAX(CASE WHEN c.clave_formato = 'FRPS04_2' THEN e.estado END) as estado_frps04_2,
               MAX(CASE WHEN c.clave_formato = 'FRPS05_2' THEN e.estado END) as estado_frps05_2,
               MAX(CASE WHEN c.clave_formato = 'FRPS04_3' THEN e.estado END) as estado_frps04_3,
               MAX(CASE WHEN c.clave_formato = 'FRPS05_3' THEN e.estado END) as estado_frps05_3,
               MAX(CASE WHEN c.clave_formato = 'DRPS02' THEN e.estado END) as estado_drps02,
               MAX(CASE WHEN c.clave_formato = 'CARTA_TERM' THEN e.estado END) as estado_carta_terminacion,
               MAX(CASE WHEN c.clave_formato = 'ACUSE_CARTA_TERM' THEN e.estado END) as estado_acuse_carta_term
        FROM alumnos a
        LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control
        LEFT JOIN expediente_entregas e ON p.id_proyecto = e.id_proyecto
        LEFT JOIN catalogo_documentos c ON e.id_documento = c.id_documento
        GROUP BY a.no_control, a.nombre, a.carrera, p.id_proyecto, p.nombre_proyecto
    """
    cursor.execute(query)
    alumnos = cursor.fetchall()
    
    cursor.close()
    conexion.close()
    return render_template('admin_validar.html', alumnos=alumnos)

@app.route('/admin/actualizar_estado', methods=['POST'])
# @login_required(role='admin')
def actualizar_estado():
    datos = request.json
    columna_full = datos.get('columna') # Ej: 'estado_frps01'
    
    # Extraer la clave del formato (ej: FRPS01) de la columna 'estado_frps01'
    clave_formato = columna_full.replace('estado_', '').upper()
    
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    nuevo_estado = datos.get('nuevo_estado')
    no_control = datos.get('no_control')
    
    # Necesitamos el id_proyecto y el id_documento
    cursor.execute("SELECT id_proyecto FROM proyectos_servicio WHERE no_control = %s ORDER BY id_proyecto DESC LIMIT 1", (no_control,))
    proy = cursor.fetchone()
    
    if not proy:
        # Si el admin actualiza estado y no hay proyecto, creamos uno básico y una dependencia placeholder
        cursor.execute("INSERT INTO dependencias (nombre) VALUES ('PENDIENTE')")
        id_dep = cursor.lastrowid
        cursor.execute("""
            INSERT INTO proyectos_servicio (no_control, id_dependencia, nombre_proyecto) 
            VALUES (%s, %s, 'PROYECTO INICIADO POR ADMIN')
        """, (no_control, id_dep))
        id_proyecto = cursor.lastrowid
    else:
        id_proyecto = proy['id_proyecto']
    
    cursor.execute("SELECT id_documento FROM catalogo_documentos WHERE clave_formato = %s", (clave_formato,))
    doc = cursor.fetchone()
    if not doc:
        return {"status": "error", "message": "Documento no encontrado en catálogo"}, 404
    id_documento = doc['id_documento']

    # Insertar o actualizar la entrega
    cursor.execute("""
        INSERT INTO expediente_entregas (id_proyecto, id_documento, estado)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE estado = %s
    """, (id_proyecto, id_documento, nuevo_estado, nuevo_estado))
                  
    # --- LOGICA DE DESBLOQUEO AUTOMÁTICO CASCADA (Adaptada) ---
    def desbloquear(clave):
        cursor.execute("SELECT id_documento FROM catalogo_documentos WHERE clave_formato = %s", (clave,))
        d = cursor.fetchone()
        if d:
            cursor.execute("""
                INSERT IGNORE INTO expediente_entregas (id_proyecto, id_documento, estado)
                VALUES (%s, %s, 'Disponible')
            """, (id_proyecto, d['id_documento']))

    if nuevo_estado == 'Aprobado':
        if clave_formato == 'FRPS01':
            for c in ['DRPS01', 'FRPS03', 'FRPS08']: desbloquear(c)
        elif clave_formato == 'FRPS08':
            for c in ['FRPS04_1', 'FRPS05_1']: desbloquear(c)
        elif clave_formato in ['FRPS04_1', 'FRPS05_1']:
            # Verificar si ambos del 1er Bim están aprobados
            cursor.execute("""
                SELECT COUNT(*) as aprobados FROM expediente_entregas e
                JOIN catalogo_documentos c ON e.id_documento = c.id_documento
                WHERE e.id_proyecto = %s AND c.clave_formato IN ('FRPS04_1', 'FRPS05_1') AND e.estado = 'Aprobado'
            """, (id_proyecto,))
            if cursor.fetchone()['aprobados'] == 2:
                for c in ['FRPS04_2', 'FRPS05_2']: desbloquear(c)
        elif clave_formato in ['FRPS04_2', 'FRPS05_2']:
            cursor.execute("""
                SELECT COUNT(*) as aprobados FROM expediente_entregas e
                JOIN catalogo_documentos c ON e.id_documento = c.id_documento
                WHERE e.id_proyecto = %s AND c.clave_formato IN ('FRPS04_2', 'FRPS05_2') AND e.estado = 'Aprobado'
            """, (id_proyecto,))
            if cursor.fetchone()['aprobados'] == 2:
                for c in ['FRPS04_3', 'FRPS05_3']: desbloquear(c)
    
    conexion.commit()
    cursor.close()
    conexion.close()
    return {"status": "success"}

# --- RUTAS DE AUDITORIA DE PROYECTOS ---
@app.route('/admin/proyectos')
def admin_proyectos():
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # Unimos alumnos con sus proyectos y dependencias (y toda su Ficha Técnica)
    query = """
        SELECT a.no_control, a.nombre, p.id_proyecto, p.nombre_proyecto, p.fecha_inicio, p.fecha_fin, p.modalidad, 
               d.nombre as dependencia, d.titular as titular_dependencia, d.cargo_titular, p.responsable_proyecto, 
               d.telefono as telefono_dependencia, d.correo as correo_dependencia, d.calle as calle_dep, 
               d.municipio as municipio_dep, d.estado as estado_dep
        FROM alumnos a
        JOIN proyectos_servicio p ON a.no_control = p.no_control
        JOIN dependencias d ON p.id_dependencia = d.id_dependencia
        ORDER BY a.nombre ASC
    """
    cursor.execute(query)
    proyectos_raw = cursor.fetchall()
    
    # Obtener todas las actividades y agruparlas programáticamente
    cursor.execute("SELECT id_proyecto, descripcion, orden FROM actividades_proyecto ORDER BY id_proyecto, orden ASC")
    actividades_raw = cursor.fetchall()
    
    # Obtener configuración global de fechas para autollenar periodos si el alumno no los tiene
    cursor.execute("SELECT inicio_bimestre_1, fin_bimestre_3 FROM configuracion_sistema WHERE id = 1")
    config_global = cursor.fetchone() or {}
    global_inicio = config_global.get('inicio_bimestre_1')
    global_fin = config_global.get('fin_bimestre_3')
    
    cursor.close()
    conexion.close()
    
    act_por_pry = {}
    for act in actividades_raw:
        pid = act['id_proyecto']
        if pid not in act_por_pry:
            act_por_pry[pid] = []
        act_por_pry[pid].append(act)
        
    proyectos = []
    for p in proyectos_raw:
        acts = act_por_pry.get(p['id_proyecto'], [])
        p['actividades'] = acts
        
        # Parsear o inyectar fechas globales por defecto (Formato YYYY-MM-DD requerido por <input type="date">)
        if p.get('fecha_inicio'):
            p['fecha_inicio'] = str(p['fecha_inicio'])
        elif global_inicio:
            p['fecha_inicio'] = str(global_inicio)
        else:
            p['fecha_inicio'] = ''

        if p.get('fecha_fin'):
            p['fecha_fin'] = str(p['fecha_fin'])
        elif global_fin:
            p['fecha_fin'] = str(global_fin)
        else:
            p['fecha_fin'] = ''
        
        # Semáforo de Completitud: (Proyecto Existe + Dependencia Existe + >=1 Actividad)
        tiene_proyecto = p.get('nombre_proyecto') and p['nombre_proyecto'].strip().upper() != 'PROYECTO INICIADO POR ADMIN'
        tiene_dep = p.get('dependencia') and p['dependencia'].strip().upper() != 'PENDIENTE'
        tiene_acts = len(acts) > 0
        
        p['es_completo'] = bool(tiene_proyecto and tiene_dep and tiene_acts)
        proyectos.append(p)
        
    return render_template('admin_proyectos.html', proyectos=proyectos)

@app.route('/admin/actualizar_proyecto', methods=['POST'])
def actualizar_proyecto():
    datos = request.json
    no_control = datos.get('no_control')
    
    if not no_control:
        return {"status": "error", "message": "Falta el número de control"}, 400
        
    conexion = obtener_conexion_db()
    cursor = conexion.cursor()
    
    try:
        conexion.start_transaction()
        # 1. Buscar el proyecto
        cursor.execute("SELECT id_proyecto, id_dependencia FROM proyectos_servicio WHERE no_control = %s ORDER BY id_proyecto DESC LIMIT 1", (no_control,))
        proy = cursor.fetchone()
        if not proy:
            return {"status": "error", "message": "No se encontró el proyecto"}, 404
        
        id_proyecto, id_dependencia = proy
        
        # 2. Actualizar Tabla Proyectos
        fecha_fin = datos.get('fecha_fin') or None
        fecha_inicio = datos.get('fecha_inicio') or None
        
        # Validar lógica de fechas si ambas existen
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            # Si se encuentra el error abortamos (sin haber comiteado por el rollback final)
            return {"status": "error", "message": "La fecha de inicio no puede ser posterior a la de fin."}, 400

        cursor.execute("""
            UPDATE proyectos_servicio 
            SET nombre_proyecto = %s, responsable_proyecto = %s, 
                modalidad = %s, fecha_inicio = %s, fecha_fin = %s 
            WHERE id_proyecto = %s
        """, (datos.get('nombre_proyecto'), datos.get('responsable_proyecto'), 
              datos.get('modalidad'), fecha_inicio, fecha_fin, id_proyecto))
        
        # 3. Actualizar Tabla Dependencias
        # Comúnmente la tabla usa columnas como calle, colonia, codigo_postal, municipio
        # Intentaremos actualizarlas si existen de acuerdo al requerimiento.
        cursor.execute("""
            UPDATE dependencias 
            SET nombre = %s, titular = %s, cargo_titular = %s, telefono = %s,
                calle = %s, colonia = %s, codigo_postal = %s, municipio = %s
            WHERE id_dependencia = %s
        """, (datos.get('dependencia', '').strip().upper(), datos.get('titular_dependencia'), 
              datos.get('cargo_titular'), datos.get('telefono_dependencia'),
              datos.get('calle_dep'), datos.get('colonia_dep'), datos.get('codigo_postal_dep'), datos.get('municipio_dep'),
              id_dependencia))
              
        # 4. Reconstrucción del Plan de Trabajo (Método Destructivo/Constructivo Seguro)
        actividades = datos.get('actividades', [])
        if isinstance(actividades, list):
            cursor.execute("DELETE FROM actividades_proyecto WHERE id_proyecto = %s", (id_proyecto,))
            for i, act_txt in enumerate(actividades):
                desc = str(act_txt).strip().upper()
                if desc:
                    cursor.execute(
                        "INSERT INTO actividades_proyecto (id_proyecto, descripcion, orden) VALUES (%s, %s, %s)",
                        (id_proyecto, desc, i + 1)
                    )

        conexion.commit()
    except Exception as e:
        conexion.rollback()
        return {"status": "error", "message": str(e)}, 500
    finally:
        cursor.close()
        conexion.close()
        
    return {"status": "success"}

@app.route('/admin')
@login_required
def panel_admin():
    # Aquí en el futuro verificaremos si session['user_token'] pertenece a un admin
    # Por ahora lo dejamos abierto para que puedas programar y probar
    
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # Obtener conteos rápidos para el Dashboard
    cursor.execute("SELECT COUNT(*) as total FROM alumnos")
    total_alumnos = cursor.fetchone()['total']
    
    # Contar expedientes aprobados (FRPS01 y FRPS08 aprobados en el proyecto)
    cursor.execute("""
        SELECT COUNT(DISTINCT p.id_proyecto) as aprobados 
        FROM proyectos_servicio p
        JOIN expediente_entregas e1 ON p.id_proyecto = e1.id_proyecto
        JOIN catalogo_documentos c1 ON e1.id_documento = c1.id_documento AND c1.clave_formato = 'FRPS01'
        JOIN expediente_entregas e2 ON p.id_proyecto = e2.id_proyecto
        JOIN catalogo_documentos c2 ON e2.id_documento = c2.id_documento AND c2.clave_formato = 'FRPS08'
        WHERE e1.estado = 'Aprobado' AND e2.estado = 'Aprobado'
    """)
    exp_aprobados = cursor.fetchone()['aprobados']
    
    # Calculando deuda total generalizada
    cursor.execute("SELECT * FROM configuracion_sistema WHERE id = 1")
    config = cursor.fetchone()
    
    adeudos_totales = 0
    if config:
        # Simplificación de morosos: si algún documento vencido no está aprobado
        query_morosos = """
            SELECT COUNT(DISTINCT a.no_control) as total_morosos
            FROM alumnos a
            JOIN proyectos_servicio p ON a.no_control = p.no_control
            LEFT JOIN (
                SELECT e.*, c.clave_formato 
                FROM expediente_entregas e 
                JOIN catalogo_documentos c ON e.id_documento = c.id_documento
            ) e ON p.id_proyecto = e.id_proyecto
            WHERE 
                ( (%s IS NOT NULL AND CURRENT_DATE > %s AND e.clave_formato='DRPS01' AND e.estado != 'Aprobado') 
                OR (%s IS NOT NULL AND CURRENT_DATE > %s AND e.clave_formato='FRPS04_1' AND e.estado != 'Aprobado')
                OR (%s IS NOT NULL AND CURRENT_DATE > %s AND e.clave_formato='FRPS04_2' AND e.estado != 'Aprobado')
                OR (%s IS NOT NULL AND CURRENT_DATE > %s AND e.clave_formato='FRPS04_3' AND e.estado != 'Aprobado')
                OR (%s IS NOT NULL AND CURRENT_DATE > %s AND e.clave_formato='DRPS02' AND e.estado != 'Aprobado') )
        """
        v = (config.get('limite_expediente_inicial'), config.get('limite_expediente_inicial'),
             config.get('limite_bimestre_1'), config.get('limite_bimestre_1'),
             config.get('limite_bimestre_2'), config.get('limite_bimestre_2'),
             config.get('limite_bimestre_3'), config.get('limite_bimestre_3'),
             config.get('limite_expediente_final'), config.get('limite_expediente_final'))
        
        cursor.execute(query_morosos, v)
        adeudos_totales = cursor.fetchone()['total_morosos']
        
    cursor.close()
    conexion.close()
    
    return render_template('admin.html', 
                           total_alumnos=total_alumnos, 
                           exps_aprobados=exp_aprobados, 
                           total_adeudos=adeudos_totales,
                           now=datetime.now().strftime('%d/%m/%Y %H:%M'))

@app.route('/admin/importar_padron', methods=['POST'])
def importar_padron():
    if 'archivo_excel' not in request.files:
        return "No se subió ningún archivo", 400
        
    archivo = request.files['archivo_excel']
    if archivo.filename == '':
        return "Archivo vacío", 400

    try:
        # Leemos el Excel directamente desde la memoria
        wb = load_workbook(archivo, data_only=True)
        ws = wb.active
        
        conexion = obtener_conexion_db()
        cursor = conexion.cursor()

        alumnos_importados = 0

        # Iterar sobre las filas (buscamos en todo el documento desde la fila 1)
        for row in ws.iter_rows(min_row=1, values_only=True):
            
            # Tomamos el valor de la Columna A (Índice 0)
            valor_col_a = row[0]
            
            # FILTRO MÁGICO: Si la columna A está vacía o NO es un número, saltamos la fila
            if valor_col_a is None or not str(valor_col_a).strip().isdigit():
                continue 
                
            # --- Si llega hasta aquí, significa que SÍ es la fila de un alumno ---
            
            no_control = str(row[6]).strip() if row[6] else None  # Columna G (Índice 6)
            nombre = str(row[5]).strip() if row[5] else None      # Columna F (Índice 5)
            carrera = str(row[7]).strip() if row[7] else None     # Columna H (Índice 7)
            correo = str(row[12]).strip() if row[12] else None    # Columna M (Índice 12)
            
            periodos = row[1] if row[1] else None                 # Columna B (Índice 1)
            creditos = row[3] if row[3] else None                 # Columna D (Índice 3)
            semestre = str(row[9]).strip() if row[9] else None    # Columna J (Índice 9)
            
            # Filtro de seguridad extra: el alumno debe tener control y nombre forzosamente
            if not no_control or not nombre:
                continue 
                
            # 1. Insertar en la tabla de alumnos (IGNORE evita errores si el alumno ya existe y suben el excel 2 veces)
            sql_alumnos = """
                INSERT IGNORE INTO alumnos 
                (no_control, nombre, carrera, correo_institucional, periodos_cursados, creditos_aprobados, semestre) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            valores_alumnos = (no_control, nombre, carrera, correo, periodos, creditos, semestre)
            cursor.execute(sql_alumnos, valores_alumnos)
            
            alumnos_importados += 1

        conexion.commit()
        cursor.close()
        conexion.close()
        
        return f"<h1>¡Éxito!</h1><p>Se importaron/actualizaron {alumnos_importados} alumnos correctamente en la base de datos.</p><a href='/admin'>Volver al Panel</a>"

    except Exception as e:
        return f"Error al procesar el Excel: {str(e)}", 500

@app.route('/login-microsoft')
def login_microsoft():
    auth_url = get_msal_app().get_authorization_request_url(SCOPE, redirect_uri=REDIRECT_URI)
    return redirect(auth_url)

@app.route('/callback')
def callback():
    code = request.args.get('code')
    result = get_msal_app().acquire_token_by_authorization_code(code, scopes=SCOPE, redirect_uri=REDIRECT_URI)
    
    if "access_token" in result:
        claims = result.get('id_token_claims', {})
        session['user_token'] = result['access_token']
        session['user_name'] = claims.get('name')
        
        # En Azure, el correo del usuario suele venir en 'preferred_username'
        correo_usuario = claims.get('preferred_username', '').lower()
        
        conexion = obtener_conexion_db()
        if not conexion:
            return "Error de conexión a la base de datos.", 500
            
        cursor = conexion.cursor(dictionary=True)
        
        try:
            # 1. VERIFICAR SI ES ADMINISTRADOR
            cursor.execute("SELECT * FROM administradores WHERE correo = %s AND activo = TRUE", (correo_usuario,))
            admin = cursor.fetchone()
            
            if admin:
                session['rol'] = admin['rol']  # Usar el rol definido en la BD (Administrador o SuperAdmin)
                session['admin_id'] = admin['id']
                return redirect(url_for('panel_admin'))
            
            # 2. VERIFICAR SI ES ALUMNO (Tabla alumnos)
            cursor.execute("SELECT * FROM alumnos WHERE correo_institucional = %s", (correo_usuario,))
            alumno = cursor.fetchone()
            
            if alumno:
                session['rol'] = 'alumno'
                session['no_control'] = alumno['no_control']
                session['user_name'] = alumno['nombre']
                
                # BUSCAR PROYECTO ACTIVO
                cursor.execute("SELECT id_proyecto FROM proyectos_servicio WHERE no_control = %s ORDER BY id_proyecto DESC LIMIT 1", (alumno['no_control'],))
                proyecto = cursor.fetchone()
                
                if proyecto:
                    session['id_proyecto'] = proyecto['id_proyecto']
                    return redirect(url_for('inicio'))
                else:
                    # Si no tiene proyecto, mandarlo directo a crear la solicitud
                    return redirect(url_for('formulario_por_clave', clave='FRPS01'))
            
            # 3. SI NO EXISTE EN NINGUNA TABLA (Rechazo)
            session.clear()
            return f"""
                <div style='text-align:center; margin-top:50px; font-family:sans-serif;'>
                    <h2 style='color:#dc3545;'>Acceso Denegado</h2>
                    <p>Tu correo (<b>{correo_usuario}</b>) no se encuentra autorizado en el sistema de Servicio Social.</p>
                    <p>Esto puede deberse a que no cuentas con el 70% de créditos o Control Escolar aún no te ha liberado.</p>
                    <p>Si crees que es un error, acude al departamento.</p>
                    <br>
                    <a href='/' style='padding:10px 20px; background:#1b396a; color:white; text-decoration:none; border-radius:5px;'>Volver al inicio</a>
                </div>
            """
            
        except Exception as e:
            return f"Error al verificar credenciales en BD: {str(e)}"
        finally:
            cursor.close()
            conexion.close()
            
    return "Error en la autenticación con Microsoft."

@app.route('/logout')
def logout():
    session.clear()
    return redirect("https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=http://127.0.0.1:5000/")


# --- FUNCIÓN DE ENVÍO VÍA MICROSOFT GRAPH ---
def enviar_correo_automatico(token, ruta_archivo):
    try:
        with open(ruta_archivo, "rb") as f:
            content_base64 = base64.b64encode(f.read()).decode()

        endpoint = "https://graph.microsoft.com/v1.0/me/sendMail"
        payload = {
            "message": {
                "subject": f"Expediente SS - {os.path.basename(ruta_archivo)}",
                "body": {
                    "contentType": "HTML", 
                    "content": f"El alumno <b>{session.get('user_name', 'Estudiante')}</b> ha generado un documento de Servicio Social."
                },
                "toRecipients": [{"emailAddress": {"address": CORREO_ADMIN}}],
                "attachments": [{
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    "name": os.path.basename(ruta_archivo),
                    "contentBytes": content_base64
                }]
            }
        }
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        requests.post(endpoint, json=payload, headers=headers)
    except Exception as e:
        print(f"Error al enviar correo: {e}")


# --- FUNCIONES DE APOYO (Word) ---
def reemplazar_texto(doc, marcador, nuevo_texto):
    """Reemplaza texto en párrafos y tablas en docx"""
    if nuevo_texto is None:
        nuevo_texto = ""
    
    nuevo_texto = str(nuevo_texto).upper()

    for p in doc.paragraphs:
        if marcador in p.text:
            for run in p.runs:
                if marcador in run.text:
                    run.text = run.text.replace(marcador, nuevo_texto)

    for tabla in doc.tables:
        for fila in tabla.rows:
            for celda in fila.cells:
                if marcador in celda.text:
                    celda.text = celda.text.replace(marcador, nuevo_texto)

# --- FUNCIONES DE APOYO (Excel) ---
def formatear_fecha(fecha_str):
    if not fecha_str:
        return ""
    try:
        meses = ["", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
        dt = datetime.strptime(fecha_str, '%Y-%m-%d')
        return f"{dt.day:02d} DE {meses[dt.month]} DE {dt.year}"
    except:
        return str(fecha_str).upper()

def escribir_en_celda(ws, coordenada, valor):
    """Escribe un valor en una celda, manejando si está combinada o no."""
    try:
        celda = ws[coordenada]
        if isinstance(celda, MergedCell):
            for rango in ws.merged_cells.ranges:
                if coordenada in rango:
                    ws.cell(row=rango.min_row, column=rango.min_col).value = valor
                    return
        else:
            ws[coordenada] = valor
    except Exception as e:
        print(f"Error al escribir en {coordenada}: {e}")

@app.context_processor
def utility_processor():
    def selector_estado(no_control, columna, estado_actual):
        # Configuración visual por estado (tema oscuro glassmorphism)
        estilos = {
            'Bloqueado':   {'bg': 'rgba(100,116,139,0.12)', 'border': 'rgba(100,116,139,0.25)', 'color': '#94a3b8', 'select_bg': 'rgba(100,116,139,0.08)'},
            'Disponible':  {'bg': 'rgba(6,182,212,0.10)',   'border': 'rgba(6,182,212,0.25)',   'color': '#67e8f9', 'select_bg': 'rgba(6,182,212,0.06)'},
            'En Revisión': {'bg': 'rgba(245,158,11,0.10)',  'border': 'rgba(245,158,11,0.25)',  'color': '#fcd34d', 'select_bg': 'rgba(245,158,11,0.06)'},
            'Aprobado':    {'bg': 'rgba(16,185,129,0.10)',  'border': 'rgba(16,185,129,0.25)',  'color': '#6ee7b7', 'select_bg': 'rgba(16,185,129,0.06)'},
        }
        e = estilos.get(estado_actual, estilos['Bloqueado'])

        opciones = ['Bloqueado', 'Disponible', 'En Revisión', 'Aprobado']
        options_html = ""
        for opt in opciones:
            selected = "selected" if opt == estado_actual else ""
            options_html += f'<option value="{opt}" {selected}>{opt}</option>'

        return f'''
            <td class="text-center align-middle" id="td_{no_control}_{columna}"
                style="background:{e['bg']};padding:6px 4px;transition:background 0.3s;">
                <select class="status-select"
                        style="background:{e['select_bg']};border:1px solid {e['border']};color:{e['color']};border-radius:8px;padding:4px 8px;font-size:0.72rem;font-weight:700;font-family:Inter,sans-serif;cursor:pointer;min-width:110px;outline:none;transition:all 0.2s;appearance:auto;"
                        onchange="cambiarEstado(this, '{no_control}', '{columna}', 'td_{no_control}_{columna}')">
                    {options_html}
                </select>
            </td>
        '''
    return dict(selector_estado=selector_estado)


# --- RUTAS PRINCIPALES ---
@app.route('/')
@login_required(role='alumno')
def inicio():
    no_control = session.get('no_control')
    id_proyecto = session.get('id_proyecto')
    
    if not id_proyecto:
        return redirect(url_for('formulario_por_clave', clave='FRPS01'))

    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # Consultamos el estado de todos los documentos para este proyecto
    # Traemos también el id_documento y si tiene campos configurados
    query = """
        SELECT c.id_documento, c.clave_formato, COALESCE(e.estado, 'Bloqueado') as estado,
               (SELECT COUNT(*) FROM configuracion_campos cc WHERE cc.id_documento = c.id_documento) as tiene_config
        FROM catalogo_documentos c
        LEFT JOIN expediente_entregas e ON c.id_documento = e.id_documento AND e.id_proyecto = %s
    """
    cursor.execute(query, (id_proyecto,))
    entregas = cursor.fetchall()
    
    # Mapear a un diccionario detallado
    expediente = {}
    for item in entregas:
        clave = item['clave_formato'].lower()
        expediente[clave] = {
            'id': item['id_documento'],
            'estado': item['estado'],
            'tiene_config': item['tiene_config'] > 0
        }
    
    # Consultamos la configuración del sistema
    cursor.execute("SELECT * FROM configuracion_sistema WHERE id = 1")
    config = cursor.fetchone()
    
    cursor.close()
    conexion.close()
    
    # Evaluar Restricción de Tiempo
    if config and expediente:
        hoy = datetime.now().date()
        
        validaciones_fechas = [
            ('frps04_1', 'fin_bimestre_1'),
            ('frps05_1', 'fin_bimestre_1'),
            ('frps04_2', 'fin_bimestre_2'),
            ('frps05_2', 'fin_bimestre_2'),
            ('frps04_3', 'fin_bimestre_3'),
            ('frps05_3', 'fin_bimestre_3')
        ]
        
        for clave, campo_fecha in validaciones_fechas:
            if clave in expediente and expediente[clave]['estado'] == 'Disponible':
                fecha_fin = config.get(campo_fecha)
                if fecha_fin and hoy < fecha_fin:
                    expediente[clave]['estado'] = 'Bloqueado por Fecha'
    
    return render_template('index.html', expediente=expediente)

# --- RUTAS DE FORMULARIOS ---
def obtener_datos_alumno_y_config():
    """Obtiene los datos del alumno, su proyecto y las actividades para autollenar formularios."""
    no_control = session.get('no_control')
    id_proyecto = session.get('id_proyecto')
    conexion = obtener_conexion_db()
    
    if not conexion:
        return {}, {}
        
    cursor = conexion.cursor(dictionary=True)
    
    # 1. Datos del alumno y su proyecto activo con prefijos tabla.columna
    #    CADA columna que configuracion_campos referencia debe tener su alias aquí.
    query = """
        SELECT 
            -- alumnos.*  (todas las columnas que configuracion_campos puede referenciar)
            al.no_control           AS `alumnos.no_control`,
            al.nombre               AS `alumnos.nombre`,
            al.carrera              AS `alumnos.carrera`, 
            al.semestre             AS `alumnos.semestre`,
            al.sexo                 AS `alumnos.sexo`,
            al.telefono             AS `alumnos.telefono`, 
            al.calle                AS `alumnos.calle`,
            al.colonia              AS `alumnos.colonia`,
            al.ciudad               AS `alumnos.ciudad`,
            al.estado               AS `alumnos.estado`, 
            al.correo_institucional AS `alumnos.correo_institucional`,
            al.correo_personal      AS `alumnos.correo_personal`,

            -- proyectos_servicio.*
            pr.nombre_proyecto        AS `proyectos_servicio.nombre_proyecto`, 
            pr.periodo                AS `proyectos_servicio.periodo`,
            pr.fecha_inicio           AS `proyectos_servicio.fecha_inicio`,
            pr.fecha_fin              AS `proyectos_servicio.fecha_fin`,
            pr.modalidad              AS `proyectos_servicio.modalidad`,
            pr.programa_institucional AS `proyectos_servicio.programa_institucional`,
            pr.responsable_proyecto   AS `proyectos_servicio.responsable_proyecto`,
            pr.cargo_responsable      AS `proyectos_servicio.cargo_responsable`,
            pr.supervisor_proyecto    AS `proyectos_servicio.supervisor_proyecto`,
            pr.cargo_supervisor       AS `proyectos_servicio.cargo_supervisor`,
            pr.objetivo               AS `proyectos_servicio.objetivo`,

            -- dependencias.*
            dp.nombre         AS `dependencias.nombre`, 
            dp.titular        AS `dependencias.titular`,
            dp.cargo_titular  AS `dependencias.cargo_titular`, 
            dp.calle          AS `dependencias.calle`,
            dp.colonia        AS `dependencias.colonia`,
            dp.municipio      AS `dependencias.municipio`,
            dp.estado         AS `dependencias.estado`, 
            dp.telefono       AS `dependencias.telefono`,
            dp.correo         AS `dependencias.correo`,

            -- Aliases planos para retrocompatibilidad con templates estáticos
            al.no_control, al.nombre, al.carrera, al.semestre, al.sexo, al.telefono,
            al.calle, al.colonia, al.ciudad, al.estado, al.correo_institucional, al.correo_personal,
            pr.nombre_proyecto, pr.periodo, pr.fecha_inicio, pr.fecha_fin, pr.modalidad,
            pr.responsable_proyecto, pr.cargo_responsable, pr.supervisor_proyecto, pr.cargo_supervisor,
            pr.programa_institucional,
            dp.nombre AS dependencia_nombre, dp.titular AS titular_dependencia

        FROM alumnos al
        LEFT JOIN proyectos_servicio pr ON al.no_control = pr.no_control AND pr.id_proyecto = %s
        LEFT JOIN dependencias dp ON pr.id_dependencia = dp.id_dependencia
        WHERE al.no_control = %s
    """
    cursor.execute(query, (id_proyecto, no_control))
    datos_raw = cursor.fetchone() or {}
    
    # 2. Obtener Actividades del Proyecto (Máximo 3)
    actividades_raw = []
    if id_proyecto:
        cursor.execute("SELECT descripcion, orden FROM actividades_proyecto WHERE id_proyecto = %s ORDER BY orden ASC LIMIT 3", (id_proyecto,))
        actividades_raw = cursor.fetchall()

    # FILTRO DE DATOS: Convertir None y placeholders técnicos a cadena vacía
    datos = {}
    placeholders_a_ignorar = {'PENDIENTE', 'NULL', 'NONE', 'PROYECTO INICIADO POR ADMIN', 'N/A'}
    
    for k, v in datos_raw.items():
        if v is None or str(v).strip() == '' or str(v).strip().upper() in placeholders_a_ignorar:
            datos[k] = ""
        else:
            # Convertir fechas a string ISO para inputs type="date"
            datos[k] = str(v) if hasattr(v, 'isoformat') else v

    # Añadir actividades al diccionario con llaves prefijadas
    # Formato: actividades_proyecto.1, actividades_proyecto.2, actividades_proyecto.3
    # Usa el campo 'orden' como clave, NO el índice de la lista
    actividades_dict = {}
    for act in actividades_raw:
        orden = act.get('orden', 0)
        desc = act.get('descripcion', '')
        if desc and str(desc).strip().upper() not in placeholders_a_ignorar:
            actividades_dict[orden] = desc
    
    for i in range(1, 4):
        key_act = f"actividades_proyecto.{i}"
        valor = actividades_dict.get(i, "")
        datos[key_act] = valor
        datos[f'actividad_{i}'] = valor  # Retrocompatibilidad

    # Aliases de compatibilidad para los templates estáticos
    datos['domicilio'] = datos.get('calle', '')
    datos['Estado'] = datos.get('estado', '')
    datos['tipo_proyecto'] = datos.get('programa_institucional', '')
    
    # 3. Configuración (Fechas y Periodo Oficial)
    cursor.execute("SELECT * FROM configuracion_sistema WHERE id = 1")
    config = cursor.fetchone() or {}
    
    # Añadir columnas de configuracion_sistema al dict de autollenado con prefijo
    for col, val in config.items():
        if col == 'id':
            continue
        if val is None or str(val).strip() == '':
            datos[f'configuracion_sistema.{col}'] = ''
        else:
            datos[f'configuracion_sistema.{col}'] = str(val) if hasattr(val, 'isoformat') else val
    
    cursor.close()
    conexion.close()
    
    return datos, config


# --- GESTIÓN DE PLANTILLAS (SUPERADMIN) ---

@app.route('/admin/plantillas')
@login_required
def admin_plantillas():
    """Redirige a la nueva interfaz unificada."""
    return redirect(url_for('admin_gestion_formatos'))

@app.route('/admin/gestion_formatos')
@login_required
def admin_gestion_formatos():
    """Vista maestra unificada: Administrador de Formatos 2.0."""
    import json as json_mod
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # 1. Todos los documentos
    cursor.execute("SELECT * FROM catalogo_documentos ORDER BY id_documento")
    documentos = cursor.fetchall()
    
    # 2. Todas las secciones
    cursor.execute("SELECT * FROM secciones_documento ORDER BY id_documento, orden_seccion")
    todas_secciones = cursor.fetchall()
    
    # 3. Todos los campos
    cursor.execute("SELECT * FROM configuracion_campos ORDER BY id_documento, orden")
    todos_campos = cursor.fetchall()
    
    cursor.close()
    conexion.close()
    
    # Agrupar por documento
    formatos = []
    for doc in documentos:
        id_doc = doc['id_documento']
        clave = doc['clave_formato']
        
        # Info del archivo físico
        nombre_archivo = PLANTILLAS_MAP.get(clave, f"{clave}.xlsx")
        ruta = os.path.join(CARPETA_PLANTILLAS, nombre_archivo)
        existe = os.path.exists(ruta)
        mtime = ""
        if existe:
            ts = os.path.getmtime(ruta)
            mtime = datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M')
        
        # Secciones de este documento
        secciones_doc = [s for s in todas_secciones if s['id_documento'] == id_doc]
        
        # Campos de este documento, agrupados por sección
        campos_doc = [c for c in todos_campos if c['id_documento'] == id_doc]
        for c in campos_doc:
            if c.get('opciones_json'):
                try:
                    c['opciones_lista'] = json_mod.loads(c['opciones_json'])
                except:
                    c['opciones_lista'] = []
        
        # Campos sin sección (huérfanos)
        campos_sin_seccion = [c for c in campos_doc if not c.get('id_seccion')]
        
        # Agrupar campos por sección
        secciones_con_campos = []
        for sec in secciones_doc:
            sec_campos = [c for c in campos_doc if c.get('id_seccion') == sec['id_seccion']]
            secciones_con_campos.append({
                'info': sec,
                'campos': sec_campos
            })
        
        formatos.append({
            'documento': doc,
            'nombre_archivo': nombre_archivo,
            'archivo_existe': existe,
            'archivo_mtime': mtime,
            'secciones': secciones_con_campos,
            'campos_sin_seccion': campos_sin_seccion,
            'total_campos': len(campos_doc),
            'total_secciones': len(secciones_doc)
        })
    
    return render_template('admin_gestion_formatos.html', formatos=formatos, plantillas_map=PLANTILLAS_MAP)


# --- APIs JSON para CRUD de Formatos, Secciones y Campos ---

@app.route('/admin/api/guardar_documento', methods=['POST'])
@login_required
def api_guardar_documento():
    """Crea o edita un documento (formato)."""
    from flask import jsonify
    data = request.get_json()
    
    id_documento = data.get('id_documento')
    clave = data.get('clave_formato', '').strip().upper()
    nombre = data.get('nombre_documento', '').strip()
    etapa = data.get('etapa', '').strip().upper()
    
    if not clave or not nombre or not etapa:
        return jsonify({'error': 'Faltan datos requeridos'}), 400
        
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        # Validar clave única
        check_sql = "SELECT id_documento FROM catalogo_documentos WHERE clave_formato = %s"
        check_params = [clave]
        if id_documento:
            check_sql += " AND id_documento != %s"
            check_params.append(id_documento)
        cursor.execute(check_sql, check_params)
        if cursor.fetchone():
            return jsonify({'error': f'La clave {clave} ya está registrada.'}), 409
            
        if id_documento:
            cursor.execute("""
                UPDATE catalogo_documentos SET clave_formato = %s, nombre_documento = %s, etapa = %s
                WHERE id_documento = %s
            """, (clave, nombre, etapa, id_documento))
        else:
            cursor.execute("""
                INSERT INTO catalogo_documentos (clave_formato, nombre_documento, etapa)
                VALUES (%s, %s, %s)
            """, (clave, nombre, etapa))
            id_documento = cursor.lastrowid
            
        conexion.commit()
        return jsonify({'ok': True, 'id_documento': id_documento})
    except Exception as e:
        conexion.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/admin/api/eliminar_documento/<int:id_documento>', methods=['DELETE'])
@login_required
def api_eliminar_documento(id_documento):
    """Elimina un documento y todas sus ramas en cascada."""
    from flask import jsonify
    conexion = obtener_conexion_db()
    cursor = conexion.cursor()
    try:
        # Eliminar las relaciones de manera explicita
        cursor.execute("DELETE FROM expediente_entregas WHERE id_documento = %s", (id_documento,))
        cursor.execute("DELETE FROM configuracion_campos WHERE id_documento = %s", (id_documento,))
        cursor.execute("DELETE FROM secciones_documento WHERE id_documento = %s", (id_documento,))
        
        cursor.execute("DELETE FROM catalogo_documentos WHERE id_documento = %s", (id_documento,))
        conexion.commit()
        return jsonify({'ok': True})
    except Exception as e:
        conexion.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/admin/api/guardar_seccion', methods=['POST'])
@login_required
def api_guardar_seccion():
    """Crea o edita una sección de documento."""
    from flask import jsonify
    data = request.get_json()
    
    id_seccion = data.get('id_seccion')
    id_documento = data.get('id_documento')
    titulo = data.get('titulo_seccion', '').strip()
    orden = data.get('orden_seccion', 0)
    
    if not id_documento or not titulo:
        return jsonify({'error': 'Faltan datos requeridos'}), 400
    
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        if id_seccion:
            cursor.execute("""
                UPDATE secciones_documento SET titulo_seccion = %s, orden_seccion = %s
                WHERE id_seccion = %s
            """, (titulo, orden, id_seccion))
        else:
            cursor.execute("""
                INSERT INTO secciones_documento (id_documento, titulo_seccion, orden_seccion)
                VALUES (%s, %s, %s)
            """, (id_documento, titulo, orden))
            id_seccion = cursor.lastrowid
        
        conexion.commit()
        return jsonify({'ok': True, 'id_seccion': id_seccion})
    except Exception as e:
        conexion.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/admin/api/eliminar_seccion/<int:id_seccion>', methods=['DELETE'])
@login_required
def api_eliminar_seccion(id_seccion):
    """Elimina una sección y opcionalmente sus campos."""
    from flask import jsonify
    borrar_campos = request.args.get('borrar_campos', 'true') == 'true'
    
    conexion = obtener_conexion_db()
    cursor = conexion.cursor()
    
    try:
        if borrar_campos:
            cursor.execute("DELETE FROM configuracion_campos WHERE id_seccion = %s", (id_seccion,))
        else:
            cursor.execute("UPDATE configuracion_campos SET id_seccion = NULL WHERE id_seccion = %s", (id_seccion,))
        
        cursor.execute("DELETE FROM secciones_documento WHERE id_seccion = %s", (id_seccion,))
        conexion.commit()
        return jsonify({'ok': True})
    except Exception as e:
        conexion.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/admin/api/guardar_campo', methods=['POST'])
@login_required
def api_guardar_campo():
    """Crea o edita un campo con todos sus metadatos. Valida duplicación de celda_excel."""
    from flask import jsonify
    data = request.get_json(force=True, silent=True)
    
    if not data:
        print(f"[DEBUG guardar_campo] No JSON body received. Content-Type: {request.content_type}, Body: {request.get_data(as_text=True)[:500]}")
        return jsonify({'error': 'No se recibieron datos JSON. Verifica la solicitud.'}), 400
    
    print(f"[DEBUG guardar_campo] Datos recibidos: id_documento={data.get('id_documento')}, label_web={data.get('label_web')}, nombre_variable={data.get('nombre_variable')}")
    
    id_campo = data.get('id_campo')
    id_documento = data.get('id_documento')
    # Safely coerce id_documento to int (handles string, float, NaN→null cases)
    if id_documento is not None:
        try:
            id_documento = int(id_documento)
        except (ValueError, TypeError):
            id_documento = None
    
    id_seccion = data.get('id_seccion') or None
    label_web = data.get('label_web', '').strip()
    nombre_variable = data.get('nombre_variable', '').strip()
    tipo_input = data.get('tipo_input', 'text')
    clase_bootstrap = data.get('clase_bootstrap', 'col-md-6')
    celda_excel = data.get('celda_excel', '').strip().upper()
    orden = data.get('orden', 0)
    tabla_origen = data.get('tabla_origen') or None
    columna_origen = data.get('columna_origen') or None
    opciones_json = data.get('opciones_json', '').strip() or None
    placeholder = data.get('placeholder', '').strip() or None
    texto_ayuda = data.get('texto_ayuda', '').strip() or None
    es_readonly = data.get('es_readonly', False)
    reglas_transformacion = data.get('reglas_transformacion', '').strip() or None
    accion_web = data.get('accion_web', '').strip() or None
    valor_condicion = data.get('valor_condicion', '').strip() or None
    campo_objetivo = data.get('campo_objetivo', '').strip() or None
    
    if (not id_documento or not label_web or not nombre_variable):
        return jsonify({'error': 'Faltan datos requeridos (Etiqueta y Nombre Variable son obligatorios)'}), 400
    
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        # Validar celda_excel único por documento
        if celda_excel:
            check_sql = "SELECT id_campo FROM configuracion_campos WHERE id_documento = %s AND celda_excel = %s"
            check_params = [id_documento, celda_excel]
            if id_campo:
                check_sql += " AND id_campo != %s"
                check_params.append(id_campo)
            cursor.execute(check_sql, check_params)
            duplicado = cursor.fetchone()
            if duplicado:
                return jsonify({'error': f'La celda {celda_excel} ya está asignada a otro campo (ID: {duplicado["id_campo"]})'}), 409
        
        if id_campo:
            cursor.execute("""
                UPDATE configuracion_campos SET
                    id_seccion=%s, label_web=%s, nombre_variable=%s, tipo_input=%s,
                    clase_bootstrap=%s, celda_excel=%s, orden=%s, tabla_origen=%s,
                    columna_origen=%s, opciones_json=%s, placeholder=%s, texto_ayuda=%s, es_readonly=%s,
                    reglas_transformacion=%s, accion_web=%s, valor_condicion=%s, campo_objetivo=%s
                WHERE id_campo=%s
            """, (id_seccion, label_web, nombre_variable, tipo_input, clase_bootstrap,
                  celda_excel, orden, tabla_origen, columna_origen, opciones_json,
                  placeholder, texto_ayuda, es_readonly,
                  reglas_transformacion, accion_web, valor_condicion, campo_objetivo, id_campo))
        else:
            cursor.execute("""
                INSERT INTO configuracion_campos 
                    (id_documento, id_seccion, label_web, nombre_variable, tipo_input, clase_bootstrap,
                     celda_excel, orden, tabla_origen, columna_origen, opciones_json, placeholder, texto_ayuda, es_readonly,
                     reglas_transformacion, accion_web, valor_condicion, campo_objetivo)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (id_documento, id_seccion, label_web, nombre_variable, tipo_input, clase_bootstrap,
                  celda_excel, orden, tabla_origen, columna_origen, opciones_json,
                  placeholder, texto_ayuda, es_readonly,
                  reglas_transformacion, accion_web, valor_condicion, campo_objetivo))
            id_campo = cursor.lastrowid
        
        conexion.commit()
        return jsonify({'ok': True, 'id_campo': id_campo})
    except Exception as e:
        conexion.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/admin/api/eliminar_campo/<int:id_campo>', methods=['DELETE'])
@login_required
def api_eliminar_campo(id_campo):
    """Elimina un campo de la configuración."""
    from flask import jsonify
    conexion = obtener_conexion_db()
    cursor = conexion.cursor()
    try:
        cursor.execute("DELETE FROM configuracion_campos WHERE id_campo = %s", (id_campo,))
        conexion.commit()
        return jsonify({'ok': True})
    except Exception as e:
        conexion.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conexion.close()


# === API: MAPEO DE VALORES (Cell Routing) ===
@app.route('/admin/api/mapeos/<int:id_campo>')
@login_required
def api_get_mapeos(id_campo):
    """Retorna todos los mapeos de valores para un campo."""
    from flask import jsonify
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM configuracion_mapeo_valores WHERE id_campo = %s ORDER BY valor_web", (id_campo,))
        mapeos = cursor.fetchall()
        return jsonify({'ok': True, 'mapeos': mapeos})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/admin/api/guardar_mapeo', methods=['POST'])
@login_required
def api_guardar_mapeo():
    """Crea o actualiza un mapeo de valor."""
    from flask import jsonify
    data = request.get_json()
    id_mapeo = data.get('id_mapeo')
    id_campo = data.get('id_campo')
    valor_web = data.get('valor_web', '').strip()
    celda_excel_destino = data.get('celda_excel_destino', '').strip().upper()
    texto_sustituto = data.get('texto_sustituto', '').strip() or None
    requiere_input_adicional = data.get('requiere_input_adicional', False)
    
    if not id_campo or not valor_web or not celda_excel_destino:
        return jsonify({'error': 'Faltan datos requeridos (id_campo, valor_web, celda_excel_destino)'}), 400
    
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    try:
        if id_mapeo:
            cursor.execute("""
                UPDATE configuracion_mapeo_valores SET
                    valor_web=%s, celda_excel_destino=%s, texto_sustituto=%s, requiere_input_adicional=%s
                WHERE id_mapeo=%s
            """, (valor_web, celda_excel_destino, texto_sustituto, requiere_input_adicional, id_mapeo))
        else:
            cursor.execute("""
                INSERT INTO configuracion_mapeo_valores 
                    (id_campo, valor_web, celda_excel_destino, texto_sustituto, requiere_input_adicional)
                VALUES (%s, %s, %s, %s, %s)
            """, (id_campo, valor_web, celda_excel_destino, texto_sustituto, requiere_input_adicional))
            id_mapeo = cursor.lastrowid
        conexion.commit()
        return jsonify({'ok': True, 'id_mapeo': id_mapeo})
    except Exception as e:
        conexion.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/admin/api/eliminar_mapeo/<int:id_mapeo>', methods=['DELETE'])
@login_required
def api_eliminar_mapeo(id_mapeo):
    """Elimina un mapeo de valor."""
    from flask import jsonify
    conexion = obtener_conexion_db()
    cursor = conexion.cursor()
    try:
        cursor.execute("DELETE FROM configuracion_mapeo_valores WHERE id_mapeo = %s", (id_mapeo,))
        conexion.commit()
        return jsonify({'ok': True})
    except Exception as e:
        conexion.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/admin/api/columnas/<tabla>')
@login_required
def api_get_columnas(tabla):
    """Retorna los nombres de las columnas reales de una tabla."""
    tablas_permitidas = ['alumnos', 'proyectos_servicio', 'dependencias', 'actividades_proyecto', 'configuracion_sistema']
    if tabla not in tablas_permitidas:
        return {"error": "Tabla no permitida"}, 400
    
    # Manejo especial para actividades (columnas virtuales)
    if tabla == 'actividades_proyecto':
        return {"columnas": ['1', '2', '3']}
    
    # Manejo especial para configuracion_sistema (excluir columna 'id', solo 1 fila)
    if tabla == 'configuracion_sistema':
        conexion = obtener_conexion_db()
        cursor = conexion.cursor()
        try:
            cursor.execute("DESCRIBE configuracion_sistema")
            columnas = [row[0] for row in cursor.fetchall() if row[0] != 'id']
            return {"columnas": columnas}
        except Exception as e:
            return {"error": str(e)}, 500
        finally:
            cursor.close()
            conexion.close()
        
    conexion = obtener_conexion_db()
    cursor = conexion.cursor()
    try:
        cursor.execute(f"DESCRIBE {tabla}")
        columnas = [row[0] for row in cursor.fetchall()]
        return {"columnas": columnas}
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        cursor.close()
        conexion.close()


@app.route('/admin/configurar_plantilla/<int:id_doc>')
@login_required
def configurar_plantilla(id_doc):
    """Muestra la interfaz para configurar los campos de un documento."""
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # Obtener info del documento
    cursor.execute("SELECT * FROM catalogo_documentos WHERE id_documento = %s", (id_doc,))
    documento = cursor.fetchone()
    
    if not documento:
        cursor.close()
        conexion.close()
        flash("Documento no encontrado.", "danger")
        return redirect(url_for('admin_plantillas'))
    
    # Obtener campos configurados
    cursor.execute("SELECT * FROM configuracion_campos WHERE id_documento = %s ORDER BY orden ASC", (id_doc,))
    campos = cursor.fetchall()
    
    cursor.close()
    conexion.close()
    return render_template('admin_configurar_plantilla.html', documento=documento, campos=campos)

@app.route('/admin/configurar_plantilla/guardar', methods=['POST'])
@login_required
def guardar_configuracion_campo():
    """Guarda o actualiza un campo en la configuración."""
    id_doc = request.form.get('id_documento')
    label_web = request.form.get('label_web')
    nombre_var = request.form.get('nombre_variable')
    tipo_input = request.form.get('tipo_input')
    celda = request.form.get('celda_excel', '').strip().upper()
    orden = request.form.get('orden', 0)
    tabla_origen = request.form.get('tabla_origen')
    columna_origen = request.form.get('columna_origen')
    
    # Normalizar "Manual"
    if tabla_origen == "Manual":
        tabla_origen = None
        columna_origen = None
    
    conexion = obtener_conexion_db()
    cursor = conexion.cursor()
    
    try:
        sql = """
            INSERT INTO configuracion_campos (id_documento, label_web, nombre_variable, tipo_input, celda_excel, orden, tabla_origen, columna_origen)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (id_doc, label_web, nombre_var, tipo_input, celda, orden, tabla_origen, columna_origen))
        conexion.commit()
    except Exception as e:
        flash(f"Error al guardar: {str(e)}", "danger")
    finally:
        cursor.close()
        conexion.close()
        
    return redirect(url_for('configurar_plantilla', id_doc=id_doc))

@app.route('/admin/configurar_plantilla/eliminar/<int:id_campo>')
@login_required
def eliminar_configuracion_campo(id_campo):
    """Elimina un campo de la configuración."""
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # Primero obtenemos el id_doc para redirigir
    cursor.execute("SELECT id_documento FROM configuracion_campos WHERE id_campo = %s", (id_campo,))
    res = cursor.fetchone()
    if not res:
        cursor.close()
        conexion.close()
        return redirect(url_for('admin_plantillas'))
    
    id_doc = res['id_documento']
    
    cursor.execute("DELETE FROM configuracion_campos WHERE id_campo = %s", (id_campo,))
    conexion.commit()
    cursor.close()
    conexion.close()
    
    return redirect(url_for('configurar_plantilla', id_doc=id_doc))

@app.route('/admin/plantillas/upload', methods=['POST'])
@login_required
def upload_plantilla():
    """Maneja la subida y reemplazo de plantillas con respaldo automático."""
    if 'archivo' not in request.files:
        flash("No se seleccionó ningún archivo.", "danger")
        return redirect(url_for('admin_plantillas'))
    
    archivo = request.files['archivo']
    clave = request.form.get('clave')
    
    if archivo.filename == '' or not clave:
        flash("Datos incompletos.", "danger")
        return redirect(url_for('admin_plantillas'))
    
    if clave not in PLANTILLAS_MAP:
        flash("Clave de formato no válida.", "danger")
        return redirect(url_for('admin_plantillas'))
    
    # Validar extensión
    ext = archivo.filename.rsplit('.', 1)[-1].lower()
    if ext not in ['xlsx', 'xls', 'docx']:
        flash("Extensión no permitida. Solo .xlsx, .xls y .docx", "danger")
        return redirect(url_for('admin_plantillas'))

    nombre_oficial = PLANTILLAS_MAP[clave]
    ruta_oficial = os.path.join(CARPETA_PLANTILLAS, nombre_oficial)
    
    try:
        # 1. RESPALDO AUTOMÁTICO
        if os.path.exists(ruta_oficial):
            nombre_old = nombre_oficial.rsplit('.', 1)[0] + "_OLD." + ext
            ruta_old = os.path.join(CARPETA_PLANTILLAS, nombre_old)
            # Si ya existía un OLD, lo borramos o sobreescribimos
            if os.path.exists(ruta_old):
                os.remove(ruta_old)
            os.rename(ruta_oficial, ruta_old)
            flash(f"Respaldo creado: {nombre_old}", "success")
        
        # 2. GUARDAR NUEVA VERSIÓN
        archivo.save(ruta_oficial)
        flash(f"Plantilla {clave} actualizada correctamente.", "success")
        
    except Exception as e:
        flash(f"Error al procesar la plantilla: {str(e)}", "danger")

    return redirect(url_for('admin_plantillas'))

# ====================================================
# === RUTA UNIVERSAL: FORMULARIO POR CLAVE_FORMATO ===
# ====================================================
@app.route('/formulario/<clave>')
@login_required
def formulario_por_clave(clave):
    """Ruta maestra: busca el documento por clave_formato y renderiza el formulario universal."""
    clave_upper = clave.strip().upper()
    
    # Validación de bimestre para reportes (FRPS04_1, FRPS05_2, etc.)
    import re
    match_bim = re.search(r'_(\d)$', clave_upper)
    if match_bim:
        num_bimestre = int(match_bim.group(1))
        conexion_check = obtener_conexion_db()
        cursor_check = conexion_check.cursor(dictionary=True)
        cursor_check.execute("SELECT * FROM configuracion_sistema WHERE id = 1")
        config_bim = cursor_check.fetchone()
        cursor_check.close()
        conexion_check.close()
        
        if config_bim:
            hoy = datetime.now().date()
            fecha_fin = config_bim.get(f'fin_bimestre_{num_bimestre}')
            if fecha_fin and hoy < fecha_fin:
                fecha_str = formatear_fecha(str(fecha_fin))
                return f"<script>alert('Acceso Denegado: Aún no es tiempo de entregar este reporte. El bimestre culmina el {fecha_str}.'); window.location.href='/';</script>"
    
    # Buscar documento en catalogo
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("SELECT id_documento FROM catalogo_documentos WHERE clave_formato = %s", (clave_upper,))
    doc = cursor.fetchone()
    cursor.close()
    conexion.close()
    
    if not doc:
        flash(f"Documento con clave '{clave_upper}' no encontrado.", "danger")
        return redirect(url_for('inicio'))
    
    return _formulario_dinamico_impl(doc['id_documento'])

# --- RUTAS DE GENERACIÓN ---

@app.route('/formulario/documento/<int:id_doc>')
@login_required
def formulario_dinamico(id_doc):
    """Wrapper de ruta para el formulario dinámico."""
    return _formulario_dinamico_impl(id_doc)


def _formulario_dinamico_impl(id_doc):
    """Renderiza un formulario universal basado en los campos configurados en la BD."""
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    # 1. Obtener info del documento
    cursor.execute("SELECT * FROM catalogo_documentos WHERE id_documento = %s", (id_doc,))
    documento = cursor.fetchone()
    
    if not documento:
        cursor.close()
        conexion.close()
        flash("Documento no encontrado.", "danger")
        return redirect(url_for('inicio'))
    
    # 2. Obtener SECCIONES configuradas
    cursor.execute("SELECT * FROM secciones_documento WHERE id_documento = %s ORDER BY orden_seccion ASC", (id_doc,))
    secciones = cursor.fetchall()
    
    # 3. Obtener CAMPOS configurados
    cursor.execute("SELECT * FROM configuracion_campos WHERE id_documento = %s ORDER BY orden ASC", (id_doc,))
    todos_los_campos = cursor.fetchall()
    
    # 4. Agrupar campos por sección y procesar metadatos (Phase 5+)
    import json
    estructura_formulario = []
    for seccion in secciones:
        campos_seccion = [c for c in todos_los_campos if c.get('id_seccion') == seccion['id_seccion']]
        # Procesar opciones JSON si existen
        for c in campos_seccion:
            if c.get('opciones_json'):
                try:
                    c['opciones_lista'] = json.loads(c['opciones_json'])
                except:
                    c['opciones_lista'] = []
            else:
                c['opciones_lista'] = []
                
        estructura_formulario.append({
            'info': seccion,
            'campos': campos_seccion
        })
    
    # Manejar campos huérfanos (sin sección)
    campos_huerfanos = [c for c in todos_los_campos if not c.get('id_seccion')]
    if campos_huerfanos:
        estructura_formulario.append({
            'info': {'nombre_seccion': 'Otros Datos', 'id_seccion': 0},
            'campos': campos_huerfanos
        })
    
    if not secciones and not campos_huerfanos:
        cursor.close()
        conexion.close()
        return render_template('form_manual.html', documento=documento)
        
    cursor.close()
    conexion.close()
    
    # 5. Obtener datos del alumno para autollenado (Data Maestra con prefijos)
    datos_alumno, config_sistema = obtener_datos_alumno_y_config()
    
    # 6. Procesar valores por defecto basados en tabla_origen y columna_origen
    val_campos = {}
    for campo in todos_los_campos:
        t_orig = campo.get('tabla_origen')
        c_orig = campo.get('columna_origen')
        
        if t_orig and c_orig:
            key_prefijada = f"{t_orig}.{c_orig}"
            val_campos[campo['nombre_variable']] = datos_alumno.get(key_prefijada, "")
        else:
            val_campos[campo['nombre_variable']] = ""
            
    return render_template('form_universal.html', 
                           documento=documento, 
                           secciones_y_campos=estructura_formulario, 
                           val_campos=val_campos, 
                           config=config_sistema)

# ====================================================
# === RUTA UNIVERSAL: GENERAR POR CLAVE_FORMATO ===
# ====================================================
@app.route('/generar/<clave>', methods=['POST'])
@login_required
def generar_por_clave(clave):
    """Ruta maestra POST: busca el documento por clave_formato y genera el Excel."""
    clave_upper = clave.strip().upper()
    
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("SELECT id_documento FROM catalogo_documentos WHERE clave_formato = %s", (clave_upper,))
    doc = cursor.fetchone()
    cursor.close()
    conexion.close()
    
    if not doc:
        return f"Documento con clave '{clave_upper}' no encontrado.", 404
    
    return _generar_documento_impl(doc['id_documento'])


@app.route('/generar/documento/<int:id_doc>', methods=['POST'])
@login_required
def generar_documento_universal(id_doc):
    """Wrapper de ruta para el generador universal."""
    return _generar_documento_impl(id_doc)


def _generar_documento_impl(id_doc):
    """Generador universal que usa la metadata de configuracion_campos para llenar el Excel."""
    from flask import jsonify
    
    conexion = obtener_conexion_db()
    cursor = conexion.cursor(dictionary=True)
    
    try:
        # 1. Obtener metadata del documento y sus campos
        cursor.execute("SELECT * FROM catalogo_documentos WHERE id_documento = %s", (id_doc,))
        doc_db = cursor.fetchone()
        
        if not doc_db:
            return "Documento no existe", 404
            
        cursor.execute("SELECT * FROM configuracion_campos WHERE id_documento = %s", (id_doc,))
        campos = cursor.fetchall()
        
        # 1.5 AUTO-SAVE-BACK: Guardar datos del formulario de vuelta a las tablas origen
        no_control_seguro = session.get('no_control', 'DESCONOCIDO')
        id_proyecto = session.get('id_proyecto')
        
        # Agrupar campos por tabla_origen
        campos_por_tabla = {}
        for campo in campos:
            t_orig = campo.get('tabla_origen')
            c_orig = campo.get('columna_origen')
            if t_orig and c_orig:
                campos_por_tabla.setdefault(t_orig, []).append(campo)
        
        try:
            # UPDATE alumnos
            if 'alumnos' in campos_por_tabla:
                set_parts = []
                values = []
                for c in campos_por_tabla['alumnos']:
                    val = request.form.get(c['nombre_variable'], '').strip()
                    if not val: continue
                    if c['tipo_input'] != 'date':
                        val = val.upper() if c.get('columna_origen') not in ['correo_personal', 'correo_institucional'] else val.lower()
                    set_parts.append(f"{c['columna_origen']} = %s")
                    values.append(val)
                if set_parts:
                    values.append(no_control_seguro)
                    cursor.execute(f"UPDATE alumnos SET {', '.join(set_parts)} WHERE no_control = %s", values)
            
            # UPDATE dependencias
            if 'dependencias' in campos_por_tabla and id_proyecto:
                cursor.execute("SELECT id_dependencia FROM proyectos_servicio WHERE id_proyecto = %s", (id_proyecto,))
                res_dep = cursor.fetchone()
                id_dep = res_dep['id_dependencia'] if res_dep else None
                if id_dep:
                    set_parts = []
                    values = []
                    for c in campos_por_tabla['dependencias']:
                        val = request.form.get(c['nombre_variable'], '').strip()
                        if not val: continue
                        if c.get('columna_origen') == 'correo':
                            val = val.lower()
                        else:
                            val = val.upper()
                        set_parts.append(f"{c['columna_origen']} = %s")
                        values.append(val)
                    if set_parts:
                        values.append(id_dep)
                        cursor.execute(f"UPDATE dependencias SET {', '.join(set_parts)} WHERE id_dependencia = %s", values)
            
            # UPDATE proyectos_servicio
            if 'proyectos_servicio' in campos_por_tabla and id_proyecto:
                set_parts = []
                values = []
                for c in campos_por_tabla['proyectos_servicio']:
                    val = request.form.get(c['nombre_variable'], '').strip()
                    if not val: continue
                    if c['tipo_input'] != 'date':
                        val = val.upper()
                    set_parts.append(f"{c['columna_origen']} = %s")
                    values.append(val)
                if set_parts:
                    values.append(id_proyecto)
                    cursor.execute(f"UPDATE proyectos_servicio SET {', '.join(set_parts)} WHERE id_proyecto = %s", values)
            
            # ACTIVIDADES: DELETE + INSERT
            if 'actividades_proyecto' in campos_por_tabla and id_proyecto:
                cursor.execute("DELETE FROM actividades_proyecto WHERE id_proyecto = %s", (id_proyecto,))
                for c in campos_por_tabla['actividades_proyecto']:
                    val = request.form.get(c['nombre_variable'], '').strip()
                    if val:
                        orden = c.get('columna_origen', '1')
                        cursor.execute(
                            "INSERT INTO actividades_proyecto (id_proyecto, descripcion, orden) VALUES (%s, %s, %s)",
                            (id_proyecto, val.upper(), orden)
                        )
            
            conexion.commit()
        except Exception as e_save:
            conexion.rollback()
            # Log but don't fail — Excel generation should still proceed
            print(f"[WARN] Auto-save-back error: {e_save}")
        
        # 2. Cargar la plantilla Excel
        clave_formato = doc_db['clave_formato']
        nombre_plantilla = PLANTILLAS_MAP.get(clave_formato)
        
        if not nombre_plantilla:
            return f"No hay una plantilla Excel asociada a la clave {clave_formato}", 400
            
        ruta_plantilla = os.path.join(CARPETA_PLANTILLAS, nombre_plantilla)
        if not os.path.exists(ruta_plantilla):
            return f"Archivo de plantilla no encontrado: {nombre_plantilla}", 404
            
        wb = load_workbook(ruta_plantilla)
        ws = wb.active
        
        # 3. Mapeo Dinámico: Llenar el Excel con enrutamiento inteligente
        import json as json_mod
        
        # Pre-cargar TODOS los mapeos de valores para este documento (1 sola query)
        mapeos_por_campo = {}
        try:
            cursor.execute("""
                SELECT m.* FROM configuracion_mapeo_valores m
                INNER JOIN configuracion_campos c ON m.id_campo = c.id_campo
                WHERE c.id_documento = %s
            """, (id_doc,))
            for mapeo in cursor.fetchall():
                mapeos_por_campo.setdefault(mapeo['id_campo'], []).append(mapeo)
        except Exception:
            pass  # Tabla aún no creada, continuar sin mapeos
        
        for campo in campos:
            valor = request.form.get(campo['nombre_variable'], '')
            id_campo_actual = campo['id_campo']
            
            # Formateo especial si es fecha
            if campo['tipo_input'] == 'date' and valor:
                valor = formatear_fecha(valor)
            
            # === PRIORIDAD 1: Enrutamiento de Celdas (configuracion_mapeo_valores) ===
            mapeos = mapeos_por_campo.get(id_campo_actual, [])
            if mapeos:
                encontrado = False
                for mapeo in mapeos:
                    if mapeo['valor_web'].strip().upper() == valor.strip().upper():
                        texto = mapeo['texto_sustituto'] or '( X )'
                        
                        # CASO B: "Otro" con input adicional
                        if mapeo.get('requiere_input_adicional'):
                            campo_adicional = campo['nombre_variable'] + '_otro'
                            valor_adicional = request.form.get(campo_adicional, '')
                            if valor_adicional:
                                texto = valor_adicional.upper()
                        
                        escribir_en_celda(ws, mapeo['celda_excel_destino'], texto)
                        encontrado = True
                        break
                
                if encontrado:
                    continue  # Ya se escribió en la celda destino, no escribir en celda_excel base
            
            # === PRIORIDAD 2: Reglas de Transformación (reglas_transformacion JSON) ===
            reglas_raw = campo.get('reglas_transformacion')
            if reglas_raw:
                try:
                    reglas = json_mod.loads(reglas_raw)
                    valor_upper = valor.strip().upper()
                    for k, v in reglas.items():
                        if k.strip().upper() == valor_upper:
                            valor = v
                            break
                except (json_mod.JSONDecodeError, TypeError):
                    pass
                escribir_en_celda(ws, campo['celda_excel'], valor)
                continue
            
            # === PRIORIDAD 3: Escritura normal o Imagen ===
            if campo['tipo_input'] == 'image':
                archivo_img = request.files.get(campo['nombre_variable'])
                if archivo_img and archivo_img.filename != '' and campo.get('celda_excel'):
                    # Guardar temporalmente para procesar
                    tmp_path = os.path.join(CARPETA_GENERADOS, f"tmp_{id_campo_actual}_{secure_filename(archivo_img.filename)}")
                    archivo_img.save(tmp_path)
                    
                    try:
                        # Redimensionar y añadir
                        img_excel = OpenpyxlImage(tmp_path)
                        w, h = redimensionar_imagen_para_excel(tmp_path)
                        img_excel.width = w
                        img_excel.height = h
                        
                        ws.add_image(img_excel, campo['celda_excel'])
                    finally:
                        # Limpieza inmediata
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)
            
            elif campo.get('celda_excel'):
                escribir_en_celda(ws, campo['celda_excel'], valor.upper())
            
        # 4. Guardar documento generado
        no_control = session.get('no_control', 'DESCONOCIDO')
        nombre_salida = f"{clave_formato}_{no_control}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        ruta_salida = os.path.join(CARPETA_GENERADOS, nombre_salida)
        
        wb.save(ruta_salida)
        wb.close()
        
        # 5. Opcional: Actualizar estado en la BD
        id_proyecto = session.get('id_proyecto')
        if id_proyecto:
            cursor.execute("""
                INSERT INTO expediente_entregas (id_proyecto, id_documento, estado)
                VALUES (%s, %s, 'En Revisión')
                ON DUPLICATE KEY UPDATE estado = 'En Revisión'
            """, (id_proyecto, id_doc))
            conexion.commit()
            
        # Enviar por correo si es posible
        try: enviar_correo_automatico(session['user_token'], ruta_salida)
        except: pass
        
        return send_file(ruta_salida, as_attachment=True, download_name=nombre_salida)
        
    except Exception as e:
        return f"Error en el generador universal: {str(e)}", 500
    finally:
        cursor.close()
        conexion.close()


# ====================================================
# === RUTAS UNIVERSALES PARA DOCUMENTOS MANUALES ===
# ====================================================
@app.route('/descargar_plantilla/<clave>', methods=['GET'])
@login_required(role='alumno')
def descargar_plantilla_generica(clave):
    try:
        clave_upper = clave.strip().upper()
        nombre_plantilla = PLANTILLAS_MAP.get(clave_upper)
        
        if not nombre_plantilla:
            return f"Error: No hay una plantilla registrada para la clave {clave_upper}."
            
        ruta_plantilla = os.path.join(CARPETA_PLANTILLAS, nombre_plantilla)
        
        if not os.path.exists(ruta_plantilla):
            return f"Error: No se encontró la plantilla física en {ruta_plantilla}"

        return send_file(ruta_plantilla, as_attachment=True, download_name=nombre_plantilla)
    except Exception as e:
        return f"Ocurrió un error al descargar la plantilla: {str(e)}", 500

@app.route('/upload_manual/<clave>', methods=['POST'])
@login_required(role='alumno')
def upload_manual_generica(clave):
    try:
        from flask import jsonify
        from werkzeug.utils import secure_filename
        
        if 'archivo' not in request.files:
            return jsonify({"success": False, "error": "No se recibió ningún archivo"}), 400
            
        archivo = request.files['archivo']
        if archivo.filename == '':
            return jsonify({"success": False, "error": "No se seleccionó archivo"}), 400
            
        no_control_seguro = session.get('no_control', 'DESCONOCIDO')
        clave_upper = clave.strip().upper()
        
        # Limpiar nombre y guardar
        filename = secure_filename(f"{clave_upper}_{no_control_seguro}_{archivo.filename}")
        ruta_guardado = os.path.join(CARPETA_GENERADOS, filename)
        archivo.save(ruta_guardado)
        
        # Enviar el archivo real mediante Microsoft Graph a la admin
        enviar_correo_automatico(session['user_token'], ruta_guardado)
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)