import os
import re
from flask import Blueprint, request, jsonify, send_file
from database import Database

import jwt
from config import Config
from controllers.email_service import send_graph_email_with_attachment

recepcion_bp = Blueprint('recepcion_bp', __name__)

GENERADOS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'generados')
os.makedirs(GENERADOS_DIR, exist_ok=True)

def get_db():
    db = Database()
    return db.get_connection()

@recepcion_bp.route('/recepcion-config', methods=['GET', 'PUT'])
def recepcion_config():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión con la base de datos"}), 500
    cursor = conn.cursor(dictionary=True)
    
    try:
        if request.method == 'GET':
            cursor.execute("""
                SELECT id, periodo_oficial, correo_recepcion_formatos,
                       smtp_host, smtp_port, smtp_user, smtp_password, smtp_remitente, smtp_use_tls
                FROM configuracion_sistema WHERE id = 1 LIMIT 1
            """)
            cfg = cursor.fetchone() or {}
            
            # Estadísticas rápidas de formatos entregados
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_entregas,
                    SUM(CASE WHEN estado = 'EN_REVISION' THEN 1 ELSE 0 END) as total_en_revision,
                    SUM(CASE WHEN estado = 'APROBADO' THEN 1 ELSE 0 END) as total_aprobados,
                    SUM(CASE WHEN estado = 'RECHAZADO' THEN 1 ELSE 0 END) as total_rechazados
                FROM expediente_entregas
                WHERE ruta_archivo IS NOT NULL AND ruta_archivo != ''
            """)
            stats = cursor.fetchone() or {}
            
            # Verificar si el usuario en sesión tiene token de Microsoft
            auth_header = request.headers.get('Authorization')
            has_ms_token = False
            user_email = None
            if auth_header and auth_header.startswith('Bearer '):
                try:
                    tok = auth_header.split(' ')[1]
                    payload = jwt.decode(tok, Config.JWT_SECRET, algorithms=["HS256"])
                    uid = payload.get('id_usuario')
                    user_email = payload.get('correo')
                    if uid:
                        cursor.execute("SELECT ms_access_token FROM usuarios WHERE id_usuario = %s", (uid,))
                        u = cursor.fetchone()
                        has_ms_token = bool(u and u.get('ms_access_token'))
                except Exception:
                    pass
            
            return jsonify({
                "correo_recepcion_formatos": cfg.get("correo_recepcion_formatos") or "serviciosocial@teziutlan.tecnm.mx",
                "periodo_oficial": cfg.get("periodo_oficial") or "Periodo Oficial",
                "stats": {
                    "total_entregas": int(stats.get("total_entregas") or 0),
                    "total_en_revision": int(stats.get("total_en_revision") or 0),
                    "total_aprobados": int(stats.get("total_aprobados") or 0),
                    "total_rechazados": int(stats.get("total_rechazados") or 0)
                },
                "smtp": {
                    "host": cfg.get("smtp_host") or "smtp.office365.com",
                    "port": cfg.get("smtp_port") or 587,
                    "user": cfg.get("smtp_user") or "",
                    "remitente": cfg.get("smtp_remitente") or "",
                    "use_tls": bool(cfg.get("smtp_use_tls", 1)),
                    "has_password": bool(cfg.get("smtp_password"))
                },
                "has_ms_token": has_ms_token,
                "current_user_email": user_email
            }), 200

        elif request.method == 'PUT':
            data = request.json or {}
            nuevo_correo = (data.get('correo_recepcion_formatos') or '').strip().lower()
            
            if not nuevo_correo or '@' not in nuevo_correo:
                return jsonify({"error": "Por favor proporciona una dirección de correo válida"}), 400
                
            smtp_data = data.get('smtp') or {}
            smtp_host = smtp_data.get('host')
            smtp_port = smtp_data.get('port')
            smtp_user = smtp_data.get('user')
            smtp_pass = smtp_data.get('password')
            smtp_rem = smtp_data.get('remitente')
            smtp_tls = 1 if smtp_data.get('use_tls', True) else 0
            
            if smtp_pass is not None and smtp_pass != '':
                cursor.execute("""
                    UPDATE configuracion_sistema 
                    SET correo_recepcion_formatos = %s,
                        smtp_host = COALESCE(%s, smtp_host),
                        smtp_port = COALESCE(%s, smtp_port),
                        smtp_user = COALESCE(%s, smtp_user),
                        smtp_password = %s,
                        smtp_remitente = COALESCE(%s, smtp_remitente),
                        smtp_use_tls = %s
                    WHERE id = 1
                """, (nuevo_correo, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_rem, smtp_tls))
            else:
                cursor.execute("""
                    UPDATE configuracion_sistema 
                    SET correo_recepcion_formatos = %s,
                        smtp_host = COALESCE(%s, smtp_host),
                        smtp_port = COALESCE(%s, smtp_port),
                        smtp_user = COALESCE(%s, smtp_user),
                        smtp_remitente = COALESCE(%s, smtp_remitente),
                        smtp_use_tls = %s
                    WHERE id = 1
                """, (nuevo_correo, smtp_host, smtp_port, smtp_user, smtp_rem, smtp_tls))
                
            conn.commit()
            
            return jsonify({
                "message": "Configuración guardada exitosamente",
                "correo_recepcion_formatos": nuevo_correo
            }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@recepcion_bp.route('/probar-correo', methods=['POST'])
def probar_correo():
    """
    Envía un correo de prueba a Outlook para verificar la entrega en tiempo real.
    """
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión con la base de datos"}), 500
    cursor = conn.cursor(dictionary=True)
    
    try:
        data = request.json or {}
        cursor.execute("SELECT correo_recepcion_formatos FROM configuracion_sistema WHERE id = 1 LIMIT 1")
        cfg = cursor.fetchone() or {}
        
        destino = (data.get('correo_destino') or cfg.get('correo_recepcion_formatos') or '').strip()
        if not destino or '@' not in destino:
            return jsonify({"error": "Correo destino no válido"}), 400
            
        # Extraer usuario actual del JWT
        auth_header = request.headers.get('Authorization')
        id_usuario = None
        user_name = "Administrador"
        if auth_header and auth_header.startswith('Bearer '):
            try:
                tok = auth_header.split(' ')[1]
                payload = jwt.decode(tok, Config.JWT_SECRET, algorithms=["HS256"])
                id_usuario = payload.get('id_usuario')
                user_name = payload.get('nombre') or user_name
            except Exception:
                pass
                
        subject = "[Prueba de Envío] Verificación de Notificaciones Outlook - ITST"
        html_content = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #10b981; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #022c22 0%, #064e3b 100%); color: #ffffff; padding: 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px;">Instituto Tecnológico Superior de Teziutlán</h2>
                <p style="margin: 4px 0 0; color: #a7f3d0; font-size: 13px;">Sistema de Automatización para Documentos de Servicio Social</p>
            </div>
            <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
                <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 6px; margin-bottom: 18px;">
                    <strong style="color: #065f46; font-size: 15px;">¡Mensaje de Prueba Exitoso!</strong>
                    <p style="margin: 4px 0 0; color: #047857; font-size: 13px;">La conexión de salida hacia Outlook está funcionando correctamente.</p>
                </div>
                <p>Este correo certifica que el sistema puede despachar documentos y notificaciones hacia el buzón oficial de recepción: <strong>{destino}</strong>.</p>
                <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center;">
                    Enviado por {user_name} desde el Panel de Administración.
                </p>
            </div>
        </div>
        """
        
        envio_status, error_envio = send_graph_email_with_attachment(
            to_email=destino,
            to_name="Buzón de Servicio Social",
            subject=subject,
            html_content=html_content,
            id_usuario=id_usuario
        )
        
        if envio_status == "ENVIADO":
            return jsonify({
                "success": True,
                "message": f"¡Correo de prueba enviado con éxito a {destino}! Revisa tu bandeja de entrada en Outlook."
            }), 200
        else:
            return jsonify({
                "success": False,
                "status": envio_status,
                "error": error_envio or "No se pudo entregar el correo a Outlook.",
                "destino": destino
            }), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@recepcion_bp.route('/entregas-recibidas', methods=['GET'])
def listar_entregas_recibidas():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    
    try:
        query = """
            SELECT 
                ee.id_entrega,
                ee.no_control,
                ee.id_proyecto,
                ee.id_documento,
                a.nombre as nombre_alumno,
                a.carrera,
                cd.clave_formato,
                COALESCE(cd.nombre, cd.nombre_documento) as nombre_documento,
                cd.etapa,
                ee.estado,
                ee.ruta_archivo,
                ee.fecha_subida,
                ee.observaciones
            FROM expediente_entregas ee
            JOIN alumnos a ON ee.no_control = a.no_control
            JOIN catalogo_documentos cd ON ee.id_documento = cd.id_documento
            WHERE ee.ruta_archivo IS NOT NULL AND ee.ruta_archivo != ''
            ORDER BY ee.fecha_subida DESC
            LIMIT 100
        """
        cursor.execute(query)
        entregas = cursor.fetchall()
        
        for e in entregas:
            if hasattr(e.get('fecha_subida'), 'strftime'):
                e['fecha_subida'] = e['fecha_subida'].strftime('%Y-%m-%d %H:%M:%S')
                
        return jsonify(entregas), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@recepcion_bp.route('/entregas-recibidas/descargar/<int:id_entrega>', methods=['GET'])
def descargar_entrega(id_entrega):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT ruta_archivo, no_control FROM expediente_entregas WHERE id_entrega = %s", (id_entrega,))
        entrega = cursor.fetchone()
        
        if not entrega or not entrega.get('ruta_archivo'):
            return jsonify({"error": "Archivo de entrega no encontrado"}), 404
            
        filename = entrega['ruta_archivo']
        full_path = os.path.join(GENERADOS_DIR, filename)
        if not os.path.exists(full_path):
            full_path = filename # Por si se guardó como ruta absoluta
            
        if not os.path.exists(full_path):
            return jsonify({"error": "El archivo físico no se encuentra en el servidor"}), 404
            
        return send_file(full_path, as_attachment=True, download_name=os.path.basename(full_path))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
