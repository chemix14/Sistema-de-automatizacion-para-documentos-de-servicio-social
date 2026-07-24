from flask import Flask, jsonify
from flask_cors import CORS
import os
import sys

# Adding current directory to path to allow importing modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    app.secret_key = app.config['SECRET_KEY']
    CORS(app)

    # Register Blueprints
    from controllers.auth_bp import auth_bp
    from controllers.admin_bp import admin_bp
    from controllers.alumno_bp import alumno_bp
    from controllers.forms_bp import forms_bp

    from controllers.admin_stats_bp import admin_stats_bp
    from controllers.generador_bp import generador_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(admin_stats_bp, url_prefix='/api/admin')
    app.register_blueprint(alumno_bp, url_prefix='/api/alumno')
    app.register_blueprint(forms_bp, url_prefix='/api/forms')
    app.register_blueprint(generador_bp, url_prefix='/api/generador')

    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            "message": "Bienvenido a la API del Sistema Integral de Servicio Social V2",
            "status": "online",
            "endpoints": {
                "auth": "/api/auth",
                "admin": "/api/admin",
                "alumno": "/api/alumno",
                "forms": "/api/forms"
            }
        }), 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
