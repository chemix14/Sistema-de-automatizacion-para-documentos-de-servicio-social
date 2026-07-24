import os
from flask import Blueprint, request, jsonify, send_file, current_app
from database import Database
from datetime import datetime
import openpyxl
from docx import Document

generador_bp = Blueprint('generador_bp', __name__)

PLANTILLAS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'plantillas')
GENERADOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'generados')

if not os.path.exists(GENERADOS_DIR):
    os.makedirs(GENERADOS_DIR)

def get_db():
    db = Database()
    return db.get_connection()

def mes_texto(mes_num):
    meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return meses[mes_num - 1] if 1 <= mes_num <= 12 else str(mes_num)

@generador_bp.route('/generar/<clave>', methods=['GET', 'POST'])
def generar_documento(clave):
    # En un sistema real, sacar el no_control de la sesión (ej. auth JWT)
    # Por ahora, para pruebas de backend, recibiremos no_control por parámetro o body
    no_control = request.args.get('no_control') or (request.json and request.json.get('no_control'))
    
    if not no_control:
        return jsonify({"error": "Falta no_control"}), 400

    clave = clave.upper()
    conn = get_db()
    if not conn:
        return jsonify({"error": "Error DB"}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        # Extraer datos completos del alumno, proyecto y dependencia
        cursor.execute("""
            SELECT a.*, p.id_proyecto, p.nombre_proyecto, p.objetivo, p.programa_institucional,
                   p.fecha_inicio, p.fecha_fin, p.responsable_nombre, p.responsable_cargo,
                   p.supervisor_nombre, p.supervisor_cargo,
                   d.nombre as dep_nombre, d.titular as dep_titular, d.cargo_titular as dep_cargo_titular,
                   d.calle as dep_calle, d.numero_ext_int as dep_num, d.colonia as dep_colonia,
                   d.municipio as dep_municipio, d.estado as dep_estado, d.codigo_postal as dep_cp,
                   d.telefono as dep_telefono
            FROM alumnos a
            LEFT JOIN proyectos_servicio p ON a.no_control = p.no_control AND p.estatus != 'CANCELADO'
            LEFT JOIN dependencias d ON p.id_dependencia = d.id_dependencia
            WHERE a.no_control = %s
        """, (no_control,))
        datos = cursor.fetchone()

        if not datos:
            return jsonify({"error": "Alumno no encontrado"}), 404

        if not datos['id_proyecto']:
            return jsonify({"error": "El alumno no tiene un proyecto activo"}), 400

        # Obtener actividades del proyecto
        cursor.execute("SELECT descripcion FROM actividades_proyecto WHERE id_proyecto = %s ORDER BY orden LIMIT 3", (datos['id_proyecto'],))
        actividades = [row['descripcion'] for row in cursor.fetchall()]
        while len(actividades) < 3:
            actividades.append("")

        # Fechas
        f_inicio = datos.get('fecha_inicio')
        f_fin = datos.get('fecha_fin')
        f_inicio_str = f"{f_inicio.day} de {mes_texto(f_inicio.month)} de {f_inicio.year}" if f_inicio else ""
        f_fin_str = f"{f_fin.day} de {mes_texto(f_fin.month)} de {f_fin.year}" if f_fin else ""

        if clave == 'FRPS03':
            plantilla_path = os.path.join(PLANTILLAS_DIR, "F-RPS-03_ CARTA COMPROMISO.xlsx")
            if not os.path.exists(plantilla_path): return jsonify({"error": "Plantilla no encontrada"}), 404
            
            wb = openpyxl.load_workbook(plantilla_path)
            ws = wb.active
            
            ws['S5'] = str(datos.get('semestre') or "")
            
            # Map carrera
            carrera_val = str(datos.get('carrera') or "").upper()
            carreras_map = {
                'GESTIÓN EMPRESARIAL': 'S6', 'INDUSTRIAL': 'S7', 'INFORMÁTICA': 'S8',
                'SISTEMAS COMPUTACIONALES': 'S9', 'MECATRÓNICA': 'S10',
                'INDUSTRIAS ALIMENTARIAS': 'S11', 'TURISMO': 'S12', 'ANIMACIÓN DIGITAL': 'S13'
            }
            # Marcar con X la celda correspondiente
            for key, celda in carreras_map.items():
                if key in carrera_val:
                    ws[celda] = '( X )'
                    break

            ws['A11'] = f"Nombre del prestador(a) del Servicio Social: {datos.get('nombre')}"
            ws['A12'] = f"Número de Control: {datos.get('no_control')}"
            ws['E12'] = f"Domicilio: {datos.get('calle')} {datos.get('numero_ext_int') or ''} {datos.get('colonia') or ''}"
            ws['A13'] = f"Teléfono: {datos.get('telefono')}"
            ws['A14'] = f"Dependencia u Organismo: {datos.get('dep_nombre')}"
            ws['A15'] = f"Domicilio de la Dependencia: {datos.get('dep_calle')} {datos.get('dep_num') or ''} {datos.get('dep_colonia') or ''} {datos.get('dep_municipio')}"
            ws['A16'] = f"Nombre del Responsable del Programa: {datos.get('responsable_nombre')}"
            ws['C17'] = f_inicio_str
            ws['H17'] = f_fin_str
            
            hoy = datetime.now()
            ws['A21'] = f"En la ciudad de Teziutlán, Puebla al día {hoy.day}"
            ws['G21'] = mes_texto(hoy.month)

            salida_path = os.path.join(GENERADOS_DIR, f"{clave}_{no_control}.xlsx")
            wb.save(salida_path)
            return send_file(salida_path, as_attachment=True)

        elif clave == 'FRPS08':
            plantilla_path = os.path.join(PLANTILLAS_DIR, "6. F-RPS-08_ BASES DE CONCERTACIÓN.xlsx")
            if not os.path.exists(plantilla_path): return jsonify({"error": "Plantilla no encontrada"}), 404
            
            wb = openpyxl.load_workbook(plantilla_path)
            ws = wb.active
            
            ws['L8'] = str(datos.get('semestre') or "")
            
            carrera_val = str(datos.get('carrera') or "").upper()
            carreras_map = {
                'GESTIÓN EMPRESARIAL': 'N9', 'INDUSTRIAL': 'N10', 'INFORMÁTICA': 'N11',
                'SISTEMAS COMPUTACIONALES': 'N12', 'MECATRÓNICA': 'N13',
                'INDUSTRIAS ALIMENTARIAS': 'N14', 'TURISMO': 'N15', 'ANIMACIÓN DIGITAL': 'N16'
            }
            for key, celda in carreras_map.items():
                if key in carrera_val:
                    ws[celda] = '( X )'
                    break

            nombre_completo = datos.get('nombre') or ""
            partes_nombre = nombre_completo.split()
            if len(partes_nombre) >= 3:
                ws['D11'] = partes_nombre[-2]  # Paterno
                ws['G11'] = partes_nombre[-1]  # Materno
                ws['B11'] = " ".join(partes_nombre[:-2])  # Nombres
            else:
                ws['B11'] = nombre_completo
                
            ws['B13'] = datos.get('calle')
            ws['D13'] = datos.get('numero_ext_int')
            ws['F13'] = datos.get('colonia')
            ws['H13'] = datos.get('ciudad')
            ws['E14'] = f"NÚMERO DE CONTROL: {datos.get('no_control')}"
            ws['C15'] = datos.get('correo_institucional')
            ws['G15'] = f"TELÉFONO: {datos.get('telefono')}"
            
            ws['A19'] = f"NOMBRE DE LA DEPENDENCIA: {datos.get('dep_nombre')}"
            ws['A20'] = f"NOMBRE COMPLETO DEL TITULAR DE LA DEPENDENCIA: {datos.get('dep_titular')}"
            ws['A21'] = f"CARGO DEL TITULAR DE LA DEPENDENCIA: {datos.get('dep_cargo_titular')}"
            
            ws['B23'] = datos.get('dep_calle')
            ws['D23'] = datos.get('dep_num')
            ws['F23'] = datos.get('dep_colonia')
            ws['H23'] = datos.get('dep_municipio')
            ws['B25'] = datos.get('dep_estado')
            ws['D25'] = datos.get('dep_cp')
            ws['F25'] = datos.get('dep_telefono')
            
            ws['A29'] = f"NOMBRE DEL PROYECTO: {datos.get('nombre_proyecto')}"
            ws['A30'] = f"OBJETIVO: {datos.get('objetivo')}"
            ws['A31'] = f"NOMBRE DEL RESPONSABLE DEL PROYECTO EN LA DEPENDENCIA: {datos.get('responsable_nombre')}"
            ws['A32'] = f"CARGO DEL RESPONSABLE DEL PROYECTO: {datos.get('responsable_cargo')}"
            ws['A33'] = f"NOMBRE DEL SUPERVISOR DEL PROYECTO EN LA DEPENDENCIA: {datos.get('supervisor_nombre')}"
            ws['A34'] = f"CARGO DEL SUPERVISIÓN DEL PROYECTO EN LA DEPENDENCIA: {datos.get('supervisor_cargo')}"
            
            ws['A54'] = f"1.- {actividades[0]}"
            ws['A56'] = f"2.- {actividades[1]}"
            ws['A58'] = f"3.- {actividades[2]}"
            
            ws['B64'] = f_inicio_str
            ws['G64'] = f_fin_str

            salida_path = os.path.join(GENERADOS_DIR, f"{clave}_{no_control}.xlsx")
            wb.save(salida_path)
            return send_file(salida_path, as_attachment=True)

        elif clave == 'DRPS01':
            plantilla_path = os.path.join(PLANTILLAS_DIR, "4.3 D-RPS-01 Plan de Trabajo.docx")
            if not os.path.exists(plantilla_path): return jsonify({"error": "Plantilla no encontrada"}), 404
            
            cursor.execute("SELECT * FROM planes_trabajo WHERE id_proyecto = %s", (datos['id_proyecto'],))
            plan = cursor.fetchone()
            if not plan: return jsonify({"error": "El alumno no ha capturado los datos del Plan de Trabajo"}), 400

            doc = Document(plantilla_path)
            
            # Simple replace in paragraphs
            reemplazos = {
                "NOMBRE DE LA DEPENDENCIA DONDE REALIZA": datos.get('dep_nombre') or "",
                "(COLOCAR EL TÍTULO CORRECTO, EN BASE AL TÍTULO QUE ENTREGO EN SU FORMATO DE SOLICITUD DE SERVICIO SOCIAL Y QUE SE LE SELLO DE RECIBIDO)": datos.get('nombre_proyecto') or "",
                "3 DE NOVIEMBRE DE 2025 – 6 DE MAYO DE 2026": f"{f_inicio_str} - {f_fin_str}",
                "NOMBRE DEL PRESTANTE": f"NOMBRE DEL PRESTANTE: {datos.get('nombre')}",
                "NÚMERO DE CONTROL": f"NÚMERO DE CONTROL: {datos.get('no_control')}",
                "CARRERA": f"CARRERA: {datos.get('carrera')}",
                "MODALIDAD": f"MODALIDAD: {datos.get('modalidad')}",
                "(media cuartilla)": plan.get('antecedentes') or "",
                "OBJETIVO GENERAL DEL PROYECTO": "OBJETIVO GENERAL DEL PROYECTO\n" + (plan.get('objetivo_general') or ""),
                "OBJETIVOS PARTICULARES DEL PROYECTO": "OBJETIVOS PARTICULARES DEL PROYECTO\n" + (plan.get('objetivos_particulares') or ""),
                "(máximo 1 cuartilla)": plan.get('alcances') or ""
            }

            for p in doc.paragraphs:
                for k, v in reemplazos.items():
                    if k in p.text:
                        p.text = p.text.replace(k, str(v))

            # Tabla actividades
            for t in doc.tables:
                for row in t.rows:
                    for cell in row.cells:
                        if "Coloque la Actividad 1" in cell.text:
                            cell.text = cell.text.replace("Coloque la Actividad 1 del documento F-RPS-01", actividades[0])
                        elif "Coloque la Actividad 2" in cell.text:
                            cell.text = cell.text.replace("Coloque la Actividad 2 del documento F-RPS-01", actividades[1])
                        elif "Coloque la Actividad 3" in cell.text:
                            cell.text = cell.text.replace("Coloque la Actividad 3 del documento F-RPS-01", actividades[2])

            salida_path = os.path.join(GENERADOS_DIR, f"{clave}_{no_control}.docx")
            doc.save(salida_path)
            return send_file(salida_path, as_attachment=True)

        elif clave.startswith('FRPS04'):
            bimestre = 1
            if '2' in clave: bimestre = 2
            elif '3' in clave: bimestre = 3
            
            plantilla_path = os.path.join(PLANTILLAS_DIR, f"FRPS04_{bimestre}.xlsx")
            if not os.path.exists(plantilla_path): return jsonify({"error": "Plantilla no encontrada"}), 404
            
            cursor.execute("SELECT * FROM reportes_bimestrales WHERE id_proyecto = %s AND bimestre = %s", (datos['id_proyecto'], bimestre))
            reporte = cursor.fetchone()
            if not reporte: return jsonify({"error": f"No se han capturado los datos del reporte para el bimestre {bimestre}"}), 400
            
            cursor.execute("SELECT calificaciones_json, observaciones FROM evaluaciones_cualitativas WHERE id_proyecto = %s AND bimestre = %s AND tipo_evaluador = 'DEPENDENCIA'", (datos['id_proyecto'], bimestre))
            eval_dep = cursor.fetchone()
            
            wb = openpyxl.load_workbook(plantilla_path)
            ws = wb.active
            
            # Datos basicos
            partes_nombre = (datos.get('nombre') or "").split()
            if len(partes_nombre) >= 3:
                ws['C11'] = " ".join(partes_nombre[:-2])
                ws['E11'] = partes_nombre[-2]
                ws['H11'] = partes_nombre[-1]
            else:
                ws['C11'] = datos.get('nombre')
                
            ws['F12'] = f"NÚMERO DE CONTROL: {datos.get('no_control')}"
            
            carrera_val = str(datos.get('carrera') or "").upper()
            carreras_map = {
                'GESTIÓN EMPRESARIAL': 'P13', 'INDUSTRIAL': 'P14', 'INFORMÁTICA': 'P15',
                'SISTEMAS COMPUTACIONALES': 'P16', 'MECATRÓNICA': 'P17',
                'INDUSTRIAS ALIMENTARIAS': 'P18', 'TURISMO': 'P19', 'ANIMACIÓN DIGITAL': 'P20'
            }
            for key, celda in carreras_map.items():
                if key in carrera_val:
                    ws[celda] = '( X )'
                    break
            
            ws['B16'] = f"DEPENDENCIA: {datos.get('dep_nombre')}"
            ws['B17'] = f"NOMBRE DEL PROYECTO: {datos.get('nombre_proyecto')}"
            ws['B18'] = f"RESUMEN DE ACTIVIDADES: {reporte['resumen_actividades']}"
            ws['B20'] = f"TOTAL DE HORAS DE ESTE REPORTE: {reporte['horas_reporte']}"
            ws['E20'] = f"TOTAL DE HORAS ACUMULADAS: {reporte['horas_acumuladas']}"
            
            # Llenar matriz de evaluacion
            if eval_dep and eval_dep.get('calificaciones_json'):
                import json
                try:
                    calif = json.loads(eval_dep['calificaciones_json'])
                    cols = {'Insuficiente': 'E', 'Suficiente': 'F', 'Bueno': 'G', 'Notable': 'H', 'Excelente': 'I'}
                    for i in range(1, 8):
                        valor = calif.get(str(i))
                        if valor and valor in cols:
                            fila = 30 + i # 31 a 37
                            ws[f"{cols[valor]}{fila}"] = 'X'
                except:
                    pass
                if eval_dep.get('observaciones'):
                    ws['B39'] = f"OBSERVACIONES: {eval_dep['observaciones']}"

            salida_path = os.path.join(GENERADOS_DIR, f"{clave}_{no_control}.xlsx")
            wb.save(salida_path)
            return send_file(salida_path, as_attachment=True)

        elif clave.startswith('FRPS05'):
            bimestre = 1
            if '2' in clave: bimestre = 2
            elif '3' in clave: bimestre = 3
            
            plantilla_path = os.path.join(PLANTILLAS_DIR, f"FRPS05_{bimestre}.xlsx")
            if not os.path.exists(plantilla_path): return jsonify({"error": "Plantilla no encontrada"}), 404
            
            cursor.execute("SELECT calificaciones_json, respuestas_impacto_json, observaciones FROM evaluaciones_cualitativas WHERE id_proyecto = %s AND bimestre = %s AND tipo_evaluador = 'ALUMNO'", (datos['id_proyecto'], bimestre))
            eval_alu = cursor.fetchone()
            if not eval_alu: return jsonify({"error": f"No se ha capturado la autoevaluación para el bimestre {bimestre}"}), 400
            
            wb = openpyxl.load_workbook(plantilla_path)
            ws = wb.active
            
            partes_nombre = (datos.get('nombre') or "").split()
            if len(partes_nombre) >= 3:
                ws['C10'] = " ".join(partes_nombre[:-2])
                ws['E10'] = partes_nombre[-2]
                ws['H10'] = partes_nombre[-1]
            else:
                ws['C10'] = datos.get('nombre')
            
            ws['B11'] = f"NOMBRE DEL PROYECTO: {datos.get('nombre_proyecto')}"
            
            if eval_alu.get('calificaciones_json'):
                import json
                try:
                    calif = json.loads(eval_alu['calificaciones_json'])
                    cols = {'Insuficiente': 'E', 'Suficiente': 'F', 'Bueno': 'G', 'Notable': 'H', 'Excelente': 'I'}
                    for i in range(1, 8):
                        valor = calif.get(str(i))
                        if valor and valor in cols:
                            fila = 18 + i # 19 a 25
                            ws[f"{cols[valor]}{fila}"] = 'X'
                            
                    impacto = json.loads(eval_alu.get('respuestas_impacto_json') or "{}")
                    for i in range(1, 9):
                        valor = impacto.get(str(i))
                        if valor and valor in cols:
                            fila = 30 + i # 31 a 38
                            ws[f"{cols[valor]}{fila}"] = 'X'
                except:
                    pass
                if eval_alu.get('observaciones'):
                    ws['B40'] = f"OBSERVACIONES: {eval_alu['observaciones']}"

            salida_path = os.path.join(GENERADOS_DIR, f"{clave}_{no_control}.xlsx")
            wb.save(salida_path)
            return send_file(salida_path, as_attachment=True)

        else:
            return jsonify({"error": f"Formato {clave} no implementado aún"}), 501

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

