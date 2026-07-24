import sys
from database import Database

def add_carreras():
    db = Database()
    conn = db.get_connection()
    if not conn:
        print("Error connecting to db")
        sys.exit(1)
        
    carreras = [
        ('IND', 'INGENIERÍA INDUSTRIAL'),
        ('INF', 'INGENIERÍA INFORMÁTICA'),
        ('MEC', 'INGENIERÍA MECATRÓNICA'),
        ('IGE', 'INGENIERÍA EN GESTIÓN EMPRESARIAL'),
        ('IIA', 'INGENIERÍA EN INDUSTRIAS ALIMENTARIAS'),
        ('ISC', 'INGENIERÍA EN SISTEMAS COMPUTACIONALES'),
        ('IADEV', 'INGENIERÍA EN ANIMACIÓN DIGITAL Y EFECTOS VISUALES'),
        ('TUR', 'LICENCIATURA EN TURISMO'),
        ('LCP', 'LICENCIATURA EN CONTADOR PÚBLICO')
    ]
    
    cursor = conn.cursor(dictionary=True)
    try:
        for clave, nombre in carreras:
            # Check if exists
            cursor.execute("SELECT id_carrera FROM carreras WHERE clave = %s", (clave,))
            if cursor.fetchone():
                print(f"Carrera {clave} already exists. Skipping.")
                continue
            
            cursor.execute("INSERT INTO carreras (clave, nombre, activa) VALUES (%s, %s, 1)", (clave, nombre))
            print(f"Inserted: {nombre} ({clave})")
            
        conn.commit()
        print("All carreras added successfully.")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    add_carreras()
