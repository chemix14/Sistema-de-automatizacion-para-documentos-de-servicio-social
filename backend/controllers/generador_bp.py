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

def safe_set_cell(ws, coord, value):
    if not coord or value is None:
        return
    try:
        cell = ws[coord]
        if isinstance(cell, openpyxl.cell.cell.MergedCell):
            for merge_range in ws.merged_cells.ranges:
                if coord in merge_range:
                    ws.cell(row=merge_range.min_row, column=merge_range.min_col, value=value)
                    return
        cell.value = value
    except Exception:
        pass

@generador_bp.route('/generar/<clave>', methods=['GET', 'POST'])
def generar_documento(clave):
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
                   d.telefono as dep_telefono, d.correo as dep_correo
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

        if clave == 'FRPS01':
            plantilla_path = os.path.join(PLANTILLAS_DIR, "F-RPS-01_SOLICITUD DE SERVICIO SOCIAL.xlsx")
            if not os.path.exists(plantilla_path): 
                plantilla_path = os.path.join(PLANTILLAS_DIR, "F-RPS-01_SOLICITUD_DE_SERVICIO_SOCIAL.xlsx")
            if not os.path.exists(plantilla_path): return jsonify({"error": "Plantilla F-RPS-01 no encontrada"}), 404
            
            wb = openpyxl.load_workbook(plantilla_path)
            ws = wb.active

            # 1. Datos Personales
            safe_set_cell(ws, 'C12', str(datos.get('nombre') or ""))
            safe_set_cell(ws, 'I12', str(datos.get('sexo') or ""))
            safe_set_cell(ws, 'B13', str(datos.get('telefono') or ""))
            safe_set_cell(ws, 'E13', f"{datos.get('calle') or ''} {datos.get('numero_ext_int') or ''} {datos.get('colonia') or ''}".strip())
            safe_set_cell(ws, 'C14', str(datos.get('ciudad') or "Teziutlán"))
            safe_set_cell(ws, 'F14', str(datos.get('estado') or "Puebla"))
            safe_set_cell(ws, 'H14', str(datos.get('correo_institucional') or ""))
            safe_set_cell(ws, 'B15', str(datos.get('correo_personal') or ""))

            # 2. Escolaridad
            safe_set_cell(ws, 'B18', str(datos.get('no_control') or ""))
            safe_set_cell(ws, 'E18', str(datos.get('carrera') or ""))
            safe_set_cell(ws, 'E19', str(datos.get('semestre') or "7"))
            safe_set_cell(ws, 'B19', str(datos.get('periodo') or "ENE-JUN-2026"))

            # 3. Datos del Proyecto
            safe_set_cell(ws, 'C21', str(datos.get('nombre_proyecto') or ""))
            safe_set_cell(ws, 'C23', f_inicio_str)
            safe_set_cell(ws, 'C24', f_fin_str)

            # 4. Dependencia
            safe_set_cell(ws, 'C26', str(datos.get('dep_nombre') or ""))
            safe_set_cell(ws, 'C27', str(datos.get('dep_titular') or ""))
            safe_set_cell(ws, 'C28', str(datos.get('dep_cargo_titular') or ""))
            safe_set_cell(ws, 'C30', str(datos.get('responsable_nombre') or ""))
            safe_set_cell(ws, 'C31', str(datos.get('responsable_cargo') or ""))
            safe_set_cell(ws, 'C32', str(datos.get('supervisor_nombre') or ""))
            safe_set_cell(ws, 'C33', str(datos.get('supervisor_cargo') or ""))
            safe_set_cell(ws, 'C34', str(datos.get('dep_telefono') or ""))
            safe_set_cell(ws, 'C35', f"{datos.get('dep_calle') or ''} {datos.get('dep_num') or ''} {datos.get('dep_colonia') or ''}".strip())
            safe_set_cell(ws, 'C36', str(datos.get('dep_municipio') or "Teziutlán"))
            safe_set_cell(ws, 'C37', str(datos.get('dep_estado') or "Puebla"))
            safe_set_cell(ws, 'C38', str(datos.get('dep_correo') or ""))

            # Actividades
            safe_set_cell(ws, 'A35', f"1.- {actividades[0]}" if actividades[0] else "")
            safe_set_cell(ws, 'A36', f"2.- {actividades[1]}" if actividades[1] else "")
            safe_set_cell(ws, 'A37', f"3.- {actividades[2]}" if actividades[2] else "")

            salida_path = os.path.join(GENERADOS_DIR, f"{clave}_{no_control}.xlsx")
            wb.save(salida_path)
            return send_file(salida_path, as_attachment=True)

        elif clave in ['FRPS03', 'CARTAC']:
            plantilla_path = os.path.join(PLANTILLAS_DIR, "3._F-RPS-03__CARTA_COMPROMISO.xlsx")
            if not os.path.exists(plantilla_path): return jsonify({"error": "Plantilla no encontrada"}), 404
            
            wb = openpyxl.load_workbook(plantilla_path)
            ws = wb.active
            
            safe_set_cell(ws, 'S5', str(datos.get('semestre') or ""))
            
            # Map carrera
            carrera_val = str(datos.get('carrera') or "").upper()
            carreras_map = {
                'GESTIÓN EMPRESARIAL': 'S6', 'INDUSTRIAL': 'S7', 'INFORMÁTICA': 'S8',
                'SISTEMAS COMPUTACIONALES': 'S9', 'MECATRÓNICA': 'S10',
                'INDUSTRIAS ALIMENTARIAS': 'S11', 'TURISMO': 'S12', 'ANIMACIÓN DIGITAL': 'S13'
            }
            for key, celda in carreras_map.items():
                if key in carrera_val:
                    safe_set_cell(ws, celda, '( X )')
                    break

            safe_set_cell(ws, 'A11', f"Nombre del prestador(a) del Servicio Social: {datos.get('nombre')}")
            safe_set_cell(ws, 'A12', f"Número de Control: {datos.get('no_control')}")
            safe_set_cell(ws, 'E12', f"Domicilio: {datos.get('calle') or ''} {datos.get('numero_ext_int') or ''} {datos.get('colonia') or ''}")
            safe_set_cell(ws, 'A13', f"Teléfono: {datos.get('telefono')}")
            safe_set_cell(ws, 'A14', f"Dependencia u Organismo: {datos.get('dep_nombre')}")
            safe_set_cell(ws, 'A15', f"Domicilio de la Dependencia: {datos.get('dep_calle') or ''} {datos.get('dep_num') or ''} {datos.get('dep_colonia') or ''} {datos.get('dep_municipio') or ''}")
            safe_set_cell(ws, 'A16', f"Nombre del Responsable del Programa: {datos.get('responsable_nombre')}")
            safe_set_cell(ws, 'C17', f_inicio_str)
            safe_set_cell(ws, 'H17', f_fin_str)
            
            hoy = datetime.now()
            safe_set_cell(ws, 'A21', f"En la ciudad de Teziutlán, Puebla al día {hoy.day}")
            safe_set_cell(ws, 'G21', mes_texto(hoy.month))

            salida_path = os.path.join(GENERADOS_DIR, f"{clave}_{no_control}.xlsx")
            wb.save(salida_path)
            return send_file(salida_path, as_attachment=True)

        elif clave in ['FRPS08', 'BASES']:
            plantilla_path = os.path.join(PLANTILLAS_DIR, "6._F-RPS-08__BASES_DE_CONCERTACION.xlsx")
            if not os.path.exists(plantilla_path): return jsonify({"error": "Plantilla no encontrada"}), 404
            
            wb = openpyxl.load_workbook(plantilla_path)
            ws = wb.active
            
            safe_set_cell(ws, 'L8', str(datos.get('semestre') or ""))
            
            carrera_val = str(datos.get('carrera') or "").upper()
            carreras_map = {
                'GESTIÓN EMPRESARIAL': 'N9', 'INDUSTRIAL': 'N10', 'INFORMÁTICA': 'N11',
                'SISTEMAS COMPUTACIONALES': 'N12', 'MECATRÓNICA': 'N13',
                'INDUSTRIAS ALIMENTARIAS': 'N14', 'TURISMO': 'N15', 'ANIMACIÓN DIGITAL': 'N16'
            }
            for key, celda in carreras_map.items():
                if key in carrera_val:
                    safe_set_cell(ws, celda, '( X )')
                    break

            nombre_completo = datos.get('nombre') or ""
            partes_nombre = nombre_completo.split()
            if len(partes_nombre) >= 3:
                safe_set_cell(ws, 'D11', partes_nombre[-2])
                safe_set_cell(ws, 'G11', partes_nombre[-1])
                safe_set_cell(ws, 'B11', " ".join(partes_nombre[:-2]))
            else:
                safe_set_cell(ws, 'B11', nombre_completo)

            safe_set_cell(ws, 'I11', str(datos.get('no_control') or ""))
            safe_set_cell(ws, 'B13', str(datos.get('calle') or ""))
            safe_set_cell(ws, 'D13', str(datos.get('numero_ext_int') or ""))
            safe_set_cell(ws, 'F13', str(datos.get('colonia') or ""))
            safe_set_cell(ws, 'H13', str(datos.get('municipio') or 'Teziutlán'))
            safe_set_cell(ws, 'B15', str(datos.get('estado') or 'Puebla'))
            safe_set_cell(ws, 'D15', str(datos.get('codigo_postal') or ""))
            safe_set_cell(ws, 'F15', str(datos.get('telefono') or ""))
            
            safe_set_cell(ws, 'A19', f"NOMBRE DE LA DEPENDENCIA: {datos.get('dep_nombre') or ''}")
            safe_set_cell(ws, 'A20', f"NOMBRE COMPLETO DEL TITULAR DE LA DEPENDENCIA: {datos.get('dep_titular') or ''}")
            safe_set_cell(ws, 'A21', f"CARGO DEL TITULAR DE LA DEPENDENCIA: {datos.get('dep_cargo_titular') or ''}")
            
            safe_set_cell(ws, 'B23', str(datos.get('dep_calle') or ""))
            safe_set_cell(ws, 'D23', str(datos.get('dep_num') or ""))
            safe_set_cell(ws, 'F23', str(datos.get('dep_colonia') or ""))
            safe_set_cell(ws, 'H23', str(datos.get('dep_municipio') or ""))
            safe_set_cell(ws, 'B25', str(datos.get('dep_estado') or ""))
            safe_set_cell(ws, 'D25', str(datos.get('dep_cp') or ""))
            safe_set_cell(ws, 'F25', str(datos.get('dep_telefono') or ""))
            
            safe_set_cell(ws, 'A29', f"NOMBRE DEL PROYECTO: {datos.get('nombre_proyecto') or ''}")
            safe_set_cell(ws, 'A30', f"OBJETIVO: {datos.get('objetivo') or ''}")
            safe_set_cell(ws, 'A31', f"NOMBRE DEL RESPONSABLE DEL PROYECTO EN LA DEPENDENCIA: {datos.get('responsable_nombre') or ''}")
            safe_set_cell(ws, 'A32', f"CARGO DEL RESPONSABLE DEL PROYECTO: {datos.get('responsable_cargo') or ''}")
            safe_set_cell(ws, 'A33', f"NOMBRE DEL SUPERVISOR DEL PROYECTO EN LA DEPENDENCIA: {datos.get('supervisor_nombre') or ''}")
            safe_set_cell(ws, 'A34', f"CARGO DEL SUPERVISIÓN DEL PROYECTO EN LA DEPENDENCIA: {datos.get('supervisor_cargo') or ''}")
            
            safe_set_cell(ws, 'A54', f"1.- {actividades[0]}" if actividades[0] else "")
            safe_set_cell(ws, 'A56', f"2.- {actividades[1]}" if actividades[1] else "")
            safe_set_cell(ws, 'A58', f"3.- {actividades[2]}" if actividades[2] else "")
            
            safe_set_cell(ws, 'B64', f_inicio_str)
            safe_set_cell(ws, 'G64', f_fin_str)

            salida_path = os.path.join(GENERADOS_DIR, f"{clave}_{no_control}.xlsx")
            wb.save(salida_path)
            return send_file(salida_path, as_attachment=True)

        elif clave in ['DRPS01', 'PLANDE']:
            plantilla_path = os.path.join(PLANTILLAS_DIR, "4.3_D-RPS-01_Plan_de_Trabajo.doc")
            if not os.path.exists(plantilla_path): return jsonify({"error": "Plantilla no encontrada"}), 404
            return send_file(plantilla_path, as_attachment=True, download_name=f"Plan_Trabajo_{no_control}.doc")

        elif clave.startswith('FRPS04') or clave.startswith('REPORT'):
            bimestre = 1
            if '2' in clave: bimestre = 2
            elif '3' in clave: bimestre = 3
            
            if bimestre == 1:
                plantilla_path = os.path.join(PLANTILLAS_DIR, "7._F-RPS-04__REPORTE_BIMESTRAL_DE_SERVICIO_SOCIAL_1er_Bimestre1.xlsx")
            elif bimestre == 2:
                plantilla_path = os.path.join(PLANTILLAS_DIR, "7._F-RPS-04__REPORTE_BIMESTRAL_DE_SERVICIO_SOCIAL_2er_Bimestre.xlsx")
            else:
                plantilla_path = os.path.join(PLANTILLAS_DIR, "7._F-RPS-04__REPORTE_BIMESTRAL_DE_SERVICIO_SOCIAL_3er_Bimestre.xlsx")
                
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

        elif clave.startswith('FRPS05') or clave.startswith('AUTOEV'):
            bimestre = 1
            if '2' in clave: bimestre = 2
            elif '3' in clave: bimestre = 3
            
            if bimestre == 1:
                plantilla_path = os.path.join(PLANTILLAS_DIR, "8._F-RPS-05__AUTOEVALUACION_CUALITATIVA_1er_Bimestre1.xlsx")
            elif bimestre == 2:
                plantilla_path = os.path.join(PLANTILLAS_DIR, "COPIA_132880_7._F-RPS-04__REPORTE_BIME.xlsx")
            else:
                plantilla_path = os.path.join(PLANTILLAS_DIR, "COPIA_206002_COPIA_132880_7._F-RPS-04_.xlsx")
                
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

