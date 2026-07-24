import os
from database import Database

def apply_schema():
    db = Database()
    conn = db.get_connection()
    if not conn:
        print("Error: Could not connect to DB")
        return

    cursor = conn.cursor()
    
    with open('schema_formularios.sql', 'r') as f:
        sql = f.read()
        
    statements = [s.strip() for s in sql.split(';') if s.strip()]
    
    try:
        for statement in statements:
            if statement.startswith('--') or statement == "": continue
            print(f"Ejecutando: {statement[:50]}...")
            cursor.execute(statement)
        conn.commit()
        print("Schema applied successfully!")
    except Exception as e:
        print(f"Error executing schema: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    apply_schema()
