import sys
from database import Database

def add_maria_and_project():
    db = Database()
    conn = db.get_connection()
    if not conn:
        print("Error connecting")
        sys.exit(1)
        
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Ensure Carrera Informática exists
        cursor.execute("SELECT id_carrera FROM carreras WHERE clave = 'INF' OR nombre LIKE '%INFORMÁTICA%' LIMIT 1")
        carrera = cursor.fetchone()
        if not carrera:
            cursor.execute("INSERT INTO carreras (clave, nombre, activa) VALUES ('INF', 'INGENIERÍA INFORMÁTICA', 1)")
            id_carrera = cursor.lastrowid
        else:
            id_carrera = carrera['id_carrera']
            
        # 2. Insert User (we use l23te0048 to avoid overwriting the ADMIN l23te0037)
        correo = "l23te0048@teziutlan.tecnm.mx"
        nombres = "Maria Elena"
        apaterno = "Hernandez"
        amaterno = "Belen"
        no_control = "L23TE0048"
        
        cursor.execute("SELECT id_usuario FROM usuarios WHERE correo = %s", (correo,))
        usu = cursor.fetchone()
        if usu:
            id_usuario = usu['id_usuario']
        else:
            cursor.execute("INSERT INTO usuarios (correo, nombres, apellido_paterno, apellido_materno, tipo, activo) VALUES (%s, %s, %s, %s, 'ALUMNO', 1)", (correo, nombres, apaterno, amaterno))
            id_usuario = cursor.lastrowid
            
        # 3. Insert Alumno
        cursor.execute("SELECT no_control FROM alumnos WHERE no_control = %s", (no_control,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO alumnos (no_control, id_usuario, id_carrera, correo_personal) VALUES (%s, %s, %s, %s)", (no_control, id_usuario, id_carrera, 'maria.elena@gmail.com'))
            
        # 4. Ensure Dependencia
        cursor.execute("SELECT id_dependencia FROM dependencias LIMIT 1")
        dep = cursor.fetchone()
        if not dep:
            cursor.execute("INSERT INTO dependencias (nombre, titular, activa) VALUES ('Ayuntamiento de Teziutlán', 'Presidente Municipal', 1)")
            id_dependencia = cursor.lastrowid
        else:
            id_dependencia = dep['id_dependencia']
            
        # 5. Ensure Periodo
        cursor.execute("SELECT id_periodo FROM periodos LIMIT 1")
        per = cursor.fetchone()
        if not per:
            cursor.execute("INSERT INTO periodos (clave, nombre_oficial, activo) VALUES ('ENE-JUN-2026', 'Enero - Junio 2026', 1)")
            id_periodo = cursor.lastrowid
        else:
            id_periodo = per['id_periodo']
            
        # 6. Insert Proyecto
        cursor.execute("SELECT id_proyecto FROM proyectos_servicio WHERE no_control = %s", (no_control,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO proyectos_servicio (
                    no_control, id_dependencia, id_periodo, nombre_proyecto, objetivo,
                    modalidad, responsable_nombre, responsable_cargo, estatus
                ) VALUES (
                    %s, %s, %s, 'Sistema de Gestión de Archivos Municipales',
                    'Digitalizar y organizar el archivo histórico del municipio para un acceso rápido y seguro.',
                    'PRESENCIAL', 'Ing. Carlos Robles', 'Jefe de Sistemas', 'ACTIVO'
                )
            """, (no_control, id_dependencia, id_periodo))
            print("Proyecto creado exitosamente!")
        else:
            print("El proyecto ya existe para este alumno.")
            
        conn.commit()
        print("Todo el proceso finalizó correctamente.")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    add_maria_and_project()
