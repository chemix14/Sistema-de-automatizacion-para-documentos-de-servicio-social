from database import Database

db = Database()
conn = db.get_connection()
cursor = conn.cursor()
cursor.execute("DESCRIBE proyectos_servicio;")
for row in cursor.fetchall():
    print(row)
cursor.execute("DESCRIBE expediente_entregas;")
for row in cursor.fetchall():
    print(row)
