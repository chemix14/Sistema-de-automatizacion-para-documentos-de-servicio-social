import os
import re
from datetime import datetime
from flask import Blueprint, request, jsonify
from database import Database

mantenimiento_bp = Blueprint('mantenimiento_bp', __name__)

GENERADOS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'generados')
os.makedirs(GENERADOS_DIR, exist_ok=True)

def get_db():
    db = Database()
    return db.get_connection()

def format_bytes(size):
    """Convierte bytes a formato legible (B, KB, MB, GB)."""
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{round(size / 1024, 2)} KB"
    elif size < 1024 * 1024 * 1024:
        return f"{round(size / (1024 * 1024), 2)} MB"
    else:
        return f"{round(size / (1024 * 1024 * 1024), 2)} GB"

@mantenimiento_bp.route('/resumen', methods=['GET'])
def obtener_resumen_almacenamiento():
    """
    Obtiene el estado actual del directorio de archivos generados,
    calcula estadísticas de ocupación y cruza cada archivo con el estatus
    del alumno en la base de datos (Activo vs Finalizado).
    """
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Obtener catálogo de alumnos y sus proyectos
        cursor.execute("""
            SELECT a.no_control, a.nombre, a.estatus as estatus_alumno,
                   p.id_proyecto, p.nombre_proyecto, p.estatus as estatus_proyecto
            FROM alumnos a
            LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control AND (p.estatus IS NULL OR p.estatus != 'CANCELADO')
        """)
        alumnos_rows = cursor.fetchall()
        alumnos_dict = {}
        for row in alumnos_rows:
            nc = (row.get('no_control') or '').strip().upper()
            if nc:
                alumnos_dict[nc] = row

        # 2. Obtener mapeo de entregas con ruta_archivo
        cursor.execute("""
            SELECT id_entrega, no_control, id_documento, ruta_archivo, estado
            FROM expediente_entregas
            WHERE ruta_archivo IS NOT NULL AND ruta_archivo != ''
        """)
        entregas = cursor.fetchall()
        entregas_by_file = {}
        for ent in entregas:
            rf = (ent.get('ruta_archivo') or '').strip()
            if rf:
                entregas_by_file[rf] = ent

        # 3. Escanear directorio generados/
        archivos_detallados = []
        total_bytes = 0
        finalizados_count = 0
        finalizados_bytes = 0
        activos_count = 0
        activos_bytes = 0

        if os.path.exists(GENERADOS_DIR):
            for fname in os.listdir(GENERADOS_DIR):
                if fname.startswith('.') or fname == '.gitkeep':
                    continue

                full_path = os.path.join(GENERADOS_DIR, fname)
                if not os.path.isfile(full_path):
                    continue

                try:
                    stat = os.stat(full_path)
                    fsize = stat.st_size
                    mtime = datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                except Exception:
                    fsize = 0
                    mtime = None

                total_bytes += fsize

                # Identificar a qué alumno corresponde el archivo
                no_control_match = None
                if fname in entregas_by_file:
                    no_control_match = entregas_by_file[fname].get('no_control')

                # Si no está en entregas_by_file, buscar en el nombre del archivo
                if not no_control_match:
                    for nc in alumnos_dict.keys():
                        if nc in fname.upper():
                            no_control_match = nc
                            break

                alumno_info = alumnos_dict.get(no_control_match) if no_control_match else None
                estatus_alu = (alumno_info.get('estatus_alumno') or 'Desconocido') if alumno_info else 'No vinculado'
                estatus_proy = (alumno_info.get('estatus_proyecto') or '') if alumno_info else ''
                nombre_alu = alumno_info.get('nombre') if alumno_info else 'Sin alumno asignado'

                # Determinar si el alumno ya concluyó su servicio social
                es_finalizado = False
                if estatus_alu.upper() in ['FINALIZADO', 'CONCLUIDO', 'LIBERADO']:
                    es_finalizado = True
                elif estatus_proy.upper() in ['FINALIZADO', 'CONCLUIDO', 'LIBERADO']:
                    es_finalizado = True

                if es_finalizado:
                    finalizados_count += 1
                    finalizados_bytes += fsize
                else:
                    activos_count += 1
                    activos_bytes += fsize

                archivos_detallados.append({
                    "nombre_archivo": fname,
                    "tamano_bytes": fsize,
                    "tamano_formateado": format_bytes(fsize),
                    "fecha_modificacion": mtime,
                    "no_control": no_control_match or "N/A",
                    "nombre_alumno": nombre_alu,
                    "estatus_alumno": estatus_alu,
                    "estatus_proyecto": estatus_proy,
                    "es_finalizado": es_finalizado
                })

        # Ordenar archivos por fecha más reciente
        archivos_detallados.sort(key=lambda x: x['fecha_modificacion'] or '', reverse=True)

        return jsonify({
            "total_archivos": len(archivos_detallados),
            "espacio_total_bytes": total_bytes,
            "espacio_total_formateado": format_bytes(total_bytes),
            "archivos_finalizados_count": finalizados_count,
            "archivos_finalizados_bytes": finalizados_bytes,
            "archivos_finalizados_formateado": format_bytes(finalizados_bytes),
            "archivos_activos_count": activos_count,
            "archivos_activos_bytes": activos_bytes,
            "archivos_activos_formateado": format_bytes(activos_bytes),
            "archivos": archivos_detallados
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error al analizar almacenamiento: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

@mantenimiento_bp.route('/eliminar', methods=['POST'])
def eliminar_archivos_generados():
    """
    Elimina archivos generados según el criterio:
    - 'TODOS': Elimina todos los archivos generados del servidor.
    - 'FINALIZADOS': Elimina únicamente los archivos de alumnos que completaron su servicio social.
    """
    data = request.json or {}
    criterio = (data.get('criterio') or 'TODOS').strip().upper()

    if criterio not in ['TODOS', 'FINALIZADOS']:
        return jsonify({"error": "Criterio inválido. Debe ser 'TODOS' o 'FINALIZADOS'"}), 400

    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        eliminados = 0
        bytes_liberados = 0

        if criterio == 'TODOS':
            # 1. Eliminar todos los archivos en generados/ excepto .gitkeep
            if os.path.exists(GENERADOS_DIR):
                for fname in os.listdir(GENERADOS_DIR):
                    if fname == '.gitkeep' or fname.startswith('.'):
                        continue
                    full_path = os.path.join(GENERADOS_DIR, fname)
                    if os.path.isfile(full_path):
                        try:
                            fsize = os.path.getsize(full_path)
                            os.remove(full_path)
                            eliminados += 1
                            bytes_liberados += fsize
                        except Exception as file_err:
                            print(f"[MANTENIMIENTO] Error al eliminar {fname}: {file_err}")

            # 2. Limpiar ruta_archivo en expediente_entregas
            cursor.execute("UPDATE expediente_entregas SET ruta_archivo = NULL WHERE ruta_archivo IS NOT NULL")
            conn.commit()

            msg = f"Se eliminaron exitosamente todos los archivos generados ({eliminados} archivos, {format_bytes(bytes_liberados)} liberados)."
            return jsonify({
                "message": msg,
                "eliminados": eliminados,
                "bytes_liberados": bytes_liberados,
                "espacio_liberado_formateado": format_bytes(bytes_liberados)
            }), 200

        elif criterio == 'FINALIZADOS':
            # 1. Obtener los no_control de alumnos finalizados
            cursor.execute("""
                SELECT DISTINCT a.no_control
                FROM alumnos a
                LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control
                WHERE UPPER(a.estatus) IN ('FINALIZADO', 'CONCLUIDO', 'LIBERADO')
                   OR UPPER(p.estatus) IN ('FINALIZADO', 'CONCLUIDO', 'LIBERADO')
            """)
            finalizados_rows = cursor.fetchall()
            finalizados_set = set(r['no_control'].strip().upper() for r in finalizados_rows if r.get('no_control'))

            if not finalizados_set:
                return jsonify({
                    "message": "No se encontraron alumnos con servicio social en estatus 'Finalizado'. No se borró ningún archivo.",
                    "eliminados": 0,
                    "bytes_liberados": 0,
                    "espacio_liberado_formateado": "0 B"
                }), 200

            # 2. Obtener archivos vinculados a estos alumnos en expediente_entregas
            format_strings = ','.join(['%s'] * len(finalizados_set))
            cursor.execute(f"""
                SELECT id_entrega, ruta_archivo, no_control
                FROM expediente_entregas
                WHERE no_control IN ({format_strings}) AND ruta_archivo IS NOT NULL AND ruta_archivo != ''
            """, tuple(finalizados_set))
            entregas_finalizadas = cursor.fetchall()
            archivos_a_borrar = set(e['ruta_archivo'] for e in entregas_finalizadas if e.get('ruta_archivo'))

            # También escanear archivos físicos cuyo nombre empiece con la matrícula finalizada
            if os.path.exists(GENERADOS_DIR):
                for fname in os.listdir(GENERADOS_DIR):
                    if fname == '.gitkeep' or fname.startswith('.'):
                        continue
                    for nc in finalizados_set:
                        if nc in fname.upper():
                            archivos_a_borrar.add(fname)

            # 3. Eliminar físicamente los archivos identificados
            for fname in archivos_a_borrar:
                full_path = os.path.join(GENERADOS_DIR, fname)
                if os.path.isfile(full_path):
                    try:
                        fsize = os.path.getsize(full_path)
                        os.remove(full_path)
                        eliminados += 1
                        bytes_liberados += fsize
                    except Exception as err:
                        print(f"[MANTENIMIENTO] Error al eliminar {fname}: {err}")

            # 4. Actualizar expediente_entregas de los alumnos finalizados
            cursor.execute(f"""
                UPDATE expediente_entregas
                SET ruta_archivo = NULL
                WHERE no_control IN ({format_strings}) AND ruta_archivo IS NOT NULL
            """, tuple(finalizados_set))
            conn.commit()

            msg = f"Se depuraron exitosamente los archivos de alumnos finalizados ({eliminados} archivos, {format_bytes(bytes_liberados)} liberados)."
            return jsonify({
                "message": msg,
                "eliminados": eliminados,
                "bytes_liberados": bytes_liberados,
                "espacio_liberado_formateado": format_bytes(bytes_liberados)
            }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Error al procesar depuración: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

@mantenimiento_bp.route('/eliminar-archivo', methods=['POST'])
def eliminar_archivo_individual():
    """
    Elimina un archivo generado específico de forma segura.
    """
    data = request.json or {}
    nombre_archivo = (data.get('nombre_archivo') or '').strip()

    if not nombre_archivo or '/' in nombre_archivo or '\\' in nombre_archivo or nombre_archivo == '.gitkeep':
        return jsonify({"error": "Nombre de archivo inválido o restringido"}), 400

    full_path = os.path.join(GENERADOS_DIR, nombre_archivo)
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        return jsonify({"error": "El archivo especificado no existe en el servidor"}), 404

    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500

    cursor = conn.cursor()
    try:
        fsize = os.path.getsize(full_path)
        os.remove(full_path)

        cursor.execute("UPDATE expediente_entregas SET ruta_archivo = NULL WHERE ruta_archivo = %s", (nombre_archivo,))
        conn.commit()

        return jsonify({
            "message": f"Archivo '{nombre_archivo}' eliminado exitosamente ({format_bytes(fsize)} liberados).",
            "bytes_liberados": fsize,
            "espacio_liberado_formateado": format_bytes(fsize)
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Error al eliminar archivo: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()
