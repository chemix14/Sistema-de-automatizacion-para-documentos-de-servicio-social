-- ==============================================================================
-- PROYECTO: Plataforma Web de Gestión de Servicio Social - ITST
-- ESQUEMA CORREGIDO Y COMPATIBLE AL 100% CON LA APLICACIÓN
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS servicio_social_itst CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE servicio_social_itst;

-- Desactivar llaves foráneas temporalmente para recrear limpio
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS configuracion_mapeo_valores;
DROP TABLE IF EXISTS configuracion_campos;
DROP TABLE IF EXISTS campos_formulario;
DROP TABLE IF EXISTS secciones_documento;
DROP TABLE IF EXISTS secciones;
DROP TABLE IF EXISTS expediente_entregas;
DROP TABLE IF EXISTS catalogo_documentos;
DROP TABLE IF EXISTS documentos;
DROP TABLE IF EXISTS actividades_proyecto;
DROP TABLE IF EXISTS proyectos_servicio;
DROP TABLE IF EXISTS dependencias;
DROP TABLE IF EXISTS alumnos;
DROP TABLE IF EXISTS administradores;
DROP TABLE IF EXISTS configuracion_sistema;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 1. CONFIGURACIÓN GLOBAL DEL SISTEMA Y CALENDARIO
-- ==============================================================================
CREATE TABLE configuracion_sistema (
    id INT PRIMARY KEY DEFAULT 1,
    periodo_oficial VARCHAR(100) DEFAULT 'FEBRERO – JUNIO 2026',
    limite_expediente_inicial DATE NULL,
    inicio_bimestre_1 DATE NULL,
    fin_bimestre_1 DATE NULL,
    limite_bimestre_1 DATE NULL,
    inicio_bimestre_2 DATE NULL,
    fin_bimestre_2 DATE NULL,
    limite_bimestre_2 DATE NULL,
    inicio_bimestre_3 DATE NULL,
    fin_bimestre_3 DATE NULL,
    limite_bimestre_3 DATE NULL,
    limite_expediente_final DATE NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fila obligatoria por defecto (ID = 1)
INSERT INTO configuracion_sistema (id, periodo_oficial) 
VALUES (1, 'FEBRERO – JUNIO 2026') 
ON DUPLICATE KEY UPDATE id=1;

-- ==============================================================================
-- 2. USUARIOS Y ADMINISTRADORES
-- ==============================================================================
CREATE TABLE administradores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    rol ENUM('SuperAdmin', 'Administrador', 'Revisor') DEFAULT 'Administrador',
    activo BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar administrador inicial por defecto
INSERT INTO administradores (nombre, correo, rol, activo)
VALUES 
('Administrador Servicio Social', 'l23te0037@teziutlan.tecnm.mx', 'SuperAdmin', TRUE)
ON DUPLICATE KEY UPDATE correo=correo;

-- ==============================================================================
-- 3. ALUMNOS
-- ==============================================================================
CREATE TABLE alumnos (
    no_control VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    carrera VARCHAR(100) NOT NULL,
    semestre VARCHAR(20) NOT NULL,
    sexo VARCHAR(20) NULL,
    telefono VARCHAR(20) NULL,
    calle VARCHAR(150) NULL,
    colonia VARCHAR(150) NULL,
    ciudad VARCHAR(100) NULL,
    estado VARCHAR(100) NULL,
    domicilio TEXT NULL,
    correo_institucional VARCHAR(100) NULL,
    correo_personal VARCHAR(100) NULL,
    periodos_cursados INT DEFAULT 0,
    creditos_aprobados INT DEFAULT 0,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estatus ENUM('Activo', 'Finalizado', 'Cancelado') DEFAULT 'Activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 4. DEPENDENCIAS E INSTITUCIONES
-- ==============================================================================
CREATE TABLE dependencias (
    id_dependencia INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    titular VARCHAR(150) NULL,
    cargo_titular VARCHAR(150) NULL,
    calle VARCHAR(150) NULL,
    num_ext_int VARCHAR(50) NULL,
    colonia VARCHAR(150) NULL,
    municipio VARCHAR(100) NULL,
    ciudad VARCHAR(100) NULL,
    estado VARCHAR(100) NULL,
    codigo_postal VARCHAR(10) NULL,
    telefono VARCHAR(30) NULL,
    correo VARCHAR(100) NULL,
    activa BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 5. PROYECTOS DE SERVICIO SOCIAL
-- ==============================================================================
CREATE TABLE proyectos_servicio (
    id_proyecto INT AUTO_INCREMENT PRIMARY KEY,
    no_control VARCHAR(20) NOT NULL,
    id_dependencia INT NOT NULL,
    nombre_proyecto VARCHAR(255) NOT NULL,
    periodo VARCHAR(50) NULL,
    fecha_inicio DATE NULL,
    fecha_fin DATE NULL,
    modalidad VARCHAR(50) NULL,
    programa_institucional VARCHAR(100) NULL,
    tipo_programa VARCHAR(100) NULL,
    responsable_proyecto VARCHAR(150) NULL,
    cargo_responsable VARCHAR(150) NULL,
    supervisor_proyecto VARCHAR(150) NULL,
    cargo_supervisor VARCHAR(150) NULL,
    objetivo TEXT NULL,
    estatus ENUM('Activo', 'Finalizado', 'Cancelado') DEFAULT 'Activo',
    
    FOREIGN KEY (no_control) REFERENCES alumnos(no_control) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_dependencia) REFERENCES dependencias(id_dependencia) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 6. CRONOGRAMA DE ACTIVIDADES
-- ==============================================================================
CREATE TABLE actividades_proyecto (
    id_actividad INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    orden INT DEFAULT 1,
    descripcion TEXT NOT NULL,
    tipo ENUM('actividad', 'subactividad') DEFAULT 'actividad',
    b1 BOOLEAN DEFAULT FALSE,
    b2 BOOLEAN DEFAULT FALSE,
    b3 BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (id_proyecto) REFERENCES proyectos_servicio(id_proyecto) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 7. CATÁLOGO DE DOCUMENTOS Y FORMATOS OFICIALES
-- ==============================================================================
CREATE TABLE catalogo_documentos (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    clave_formato VARCHAR(50) NOT NULL UNIQUE,
    nombre_documento VARCHAR(200) NOT NULL,
    etapa ENUM('Apertura', 'Bimestral', 'Liberacion') NOT NULL,
    ruta_archivo_excel VARCHAR(255) NULL,
    plantilla_excel VARCHAR(255) NULL,
    orden_en_etapa INT DEFAULT 1,
    activo BOOLEAN DEFAULT TRUE,
    fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar catálogo oficial de documentos
INSERT INTO catalogo_documentos (id_documento, clave_formato, nombre_documento, etapa, ruta_archivo_excel) VALUES
(1, 'FRPS01', 'Solicitud de Servicio Social (F-RPS-01)', 'Apertura', 'F-RPS-01_SOLICITUD DE SERVICIO SOCIAL.xlsx'),
(2, 'FRPS03', 'Carta Compromiso de Servicio Social (F-RPS-03)', 'Apertura', 'F-RPS-03_ CARTA COMPROMISO.xlsx'),
(3, 'DRPS01', 'Plan de Trabajo de Servicio Social (D-RPS-01)', 'Apertura', '4.3 D-RPS-01 Plan de Trabajo.docx'),
(4, 'FRPS08', 'Bases de Concertación (F-RPS-08)', 'Apertura', '6. F-RPS-08_ BASES DE CONCERTACIÓN.xlsx'),
(5, 'FRPS04_1', 'Reporte Bimestral 1 (F-RPS-04)', 'Bimestral', '7. F-RPS-04_ REPORTE BIMESTRAL DE SERVICIO SOCIAL_1er Bimestre.xlsx'),
(6, 'FRPS05_1', 'Autoevaluación Cualitativa Bimestre 1 (F-RPS-05)', 'Bimestral', '8. F-RPS-05_ AUTOEVALUACION CUALITATIVA_1er Bimestre.xlsx'),
(7, 'FRPS04_2', 'Reporte Bimestral 2 (F-RPS-04)', 'Bimestral', 'FRPS04_2.xlsx'),
(8, 'FRPS05_2', 'Autoevaluación Cualitativa Bimestre 2 (F-RPS-05)', 'Bimestral', 'FRPS05_2.xlsx'),
(9, 'FRPS04_3', 'Reporte Bimestral 3 (F-RPS-04)', 'Bimestral', 'FRPS04_3.xlsx'),
(10, 'FRPS05_3', 'Autoevaluación Cualitativa Bimestre 3 (F-RPS-05)', 'Bimestral', 'FRPS05_3.xlsx'),
(11, 'DRPS02', 'Reporte Final de Servicio Social (D-RPS-02)', 'Liberacion', NULL)
ON DUPLICATE KEY UPDATE nombre_documento=VALUES(nombre_documento);

-- ==============================================================================
-- 8. EXPEDIENTE DE ENTREGAS
-- ==============================================================================
CREATE TABLE expediente_entregas (
    id_entrega INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_documento INT NOT NULL,
    estado ENUM('Bloqueado', 'Pendiente', 'En Revisión', 'Aprobado', 'Rechazado') DEFAULT 'Pendiente',
    ruta_archivo VARCHAR(255) NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    observaciones TEXT NULL,
    
    UNIQUE KEY uq_proyecto_documento (id_proyecto, id_documento),
    FOREIGN KEY (id_proyecto) REFERENCES proyectos_servicio(id_proyecto) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_documento) REFERENCES catalogo_documentos(id_documento) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 9. SECCIONES DE FORMULARIOS DINÁMICOS
-- ==============================================================================
CREATE TABLE secciones_documento (
    id_seccion INT AUTO_INCREMENT PRIMARY KEY,
    id_documento INT NOT NULL,
    titulo_seccion VARCHAR(150) NOT NULL,
    orden_seccion INT DEFAULT 1,
    
    FOREIGN KEY (id_documento) REFERENCES catalogo_documentos(id_documento) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Secciones para F-RPS-01
INSERT INTO secciones_documento (id_seccion, id_documento, titulo_seccion, orden_seccion) VALUES
(1, 1, '1. DATOS PERSONALES', 1),
(2, 1, '2. ESCOLARIDAD', 2),
(3, 1, '3. DATOS DEL PROYECTO', 3),
(4, 1, '4. DATOS DE LA INSTITUCIÓN/DEPENDENCIA (UBICACIÓN)', 4),
(5, 1, '5. TIPO DE PROGRAMA', 5),
(6, 1, '6. PARA USO EXCLUSIVO DEL DEPARTAMENTO', 6)
ON DUPLICATE KEY UPDATE titulo_seccion=VALUES(titulo_seccion);

-- ==============================================================================
-- 10. CAMPOS DE FORMULARIOS DINÁMICOS
-- ==============================================================================
CREATE TABLE configuracion_campos (
    id_campo INT AUTO_INCREMENT PRIMARY KEY,
    id_documento INT NOT NULL,
    id_seccion INT NULL,
    orden INT DEFAULT 1,
    
    -- Configuración Visual
    label_web VARCHAR(255) NOT NULL,
    nombre_variable VARCHAR(100) NOT NULL,
    tipo_input VARCHAR(50) DEFAULT 'text',
    clase_bootstrap VARCHAR(50) DEFAULT 'col-md-6',
    celda_excel VARCHAR(20) NULL,
    opciones_json JSON NULL,
    placeholder VARCHAR(255) NULL,
    texto_ayuda VARCHAR(255) NULL,
    es_readonly BOOLEAN DEFAULT FALSE,
    
    -- Autollenado DB
    tabla_origen VARCHAR(100) NULL,
    columna_origen VARCHAR(100) NULL,
    
    -- Lógica Avanzada
    reglas_transformacion JSON NULL,
    accion_web VARCHAR(50) NULL,
    valor_condicion VARCHAR(100) NULL,
    campo_objetivo VARCHAR(100) NULL,
    
    FOREIGN KEY (id_documento) REFERENCES catalogo_documentos(id_documento) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (id_seccion) REFERENCES secciones_documento(id_seccion) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserción de campos preconfigurados para F-RPS-01
INSERT INTO configuracion_campos 
(id_campo, id_documento, id_seccion, orden, label_web, nombre_variable, tipo_input, clase_bootstrap, celda_excel, opciones_json, placeholder, texto_ayuda, es_readonly, tabla_origen, columna_origen, reglas_transformacion, accion_web, valor_condicion, campo_objetivo)
VALUES
(1, 1, 1, 1, 'Nombre Completo', 'nombre_alumno', 'text', 'col-md-8', 'C12', NULL, 'Apellido Paterno Materno Nombres', NULL, 0, 'alumnos', 'nombre', NULL, NULL, NULL, NULL),
(2, 1, 1, 2, 'Sexo', 'sexo', 'select', 'col-md-4', 'I12', '["HOMBRE", "MUJER"]', NULL, NULL, 0, 'alumnos', 'sexo', NULL, NULL, NULL, NULL),
(3, 1, 1, 3, 'Teléfono', 'telefono', 'text', 'col-md-4', 'B13', NULL, '10 dígitos', NULL, 0, 'alumnos', 'telefono', NULL, NULL, NULL, NULL),
(4, 1, 1, 4, 'Domicilio (Calle, Número, Colonia)', 'domicilio', 'text', 'col-md-8', 'E13', NULL, 'Calle, Número y Colonia', NULL, 0, 'alumnos', 'calle', NULL, NULL, NULL, NULL),
(5, 1, 1, 5, 'Ciudad/Pueblo', 'ciudad', 'text', 'col-md-8', 'C14', NULL, NULL, NULL, 0, 'alumnos', 'ciudad', NULL, NULL, NULL, NULL),
(6, 1, 1, 6, 'Estado', 'estado', 'text', 'col-md-4', 'F14', NULL, 'Ej: Puebla', NULL, 0, 'alumnos', 'estado', NULL, NULL, NULL, NULL),
(7, 1, 1, 7, 'Correo Institucional (Automático)', 'correo_inst', 'text', 'col-md-6', 'H14', NULL, NULL, NULL, 1, 'alumnos', 'correo_institucional', NULL, NULL, NULL, NULL),
(8, 1, 1, 8, 'Correo Personal', 'correo_per', 'text', 'col-md-6', 'B15', NULL, 'correo@ejemplo.com', NULL, 0, 'alumnos', 'correo_personal', NULL, NULL, NULL, NULL),
(9, 1, 2, 1, 'Número de Control', 'no_control', 'text', 'col-md-4', 'B18', NULL, 'Ej: 23TE0037', NULL, 1, 'alumnos', 'no_control', NULL, NULL, NULL, NULL),
(10, 1, 2, 2, 'Carrera', 'carrera', 'select', 'col-md-8', 'E18', '["INFORMÁTICA", "SISTEMAS COMPUTACIONALES", "INDUSTRIAL", "GESTIÓN EMPRESARIAL", "MECATRÓNICA", "INDUSTRIAS ALIMENTARIAS", "ANIMACIÓN DIGITAL", "TURISMO"]', 'Selecciona la carrera...', NULL, 0, 'alumnos', 'carrera', NULL, NULL, NULL, NULL),
(11, 1, 2, 3, 'Semestre', 'semestre', 'select', 'col-md-6', 'E19', '["7", "8", "9", "10", "11", "12"]', NULL, NULL, 0, 'alumnos', 'semestre', NULL, NULL, NULL, NULL),
(12, 1, 2, 4, 'Periodo', 'periodo', 'text', 'col-md-6', 'B19', NULL, 'Ej: AGO-DIC 2025', NULL, 0, 'proyectos_servicio', 'periodo', NULL, NULL, NULL, NULL),
(13, 1, 3, 1, 'Nombre del Proyecto', 'nombre_proyecto', 'text', 'col-12', 'C21', NULL, 'Nombre oficial del proyecto', 'Tal cual aparece en tu carta de aceptación.', 0, 'proyectos_servicio', 'nombre_proyecto', NULL, NULL, NULL, NULL),
(14, 1, 3, 2, 'Nombre de la Dependencia (Oficial)', 'nombre_dep', 'text', 'col-md-6', 'C26', NULL, 'Ej: H. Ayuntamiento de Teziutlán', NULL, 0, 'dependencias', 'nombre', NULL, NULL, NULL, NULL),
(15, 1, 3, 3, 'Titular de la Dependencia', 'titular_dep', 'text', 'col-md-6', 'C27', NULL, 'Nombre con grado (Lic., Ing.)', NULL, 0, 'dependencias', 'titular', NULL, NULL, NULL, NULL),
(16, 1, 3, 4, 'Cargo del Titular', 'cargo_titular', 'text', 'col-md-6', 'C28', NULL, 'Ej: Director General', NULL, 0, 'dependencias', 'cargo_titular', NULL, NULL, NULL, NULL),
(17, 1, 3, 5, 'Responsable del Programa (Jefe directo)', 'resp_proy', 'text', 'col-md-6', 'C30', NULL, 'Nombre completo', NULL, 0, 'proyectos_servicio', 'responsable_proyecto', NULL, NULL, NULL, NULL),
(18, 1, 3, 6, 'Cargo del Responsable del Programa', 'cargo_resp', 'text', 'col-md-6', 'C31', NULL, 'Cargo del jefe directo', NULL, 0, 'proyectos_servicio', 'cargo_responsable', NULL, NULL, NULL, NULL),
(19, 1, 3, 7, 'Nombre del Supervisor del Programa', 'sup_proy', 'text', 'col-md-6', 'C32', NULL, 'Nombre con grado (Lic., Ing.)', NULL, 0, 'proyectos_servicio', 'supervisor_proyecto', NULL, NULL, NULL, NULL),
(20, 1, 3, 8, 'Cargo del Supervisor del Programa', 'cargo_sup', 'text', 'col-md-6', 'C33', NULL, 'Cargo del supervisor', NULL, 0, 'proyectos_servicio', 'cargo_supervisor', NULL, NULL, NULL, NULL),
(21, 1, 3, 9, 'Modalidad de Servicio Social', 'modalidad', 'select', 'col-md-6', 'XX', '["Presencial", "Educación a distancia"]', NULL, NULL, 0, 'proyectos_servicio', 'modalidad', NULL, NULL, NULL, NULL),
(22, 1, 3, 10, 'Fecha de Inicio', 'fecha_inicio', 'date', 'col-md-6', 'C23', NULL, NULL, NULL, 0, 'proyectos_servicio', 'fecha_inicio', NULL, NULL, NULL, NULL),
(23, 1, 3, 11, 'Fecha de Fin', 'fecha_fin', 'date', 'col-md-6', 'C24', NULL, NULL, NULL, 0, 'proyectos_servicio', 'fecha_fin', NULL, NULL, NULL, NULL),
(24, 1, 3, 12, 'Actividad 1', 'act1', 'text', 'col-12', 'A35', NULL, 'Describe la primera actividad...', NULL, 0, 'actividades_proyecto', '1', NULL, NULL, NULL, NULL),
(25, 1, 3, 13, 'Actividad 2', 'act2', 'text', 'col-12', 'A36', NULL, 'Describe la segunda actividad...', NULL, 0, 'actividades_proyecto', '2', NULL, NULL, NULL, NULL),
(26, 1, 3, 14, 'Actividad 3', 'act3', 'text', 'col-12', 'A37', NULL, 'Describe la tercera actividad...', NULL, 0, 'actividades_proyecto', '3', NULL, NULL, NULL, NULL),
(27, 1, 4, 1, 'Teléfono de la Dependencia', 'tel_dep', 'text', 'col-md-6', 'C34', NULL, 'Ej: 2311234567', NULL, 0, 'dependencias', 'telefono', NULL, NULL, NULL, NULL),
(28, 1, 4, 2, 'Domicilio de la Dependencia', 'dom_dep', 'text', 'col-md-6', 'C35', NULL, 'Calle, Número y Colonia', NULL, 0, 'dependencias', 'calle', NULL, NULL, NULL, NULL),
(29, 1, 4, 3, 'Ciudad o Municipio de la Dependencia', 'ciu_dep', 'text', 'col-md-6', 'C36', NULL, NULL, NULL, 0, 'dependencias', 'municipio', NULL, NULL, NULL, NULL),
(30, 1, 4, 4, 'Estado de la Dependencia', 'est_dep', 'text', 'col-md-6', 'C37', NULL, 'Ej: Puebla', NULL, 0, 'dependencias', 'estado', NULL, NULL, NULL, NULL),
(31, 1, 4, 5, 'Correo de la Dependencia', 'cor_dep', 'text', 'col-md-6', 'C38', NULL, 'correo@ejemplo.com', NULL, 0, 'dependencias', 'correo', NULL, NULL, NULL, NULL),
(32, 1, 5, 1, 'Seleccione a qué programa pertenece el proyecto', 'tipo_prog', 'select', 'col-md-6', 'C39', '["ALFABETIZATEC", "EDUCACIÓN PARA ADULTOS", "ACTIVIDADES CÍVICAS", "ACTIVIDADES CULTURALES", "ACTIVIDADES DEPORTIVAS", "APOYO A LA SALUD", "DESARROLLO SUSTENTABLE", "MEDIO AMBIENTE", "DESARROLLO DE COMUNIDAD", "Otro (Especificar)"]', 'Selecciona el programa...', NULL, 0, 'proyectos_servicio', 'programa_institucional', NULL, 'HABILITAR', 'Otro (Especificar)', 'otro_prog'),
(33, 1, 5, 2, 'Especifique otro programa', 'otro_prog', 'text', 'col-md-6', 'D48', NULL, 'Escribe aquí el programa...', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
(34, 1, 6, 1, '¿ACEPTADO(A)?', 'aceptado', 'radio', 'col-md-6', 'B51', '["SI", "NO"]', NULL, NULL, 0, NULL, NULL, '{"SI":"SI ( X )  NO (  )", "NO":"SI (  )  NO ( X )"}', 'HABILITAR', 'NO', 'motivos'),
(35, 1, 6, 2, 'Motivos (Sólo si la respuesta es NO)', 'motivos', 'text', 'col-md-6', 'E51', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE label_web=VALUES(label_web);

-- ==============================================================================
-- 11. MAPEO AVANZADO DE VALORES
-- ==============================================================================
CREATE TABLE configuracion_mapeo_valores (
    id_mapeo INT AUTO_INCREMENT PRIMARY KEY,
    id_campo INT NOT NULL,
    valor_web VARCHAR(150) NOT NULL,
    celda_excel_destino VARCHAR(20) NOT NULL,
    texto_sustituto VARCHAR(100) NULL,
    requiere_input_adicional BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (id_campo) REFERENCES configuracion_campos(id_campo) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
