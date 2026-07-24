import sys
from database import Database

def add_user():
    db = Database()
    conn = db.get_connection()
    if not conn:
        print("Error: No se pudo conectar a la base de datos.")
        sys.exit(1)
        
    cursor = conn.cursor()
    try:
        # Primero revisamos el esquema
        cursor.execute("DESCRIBE usuarios")
        columnas = [col[0] for col in cursor.fetchall()]
        print(f"Columnas en usuarios: {columnas}")
        
        # Insertamos al usuario
        # Verificamos si existe
        correo = "l23te0037@teziutlan.tecnm.mx"
        cursor.execute("SELECT id_usuario FROM usuarios WHERE correo = %s", (correo,))
        if cursor.fetchone():
            print(f"El usuario con correo {correo} ya existe.")
            
            # Vamos a actualizar sus datos por si acaso y hacerlo ADMIN
            update_query = """
                UPDATE usuarios 
                SET nombres = %s, apellido_paterno = %s, apellido_materno = %s, tipo = %s, activo = 1
                WHERE correo = %s
            """
            cursor.execute(update_query, ("Jose Manuel", "Mendez", "Muñoz", "ADMIN", correo))
            conn.commit()
            print("Usuario actualizado correctamente a ADMIN.")
            return

        # Si no existe, lo insertamos
        # Aseguramos que tenemos los campos correctos (asumimos nombres, apellido_paterno, apellido_materno, correo, tipo, activo)
        # Algunos esquemas tienen nombre en lugar de nombres, etc. Así que vamos a construir la consulta
        
        campos = []
        valores = []
        
        if 'nombres' in columnas:
            campos.append('nombres')
        elif 'nombre' in columnas:
            campos.append('nombre')
            
        valores.append("Jose Manuel")
        
        if 'apellido_paterno' in columnas:
            campos.append('apellido_paterno')
            valores.append("Mendez")
            
        if 'apellido_materno' in columnas:
            campos.append('apellido_materno')
            valores.append("Muñoz")
            
        campos.extend(['correo', 'tipo', 'activo'])
        valores.extend([correo, 'ADMIN', 1])
        
        placeholders = ', '.join(['%s'] * len(valores))
        campos_str = ', '.join(campos)
        
        insert_query = f"INSERT INTO usuarios ({campos_str}) VALUES ({placeholders})"
        cursor.execute(insert_query, tuple(valores))
        conn.commit()
        
        print("Usuario insertado correctamente como ADMIN.")
        
    except Exception as e:
        print(f"Error en la operación: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    add_user()
