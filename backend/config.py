import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
basedir = os.path.abspath(os.path.dirname(__file__))

# EL SECRETO ESTÁ EN EL override=True
load_dotenv(os.path.join(basedir, '.env'), override=True)
class Config:
    # Configuración de Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key')
    JWT_SECRET = os.getenv('JWT_SECRET', 'default_jwt_secret')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

    # Credenciales de Azure / MSAL
    MS_CLIENT_ID = os.getenv('MS_CLIENT_ID')
    MS_CLIENT_SECRET = os.getenv('MS_CLIENT_SECRET')
    TENANT_ID = os.getenv('TENANT_ID', 'common')
    AUTHORITY = os.getenv('AUTHORITY', f'https://login.microsoftonline.com/{TENANT_ID}')
    REDIRECT_URI = 'http://localhost:5000/api/auth/callback'
    SCOPE = ["User.Read"]

    # Credenciales de Base de Datos
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'servicio_social_v2')

    # Roles
    ADMIN_EMAILS = os.getenv('ADMIN_EMAILS', '').split(',')
