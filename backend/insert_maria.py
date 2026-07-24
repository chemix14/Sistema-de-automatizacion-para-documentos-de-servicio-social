import sys
from database import Database

def add_maria():
    db = Database()
    conn = db.get_connection()
    if not conn:
        print("Error: No se pudo conectar a la base de datos.")
        sys.exit(1)
        
    cursor = conn.cursor(dictionary=True)
    try:
        correo = "l23te0048@teziutlan.tecnm.mx"
        nombres = "Maria Elena"
        apaterno = "Hernandez"
        amaterno = "Belen"
        no_control = "L23TE0048"
        
        cursor.execute("SELECT id_usuario FROM usuarios WHERE correo = %s", (correo,))
        usu = cursor.fetchone()
        
        if usu:
            print("El usuario ya existe en la tabla usuarios.")
            id_usuario = usu['id_usuario']
        else:
            cursor.execute("INSERT INTO usuarios (correo, nombres, apellido_paterno, apellido_materno, tipo) VALUES (%s, %s, %s, %s, 'ALUMNO')", (correo, nombres, apaterno, amaterno))
            id_usuario = cursor.lastrowid
            print(f"Usuario insertado con ID {id_usuario}.")
            
        cursor.execute("SELECT no_control FROM alumnos WHERE no_control = %s", (no_control,))
        alm = cursor.fetchone()
        if alm:
            print("El alumno ya existe en la tabla alumnos.")
        else:
            # Get an id_carrera
            cursor.execute("SELECT id_carrera FROM carreras LIMIT 1")
            carrera = cursor.fetchone()
            id_carrera = carrera['id_carrera'] if carrera else 1
            if not carrera:
                cursor.execute("INSERT INTO carreras (clave, nombre) VALUES ('SYS', 'Sistemas')")
                id_carrera = cursor.lastrowid
                
            cursor.execute("INSERT INTO alumnos (no_control, id_usuario, id_carrera, correo_personal) VALUES (%s, %s, %s, %s)", (no_control, id_usuario, id_carrera, correo))
            print("Alumno insertado.")
            
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    add_maria()
