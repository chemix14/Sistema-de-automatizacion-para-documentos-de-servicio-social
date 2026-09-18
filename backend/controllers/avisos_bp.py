import os
import jwt
from datetime import datetime
from flask import Blueprint, jsonify, request
from config import Config
from database import Database
from controllers.email_service import send_graph_email_with_attachment

avisos_bp = Blueprint('avisos_bp', __name__)

def get_db():
    db = Database()
    return db.get_connection()

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
        return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None

def send_notification_email(to_email, to_name, subject, html_content, id_usuario=None):
    """
    Despacha el correo institucional usando el servicio unificado (Microsoft Graph Delegado / SMTP).
    """
    return send_graph_email_with_attachment(
        to_email=to_email,
        to_name=to_name,
        subject=subject,
        html_content=html_content,
        id_usuario=id_usuario
    )

def build_adeudo_email_html(nombre, no_control, carrera, documentos_adeudos):
    """
    Construye la plantilla de correo institucional para notificación de adeudos y rechazos.
    """
    docs_html = ""
    for doc in documentos_adeudos:
        es_rechazo = (doc.get('estado') == 'RECHAZADO')
        bg_color = "#fef2f2" if es_rechazo else "#fffbeb"
        border_color = "#f87171" if es_rechazo else "#fcd34d"
        text_color = "#991b1b" if es_rechazo else "#92400e"
        tag_label = "❌ REQUIERE CORRECCIÓN (RECHAZADO)" if es_rechazo else "📌 PENDIENTE DE ENTREGA"
        
        docs_html += f"""
        <div style="background-color: {bg_color}; border-left: 4px solid {border_color}; padding: 12px 16px; margin-bottom: 10px; border-radius: 6px;">
            <div style="font-weight: 700; color: #1e293b; font-size: 14px;">{doc.get('nombre', 'Documento')}</div>
            <div style="font-size: 12px; color: {text_color}; font-weight: 600; margin-top: 4px;">
                {tag_label} {f"— Motivo: {doc.get('motivo')}" if doc.get('motivo') else ""}
            </div>
        </div>
        """
        
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            
            <!-- Encabezado Institucional -->
            <div style="background: linear-gradient(135deg, #1b396a 0%, #2563eb 100%); color: #ffffff; padding: 24px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">TecNM Campus Teziutlán</div>
                <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 800;">AVISO DE SEGUIMIENTO A EXPEDIENTE</h1>
                <div style="font-size: 13px; margin-top: 4px; opacity: 0.85;">Departamento de Residencias Profesionales y Servicio Social</div>
            </div>

            <!-- Cuerpo del Correo -->
            <div style="padding: 24px;">
                <p style="font-size: 15px; color: #334155; margin-top: 0;">
                    Estimado(a) <strong>{nombre}</strong> (No. Control: <strong>{no_control}</strong>),
                </p>
                
                <p style="font-size: 14px; color: #475569; line-height: 1.5;">
                    Se ha realizado una revisión oficial a tu expediente de <strong>Servicio Social</strong> correspondiente a la carrera de <strong>{carrera}</strong>. El sistema ha detectado que presentas los siguientes formatos con observaciones o pendientes de entrega:
                </p>

                <!-- Lista de Formatos -->
                <div style="margin: 20px 0;">
                    {docs_html}
                </div>

                <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                    Te solicitamos ingresar a la brevedad a la plataforma para completar, corregir o cargar la documentación requerida y evitar retrasos en tu liberación de servicio social.
                </p>

                <!-- Botón de Acción -->
                <div style="text-align: center; margin: 28px 0;">
                    <a href="http://localhost:5173/student/formatos" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(37,99,235,0.3);">
                        Acceder a Mis Formatos
                    </a>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

                <div style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.4;">
                    Este es un aviso automático generado por el Sistema de Automatización de Documentos de Servicio Social.<br/>
                    Tecnológico Nacional de México / ITST Teziutlán.
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def build_general_email_html(titulo, contenido, autor):
    """
    Construye la plantilla de correo para Avisos Generales institucionales a todos los alumnos.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            
            <!-- Encabezado Institucional -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: #ffffff; padding: 24px; text-align: center;">
                <div style="font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; opacity: 0.85;">TecNM Campus Teziutlán</div>
                <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 800; color: #38bdf8;">AVISO INSTITUCIONAL</h1>
                <div style="font-size: 13px; margin-top: 4px; opacity: 0.85;">{autor}</div>
            </div>

            <!-- Cuerpo del Correo -->
            <div style="padding: 28px;">
                <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                    {titulo}
                </h2>

                <div style="font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-line; margin: 16px 0;">
                    {contenido}
                </div>

                <!-- Botón de Acción -->
                <div style="text-align: center; margin: 28px 0;">
                    <a href="http://localhost:5173" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
                        Ir a la Plataforma de Servicio Social
                    </a>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

                <div style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.4;">
                    Departamento de Residencias Profesionales y Servicio Social<br/>
                    Instituto Tecnológico Superior de Teziutlán.
                </div>
            </div>
        </div>
    </body>
    </html>
    """

# ----------------------------------------------------
# 1. NOTIFICACIÓN AUTOMÁTICA MASIVA DE ADEUDOS / RECHAZOS
# ----------------------------------------------------
@avisos_bp.route('/notificar-adeudos', methods=['POST'])
def notificar_adeudos():
    user = get_current_user_from_token()
    id_usuario = user.get('id_usuario') if user else None
    
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Consultar todos los alumnos con sus correos
        cursor.execute("""
            SELECT a.no_control, a.nombre, a.correo_institucional, a.correo_personal,
                   COALESCE(c.nombre, a.carrera) AS carrera,
                   p.id_proyecto
            FROM alumnos a
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control AND p.estatus != 'CANCELADO'
            ORDER BY a.no_control ASC
        """)
        alumnos_rows = cursor.fetchall()
        
        # Documentos activos del catálogo
        cursor.execute("SELECT id_documento, clave_formato, nombre_documento FROM catalogo_documentos WHERE activo = 1")
        catalogo_docs = cursor.fetchall()
        
        # Entregas registradas
        cursor.execute("SELECT no_control, id_proyecto, id_documento, estado, observaciones FROM expediente_entregas")
        entregas_rows = cursor.fetchall()
        
        entregas_by_ctrl = {}
        entregas_by_proy = {}
        for e in entregas_rows:
            info = {
                'estado': (e['estado'] or 'BLOQUEADO').upper(),
                'observaciones': e.get('observaciones') or ''
            }
            if e.get('no_control'):
                if e['no_control'] not in entregas_by_ctrl:
                    entregas_by_ctrl[e['no_control']] = {}
                entregas_by_ctrl[e['no_control']][e['id_documento']] = info
            if e.get('id_proyecto'):
                if e['id_proyecto'] not in entregas_by_proy:
                    entregas_by_proy[e['id_proyecto']] = {}
                entregas_by_proy[e['id_proyecto']][e['id_documento']] = info
            
        destinatarios_notificados = []
        
        for al in alumnos_rows:
            nc = al['no_control']
            pid = al.get('id_proyecto')
            p_entregas = {}
            if nc in entregas_by_ctrl:
                p_entregas.update(entregas_by_ctrl[nc])
            elif pid and pid in entregas_by_proy:
                p_entregas.update(entregas_by_proy[pid])
            
            documentos_con_adeudo = []
            for doc in catalogo_docs:
                doc_id = doc['id_documento']
                entrega_info = p_entregas.get(doc_id, {'estado': 'BLOQUEADO', 'observaciones': ''})
                estado = entrega_info['estado']
                
                # Si el documento está PENDIENTE o RECHAZADO
                if estado in ['PENDIENTE', 'RECHAZADO', 'RECHAZADA']:
                    documentos_con_adeudo.append({
                        'id_documento': doc_id,
                        'clave': doc['clave_formato'],
                        'nombre': doc['nombre_documento'],
                        'estado': 'RECHAZADO' if estado in ['RECHAZADO', 'RECHAZADA'] else 'PENDIENTE',
                        'motivo': entrega_info.get('observaciones', '')
                    })
                    
            # Si el estudiante tiene mínimo un documento en pendiente o rechazado
            if documentos_con_adeudo:
                dest_email = al.get('correo_institucional') or al.get('correo_personal') or f"l{al['no_control'].lower()}@teziutlan.tecnm.mx"
                asunto = f"Aviso de Seguimiento: Formatos Pendientes de Servicio Social ({al['no_control']})"
                
                html_body = build_adeudo_email_html(
                    nombre=al['nombre'] or al['no_control'],
                    no_control=al['no_control'],
                    carrera=al['carrera'] or 'ITST',
                    documentos_adeudos=documentos_con_adeudo
                )
                
                # Enviar mediante servicio unificado de correo (Graph delegado / SMTP)
                estado_envio, error_msg = send_notification_email(
                    to_email=dest_email,
                    to_name=al['nombre'] or al['no_control'],
                    subject=asunto,
                    html_content=html_body,
                    id_usuario=id_usuario
                )
                
                # Registrar en historial
                cursor.execute("""
                    INSERT INTO historial_notificaciones_correo (
                        destinatario, nombre_destinatario, no_control, asunto, cuerpo_html, tipo_aviso, estado_envio, error_detalle
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    dest_email, al['nombre'], al['no_control'], asunto, html_body, 'ADEUDO_FORMATOS', estado_envio, error_msg
                ))
                
                destinatarios_notificados.append({
                    'no_control': al['no_control'],
                    'nombre': al['nombre'],
                    'correo': dest_email,
                    'total_pendientes': len(documentos_con_adeudo),
                    'documentos': [d['clave'] for d in documentos_con_adeudo],
                    'estado_envio': estado_envio
                })
                
        conn.commit()
        total_exitosos = sum(1 for d in destinatarios_notificados if d['estado_envio'] == 'ENVIADO')
        return jsonify({
            "message": f"Se procesó el envío masivo de avisos a {len(destinatarios_notificados)} alumnos con formatos pendientes o rechazados. ({total_exitosos} entregados exitosamente a Outlook).",
            "total_notificados": len(destinatarios_notificados),
            "total_exitosos": total_exitosos,
            "destinatarios": destinatarios_notificados
        }), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ----------------------------------------------------
# 2. PUBLICACIÓN DE AVISO GENERAL (A TODOS LOS ALUMNOS)
# ----------------------------------------------------
@avisos_bp.route('/avisos-generales', methods=['GET', 'POST'])
def avisos_generales():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        try:
            cursor.execute("SELECT * FROM avisos_generales ORDER BY fecha_publicacion DESC")
            avisos = cursor.fetchall()
            for av in avisos:
                if hasattr(av.get('fecha_publicacion'), 'strftime'):
                    av['fecha_publicacion'] = av['fecha_publicacion'].strftime('%Y-%m-%d %H:%M')
            return jsonify(avisos), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'POST':
        data = request.json or {}
        titulo = data.get('titulo', '').strip()
        contenido = data.get('contenido', '').strip()
        autor = data.get('autor', 'Coordinación de Residencias y Servicio Social')
        enviar_correo = data.get('enviar_correo', True)
        
        if not titulo or not contenido:
            return jsonify({"error": "Título y contenido son obligatorios"}), 400
            
        try:
            # 1. Guardar aviso en base de datos
            cursor.execute("""
                INSERT INTO avisos_generales (titulo, contenido, autor, tipo, activo)
                VALUES (%s, %s, %s, 'GENERAL', 1)
            """, (titulo, contenido, autor))
            id_aviso = cursor.lastrowid
            
            total_enviados = 0
            
            # 2. Si se solicita enviar correo masivo a TODOS los alumnos registrados
            if enviar_correo:
                user = get_current_user_from_token()
                id_usuario = user.get('id_usuario') if user else None
                
                cursor.execute("""
                    SELECT a.no_control, a.nombre, a.correo_institucional, a.correo_personal
                    FROM alumnos a
                    WHERE a.estatus != 'Cancelado'
                """)
                todos_alumnos = cursor.fetchall()
                
                asunto = f"Aviso General: {titulo} - Servicio Social ITST"
                html_body = build_general_email_html(titulo, contenido, autor)
                
                for al in todos_alumnos:
                    dest_email = al.get('correo_institucional') or al.get('correo_personal') or f"l{al['no_control'].lower()}@teziutlan.tecnm.mx"
                    
                    estado_envio, error_msg = send_notification_email(
                        to_email=dest_email,
                        to_name=al['nombre'] or al['no_control'],
                        subject=asunto,
                        html_content=html_body,
                        id_usuario=id_usuario
                    )
                    
                    cursor.execute("""
                        INSERT INTO historial_notificaciones_correo (
                            destinatario, nombre_destinatario, no_control, asunto, cuerpo_html, tipo_aviso, estado_envio, error_detalle
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        dest_email, al['nombre'], al['no_control'], asunto, html_body, 'AVISO_GENERAL', estado_envio, error_msg
                    ))
                    total_enviados += 1
                    
            conn.commit()
            return jsonify({
                "message": f"Aviso publicado exitosamente y enviado a {total_enviados} alumnos por correo institucional.",
                "id_aviso": id_aviso,
                "total_enviados": total_enviados
            }), 201
            
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@avisos_bp.route('/avisos-generales/<int:id_aviso>', methods=['DELETE'])
def delete_aviso_general(id_aviso):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("DELETE FROM avisos_generales WHERE id_aviso = %s", (id_aviso,))
        conn.commit()
        return jsonify({"message": "Aviso eliminado correctamente"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@avisos_bp.route('/avisos-generales/todos', methods=['DELETE'])
def delete_todos_avisos():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM avisos_generales")
        conn.commit()
        total_borrados = cursor.rowcount
        return jsonify({
            "message": f"Se eliminaron todos los avisos generales ({total_borrados} comunicados eliminados).",
            "total_eliminados": total_borrados
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ----------------------------------------------------
# 3. HISTORIAL DE CORREOS Y NOTIFICACIONES ENVIADAS
# ----------------------------------------------------
@avisos_bp.route('/historial-notificaciones', methods=['GET'])
def get_historial():
    conn = get_db()
    if not conn:
        return jsonify([]), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM historial_notificaciones_correo ORDER BY fecha_envio DESC LIMIT 100")
        historial = cursor.fetchall()
        for h in historial:
            if hasattr(h.get('fecha_envio'), 'strftime'):
                h['fecha_envio'] = h['fecha_envio'].strftime('%Y-%m-%d %H:%M:%S')
        return jsonify(historial), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@avisos_bp.route('/historial-notificaciones/<int:id_notificacion>', methods=['DELETE'])
def delete_notificacion_individual(id_notificacion):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM historial_notificaciones_correo WHERE id_notificacion = %s", (id_notificacion,))
        conn.commit()
        return jsonify({"message": "Registro de notificación eliminado exitosamente"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@avisos_bp.route('/historial-notificaciones/todos', methods=['DELETE'])
def delete_todo_historial():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM historial_notificaciones_correo")
        conn.commit()
        total_borrados = cursor.rowcount
        return jsonify({
            "message": f"Se vació el historial de notificaciones ({total_borrados} registros eliminados).",
            "total_eliminados": total_borrados
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ----------------------------------------------------
# 4. ENDPOINT PARA EL PORTAL DE ESTUDIANTES
# ----------------------------------------------------
@avisos_bp.route('/estudiante/avisos', methods=['GET'])
def get_estudiante_avisos():
    conn = get_db()
    if not conn:
        return jsonify([]), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM avisos_generales WHERE activo = 1 ORDER BY fecha_publicacion DESC LIMIT 10")
        avisos = cursor.fetchall()
        for av in avisos:
            if hasattr(av.get('fecha_publicacion'), 'strftime'):
                av['fecha_publicacion'] = av['fecha_publicacion'].strftime('%d/%m/%Y %H:%M')
        return jsonify(avisos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
