import jwt
import os
import msal
from flask import Blueprint, redirect, current_app, request, session, url_for
from database import Database
from config import Config

auth_bp = Blueprint('auth_bp', __name__)

def _build_msal_app(cache=None):
    return msal.ConfidentialClientApplication(
        Config.MS_CLIENT_ID, authority=Config.AUTHORITY,
        client_credential=Config.MS_CLIENT_SECRET, token_cache=cache)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    session["flow"] = _build_msal_app().initiate_auth_code_flow(
        Config.SCOPE, redirect_uri=Config.REDIRECT_URI)
    return redirect(session["flow"]["auth_uri"])

@auth_bp.route('/callback')
def callback():
    try:
        cache = _build_msal_app()
        result = cache.acquire_token_by_auth_code_flow(
            session.get("flow", {}), request.args)
        
        if "error" in result:
            return redirect(f"{Config.FRONTEND_URL}/login/error?reason={result.get('error_description', 'error')}")
            
        claims = result.get("id_token_claims", {})
        correo = claims.get("preferred_username") or claims.get("email") or claims.get("upn")
        nombres = claims.get("name", "Usuario")
        
        if not correo:
             return redirect(f"{Config.FRONTEND_URL}/login/error?reason=NO_EMAIL_IN_TOKEN")
        
        db = Database()
        conn = db.get_connection()
        if not conn:
            return redirect(f"{Config.FRONTEND_URL}/login/error?reason=DB_ERROR")
            
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM usuarios WHERE correo = %s", (correo,))
        user = cursor.fetchone()
        
        if not user:
            # Check if user is in ADMIN_EMAILS list
            is_admin = correo in Config.ADMIN_EMAILS if Config.ADMIN_EMAILS else False
            tipo = 'ADMIN' if is_admin else 'ALUMNO'

            # Auto-register
            cursor.execute("""
                INSERT INTO usuarios (correo, nombres, apellido_paterno, apellido_materno, tipo, activo)
                VALUES (%s, %s, %s, %s, %s, 1)
            """, (correo, nombres, "", "", tipo))
            conn.commit()
            
            cursor.execute("SELECT * FROM usuarios WHERE correo = %s", (correo,))
            user = cursor.fetchone()
            
        cursor.close()
        conn.close()
        
        secret = Config.JWT_SECRET
        payload = {
            "id_usuario": user['id_usuario'],
            "correo": user['correo'],
            "nombre": user['nombre_completo'],
            "tipo": user['tipo']
        }
        token = jwt.encode(payload, secret, algorithm="HS256")
        
        return redirect(f"{Config.FRONTEND_URL}/login/success?token={token}")
        
    except Exception as e:
        return redirect(f"{Config.FRONTEND_URL}/login/error?reason={str(e)}")

@auth_bp.route('/logout')
def logout():
    session.clear()
    logout_url = f"{Config.AUTHORITY}/oauth2/v2.0/logout?post_logout_redirect_uri={Config.FRONTEND_URL}/login"
    return redirect(logout_url)
