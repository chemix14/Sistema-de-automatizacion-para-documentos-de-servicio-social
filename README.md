================================================================================
  SISTEMA DE AUTOMATIZACIÓN PARA DOCUMENTOS DE SERVICIO SOCIAL - ITST
              Instituto Tecnológico Superior de Teziutlán (TecNM)
================================================================================

DESCRIPCIÓN GENERAL
--------------------------------------------------------------------------------
Plataforma web integral diseñada para digitalizar, automatizar y gestionar el
ciclo completo de Servicio Social de los estudiantes del Instituto Tecnológico
Superior de Teziutlán (ITST).

El sistema erradica la burocracia manual mediante el autollenado inteligente de
formatos oficiales en Microsoft Excel (.xlsx) y Word (.docx), validación de
expedientes en tiempo real por parte de la coordinación, notificaciones
automáticas por correo institucional (Microsoft Graph API / Outlook), diseñador
visual de formatos (Form Builder) y generación de bitácoras oficiales listas para
auditoría y acreditación.


CARACTERÍSTICAS PRINCIPALES
--------------------------------------------------------------------------------

1. PORTAL DEL ESTUDIANTE:
   • Inicio de sesión institucional único (SSO) con Microsoft Entra ID (@teziutlan.tecnm.mx).
   • Espacio de trabajo (Workspace) con detalles del proyecto asignado y dependencia receptora.
   • Expediente digital organizado por etapas: Apertura, Bimestrales (1, 2, 3) y Liberación.
   • Semáforo de estados en vivo: Disponible, En Revisión, Aprobado, Rechazado y Bloqueado.
   • Autollenado inteligente de formatos interactivos (F-RPS-01, etc.) extrayendo datos
     académicos y del proyecto directamente de la base de datos.
   • Descarga directa de plantillas oficiales en blanco y formatos generados.
   • Módulo interactivo de subida de archivos (PDF, Word, Excel, imágenes) con acuse
     automático por correo a la coordinación.
   • Tablón de comunicados oficiales vigentes.

2. PANEL ADMINISTRATIVO Y COORDINACIÓN:
   • Dashboard analítico con métricas en tiempo real: alumnos activos, proyectos en vinculación,
     expedientes pendientes de revisión y distribución por carrera.
   • Matriz de Validación de Expedientes (Pipeline): cuadrícula interactiva de todos los alumnos
     contra todos los formatos oficiales, con aprobación/rechazo con observaciones y
     actualizaciones masivas en lote (batch updates).
   • Diseñador Visual de Formatos (Form Builder Drag & Drop):
     - Creación de formularios sin código con campos de texto, fechas, selects, radios y subida de archivos.
     - Mapeo directo y bidireccional a celdas de plantillas Excel (openpyxl).
     - Vinculación con columnas de base de datos para autollenado.
     - Lógica condicional de visualización en la interfaz.
   • Buzón Oficial de Recepción: auditoría de documentos entregados, descarga de archivos,
     configuración de buzón y herramientas de prueba de conectividad de correo.
   • Padrón de Alumnos e Importación Masiva: gestión individual e importador inteligente
     desde archivos Excel mediante Pandas.
   • Auditoría y Gestión de Proyectos de Servicio Social vinculados a dependencias y programas
     institucionales (AlfabetizaTec, Apoyo a la Salud, Medio Ambiente, etc.).
   • Calendario Oficial del Periodo: configuración de fechas límite de entrega por etapas.
   • Sistema Automatizado de Avisos y Adeudos: detección automática de estudiantes morosos y
     envío masivo de correos HTML personalizados con el desglose exacto de pendientes.
   • Generador de Reportes Oficiales del ITST en Excel:
     - Bitácora Oficial de Seguimiento al Prestante (con membrete institucional y marcas en amarillo).
     - Padrón Oficial de Alumnos del Periodo para firma y validación.
     - Reporte de Alumnos prestando servicio interno en el Tecnológico.
     - Desglose estadístico por carrera.
   • Mantenimiento y Depuración: cálculo de espacio en disco y purga selectiva de archivos
     de alumnos con servicio concluido, manteniendo la integridad de la base de datos.


ARQUITECTURA Y STACK TECNOLÓGICO
--------------------------------------------------------------------------------

ARQUITECTURA: Cliente - Servidor Desacoplado (SPA + API RESTful + MySQL)

FRONTEND:
  • React 18 & Vite 5 (Compilación ultra rápida y HMR)
  • React Router DOM 6 (Rutas privadas protegidas por rol ADMIN / ALUMNO)
  • Lucide React (Iconografía vectorial moderna)
  • @dnd-kit (Motor interactivo de arrastrar y soltar para Form Builder)
  • React Dropzone (Carga interactiva de archivos y evidencias)
  • SweetAlert2 (Ventanas modales interactivas y notificaciones toast)
  • Axios & Fetch API (Consumo asíncrono con tokens JWT Bearer)
  • CSS3 Avanzado con Glassmorphism (Efecto cristal esmerilado, paleta verde/blanco ITST)

BACKEND:
  • Python 3.11+ & Flask 3.0 (API RESTful modular con Blueprints)
  • Flask-CORS (Seguridad de orígenes cruzados)
  • MSAL (Microsoft Authentication Library) & PyJWT (OAuth2 y tokens de sesión seguros)
  • MySQL Connector Python (Driver nativo de base de datos relacional)
  • openpyxl & python-docx (Automatización e inyección de datos en Excel y Word)
  • Pandas & NumPy (Importación masiva de alumnos y análisis de datos)
  • Pillow / PIL (Procesamiento de sellos y firmas digitales)
  • Requests (Consumo de Microsoft Graph API v1.0 para envío de correos)
  • Smtplib & email.mime (Mecanismo alternativo de contingencia SMTP con TLS)

BASE DE DATOS:
  • MySQL 8.0 / MariaDB (Esquema relacional con 18 tablas, llaves foráneas y UTF-8mb4)

DESPLIEGUE:
  • Docker & Docker Compose (Contenedores itst_db, itst_backend, itst_frontend con Nginx)


ESTRUCTURA DEL PROYECTO
--------------------------------------------------------------------------------
.
├── backend/
│   ├── controllers/            # Blueprints Flask (auth, admin, alumno, forms, reportes...)
│   │   ├── auth_bp.py          # Autenticación Microsoft OAuth2 y JWT
│   │   ├── admin_bp.py         # Gestión de alumnos, carreras, personal y validación
│   │   ├── alumno_bp.py        # Portal de estudiante, autollenado y entregas
│   │   ├── forms_bp.py         # Motor de formularios dinámicos y plantillas
│   │   ├── generador_bp.py     # Motor openpyxl de generación de formatos
│   │   ├── reportes_bp.py      # Bitácoras oficiales y exportaciones en Excel
│   │   ├── avisos_bp.py        # Detector de adeudos y correos masivos
│   │   ├── recepcion_bp.py     # Buzón oficial de recepción
│   │   ├── mantenimiento_bp.py # Depuración de almacenamiento
│   │   └── email_service.py    # Servicio unificado de correo (Graph + SMTP)
│   ├── plantillas/             # Plantillas oficiales físicas (.xlsx y .docx)
│   ├── generados/              # Directorio de almacenamiento de formatos generados
│   ├── app.py                  # Fábrica de la aplicación Flask y rutas base
│   ├── config.py               # Configuración central y variables de entorno
│   ├── database.py             # Conector Singleton a MySQL
│   ├── requirements.txt        # Dependencias de Python
│   └── Dockerfile              # Imagen Docker del Backend
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes del Form Builder, Iconos y Errores
│   │   ├── layouts/            # Layouts maestros (AdminLayout, StudentLayout)
│   │   ├── pages/
│   │   │   ├── auth/           # Login y LoginCallback (Microsoft SSO)
│   │   │   ├── admin/          # 14 módulos de administración, validación y reportes
│   │   │   └── student/        # Workspace, Expediente, Llenado y Subida de archivos
│   │   ├── App.jsx             # Enrutador principal y control de acceso
│   │   ├── main.jsx            # Punto de entrada de React
│   │   └── index.css           # Tokens de diseño Glassmorphism y botones
│   ├── nginx.conf              # Configuración de Nginx para producción y proxy /api/
│   ├── package.json            # Dependencias de JavaScript (npm)
│   ├── vite.config.js          # Configuración de Vite
│   └── Dockerfile              # Imagen Docker del Frontend (Multi-stage)
│
├── docker/
│   └── init.sql                # Script de inicialización con esquema completo y catálogos
├── docker-compose.yml          # Orquestador de servicios (db, backend, frontend)
├── .env.docker.example         # Plantilla de variables de entorno
├── run.sh                      # Script ejecutable de inicio rápido con un solo comando
├── schema_completo.sql         # Esquema completo de base de datos
├── DOCKER_INSTRUCTIONS.md      # Manual de despliegue con Docker
├── reporte.md                  # Reporte técnico detallado del sistema
└── readme.txt                  # Este archivo


INICIO RÁPIDO CON DOCKER (RECOMENDADO)
--------------------------------------------------------------------------------
El proyecto cuenta con un script automatizado que construye las imágenes, levanta
los contenedores y configura la base de datos de manera autónoma.

1. Dar permisos y ejecutar el script:
   chmod +x run.sh
   ./run.sh

2. Comandos auxiliares:
   ./run.sh logs      # Ver registros en tiempo real de todos los servicios
   ./run.sh stop      # Detener los contenedores
   ./run.sh restart   # Reiniciar los servicios
   ./run.sh clean     # Detener y reiniciar base de datos desde cero

3. Accesos directos una vez iniciado:
   • Frontend Web:      http://localhost:5173
   • API Backend REST:  http://localhost:5000
   • Base de Datos:     localhost:3306 (Usuario: root, BD: servicio_social_itst)


EJECUCIÓN MANUAL (SIN DOCKER)
--------------------------------------------------------------------------------

REQUISITOS PREVIOS:
  • Python 3.10 o superior
  • Node.js 18 o superior y npm
  • MySQL Server 8.0 activo

PASO 1: BASE DE DATOS
  1. Inicia sesión en MySQL:
     mysql -u root -p
  2. Crea la base de datos e importa el esquema:
     CREATE DATABASE servicio_social_itst CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     USE servicio_social_itst;
     SOURCE docker/init.sql;

PASO 2: BACKEND (FLASK)
  1. Entrar a la carpeta backend:
     cd backend
  2. Crear y activar entorno virtual:
     python3 -m venv .venv
     source .venv/bin/activate    # En Windows: .venv\Scripts\activate
  3. Instalar dependencias:
     pip install -r requirements.txt
  4. Configurar variables de entorno:
     Copia el archivo .env.example como .env y edita las credenciales de BD y Azure.
  5. Iniciar servidor API:
     python app.py
     El backend quedará escuchando en http://localhost:5000

PASO 3: FRONTEND (REACT + VITE)
  1. En una nueva terminal, entrar a la carpeta frontend:
     cd frontend
  2. Instalar dependencias de Node.js:
     npm install
  3. Iniciar el servidor de desarrollo:
     npm run dev
  4. Abrir en el navegador:
     http://localhost:5173


VARIABLES DE ENTORNO RELEVANTES (.env)
--------------------------------------------------------------------------------
DB_HOST=localhost (o 'db' en Docker)
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=servicio_social_itst

SECRET_KEY=clave_secreta_flask
JWT_SECRET=clave_secreta_jwt
FRONTEND_URL=http://localhost:5173

# Microsoft Azure / Entra ID (OAuth 2.0 y Microsoft Graph API)
MS_CLIENT_ID=tu_client_id_de_azure
MS_CLIENT_SECRET=tu_client_secret_de_azure
TENANT_ID=common
AUTHORITY=https://login.microsoftonline.com/common


ESTIMACIÓN DE ALMACENAMIENTO PARA 500 ALUMNOS
--------------------------------------------------------------------------------
Para una población de 500 alumnos prestando servicio social simultáneamente:
  • Documentos generados y subidos (100 a 150 por alumno): ~10 GB a 15 GB
  • Base de datos relacional MySQL (registros, entregas, auditoría): ~0.40 GB
  • Código fuente, frontend compilado y dependencias: ~0.47 GB
  • TOTAL EXCLUSIVO REQUERIDO: ~11 GB a 16 GB de almacenamiento en disco.


CRÉDITOS Y DERECHOS
--------------------------------------------------------------------------------
Desarrollado para el Departamento y Coordinación de Servicio Social
Instituto Tecnológico Superior de Teziutlán (ITST)
Tecnológico Nacional de México (TecNM)
Puebla, México.
================================================================================
