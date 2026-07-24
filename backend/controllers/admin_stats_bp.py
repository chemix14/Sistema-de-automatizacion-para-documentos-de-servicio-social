from flask import Blueprint, jsonify
from database import Database

admin_stats_bp = Blueprint('admin_stats_bp', __name__)

def get_db():
    db = Database()
    return db.get_connection()

@admin_stats_bp.route('/stats', methods=['GET'])
def stats():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) as count FROM alumnos")
        alumnos_activos = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM proyectos_servicio WHERE estatus='ACTIVO'")
        proyectos_activos = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM expediente_entregas WHERE estado='EN_REVISION'")
        documentos_pendientes = cursor.fetchone()['count']
        
        return jsonify({
            "alumnos_activos": alumnos_activos,
            "proyectos_activos": proyectos_activos,
            "documentos_pendientes": documentos_pendientes
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
