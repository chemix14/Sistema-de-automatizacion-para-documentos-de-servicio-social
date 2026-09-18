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
    from controllers.reportes_bp import reportes_bp
    from controllers.avisos_bp import avisos_bp
    from controllers.recepcion_bp import recepcion_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(admin_stats_bp, url_prefix='/api/admin')
    app.register_blueprint(recepcion_bp, url_prefix='/api/admin')
    app.register_blueprint(alumno_bp, url_prefix='/api/alumno')
    app.register_blueprint(forms_bp, url_prefix='/api/forms')
    app.register_blueprint(generador_bp, url_prefix='/api/generador')
    app.register_blueprint(reportes_bp, url_prefix='/api/admin/reportes')
    app.register_blueprint(avisos_bp, url_prefix='/api/admin')

    @app.route('/api/esquema/columnas', methods=['GET'])
    def esquema_columnas():
        from flask import request
        fuente = (request.args.get('fuente') or '').upper()
        
        # Mapeo enriquecido con nombre técnico y etiqueta amigable
        cols_metadata = {
            'ALUMNO': [
                {'campo': 'no_control', 'label': 'Número de Control', 'tipo': 'texto'},
                {'campo': 'nombre', 'label': 'Nombre Completo del Alumno', 'tipo': 'texto'},
                {'campo': 'carrera', 'label': 'Carrera / Licenciatura', 'tipo': 'texto'},
                {'campo': 'semestre', 'label': 'Semestre Actual', 'tipo': 'texto'},
                {'campo': 'modalidad', 'label': 'Modalidad (Escolarizada / Sabatina)', 'tipo': 'texto'},
                {'campo': 'sexo', 'label': 'Sexo (M / F)', 'tipo': 'texto'},
                {'campo': 'telefono', 'label': 'Teléfono de Contacto', 'tipo': 'texto'},
                {'campo': 'correo_institucional', 'label': 'Correo Institucional', 'tipo': 'email'},
                {'campo': 'correo_personal', 'label': 'Correo Personal', 'tipo': 'email'},
                {'campo': 'calle', 'label': 'Calle de Domicilio', 'tipo': 'texto'},
                {'campo': 'colonia', 'label': 'Colonia de Domicilio', 'tipo': 'texto'},
                {'campo': 'ciudad', 'label': 'Ciudad / Población', 'tipo': 'texto'},
                {'campo': 'estado', 'label': 'Estado', 'tipo': 'texto'},
                {'campo': 'domicilio', 'label': 'Domicilio Completo', 'tipo': 'texto'},
                {'campo': 'periodos_cursados', 'label': 'Periodos Cursados', 'tipo': 'numero'},
                {'campo': 'creditos_aprobados', 'label': 'Créditos Aprobados', 'tipo': 'numero'},
                {'campo': 'estatus', 'label': 'Estatus del Alumno', 'tipo': 'texto'}
            ],
            'PROYECTO': [
                {'campo': 'nombre_proyecto', 'label': 'Nombre Oficial del Proyecto', 'tipo': 'texto'},
                {'campo': 'objetivo', 'label': 'Objetivo General del Proyecto', 'tipo': 'texto'},
                {'campo': 'modalidad', 'label': 'Modalidad del Servicio', 'tipo': 'texto'},
                {'campo': 'programa_institucional', 'label': 'Programa Institucional', 'tipo': 'texto'},
                {'campo': 'tipo_programa', 'label': 'Tipo de Programa', 'tipo': 'texto'},
                {'campo': 'actividad_1', 'label': 'Actividad 1 (Programa de Actividades)', 'tipo': 'texto'},
                {'campo': 'actividad_2', 'label': 'Actividad 2 (Programa de Actividades)', 'tipo': 'texto'},
                {'campo': 'actividad_3', 'label': 'Actividad 3 (Programa de Actividades)', 'tipo': 'texto'},
                {'campo': 'responsable_nombre', 'label': 'Nombre del Responsable del Proyecto', 'tipo': 'texto'},
                {'campo': 'responsable_cargo', 'label': 'Cargo del Responsable', 'tipo': 'texto'},
                {'campo': 'supervisor_nombre', 'label': 'Nombre del Supervisor / Asesor', 'tipo': 'texto'},
                {'campo': 'supervisor_cargo', 'label': 'Cargo del Supervisor', 'tipo': 'texto'},
                {'campo': 'fecha_inicio', 'label': 'Fecha de Inicio', 'tipo': 'fecha'},
                {'campo': 'fecha_fin', 'label': 'Fecha de Término', 'tipo': 'fecha'},
                {'campo': 'estatus', 'label': 'Estatus del Proyecto', 'tipo': 'texto'}
            ],
            'ACTIVIDADES': [
                {'campo': 'actividad_1', 'label': 'Actividad 1 del Programa de Actividades', 'tipo': 'texto'},
                {'campo': 'actividad_2', 'label': 'Actividad 2 del Programa de Actividades', 'tipo': 'texto'},
                {'campo': 'actividad_3', 'label': 'Actividad 3 del Programa de Actividades', 'tipo': 'texto'}
            ],
            'DEPENDENCIA': [
                {'campo': 'nombre', 'label': 'Nombre de la Dependencia / Empresa', 'tipo': 'texto'},
                {'campo': 'titular', 'label': 'Nombre del Titular o Director', 'tipo': 'texto'},
                {'campo': 'cargo_titular', 'label': 'Cargo del Titular', 'tipo': 'texto'},
                {'campo': 'calle', 'label': 'Calle de la Dependencia', 'tipo': 'texto'},
                {'campo': 'num_ext_int', 'label': 'Número Ext / Int', 'tipo': 'texto'},
                {'campo': 'colonia', 'label': 'Colonia', 'tipo': 'texto'},
                {'campo': 'municipio', 'label': 'Municipio', 'tipo': 'texto'},
                {'campo': 'ciudad', 'label': 'Ciudad', 'tipo': 'texto'},
                {'campo': 'estado', 'label': 'Estado', 'tipo': 'texto'},
                {'campo': 'codigo_postal', 'label': 'Código Postal', 'tipo': 'texto'},
                {'campo': 'telefono', 'label': 'Teléfono de Contacto', 'tipo': 'texto'},
                {'campo': 'correo', 'label': 'Correo Oficial de la Dependencia', 'tipo': 'email'}
            ],
            'PERIODO': [
                {'campo': 'clave', 'label': 'Clave del Periodo (ej. ENE-JUN-2026)', 'tipo': 'texto'},
                {'campo': 'nombre_oficial', 'label': 'Nombre Oficial del Periodo', 'tipo': 'texto'},
                {'campo': 'fecha_inicio', 'label': 'Fecha de Inicio del Periodo', 'tipo': 'fecha'},
                {'campo': 'fecha_fin', 'label': 'Fecha de Fin del Periodo', 'tipo': 'fecha'},
                {'campo': 'apertura_expediente', 'label': 'Apertura de Expediente', 'tipo': 'fecha'},
                {'campo': 'cierre_expediente', 'label': 'Cierre de Expediente Inicial', 'tipo': 'fecha'},
                {'campo': 'limite_entrega_bim_1', 'label': 'Límite Entrega Bimestre 1', 'tipo': 'fecha'},
                {'campo': 'limite_entrega_bim_2', 'label': 'Límite Entrega Bimestre 2', 'tipo': 'fecha'},
                {'campo': 'limite_entrega_bim_3', 'label': 'Límite Entrega Bimestre 3', 'tipo': 'fecha'}
            ],
            'SISTEMA': [
                {'campo': 'periodo_oficial', 'label': 'Periodo Oficial Actual', 'tipo': 'texto'},
                {'campo': 'limite_expediente_inicial', 'label': 'Límite Entrega Inicial', 'tipo': 'fecha'},
                {'campo': 'limite_expediente_final', 'label': 'Límite Expediente Final', 'tipo': 'fecha'},
                {'campo': 'correo_recepcion_formatos', 'label': 'Correo de Recepción de Formatos', 'tipo': 'email'}
            ]
        }

        # Soporte para alias de tablas comunes
        alias_map = {
            'ALUMNOS': 'ALUMNO',
            'PROYECTOS': 'PROYECTO',
            'PROYECTOS_SERVICIO': 'PROYECTO',
            'ACTIVIDADES': 'ACTIVIDADES',
            'ACTIVIDAD': 'ACTIVIDADES',
            'ACTIVIDADES_PROYECTO': 'ACTIVIDADES',
            'PROGRAMA_ACTIVIDADES': 'ACTIVIDADES',
            'DEPENDENCIAS': 'DEPENDENCIA',
            'PERIODOS': 'PERIODO',
            'CONFIGURACION': 'SISTEMA',
            'CONFIGURACION_SISTEMA': 'SISTEMA'
        }
        fuente_normalizada = alias_map.get(fuente, fuente)
        
        datos = cols_metadata.get(fuente_normalizada, [])
        return jsonify(datos), 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
