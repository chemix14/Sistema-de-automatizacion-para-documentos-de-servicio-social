from flask import Blueprint, jsonify, request
import pandas as pd
from database import Database

admin_bp = Blueprint('admin_bp', __name__)

def get_db():
    db = Database()
    return db.get_connection()

@admin_bp.route('/catalogos/carreras', methods=['GET', 'POST'])
def carreras():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        try:
            cursor.execute("SELECT id_carrera, clave, nombre, activa FROM carreras ORDER BY id_carrera")
            results = cursor.fetchall()
            return jsonify(results), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'POST':
        data = request.json
        clave = data.get('clave')
        nombre = data.get('nombre')
        activa = data.get('activa', 1)
        
        if not clave or not nombre:
            return jsonify({"error": "Clave y nombre son requeridos"}), 400
            
        try:
            cursor.execute("INSERT INTO carreras (clave, nombre, activa) VALUES (%s, %s, %s)", (clave, nombre, activa))
            conn.commit()
            return jsonify({"message": "Carrera agregada exitosamente", "id": cursor.lastrowid}), 201
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@admin_bp.route('/catalogos/carreras/<int:id_carrera>', methods=['DELETE', 'PUT'])
def carreras_detail(id_carrera):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'PUT':
        data = request.json
        clave = data.get('clave')
        nombre = data.get('nombre')
        activa = data.get('activa', 1)
        
        try:
            cursor.execute("UPDATE carreras SET clave=%s, nombre=%s, activa=%s WHERE id_carrera=%s", (clave, nombre, activa, id_carrera))
            conn.commit()
            return jsonify({"message": "Carrera actualizada exitosamente"}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'DELETE':
        try:
            cursor.execute("DELETE FROM carreras WHERE id_carrera=%s", (id_carrera,))
            conn.commit()
            return jsonify({"message": "Carrera eliminada exitosamente"}), 200
        except Exception as e:
            conn.rollback()
            # If foreign key constraint fails
            return jsonify({"error": "No se puede eliminar la carrera porque tiene alumnos asignados u otros registros dependientes."}), 400
        finally:
            cursor.close()
            conn.close()

@admin_bp.route('/personal', methods=['GET', 'POST'])
def personal():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        try:
            # Seleccionamos usuarios que no sean alumnos
            cursor.execute("SELECT id_usuario, nombres, correo, tipo as rol, activo FROM usuarios WHERE tipo != 'ALUMNO' ORDER BY id_usuario DESC")
            results = cursor.fetchall()
            
            # Map 'nombres' or 'nombre_completo' to 'nombre' as expected by frontend
            for row in results:
                row['nombre'] = row.get('nombres', 'Usuario Sin Nombre')
                
            return jsonify(results), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'POST':
        data = request.json
        nombre = data.get('nombre')
        correo = data.get('correo')
        rol = data.get('rol', 'Admin')
        
        if not nombre or not correo:
            return jsonify({"error": "Nombre y correo son requeridos"}), 400
            
        try:
            cursor.execute("INSERT INTO usuarios (nombres, correo, tipo, activo) VALUES (%s, %s, %s, 1)", (nombre, correo, rol))
            conn.commit()
            return jsonify({"message": "Usuario creado exitosamente"}), 201
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@admin_bp.route('/personal/<int:id_usuario>/estatus', methods=['PUT'])
def personal_estatus(id_usuario):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    activo = request.json.get('activo', 1)
    
    try:
        cursor.execute("UPDATE usuarios SET activo = %s WHERE id_usuario = %s", (activo, id_usuario))
        conn.commit()
        return jsonify({"message": "Estatus actualizado"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/personal/<int:id_usuario>/rol', methods=['PUT'])
def personal_rol(id_usuario):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    rol = request.json.get('rol')
    
    if not rol:
        return jsonify({"error": "Rol es requerido"}), 400
        
    try:
        cursor.execute("UPDATE usuarios SET tipo = %s WHERE id_usuario = %s", (rol, id_usuario))
        conn.commit()
        return jsonify({"message": "Rol actualizado"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/configuracion', methods=['GET', 'PUT'])
def configuracion():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        try:
            cursor.execute("SELECT * FROM periodos WHERE activo = 1 LIMIT 1")
            periodo = cursor.fetchone()
            if periodo:
                for k, v in periodo.items():
                    if hasattr(v, 'strftime'):
                        periodo[k] = v.strftime('%Y-%m-%d')
                return jsonify(periodo), 200
            return jsonify({}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'PUT':
        data = request.json
        keys = [
            'nombre_oficial', 'apertura_expediente', 'cierre_expediente',
            'inicio_bimestre_1', 'fin_bimestre_1', 'limite_entrega_bim_1',
            'inicio_bimestre_2', 'fin_bimestre_2', 'limite_entrega_bim_2',
            'inicio_bimestre_3', 'fin_bimestre_3', 'limite_entrega_bim_3',
            'apertura_expediente_final', 'cierre_expediente_final'
        ]
        
        updates = []
        values = []
        for k in keys:
            if k in data and data[k]:
                updates.append(f"{k} = %s")
                values.append(data[k])
                
        try:
            if updates:
                cursor.execute("SELECT id_periodo FROM periodos WHERE activo = 1 LIMIT 1")
                periodo = cursor.fetchone()
                if periodo:
                    values.append(periodo['id_periodo'])
                    query = f"UPDATE periodos SET {', '.join(updates)} WHERE id_periodo = %s"
                    cursor.execute(query, tuple(values))
                else:
                    cols = ', '.join([k for k in keys if k in data and data[k]])
                    placeholders = ', '.join(['%s'] * len(updates))
                    query = f"INSERT INTO periodos ({cols}, activo) VALUES ({placeholders}, 1)"
                    cursor.execute(query, tuple(values))
                conn.commit()
            return jsonify({"message": "Configuración guardada"}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@admin_bp.route('/proyectos', methods=['GET'])
def proyectos():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT a.no_control, u.nombres as nombre_alumno, c.nombre as carrera,
                   p.id_proyecto, p.nombre_proyecto, p.modalidad, p.fecha_inicio, p.fecha_fin, p.estatus,
                   d.nombre as dependencia, d.titular as titular_dependencia, d.cargo_titular, d.telefono as telefono_dependencia, d.correo as correo_dependencia
            FROM alumnos a
            JOIN usuarios u ON a.id_usuario = u.id_usuario
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control
            LEFT JOIN dependencias d ON p.id_dependencia = d.id_dependencia
            ORDER BY u.nombres ASC
        """
        cursor.execute(query)
        results = cursor.fetchall()
        
        for row in results:
            for k, v in row.items():
                if hasattr(v, 'strftime'):
                    row[k] = v.strftime('%Y-%m-%d')
                    
        return jsonify({"data": results}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/proyectos/<int:id>', methods=['PUT'])
def proyecto_detail(id):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    data = request.json
    
    try:
        cursor.execute("UPDATE proyectos_servicio SET nombre_proyecto=%s, modalidad=%s, fecha_inicio=%s, fecha_fin=%s WHERE id_proyecto=%s",
                       (data.get('nombre_proyecto'), data.get('modalidad'), data.get('fecha_inicio'), data.get('fecha_fin'), id))
                       
        dep = data.get('dependencia')
        if dep:
            cursor.execute("SELECT id_dependencia FROM proyectos_servicio WHERE id_proyecto=%s", (id,))
            p = cursor.fetchone()
            if p and p['id_dependencia']:
                cursor.execute("UPDATE dependencias SET nombre=%s, titular=%s WHERE id_dependencia=%s",
                               (dep.get('nombre'), dep.get('titular_dependencia'), p['id_dependencia']))
                               
        conn.commit()
        return jsonify({"message": "Proyecto actualizado"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/alumnos', methods=['GET'])
def alumnos():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT a.no_control, u.nombres as nombre_alumno, c.nombre as carrera,
                   'N/A' as semestre, p.estatus as estatus
            FROM alumnos a
            JOIN usuarios u ON a.id_usuario = u.id_usuario
            LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
            LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control
            ORDER BY a.no_control ASC
        """
        cursor.execute(query)
        results = cursor.fetchall()
        for r in results:
            if not r['estatus']:
                r['estatus'] = 'PENDIENTE'
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/alumnos/importar', methods=['POST'])
def importar_alumnos():
    if 'archivo_excel' not in request.files:
        return jsonify({"error": "No se subió ningún archivo"}), 400
    
    file = request.files['archivo_excel']
    if file.filename == '':
        return jsonify({"error": "Archivo vacío"}), 400
        
    try:
        df = pd.read_excel(file)
        
        conn = get_db()
        cursor = conn.cursor()
        
        insertados = 0
        actualizados = 0
        errores = []
        
        for index, row in df.iterrows():
            no_control = str(row.iloc[0]).strip() if len(row) > 0 else None
            nombre = str(row.iloc[1]).strip() if len(row) > 1 else 'Sin Nombre'
            correo = str(row.iloc[2]).strip() if len(row) > 2 else f"{no_control}@teziutlan.tecnm.mx"
            
            if not no_control or no_control == 'nan':
                continue
                
            cursor.execute("SELECT id_usuario FROM usuarios WHERE correo = %s", (correo,))
            u = cursor.fetchone()
            if u:
                id_usuario = u[0]
                actualizados += 1
            else:
                cursor.execute("INSERT INTO usuarios (correo, nombres, tipo, activo) VALUES (%s, %s, 'ALUMNO', 1)", (correo, nombre))
                id_usuario = cursor.lastrowid
                insertados += 1
                
            cursor.execute("SELECT no_control FROM alumnos WHERE no_control = %s", (no_control,))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO alumnos (no_control, id_usuario) VALUES (%s, %s)", (no_control, id_usuario))
                
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "detalles": {
                "procesados": insertados + actualizados,
                "insertados": insertados,
                "actualizados": actualizados,
                "errores": errores
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/matriz-validacion', methods=['GET', 'PATCH'])
def matriz_validacion():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        try:
            cursor.execute("SELECT id_documento, etapa, nombre FROM catalogo_documentos ORDER BY id_documento")
            docs = cursor.fetchall()
            etapas = {}
            for d in docs:
                if d['etapa'] not in etapas:
                    etapas[d['etapa']] = []
                etapas[d['etapa']].append(d)
                
            cursor.execute("""
                SELECT a.no_control, u.nombres as nombre_alumno, p.id_proyecto 
                FROM alumnos a
                JOIN usuarios u ON a.id_usuario = u.id_usuario
                LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control
            """)
            alumnos = cursor.fetchall()
            
            cursor.execute("SELECT id_proyecto, id_documento, estado FROM expediente_entregas")
            entregas = cursor.fetchall()
            
            entregas_map = {}
            for e in entregas:
                if e['id_proyecto'] not in entregas_map:
                    entregas_map[e['id_proyecto']] = {}
                entregas_map[e['id_proyecto']][e['id_documento']] = e['estado']
                
            for al in alumnos:
                al['documentos'] = entregas_map.get(al['id_proyecto'], {})
                
            return jsonify({"etapas": etapas, "alumnos": alumnos}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'PATCH':
        data = request.json
        id_proyecto = data.get('id_proyecto')
        id_documento = data.get('id_documento')
        nuevo_estado = data.get('nuevo_estado')
        
        try:
            cursor.execute("SELECT id_entrega FROM expediente_entregas WHERE id_proyecto=%s AND id_documento=%s", (id_proyecto, id_documento))
            if cursor.fetchone():
                cursor.execute("UPDATE expediente_entregas SET estado=%s WHERE id_proyecto=%s AND id_documento=%s", (nuevo_estado, id_proyecto, id_documento))
            else:
                cursor.execute("INSERT INTO expediente_entregas (id_proyecto, id_documento, estado) VALUES (%s, %s, %s)", (id_proyecto, id_documento, nuevo_estado))
            conn.commit()
            return jsonify({"message": "Estado actualizado"}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
