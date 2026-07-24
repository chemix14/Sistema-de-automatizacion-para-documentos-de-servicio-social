import os
import openpyxl
from docx import Document

base_dir = '/home/josem/Documentos/ServisioSocial/Sistema-de-automatizacion-para-documentos-de-servicio-social-main/plantillas'

def extract_excel(filepath):
    print(f"\n--- EXCEL: {os.path.basename(filepath)} ---")
    try:
        wb = openpyxl.load_workbook(filepath, data_only=True)
        ws = wb.active
        for row in ws.iter_rows():
            for cell in row:
                if cell.value and isinstance(cell.value, str):
                    val = cell.value.strip()
                    if val and len(val) > 2:
                        print(f"{cell.coordinate}: {val}")
    except Exception as e:
        print(f"Error: {e}")

def extract_word(filepath):
    print(f"\n--- WORD: {os.path.basename(filepath)} ---")
    try:
        doc = Document(filepath)
        for i, p in enumerate(doc.paragraphs):
            txt = p.text.strip()
            if txt:
                print(f"P{i}: {txt}")
        for table in doc.tables:
            for row in table.rows:
                row_data = []
                for cell in row.cells:
                    if cell.text.strip():
                        row_data.append(cell.text.strip())
                if row_data:
                    print("Table Row:", " | ".join(row_data))
    except Exception as e:
        print(f"Error: {e}")

files = [
    "F-RPS-03_ CARTA COMPROMISO.xlsx",
    "6. F-RPS-08_ BASES DE CONCERTACIÓN.xlsx",
    "FRPS04_1.xlsx",
    "FRPS05_1.xlsx",
    "4.3 D-RPS-01 Plan de Trabajo.docx"
]

for f in files:
    path = os.path.join(base_dir, f)
    if f.endswith('.xlsx'):
        extract_excel(path)
    elif f.endswith('.docx'):
        extract_word(path)
