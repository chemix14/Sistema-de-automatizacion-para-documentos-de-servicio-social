import os
import time
import base64
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import requests
import msal
from config import Config
from database import Database

def get_valid_user_ms_token(id_usuario, cursor=None, conn=None):
    """
    Recupera el token delegado de Microsoft Graph del usuario desde la BD.
    Si está próximo a expirar y existe refresh_token, lo renueva automáticamente.
    """
    if not id_usuario:
        return None
        
    close_db = False
    if not cursor or not conn:
        db = Database()
        conn = db.get_connection()
        if not conn:
            return None
        cursor = conn.cursor(dictionary=True)
        close_db = True
        
    try:
        cursor.execute("SELECT ms_access_token, ms_refresh_token, ms_token_expires_at FROM usuarios WHERE id_usuario = %s", (id_usuario,))
        row = cursor.fetchone()
        if not row:
            return None
            
        access_token = row.get('ms_access_token')
        refresh_token = row.get('ms_refresh_token')
        expires_at = row.get('ms_token_expires_at') or 0
        
        # Si todavía es válido con al menos 90 segundos de margen
        now_ts = int(time.time())
        if access_token and expires_at > (now_ts + 90):
            return access_token
            
        # Si expiró o está por expirar y tenemos refresh_token, renovarlo
        if refresh_token:
            app = msal.ConfidentialClientApplication(
                Config.MS_CLIENT_ID, 
                authority=Config.AUTHORITY,
                client_credential=Config.MS_CLIENT_SECRET
            )
            token_result = app.acquire_token_by_refresh_token(refresh_token, scopes=Config.SCOPE)
            
            if "access_token" in token_result:
                new_acc = token_result["access_token"]
                new_ref = token_result.get("refresh_token", refresh_token)
                new_exp = now_ts + int(token_result.get("expires_in", 3600))
                
                cursor.execute("""
                    UPDATE usuarios 
                    SET ms_access_token = %s, ms_refresh_token = %s, ms_token_expires_at = %s 
                    WHERE id_usuario = %s
                """, (new_acc, new_ref, new_exp, id_usuario))
                conn.commit()
                return new_acc
                
        return access_token
    except Exception as e:
        print("Error al obtener/refrescar token MSAL:", e)
        return None
    finally:
        if close_db:
            cursor.close()
            conn.close()

def send_via_delegated_graph(ms_token, to_email, to_name, subject, html_content, attachment_filename=None, attachment_bytes=None):
    """
    Envía un correo directamente desde la cuenta de Microsoft del usuario logueado
    mediante el endpoint /v1.0/me/sendMail con permiso delegado Mail.Send.
    """
    try:
        headers = {
            'Authorization': f'Bearer {ms_token}',
            'Content-Type': 'application/json'
        }
        
        message_obj = {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": html_content
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": to_email,
                        "name": to_name or to_email
                    }
                }
            ]
        }
        
        if attachment_filename and attachment_bytes:
            b64_content = base64.b64encode(attachment_bytes).decode('utf-8')
            message_obj["attachments"] = [
                {
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    "name": attachment_filename,
                    "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "contentBytes": b64_content
                }
            ]
            
        payload = {
            "message": message_obj,
            "saveToSentItems": True
        }
        
        response = requests.post("https://graph.microsoft.com/v1.0/me/sendMail", json=payload, headers=headers, timeout=15)
        
        if response.status_code in [200, 201, 202]:
            return "ENVIADO", None
        else:
            return "FALLO", f"Graph API me/sendMail HTTP {response.status_code}: {response.text[:300]}"
            
    except Exception as e:
        return "FALLO", f"Excepción en Graph me/sendMail: {str(e)}"

def get_any_valid_institutional_ms_token():
    """
    Busca si existe algún usuario institucional (administrador o usuario con token activo)
    que tenga un token delegado válido o renovable para despachar correos.
    """
    db = Database()
    conn = db.get_connection()
    if not conn:
        return None
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id_usuario FROM usuarios 
            WHERE ms_access_token IS NOT NULL OR ms_refresh_token IS NOT NULL
            ORDER BY (CASE WHEN tipo = 'ADMIN' THEN 1 ELSE 2 END) ASC, ultimo_acceso DESC
            LIMIT 5
        """)
        candidates = cursor.fetchall()
        for cand in candidates:
            tok = get_valid_user_ms_token(cand['id_usuario'], cursor=cursor, conn=conn)
            if tok:
                return tok
        return None
    except Exception as e:
        print("Error buscando token institucional alterno:", e)
        return None
    finally:
        cursor.close()
        conn.close()

def send_via_smtp(smtp_cfg, to_email, to_name, subject, html_content, attachment_filename=None, attachment_bytes=None):
    """
    Envía el correo utilizando servidor SMTP (Office 365 SMTP u otro servidor institucional).
    """
    try:
        host = smtp_cfg.get('smtp_host') or 'smtp.office365.com'
        port = int(smtp_cfg.get('smtp_port') or 587)
        user = smtp_cfg.get('smtp_user')
        password = smtp_cfg.get('smtp_password')
        use_tls = bool(smtp_cfg.get('smtp_use_tls', True))
        sender = smtp_cfg.get('smtp_remitente') or user
        
        if not user or not password:
            return "NO_CONFIGURADO", "Credenciales SMTP no configuradas"
            
        msg = MIMEMultipart()
        msg['From'] = f"Servicio Social ITST <{sender}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        if attachment_filename and attachment_bytes:
            part = MIMEBase('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            part.set_payload(attachment_bytes)
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="{attachment_filename}"')
            msg.attach(part)
            
        server = smtplib.SMTP(host, port, timeout=15)
        if use_tls:
            server.starttls()
        server.login(user, password)
        server.send_message(msg)
        server.quit()
        
        return "ENVIADO", None
    except Exception as e:
        return "FALLO", f"Excepción SMTP: {str(e)}"

def send_graph_email_with_attachment(to_email, to_name, subject, html_content, attachment_filename=None, attachment_bytes=None, sender_email=None, id_usuario=None, ms_token=None):
    """
    Despachador unificado de correo a Outlook:
    1. Intenta envío mediante Microsoft Graph Delegado (/me/sendMail) con el token del usuario logueado.
    2. Si el token de id_usuario no está disponible, busca si hay otro token institucional válido en BD.
    3. Si falla o no hay sesión de Microsoft, intenta mediante configuración SMTP (Office 365 / institucional).
    4. Si ambos fallan, retorna el diagnóstico detallado para orientar al usuario.
    """
    # 1. Intentar con token delegado del usuario actual
    active_token = ms_token
    if not active_token and id_usuario:
        active_token = get_valid_user_ms_token(id_usuario)
        
    if active_token:
        st, err = send_via_delegated_graph(active_token, to_email, to_name, subject, html_content, attachment_filename, attachment_bytes)
        if st == "ENVIADO":
            return "ENVIADO", None
        print(f"Aviso: Envío Graph Delegado de usuario no completado: {err}. Probando vías alternas...")

    # 1b. Intentar con token institucional de respaldo en base de datos
    inst_token = get_any_valid_institutional_ms_token()
    if inst_token and inst_token != active_token:
        st_inst, err_inst = send_via_delegated_graph(inst_token, to_email, to_name, subject, html_content, attachment_filename, attachment_bytes)
        if st_inst == "ENVIADO":
            return "ENVIADO", None
        print(f"Aviso: Envío Graph Institucional no completado: {err_inst}. Probando SMTP...")
        
    # 2. Intentar vía SMTP si está configurado en configuracion_sistema
    try:
        db = Database()
        conn = db.get_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT smtp_host, smtp_port, smtp_user, smtp_password, smtp_use_tls, smtp_remitente FROM configuracion_sistema WHERE id = 1 LIMIT 1")
            smtp_cfg = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if smtp_cfg and smtp_cfg.get('smtp_user') and smtp_cfg.get('smtp_password'):
                st, err = send_via_smtp(smtp_cfg, to_email, to_name, subject, html_content, attachment_filename, attachment_bytes)
                if st == "ENVIADO":
                    return "ENVIADO", None
                print(f"Aviso: Envío SMTP falló: {err}")
    except Exception as e_smtp:
        print("Error consultando SMTP:", e_smtp)

    # 3. Intentar App Token de Microsoft Graph (si el tenant lo permitiera)
    try:
        if Config.MS_CLIENT_ID and Config.MS_CLIENT_SECRET:
            app = msal.ConfidentialClientApplication(
                Config.MS_CLIENT_ID,
                authority=f"https://login.microsoftonline.com/{Config.TENANT_ID}",
                client_credential=Config.MS_CLIENT_SECRET
            )
            token_res = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
            if "access_token" in token_res:
                s_email = sender_email or (Config.ADMIN_EMAILS[0] if Config.ADMIN_EMAILS and Config.ADMIN_EMAILS[0] else 'servicio.social@teziutlan.tecnm.mx')
                headers = {'Authorization': f'Bearer {token_res["access_token"]}', 'Content-Type': 'application/json'}
                message_obj = {
                    "subject": subject,
                    "body": {"contentType": "HTML", "content": html_content},
                    "toRecipients": [{"emailAddress": {"address": to_email, "name": to_name or to_email}}]
                }
                if attachment_filename and attachment_bytes:
                    b64_content = base64.b64encode(attachment_bytes).decode('utf-8')
                    message_obj["attachments"] = [{
                        "@odata.type": "#microsoft.graph.fileAttachment",
                        "name": attachment_filename,
                        "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "contentBytes": b64_content
                    }]
                r = requests.post(f"https://graph.microsoft.com/v1.0/users/{s_email}/sendMail", json={"message": message_obj, "saveToSentItems": True}, headers=headers, timeout=12)
                if r.status_code in [200, 201, 202]:
                    return "ENVIADO", None
    except Exception as e_app:
        pass

    # Si no se pudo enviar por ninguna vía
    diag_msg = (
        f"No se pudo entregar el correo a Outlook hacia {to_email}. La sesión actual no cuenta con un "
        "token delegado de Microsoft activo con permiso Mail.Send ni se han configurado credenciales SMTP. "
        "Por favor cierra sesión y vuelve a ingresar con tu cuenta institucional de Microsoft para autorizar "
        "el envío por Outlook, o configura las credenciales SMTP en el Buzón de Recepción."
    )
    return "PENDIENTE_AUTORIZACION", diag_msg
