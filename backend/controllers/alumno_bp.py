from flask import Blueprint, jsonify

alumno_bp = Blueprint('alumno_bp', __name__)

@alumno_bp.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "ok"}), 200
