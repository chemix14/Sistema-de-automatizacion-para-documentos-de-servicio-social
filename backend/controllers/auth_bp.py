import jwt
import os
import time
import msal
from flask import Blueprint, redirect, current_app, request, session, url_for, jsonify
from database import Database
from config import Config

auth_bp = Blueprint('auth_bp', __name__)

# Almacén de flujos de autenticación en memoria para evitar fallos de cookies/state-mismatch entre localhost e IPs de LAN
AUTH_FLOWS = {}

def _build_msal_app(cache=None):
    return msal.ConfidentialClientApplication(
        Config.MS_CLIENT_ID, authority=Config.AUTHORITY,
        client_credential=Config.MS_CLIENT_SECRET, token_cache=cache)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    # Detectar el host del request (ej. "192.168.1.3:5000" o "localhost:5000")
    req_host = request.host
    host_only = req_host.split(':')[0]
    
    # Determinar URL del frontend para la redirección post-login
    explicit_origin = request.args.get('origin')
    referer = request.headers.get('Referer')
    if explicit_origin:
        frontend_origin = explicit_origin.rstrip('/')
    elif referer:
        import urllib.parse
        p = urllib.parse.urlparse(referer)
        frontend_origin = f"{p.scheme}://{p.netloc}"
    else:
        frontend_origin = f"http://{host_only}:5173"
        
    session["frontend_origin"] = frontend_origin

    # Microsoft Azure prohíbe estrictamente URLs con 'http://' en direcciones IP numéricas.
    # La única excepción permitida por Azure en HTTP es 'http://localhost'.
    # Por lo tanto, redirect_uri debe ser siempre http://localhost:5000/api/auth/callback.
    # Gracias a AUTH_FLOWS y frontend_origin, al finalizar la autenticación el usuario es
    # retornado automáticamente a http://192.168.1.3:5173.
    redirect_uri = Config.REDIRECT_URI

    flow = _build_msal_app().initiate_auth_code_flow(
        Config.SCOPE, redirect_uri=redirect_uri)
        
    flow["frontend_origin"] = frontend_origin
    flow["redirect_uri"] = redirect_uri
    
    session["flow"] = flow
    state = flow.get("state")
    if state:
        AUTH_FLOWS[state] = flow

    return redirect(flow["auth_uri"])

@auth_bp.route('/callback')
def callback():
    try:
        req_state = request.args.get("state")
        flow = session.get("flow")
        
        # Si la cookie de sesión no coincide (o se navegó entre localhost e IP de red local),
        # recuperar el flow original del almacén en memoria usando el state
        if not flow or flow.get("state") != req_state:
            if req_state and req_state in AUTH_FLOWS:
                flow = AUTH_FLOWS.pop(req_state)
                session["flow"] = flow
                
        if not flow:
            frontend_url = session.get("frontend_origin") or Config.FRONTEND_URL
            return redirect(f"{frontend_url}/login/error?reason=NO_ACTIVE_AUTH_FLOW")

        frontend_url = flow.get("frontend_origin") or session.get("frontend_origin") or Config.FRONTEND_URL
        cache = _build_msal_app()
        result = cache.acquire_token_by_auth_code_flow(
            flow, request.args)
        
        if "error" in result:
            return redirect(f"{frontend_url}/login/error?reason={result.get('error_description', 'error')}")
            
        claims = result.get("id_token_claims", {})
        correo_raw = claims.get("preferred_username") or claims.get("email") or claims.get("upn")
        nombres = claims.get("name", "Usuario")
        
        if not correo_raw:
             return redirect(f"{frontend_url}/login/error?reason=NO_EMAIL_IN_TOKEN")
        
        correo = str(correo_raw).strip().lower()
        
        db = Database()
        conn = db.get_connection()
        if not conn:
            return redirect(f"{frontend_url}/login/error?reason=DB_ERROR")
            
        cursor = conn.cursor(dictionary=True)
        
        # 1. VERIFICACIÓN: ¿Existe en la tabla administradores Y tiene estatus activo?
        cursor.execute("SELECT * FROM administradores WHERE LOWER(TRIM(correo)) = LOWER(TRIM(%s))", (correo,))
        admin_record = cursor.fetchone()
        
        # Un usuario es ADMIN únicamente si está en administradores con activo = 1
        is_active_admin = (admin_record is not None and admin_record.get('activo') == 1)
        
        alumno_record = None
        
        if is_active_admin:
            tipo = 'ADMIN'
            rol = admin_record.get('rol') or 'SuperAdmin'
            display_name = admin_record.get('nombre') or nombres
            
            # Actualizar último acceso del administrador
            cursor.execute("""
                UPDATE administradores 
                SET ultimo_acceso = CURRENT_TIMESTAMP 
                WHERE id = %s
            """, (admin_record['id'],))
            conn.commit()
        else:
            # 2. VERIFICACIÓN DE ALUMNOS: Buscar en la tabla alumnos
            cursor.execute("""
                SELECT * FROM alumnos 
                WHERE LOWER(TRIM(correo_institucional)) = LOWER(TRIM(%s)) 
                   OR LOWER(TRIM(correo_personal)) = LOWER(TRIM(%s))
            """, (correo, correo))
            alumno_record = cursor.fetchone()
            
            # Si no se encuentra por correo exacto, extraer número de control del usuario
            # Ejemplo: l23te0037@teziutlan.tecnm.mx -> 23TE0037
            if not alumno_record and '@' in correo:
                user_prefix = correo.split('@')[0].strip().upper()
                candidato_nc = user_prefix[1:] if user_prefix.startswith('L') else user_prefix
                cursor.execute("""
                    SELECT * FROM alumnos 
                    WHERE UPPER(TRIM(no_control)) = %s 
                       OR UPPER(TRIM(no_control)) LIKE %s
                """, (candidato_nc, f"{candidato_nc}%"))
                alumno_record = cursor.fetchone()
            
            # Si no es admin y tampoco está en alumnos pero tiene cuenta admin inactiva
            if not alumno_record and admin_record and admin_record.get('activo') == 0:
                return redirect(f"{Config.FRONTEND_URL}/login/error?reason=CUENTA_ADMINISTRADOR_INACTIVA")

            tipo = 'ALUMNO'
            rol = 'ALUMNO'
            display_name = alumno_record['nombre'] if (alumno_record and alumno_record.get('nombre')) else nombres

        ms_access_token = result.get("access_token")
        ms_refresh_token = result.get("refresh_token")
        expires_in = result.get("expires_in", 3600)
        expires_at = int(time.time()) + int(expires_in)

        # 3. Sincronizar tabla usuarios (sin tocar 'nombre_completo' que es VIRTUAL GENERATED)
        cursor.execute("SELECT * FROM usuarios WHERE LOWER(TRIM(correo)) = LOWER(TRIM(%s))", (correo,))
        user = cursor.fetchone()
        
        if not user:
            cursor.execute("""
                INSERT INTO usuarios (correo, nombres, apellido_paterno, apellido_materno, tipo, activo, ms_access_token, ms_refresh_token, ms_token_expires_at)
                VALUES (%s, %s, '', '', %s, 1, %s, %s, %s)
            """, (correo, display_name, tipo, ms_access_token, ms_refresh_token, expires_at))
            conn.commit()
            cursor.execute("SELECT * FROM usuarios WHERE LOWER(TRIM(correo)) = LOWER(TRIM(%s))", (correo,))
            user = cursor.fetchone()
        else:
            cursor.execute("""
                UPDATE usuarios 
                SET tipo = %s, activo = 1, nombres = %s,
                    ms_access_token = COALESCE(%s, ms_access_token),
                    ms_refresh_token = COALESCE(%s, ms_refresh_token),
                    ms_token_expires_at = COALESCE(%s, ms_token_expires_at)
                WHERE id_usuario = %s
            """, (tipo, display_name, ms_access_token, ms_refresh_token, expires_at, user['id_usuario']))
            conn.commit()
            user['tipo'] = tipo

        # Si es alumno, asegurar vinculación en tabla alumnos
        if alumno_record and user:
            cursor.execute("UPDATE alumnos SET id_usuario = %s WHERE no_control = %s", (user['id_usuario'], alumno_record['no_control']))
            conn.commit()

        cursor.close()
        conn.close()
        
        secret = Config.JWT_SECRET
        payload = {
            "id_usuario": user['id_usuario'],
            "correo": user['correo'],
            "nombre": display_name,
            "tipo": tipo,       # 'ADMIN' o 'ALUMNO'
            "rol": rol,         # 'SuperAdmin', 'Administrador', 'Revisor' o 'ALUMNO'
            "no_control": alumno_record['no_control'] if alumno_record else None,
            "carrera": alumno_record['carrera'] if alumno_record else None,
            "has_ms_token": bool(ms_access_token)
        }
        token = jwt.encode(payload, secret, algorithm="HS256")
        
        return redirect(f"{frontend_url}/login/success?token={token}")
        
    except Exception as e:
        frontend_url = session.get("frontend_origin") or Config.FRONTEND_URL
        return redirect(f"{frontend_url}/login/error?reason={str(e)}")

@auth_bp.route('/logout')
def logout():
    session.clear()
    frontend_url = session.get("frontend_origin") or Config.FRONTEND_URL
    logout_url = f"{Config.AUTHORITY}/oauth2/v2.0/logout?post_logout_redirect_uri={frontend_url}/login"
    return redirect(logout_url)

@auth_bp.route('/test-login', methods=['POST'])
def test_login():
    """
    Permite iniciar sesión rápidamente en pruebas de red local (LAN)
    seleccionando una cuenta registrada (Administrador o Alumno).
    """
    data = request.json or {}
    correo = (data.get('email') or '').strip().lower()
    if not correo:
        return jsonify({"error": "Correo requerido"}), 400
        
    db = Database()
    conn = db.get_connection()
    if not conn:
        return jsonify({"error": "Error de base de datos"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        # Verificar si es admin
        cursor.execute("SELECT * FROM administradores WHERE LOWER(TRIM(correo)) = %s AND activo = 1", (correo,))
        admin = cursor.fetchone()
        
        cursor.execute("SELECT * FROM usuarios WHERE LOWER(TRIM(correo)) = %s", (correo,))
        user = cursor.fetchone()
        
        cursor.execute("""
            SELECT * FROM alumnos 
            WHERE LOWER(TRIM(correo_institucional)) = %s 
               OR LOWER(TRIM(correo_personal)) = %s
        """, (correo, correo))
        alumno = cursor.fetchone()
        
        if not user and not admin and not alumno:
            return jsonify({"error": "Cuenta no encontrada para pruebas"}), 404
            
        as_role = (data.get('as_role') or '').upper()
        if as_role == 'ALUMNO' and alumno:
            tipo = 'ALUMNO'
            rol = 'ALUMNO'
        else:
            tipo = 'ADMIN' if admin else 'ALUMNO'
            rol = admin['rol'] if admin else 'ALUMNO'
        nombre = (admin.get('nombre') if admin else None) or (alumno.get('nombre') if alumno else None) or (user.get('nombre_completo') if user else 'Usuario')
        user_id = user['id_usuario'] if user else (admin['id'] if admin else None)
        has_ms_token = bool(user and user.get('ms_access_token'))
        
        payload = {
            "id_usuario": user_id,
            "correo": correo,
            "nombre": nombre,
            "tipo": tipo,
            "rol": rol,
            "no_control": alumno['no_control'] if alumno else None,
            "carrera": alumno['carrera'] if alumno else None,
            "has_ms_token": has_ms_token
        }
        token = jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")
        return jsonify({
            "token": token,
            "user": payload
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
