import sys
from database import Database

def check_schema():
    db = Database()
    conn = db.get_connection()
    if not conn:
        print("Error connecting")
        sys.exit(1)
    
    cursor = conn.cursor(dictionary=True)
    cursor.execute("DESCRIBE carreras;")
    columns = cursor.fetchall()
    for col in columns:
        print(col)
    
    cursor.close()
    conn.close()

if __name__ == '__main__':
    check_schema()
