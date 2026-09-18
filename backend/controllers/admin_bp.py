from flask import Blueprint, jsonify, request
import pandas as pd
from datetime import datetime, date
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
            cursor.execute("SELECT id, nombre, correo, rol, activo, ultimo_acceso FROM administradores ORDER BY id ASC")
            results = cursor.fetchall()
            
            for row in results:
                row['id_usuario'] = row['id']
                
            return jsonify(results), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'POST':
        data = request.json or {}
        nombre = data.get('nombre')
        correo = data.get('correo')
        rol_raw = data.get('rol', 'Administrador')
        
        r_map = {
            'Admin': 'Administrador',
            'admin': 'Administrador',
            'Administrador': 'Administrador',
            'SuperAdmin': 'SuperAdmin',
            'superadmin': 'SuperAdmin',
            'Revisor': 'Revisor',
            'revisor': 'Revisor',
            'Servicio_Social': 'Revisor',
            'servicio_social': 'Revisor'
        }
        rol = r_map.get(str(rol_raw).strip(), rol_raw)
        
        if not nombre or not correo:
            return jsonify({"error": "Nombre y correo son requeridos"}), 400
            
        try:
            cursor.execute("""
                INSERT INTO administradores (nombre, correo, rol, activo) 
                VALUES (%s, %s, %s, 1)
                ON DUPLICATE KEY UPDATE nombre=%s, rol=%s, activo=1
            """, (nombre, correo, rol, nombre, rol))
            
            cursor.execute("""
                INSERT INTO usuarios (nombres, correo, tipo, activo)
                VALUES (%s, %s, 'ADMIN', 1)
                ON DUPLICATE KEY UPDATE tipo='ADMIN', activo=1
            """, (nombre, correo))
            
            conn.commit()
            return jsonify({"message": "Personal agregado exitosamente"}), 201
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
        cursor.execute("SELECT correo FROM administradores WHERE id = %s", (id_usuario,))
        adm = cursor.fetchone()
        cursor.execute("UPDATE administradores SET activo = %s WHERE id = %s", (activo, id_usuario))
        if adm:
            cursor.execute("UPDATE usuarios SET activo = %s WHERE correo = %s", (activo, adm['correo']))
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
    rol_raw = request.json.get('rol')
    
    if not rol_raw:
        return jsonify({"error": "Rol es requerido"}), 400

    r_map = {
        'Admin': 'Administrador',
        'admin': 'Administrador',
        'Administrador': 'Administrador',
        'SuperAdmin': 'SuperAdmin',
        'superadmin': 'SuperAdmin',
        'Revisor': 'Revisor',
        'revisor': 'Revisor',
        'Servicio_Social': 'Revisor',
        'servicio_social': 'Revisor'
    }
    rol = r_map.get(str(rol_raw).strip(), rol_raw)
        
    try:
        cursor.execute("UPDATE administradores SET rol = %s WHERE id = %s", (rol, id_usuario))
        conn.commit()
        return jsonify({"message": "Rol actualizado", "rol": rol}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/personal/<int:id_usuario>', methods=['DELETE'])
def personal_eliminar(id_usuario):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT correo FROM administradores WHERE id = %s", (id_usuario,))
        adm = cursor.fetchone()
        if not adm:
            return jsonify({"error": "Usuario administrador no encontrado"}), 404
            
        cursor.execute("DELETE FROM administradores WHERE id = %s", (id_usuario,))
        
        # Si el usuario también existe en la tabla alumnos, cambiar su rol a ALUMNO en usuarios
        cursor.execute("SELECT no_control FROM alumnos WHERE LOWER(TRIM(correo_institucional)) = LOWER(TRIM(%s))", (adm['correo'],))
        es_alumno = cursor.fetchone()
        if es_alumno:
            cursor.execute("UPDATE usuarios SET tipo = 'ALUMNO', activo = 1 WHERE LOWER(TRIM(correo)) = LOWER(TRIM(%s))", (adm['correo'],))
        else:
            cursor.execute("UPDATE usuarios SET activo = 0 WHERE LOWER(TRIM(correo)) = LOWER(TRIM(%s))", (adm['correo'],))
            
        conn.commit()
        return jsonify({"message": "Administrador eliminado correctamente"}), 200
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

@admin_bp.route('/proyectos', methods=['GET', 'POST'])
def proyectos():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        try:
            query = """
                SELECT p.id_proyecto, p.no_control, p.id_dependencia, p.nombre_proyecto, p.periodo,
                       p.fecha_inicio, p.fecha_fin,
                       COALESCE(a.modalidad, p.modalidad) AS modalidad,
                       a.modalidad AS modalidad_alumno,
                       p.modalidad AS modalidad_proyecto,
                       p.programa_institucional, p.tipo_programa,
                       COALESCE(p.responsable_nombre, p.responsable_proyecto) AS responsable_nombre,
                       COALESCE(p.responsable_cargo, p.cargo_responsable) AS responsable_cargo,
                       COALESCE(p.supervisor_nombre, p.supervisor_proyecto) AS supervisor_nombre,
                       COALESCE(p.supervisor_cargo, p.cargo_supervisor) AS supervisor_cargo,
                       p.objetivo, p.estatus, p.id_periodo,
                       a.nombre AS nombre_alumno, COALESCE(c.nombre, a.carrera) AS carrera, a.semestre, a.telefono AS telefono_alumno, a.correo_institucional,
                       d.nombre AS dependencia_nombre, d.titular AS titular_dependencia, d.cargo_titular AS cargo_titular_dependencia,
                       d.calle AS calle_dependencia, d.colonia AS colonia_dependencia, d.municipio AS municipio_dependencia, d.ciudad AS ciudad_dependencia, d.estado AS estado_dependencia, d.codigo_postal AS cp_dependencia,
                       d.telefono AS telefono_dependencia, d.correo AS correo_dependencia
                FROM proyectos_servicio p
                JOIN alumnos a ON p.no_control = a.no_control
                LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
                LEFT JOIN dependencias d ON p.id_dependencia = d.id_dependencia
                ORDER BY p.id_proyecto DESC
            """
            cursor.execute(query)
            results = cursor.fetchall()
            
            for row in results:
                for k, v in row.items():
                    if hasattr(v, 'strftime'):
                        row[k] = v.strftime('%Y-%m-%d')
                if not row.get('estatus'):
                    row['estatus'] = 'Activo'
                        
            return jsonify({"data": results}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'POST':
        data = request.json or {}
        no_control = data.get('no_control', '').strip()
        nombre_proyecto = data.get('nombre_proyecto', '').strip()
        
        if not no_control or not nombre_proyecto:
            return jsonify({"error": "No. de Control y Nombre del Proyecto son requeridos"}), 400
            
        try:
            # 1. Crear dependencia si se proporcionó
            dep_nombre = data.get('dependencia_nombre') or data.get('dependencia')
            id_dependencia = data.get('id_dependencia')
            if dep_nombre and not id_dependencia:
                cursor.execute("""
                    INSERT INTO dependencias (nombre, titular, cargo_titular, calle, colonia, ciudad, estado, codigo_postal, telefono, correo)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    dep_nombre, data.get('titular_dependencia', ''), data.get('cargo_titular_dependencia', ''),
                    data.get('calle_dependencia', ''), data.get('colonia_dependencia', ''), data.get('ciudad_dependencia', ''),
                    data.get('estado_dependencia', ''), data.get('cp_dependencia', ''), data.get('telefono_dependencia', ''), data.get('correo_dependencia', '')
                ))
                id_dependencia = cursor.lastrowid
            elif not id_dependencia:
                id_dependencia = 1
                
            cursor.execute("""
                INSERT INTO proyectos_servicio (
                    no_control, id_dependencia, nombre_proyecto, modalidad,
                    programa_institucional, tipo_programa, fecha_inicio, fecha_fin,
                    responsable_nombre, responsable_cargo, responsable_proyecto, cargo_responsable,
                    supervisor_nombre, supervisor_cargo, supervisor_proyecto, cargo_supervisor,
                    objetivo, estatus
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                no_control, id_dependencia, nombre_proyecto, data.get('modalidad', 'PRESENCIAL'),
                data.get('programa_institucional', 'DESARROLLO SUSTENTABLE'), data.get('tipo_programa', 'DESARROLLO SUSTENTABLE'),
                data.get('fecha_inicio'), data.get('fecha_fin'),
                data.get('responsable_nombre', ''), data.get('responsable_cargo', ''), data.get('responsable_nombre', ''), data.get('responsable_cargo', ''),
                data.get('supervisor_nombre', ''), data.get('supervisor_cargo', ''), data.get('supervisor_nombre', ''), data.get('supervisor_cargo', ''),
                data.get('objetivo', ''), data.get('estatus', 'Activo')
            ))
            conn.commit()
            return jsonify({"message": "Proyecto registrado correctamente"}), 201
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@admin_bp.route('/proyectos/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def proyecto_detail(id):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        try:
            cursor.execute("""
                SELECT p.*, d.nombre as dependencia_nombre, d.titular as titular_dependencia, d.cargo_titular,
                       d.calle as calle_dependencia, d.colonia as colonia_dependencia, d.ciudad as ciudad_dependencia, d.estado as estado_dependencia, d.telefono as telefono_dependencia, d.correo as correo_dependencia
                FROM proyectos_servicio p
                LEFT JOIN dependencias d ON p.id_dependencia = d.id_dependencia
                WHERE p.id_proyecto = %s
            """, (id,))
            p = cursor.fetchone()
            if not p:
                return jsonify({"error": "Proyecto no encontrado"}), 404
            return jsonify(p), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'PUT':
        data = request.json or {}
        try:
            # 1. Actualizar proyectos_servicio
            cursor.execute("""
                UPDATE proyectos_servicio SET 
                    nombre_proyecto = %s,
                    modalidad = %s,
                    programa_institucional = %s,
                    tipo_programa = %s,
                    fecha_inicio = %s,
                    fecha_fin = %s,
                    responsable_nombre = %s,
                    responsable_cargo = %s,
                    responsable_proyecto = %s,
                    cargo_responsable = %s,
                    supervisor_nombre = %s,
                    supervisor_cargo = %s,
                    supervisor_proyecto = %s,
                    cargo_supervisor = %s,
                    objetivo = %s,
                    estatus = %s
                WHERE id_proyecto = %s
            """, (
                data.get('nombre_proyecto'),
                data.get('modalidad'),
                data.get('programa_institucional'),
                data.get('tipo_programa'),
                data.get('fecha_inicio'),
                data.get('fecha_fin'),
                data.get('responsable_nombre'),
                data.get('responsable_cargo'),
                data.get('responsable_nombre'),
                data.get('responsable_cargo'),
                data.get('supervisor_nombre'),
                data.get('supervisor_cargo'),
                data.get('supervisor_nombre'),
                data.get('supervisor_cargo'),
                data.get('objetivo'),
                data.get('estatus', 'Activo'),
                id
            ))
            
            # 2. Actualizar dependencia asociada
            cursor.execute("SELECT id_dependencia FROM proyectos_servicio WHERE id_proyecto = %s", (id,))
            p_row = cursor.fetchone()
            
            if p_row and p_row.get('id_dependencia'):
                dep_id = p_row['id_dependencia']
                dep_nombre = data.get('dependencia_nombre') or data.get('dependencia')
                
                if dep_nombre:
                    cursor.execute("""
                        UPDATE dependencias SET 
                            nombre = %s,
                            titular = %s,
                            cargo_titular = %s,
                            calle = %s,
                            colonia = %s,
                            ciudad = %s,
                            estado = %s,
                            codigo_postal = %s,
                            telefono = %s,
                            correo = %s
                        WHERE id_dependencia = %s
                    """, (
                        dep_nombre,
                        data.get('titular_dependencia'),
                        data.get('cargo_titular_dependencia') or data.get('cargo_titular'),
                        data.get('calle_dependencia'),
                        data.get('colonia_dependencia'),
                        data.get('ciudad_dependencia'),
                        data.get('estado_dependencia'),
                        data.get('cp_dependencia'),
                        data.get('telefono_dependencia'),
                        data.get('correo_dependencia'),
                        dep_id
                    ))
                    
            conn.commit()
            return jsonify({"message": "Proyecto y datos de la dependencia actualizados exitosamente."}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'DELETE':
        try:
            cursor.execute("DELETE FROM proyectos_servicio WHERE id_proyecto = %s", (id,))
            conn.commit()
            return jsonify({"message": "Proyecto eliminado exitosamente"}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@admin_bp.route('/alumnos', methods=['GET', 'POST'])
def alumnos():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        try:
            query = """
                SELECT a.no_control, 
                       COALESCE(a.nombre, u.nombres) AS nombre,
                       COALESCE(c.nombre, a.carrera) AS carrera,
                       a.modalidad,
                       a.semestre, a.sexo, a.telefono,
                       a.calle, a.colonia, a.ciudad, a.estado, a.domicilio,
                       a.correo_institucional, a.correo_personal,
                       a.creditos_aprobados, a.periodos_cursados,
                       a.estatus, a.fecha_registro, a.id_carrera, a.id_usuario,
                       c.nombre as carrera_nombre, c.clave as carrera_clave,
                       p.id_proyecto, p.nombre_proyecto, p.estatus as estatus_proyecto
                FROM alumnos a
                LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
                LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
                LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control AND p.estatus != 'CANCELADO'
                ORDER BY a.no_control ASC
            """
            cursor.execute(query)
            results = cursor.fetchall()
            for r in results:
                if not r.get('estatus'):
                    r['estatus'] = 'Activo'
                if hasattr(r.get('fecha_registro'), 'strftime'):
                    r['fecha_registro'] = r['fecha_registro'].strftime('%Y-%m-%d')
            return jsonify(results), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'POST':
        data = request.json or {}
        no_control = data.get('no_control', '').strip().upper()
        nombre = data.get('nombre', '').strip()
        carrera = data.get('carrera', '').strip()
        modalidad = data.get('modalidad', '').strip()
        
        if not no_control or not nombre:
            return jsonify({"error": "Número de control y nombre son requeridos"}), 400
            
        try:
            # Buscar id_carrera si no se proporcionó directamente
            id_carrera = data.get('id_carrera')
            if not id_carrera and carrera:
                cursor.execute("SELECT id_carrera FROM carreras WHERE nombre = %s OR clave = %s LIMIT 1", (carrera, carrera))
                c_row = cursor.fetchone()
                if c_row:
                    id_carrera = c_row['id_carrera']
                    
            cursor.execute("""
                INSERT INTO alumnos (
                    no_control, nombre, carrera, modalidad, semestre, sexo, telefono,
                    calle, colonia, ciudad, estado, domicilio,
                    correo_institucional, correo_personal, creditos_aprobados,
                    periodos_cursados, estatus, id_carrera
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    nombre=VALUES(nombre), carrera=VALUES(carrera), modalidad=VALUES(modalidad),
                    semestre=VALUES(semestre), sexo=VALUES(sexo), telefono=VALUES(telefono),
                    calle=VALUES(calle), colonia=VALUES(colonia), ciudad=VALUES(ciudad), estado=VALUES(estado),
                    domicilio=VALUES(domicilio), correo_institucional=VALUES(correo_institucional),
                    correo_personal=VALUES(correo_personal), creditos_aprobados=VALUES(creditos_aprobados),
                    periodos_cursados=VALUES(periodos_cursados), estatus=VALUES(estatus), id_carrera=VALUES(id_carrera)
            """, (
                no_control, nombre, carrera, modalidad, data.get('semestre', '7'), data.get('sexo', ''), data.get('telefono', ''),
                data.get('calle', ''), data.get('colonia', ''), data.get('ciudad', ''), data.get('estado', ''), data.get('domicilio', ''),
                data.get('correo_institucional', ''), data.get('correo_personal', ''),
                data.get('creditos_aprobados', 0) or 0, data.get('periodos_cursados', 0) or 0,
                data.get('estatus', 'Activo'), id_carrera
            ))
            conn.commit()
            return jsonify({"message": f"Alumno '{no_control}' registrado correctamente"}), 201
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@admin_bp.route('/alumnos/<string:no_control>', methods=['GET', 'PUT', 'DELETE'])
def alumno_detail(no_control):
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        try:
            cursor.execute("""
                SELECT a.*, c.nombre as carrera_nombre, c.clave as carrera_clave,
                       p.id_proyecto, p.nombre_proyecto, p.estatus as estatus_proyecto
                FROM alumnos a
                LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
                LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control AND p.estatus != 'CANCELADO'
                WHERE a.no_control = %s
            """, (no_control,))
            alu = cursor.fetchone()
            if not alu:
                return jsonify({"error": "Alumno no encontrado"}), 404
            return jsonify(alu), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'PUT':
        data = request.json or {}
        try:
            # Buscar id_carrera si se modificó el nombre de la carrera
            carrera = data.get('carrera')
            id_carrera = data.get('id_carrera')
            if not id_carrera and carrera:
                cursor.execute("SELECT id_carrera FROM carreras WHERE nombre = %s OR clave = %s LIMIT 1", (carrera, carrera))
                c_row = cursor.fetchone()
                if c_row:
                    id_carrera = c_row['id_carrera']

            cursor.execute("""
                UPDATE alumnos SET
                    nombre = %s,
                    carrera = %s,
                    modalidad = %s,
                    semestre = %s,
                    sexo = %s,
                    telefono = %s,
                    calle = %s,
                    colonia = %s,
                    ciudad = %s,
                    estado = %s,
                    domicilio = %s,
                    correo_institucional = %s,
                    correo_personal = %s,
                    creditos_aprobados = %s,
                    periodos_cursados = %s,
                    estatus = %s,
                    id_carrera = %s
                WHERE no_control = %s
            """, (
                data.get('nombre'),
                carrera,
                data.get('modalidad'),
                data.get('semestre'),
                data.get('sexo'),
                data.get('telefono'),
                data.get('calle'),
                data.get('colonia'),
                data.get('ciudad'),
                data.get('estado'),
                data.get('domicilio'),
                data.get('correo_institucional'),
                data.get('correo_personal'),
                data.get('creditos_aprobados', 0) or 0,
                data.get('periodos_cursados', 0) or 0,
                data.get('estatus', 'Activo'),
                id_carrera,
                no_control
            ))
            
            # Sincronizar en tabla usuarios si está vinculado
            cursor.execute("SELECT id_usuario FROM alumnos WHERE no_control = %s", (no_control,))
            al_row = cursor.fetchone()
            if al_row and al_row.get('id_usuario'):
                cursor.execute("UPDATE usuarios SET nombres = %s, correo = %s WHERE id_usuario = %s",
                               (data.get('nombre'), data.get('correo_institucional'), al_row['id_usuario']))
                               
            conn.commit()
            return jsonify({"message": f"Información del alumno '{no_control}' actualizada exitosamente."}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'DELETE':
        try:
            cursor.execute("DELETE FROM alumnos WHERE no_control = %s", (no_control,))
            conn.commit()
            return jsonify({"message": f"Alumno '{no_control}' eliminado correctamente."}), 200
        except Exception as e:
            conn.rollback()
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
        import unicodedata
        import re

        def normalize_str(val):
            if val is None or pd.isna(val):
                return ""
            s = unicodedata.normalize('NFKD', str(val)).encode('ASCII', 'ignore').decode('utf-8')
            return ' '.join(s.upper().split())

        # Leer archivo completo sin asumir fila de encabezados fija
        df_raw = pd.read_excel(file, header=None)
        if df_raw.empty:
            return jsonify({"error": "El archivo de Excel no contiene datos"}), 400

        # 1. Detectar la fila de encabezados buscando palabras clave
        header_row_idx = None
        col_creditos = None
        col_nombre = None
        col_control = None
        col_carrera = None
        col_mod = None
        col_sem = None
        col_sexo = None
        col_correo = None

        for row_i in range(min(15, len(df_raw))):
            row_vals = [normalize_str(val) for val in df_raw.iloc[row_i]]
            has_nombre = any("NOMBRE" in v for v in row_vals)
            has_control = any("CONTROL" in v or "NO." in v for v in row_vals)
            has_carrera = any("CARRERA" in v for v in row_vals)
            
            if has_nombre and (has_control or has_carrera):
                header_row_idx = row_i
                for col_j, cell_val in enumerate(row_vals):
                    # Créditos aprobados (D5 / CREDITOS APROB)
                    if ("CREDITO" in cell_val or "CRDITO" in cell_val or "APROB" in cell_val) and col_creditos is None:
                        col_creditos = col_j
                    # Nombre del alumno (F5 / NOMBRE)
                    elif "NOMBRE" in cell_val and not any(w in cell_val for w in ["PROYECTO", "RESPONSABLE", "TITULAR", "SUPERVISOR", "JEFE", "DEPENDENCIA"]):
                        col_nombre = col_j
                    # Número de control (G5 / NO. DE CONTROL)
                    elif ("CONTROL" in cell_val or "MATRICULA" in cell_val or "NO. DE CONTROL" in cell_val or "NO. CONTROL" in cell_val) and col_control is None:
                        col_control = col_j
                    # Carrera (H5 / CARRERA)
                    elif "CARRERA" in cell_val and col_carrera is None:
                        col_carrera = col_j
                    # Modalidad (I5 / MOD)
                    elif (cell_val == "MOD" or "MODALIDAD" in cell_val) and col_mod is None:
                        col_mod = col_j
                    # Semestre (J5 / SEM)
                    elif (cell_val == "SEM" or "SEMESTRE" in cell_val) and col_sem is None:
                        col_sem = col_j
                    # Sexo (L5 / SEXO)
                    elif ("SEXO" in cell_val or "GENERO" in cell_val) and col_sexo is None:
                        col_sexo = col_j
                    # Correo Institucional del Alumno (M5 / CORREO INSTITUCIONAL)
                    # Excluir correos de dependencias, titulares, supervisores o empresas
                    elif ("CORREO" in cell_val or "EMAIL" in cell_val) and not any(w in cell_val for w in ["DEPEN", "TITULAR", "RESPONSABLE", "SUPERVISOR", "JEFE", "EMPRESA", "ORGANIZACION"]):
                        if "INSTITUCIONAL" in cell_val or "ALUMNO" in cell_val or col_correo is None:
                            col_correo = col_j
                break

        # Fallback a posiciones estándar del formato oficial del Tecnológico (D=3, F=5, G=6, H=7, I=8, J=9, L=11, M=12)
        if col_creditos is None: col_creditos = 3 # Columna D (CREDITOS APROB)
        if col_nombre is None: col_nombre = 5     # Columna F (NOMBRE)
        if col_control is None: col_control = 6   # Columna G (NO. DE CONTROL)
        if col_carrera is None: col_carrera = 7   # Columna H (CARRERA)
        if col_mod is None: col_mod = 8           # Columna I (MOD)
        if col_sem is None: col_sem = 9           # Columna J (SEM)
        if col_sexo is None: col_sexo = 11        # Columna L (SEXO)
        if col_correo is None: col_correo = 12    # Columna M (CORREO INSTITUCIONAL)
        if header_row_idx is None: header_row_idx = 4 # Fila 5 (índice 4 en 0-based)

        start_row = header_row_idx + 1

        conn = get_db()
        if not conn:
            return jsonify({"error": "Error de conexión con la base de datos"}), 500
        cursor = conn.cursor(dictionary=True)

        # Cargar catálogo de carreras para mapeo inteligente
        cursor.execute("SELECT id_carrera, clave, nombre FROM carreras")
        carreras_db = cursor.fetchall()
        carreras_map = {}
        for c in carreras_db:
            carreras_map[normalize_str(c['nombre'])] = c['id_carrera']
            carreras_map[normalize_str(c['clave'])] = c['id_carrera']

        # Cargar catálogo oficial de documentos para inicializar entregas
        cursor.execute("SELECT id_documento FROM catalogo_documentos WHERE activo = 1")
        docs_catalogo = cursor.fetchall()

        insertados = 0
        actualizados = 0
        errores = []

        for curr_idx in range(start_row, len(df_raw)):
            row = df_raw.iloc[curr_idx]
            
            # Extraer y sanitizar No. Control
            raw_ctrl = row[col_control] if col_control < len(row) else None
            if pd.isna(raw_ctrl) or raw_ctrl is None:
                continue
            
            str_ctrl = str(raw_ctrl).strip()
            # Conservar número de control intacto con todos sus caracteres (ej. '*' o letras para alumnos de sabatino)
            no_control = str_ctrl.upper()
            
            if not no_control or no_control in ('NAN', 'NONE', '', 'NO. DE CONTROL', 'NO. CONTROL', 'TOTAL'):
                continue

            # Extraer y sanitizar Nombre
            raw_nom = row[col_nombre] if col_nombre < len(row) else ''
            if pd.isna(raw_nom) or raw_nom is None:
                nombre = 'Sin Nombre'
            else:
                nombre = ' '.join(str(raw_nom).strip().split())
                if not nombre or nombre.upper() in ('NAN', 'NONE'):
                    nombre = 'Sin Nombre'

            # Extraer Créditos Aprobados (Columna D - ej: "216 - 83.08", "184 - 70.77%", "192")
            raw_cred = row[col_creditos] if col_creditos < len(row) else 0
            creditos_aprobados = 0
            if pd.notna(raw_cred) and raw_cred is not None:
                try:
                    cred_str = str(raw_cred).strip()
                    match_cred = re.search(r'(\d+)', cred_str)
                    if match_cred:
                        creditos_aprobados = int(match_cred.group(1))
                except Exception:
                    creditos_aprobados = 0

            # Extraer Carrera y mapear a id_carrera
            raw_car = row[col_carrera] if col_carrera < len(row) else ''
            carrera_clean = ' '.join(str(raw_car).strip().split()) if pd.notna(raw_car) else ''
            norm_car = normalize_str(carrera_clean)
            
            id_carrera = carreras_map.get(norm_car)
            if not id_carrera:
                # Búsqueda por subcadena/palabras clave en catálogo
                for k_norm, id_c in carreras_map.items():
                    if k_norm and (k_norm in norm_car or norm_car in k_norm):
                        id_carrera = id_c
                        break

            # Extraer Modalidad (MOD)
            raw_mod = row[col_mod] if col_mod < len(row) else ''
            modalidad = str(raw_mod).strip().upper() if pd.notna(raw_mod) and str(raw_mod).strip().lower() not in ('nan', 'none') else ''

            # Extraer Semestre (SEM)
            raw_sem = row[col_sem] if col_sem < len(row) else ''
            sem_str = str(raw_sem).strip() if pd.notna(raw_sem) else '7'
            sem_match = re.search(r'\d+', sem_str)
            semestre = sem_match.group(0) if sem_match else '7'

            # Extraer y normalizar Sexo
            raw_sex = str(row[col_sexo]).strip().upper() if col_sexo < len(row) and pd.notna(row[col_sexo]) else ''
            if raw_sex in ('H', 'MASCULINO', 'HOMBRE'):
                sexo = 'Masculino'
            elif raw_sex in ('M', 'FEMENINO', 'MUJER'):
                sexo = 'Femenino'
            elif raw_sex and raw_sex.lower() not in ('nan', 'none'):
                sexo = raw_sex
            else:
                sexo = 'Masculino'

            # Extraer y sanitizar Correo Institucional del Alumno (Columna M)
            raw_correo = str(row[col_correo]).strip().lower() if col_correo < len(row) and pd.notna(row[col_correo]) else ''
            if raw_correo and raw_correo not in ('nan', 'none', '') and '@' in raw_correo and '.' in raw_correo:
                correo_inst = raw_correo
            else:
                no_ctrl_clean = re.sub(r'[^A-Za-z0-9]', '', no_control).lower()
                correo_inst = f"l{no_ctrl_clean}@teziutlan.tecnm.mx" if not no_ctrl_clean.startswith('l') else f"{no_ctrl_clean}@teziutlan.tecnm.mx"

            try:
                # 1. Gestionar usuario en tabla 'usuarios'
                cursor.execute("SELECT id_usuario FROM usuarios WHERE LOWER(correo) = %s", (correo_inst,))
                user_found = cursor.fetchone()
                if user_found:
                    id_usuario = user_found['id_usuario']
                    cursor.execute("""
                        UPDATE usuarios SET nombres = %s, tipo = 'ALUMNO', activo = 1 
                        WHERE id_usuario = %s
                    """, (nombre, id_usuario))
                else:
                    cursor.execute("""
                        INSERT INTO usuarios (correo, nombres, tipo, activo) 
                        VALUES (%s, %s, 'ALUMNO', 1)
                    """, (correo_inst, nombre))
                    id_usuario = cursor.lastrowid

                # 2. Gestionar expediente en tabla 'alumnos'
                cursor.execute("SELECT no_control FROM alumnos WHERE no_control = %s", (no_control,))
                alumno_existe = cursor.fetchone()

                cursor.execute("""
                    INSERT INTO alumnos (
                        no_control, nombre, carrera, modalidad, semestre, sexo,
                        correo_institucional, creditos_aprobados, id_carrera, id_usuario, estatus
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Activo')
                    ON DUPLICATE KEY UPDATE
                        nombre = VALUES(nombre),
                        carrera = VALUES(carrera),
                        modalidad = VALUES(modalidad),
                        semestre = VALUES(semestre),
                        sexo = VALUES(sexo),
                        correo_institucional = VALUES(correo_institucional),
                        creditos_aprobados = VALUES(creditos_aprobados),
                        id_carrera = COALESCE(VALUES(id_carrera), alumnos.id_carrera),
                        id_usuario = COALESCE(VALUES(id_usuario), alumnos.id_usuario),
                        estatus = 'Activo'
                """, (
                    no_control, nombre, carrera_clean, modalidad, semestre, sexo,
                    correo_inst, creditos_aprobados, id_carrera, id_usuario
                ))

                if alumno_existe:
                    actualizados += 1
                else:
                    insertados += 1

            except Exception as row_err:
                errores.append(f"Fila {curr_idx + 1} ({no_control}): {str(row_err)}")

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "message": "Importación completada exitosamente",
            "detalles": {
                "procesados": insertados + actualizados,
                "insertados": insertados,
                "actualizados": actualizados,
                "errores": errores
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error al procesar el archivo Excel: {str(e)}"}), 500

@admin_bp.route('/matriz-validacion', methods=['GET', 'PATCH'])
def matriz_validacion():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    if request.method == 'GET':
        try:
            cursor.execute("""
                SELECT id_documento, etapa, COALESCE(nombre, nombre_documento) as nombre, clave_formato 
                FROM catalogo_documentos 
                ORDER BY id_documento ASC
            """)
            docs = cursor.fetchall()
            etapas = {}
            for d in docs:
                etp = d['etapa'] or 'General'
                if etp not in etapas:
                    etapas[etp] = []
                etapas[etp].append(d)

            # Obtener periodo activo oficial para mapeo automático de plazos de entrega
            cursor.execute("SELECT * FROM periodos WHERE activo = 1 ORDER BY id_periodo DESC LIMIT 1")
            periodo = cursor.fetchone() or {}
            
            hoy = date.today()
            def parse_date(val):
                if not val:
                    return None
                if isinstance(val, datetime):
                    return val.date()
                if isinstance(val, date):
                    return val
                if isinstance(val, str):
                    try:
                        return datetime.strptime(val.split('T')[0], '%Y-%m-%d').date()
                    except Exception:
                        return None
                return None

            fechas_oficiales = {
                'APERTURA': parse_date(periodo.get('cierre_expediente')) or parse_date(periodo.get('apertura_expediente')),
                'BIMESTRE 1': parse_date(periodo.get('limite_entrega_bim_1')) or parse_date(periodo.get('fin_bimestre_1')),
                'BIMESTRE 2': parse_date(periodo.get('limite_entrega_bim_2')) or parse_date(periodo.get('fin_bimestre_2')),
                'BIMESTRE 3': parse_date(periodo.get('limite_entrega_bim_3')) or parse_date(periodo.get('fin_bimestre_3')),
                'LIBERACION': parse_date(periodo.get('cierre_expediente_final')) or parse_date(periodo.get('apertura_expediente_final')),
                'FINAL': parse_date(periodo.get('cierre_expediente_final')) or parse_date(periodo.get('apertura_expediente_final')),
            }

            def resolver_fecha_limite(etp_name):
                if not etp_name:
                    return None
                etp_upper = etp_name.strip().upper()
                for key, fval in fechas_oficiales.items():
                    if key in etp_upper or (key == 'LIBERACION' and ('FINAL' in etp_upper or 'TERMINACION' in etp_upper or 'CIERRE' in etp_upper)):
                        return fval
                return None

            # Metadatos informativos de cada etapa
            info_etapas = {}
            for etp_k in etapas.keys():
                flim = resolver_fecha_limite(etp_k)
                is_venc = bool(flim and hoy > flim)
                info_etapas[etp_k] = {
                    'fecha_limite': str(flim) if flim else None,
                    'fecha_limite_formato': flim.strftime('%d/%m/%Y') if flim else None,
                    'vencido': is_venc,
                    'dias_diferencia': (flim - hoy).days if flim else None
                }

            # Identificar qué documentos tienen fecha límite vencida
            doc_vencido_map = {}
            for d in docs:
                etp_doc = d.get('etapa') or 'General'
                flim = resolver_fecha_limite(etp_doc)
                doc_vencido_map[d['id_documento']] = bool(flim and hoy > flim)
                
            cursor.execute("""
                SELECT a.no_control, 
                       COALESCE(u.nombre_completo, CONCAT(u.nombres, ' ', u.apellido_paterno), a.nombre) as nombre_alumno, 
                       COALESCE(c.nombre, a.carrera) as carrera,
                       p.id_proyecto, p.nombre_proyecto, p.estatus as estatus_proyecto
                FROM alumnos a
                LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
                LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control AND p.estatus != 'CANCELADO'
                LEFT JOIN carreras c ON a.id_carrera = c.id_carrera
                ORDER BY a.no_control ASC
            """)
            alumnos = cursor.fetchall()
            
            cursor.execute("SELECT no_control, id_proyecto, id_documento, estado FROM expediente_entregas")
            entregas = cursor.fetchall()
            
            # Normalizar estados para el frontend
            status_map = {
                'APROBADO': 'APROBADO', 'Aprobado': 'APROBADO',
                'RECHAZADO': 'RECHAZADO', 'Rechazado': 'RECHAZADO',
                'EN_REVISION': 'EN_REVISION', 'En Revisión': 'EN_REVISION', 'En Revision': 'EN_REVISION',
                'DISPONIBLE': 'DISPONIBLE', 'Disponible': 'DISPONIBLE',
                'PENDIENTE': 'PENDIENTE', 'Pendiente': 'PENDIENTE',
                'BLOQUEADO': 'BLOQUEADO', 'Bloqueado': 'BLOQUEADO'
            }
            
            entregas_by_ctrl = {}
            entregas_by_proy = {}
            for e in entregas:
                norm_st = status_map.get(e['estado'], 'BLOQUEADO')
                if e.get('no_control'):
                    if e['no_control'] not in entregas_by_ctrl:
                        entregas_by_ctrl[e['no_control']] = {}
                    entregas_by_ctrl[e['no_control']][e['id_documento']] = norm_st
                if e.get('id_proyecto'):
                    if e['id_proyecto'] not in entregas_by_proy:
                        entregas_by_proy[e['id_proyecto']] = {}
                    entregas_by_proy[e['id_proyecto']][e['id_documento']] = norm_st
                
            sync_upserts = []

            for al in alumnos:
                docs_obj = {}
                nc = al['no_control']
                pid = al.get('id_proyecto')
                if nc in entregas_by_ctrl:
                    docs_obj.update(entregas_by_ctrl[nc])
                elif pid and pid in entregas_by_proy:
                    docs_obj.update(entregas_by_proy[pid])
                    
                for d in docs:
                    did = d['id_documento']
                    curr_st = docs_obj.get(did)
                    is_vencido = doc_vencido_map.get(did, False)

                    if is_vencido:
                        # Si la fecha límite oficial ha vencido y el documento no tiene
                        # una revisión formal (APROBADO, EN_REVISION, RECHAZADO),
                        # debe marcarse AUTOMÁTICAMENTE como PENDIENTE sin requerir acción manual.
                        if curr_st not in ['APROBADO', 'EN_REVISION', 'RECHAZADO']:
                            docs_obj[did] = 'PENDIENTE'
                            if curr_st != 'PENDIENTE':
                                sync_upserts.append((nc, pid, did))
                    else:
                        if did not in docs_obj:
                            docs_obj[did] = 'BLOQUEADO'

                al['documentos'] = docs_obj
                
            # Sincronizar en base de datos para mantener consistencia en reportes y consultas
            if sync_upserts:
                try:
                    for s_nc, s_pid, s_did in sync_upserts:
                        cursor.execute("""
                            INSERT INTO expediente_entregas (no_control, id_proyecto, id_documento, estado)
                            VALUES (%s, %s, %s, 'PENDIENTE')
                            ON DUPLICATE KEY UPDATE 
                                estado = IF(estado IN ('BLOQUEADO', 'DISPONIBLE'), 'PENDIENTE', estado),
                                id_proyecto = COALESCE(id_proyecto, VALUES(id_proyecto))
                        """, (s_nc, s_pid, s_did))
                    conn.commit()
                except Exception as sync_err:
                    print(f"Advertencia de sincronización automática de pendientes: {sync_err}")

            return jsonify({
                "etapas": etapas, 
                "alumnos": alumnos,
                "info_etapas": info_etapas,
                "periodo_activo": {
                    "id_periodo": periodo.get('id_periodo'),
                    "clave": periodo.get('clave'),
                    "nombre_oficial": periodo.get('nombre_oficial')
                }
            }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()
            
    elif request.method == 'PATCH':
        data = request.json or {}
        no_control = data.get('no_control')
        id_proyecto = data.get('id_proyecto')
        id_documento = data.get('id_documento')
        nuevo_estado = data.get('nuevo_estado', 'BLOQUEADO')
        
        if not no_control and id_proyecto:
            cursor.execute("SELECT no_control FROM proyectos_servicio WHERE id_proyecto = %s", (id_proyecto,))
            p_row = cursor.fetchone()
            if p_row:
                no_control = p_row['no_control']
                
        if not no_control:
            return jsonify({"error": "no_control es requerido"}), 400
            
        try:
            # Actualizar o insertar entrega asociada directamente al alumno (no_control) SIN crear proyectos falsos
            cursor.execute("SELECT id_entrega FROM expediente_entregas WHERE no_control = %s AND id_documento = %s", (no_control, id_documento))
            ent = cursor.fetchone()
            if ent:
                cursor.execute("""
                    UPDATE expediente_entregas 
                    SET estado = %s, id_proyecto = COALESCE(id_proyecto, %s)
                    WHERE no_control = %s AND id_documento = %s
                """, (nuevo_estado, id_proyecto, no_control, id_documento))
            else:
                cursor.execute("""
                    INSERT INTO expediente_entregas (no_control, id_proyecto, id_documento, estado)
                    VALUES (%s, %s, %s, %s)
                """, (no_control, id_proyecto, id_documento, nuevo_estado))
                
            conn.commit()
            return jsonify({"message": "Estado de validación actualizado exitosamente", "no_control": no_control}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            conn.close()

@admin_bp.route('/matriz-validacion/batch-documento', methods=['POST'])
def batch_update_documento():
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error de conexión a la base de datos"}), 500
        
    cursor = conn.cursor(dictionary=True)
    data = request.json or {}
    id_documento = data.get('id_documento')
    nuevo_estado = data.get('nuevo_estado', 'BLOQUEADO')
    
    if not id_documento:
        return jsonify({"error": "id_documento es requerido"}), 400
        
    try:
        cursor.execute("SELECT no_control FROM alumnos WHERE estatus = 'Activo'")
        alumnos_activos = cursor.fetchall()
        
        count = 0
        for al in alumnos_activos:
            nc = al['no_control']
            cursor.execute("SELECT id_entrega FROM expediente_entregas WHERE no_control = %s AND id_documento = %s", (nc, id_documento))
            if cursor.fetchone():
                cursor.execute("UPDATE expediente_entregas SET estado = %s WHERE no_control = %s AND id_documento = %s", (nuevo_estado, nc, id_documento))
            else:
                cursor.execute("INSERT INTO expediente_entregas (no_control, id_documento, estado) VALUES (%s, %s, %s)", (nc, id_documento, nuevo_estado))
            count += 1
            
        conn.commit()
        return jsonify({"message": f"Estado actualizado a '{nuevo_estado}' para {count} alumnos.", "count": count}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
