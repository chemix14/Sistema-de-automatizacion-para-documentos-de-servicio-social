# 🦝 Servicio Social ITST — Plataforma de Automatización y Gestión Documental

<div align="center">
  <h3>Instituto Tecnológico Superior de Teziutlán • TecNM</h3>
  <p><strong>Digitalización, autollenado inteligente de formatos oficiales en Excel/Word y validación de expedientes en tiempo real.</strong></p>

  [![Docker](https://img.shields.io/badge/Docker-Ready%20%7C%20Compose-0db7ed.svg?logo=docker&logoColor=white)](https://www.docker.com/)
  [![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%205-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
  [![Backend](https://img.shields.io/badge/Backend-Python%203.11%20%7C%20Flask-3776AB.svg?logo=python&logoColor=white)](https://flask.palletsprojects.com/)
  [![Database](https://img.shields.io/badge/Database-MySQL%208.0-4479A1.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
  [![Auth](https://img.shields.io/badge/Auth-Microsoft%20Entra%20ID-0078D4.svg?logo=microsoft&logoColor=white)](https://entra.microsoft.com/)
  [![Office](https://img.shields.io/badge/Office-openpyxl%20%7C%20python--docx-217346.svg?logo=microsoftexcel&logoColor=white)](https://openpyxl.readthedocs.io/)
  [![License](https://img.shields.io/badge/License-TecNM%20%2F%20ITST-059669.svg)](LICENSE)
</div>

---

## 📌 Descripción del Proyecto

El **Sistema de Automatización para Documentos de Servicio Social (ITST Mapaches V2)** es una plataforma web integral de arquitectura desacoplada (*Single Page Application* + *API RESTful* + *MySQL*) diseñada para digitalizar, agilizar y modernizar el ciclo de acreditación de las 480 horas de Servicio Social en el **Instituto Tecnológico Superior de Teziutlán**.

El sistema erradica la burocracia documental manual mediante:
- **Autollenado inteligente de formatos oficiales** en Microsoft Excel (`.xlsx`) y Word (`.docx`) mediante inyección directa en celdas parametrizadas sin alterar fórmulas ni membretes.
- **Seguimiento centralizado por etapas:** Apertura (*Inicial*), Bimestrales (*1, 2 y 3*) y Liberación (*Final*).
- **Matriz de validación en tiempo real** para la coordinación y asesores con aprobación, rechazo y observaciones directas.
- **Despacho automatizado de notificaciones** institucionales vía **Microsoft Graph API / Outlook**.
- **Despliegue contenerizado en 1 solo comando** con Docker y Docker Compose.

---

## ✨ Características Principales

- 🔑 **Autenticación Institucional Única (SSO):** Inicio de sesión con cuentas oficiales `@teziutlan.tecnm.mx` a través de **Microsoft Entra ID (Azure AD)** y gestión de sesiones sin estado mediante tokens JWT (HS256).
- 📝 **Autollenado Inteligente de Formatos:** Precarga automática de datos personales, académicos, del proyecto y de la dependencia receptora en formatos oficiales (F-RPS-01, F-RPS-03, F-RPS-04, etc.) utilizando **openpyxl**.
- 📂 **Expediente Digital del Estudiante:** Visualización del progreso por etapas con semáforo de estados en vivo (`Disponible`, `En Revisión`, `Aprobado`, `Rechazado` y `Bloqueado`).
- 📤 **Entrega Digital y Carga de Archivos:** Zona interactiva *Drag and Drop* con **React Dropzone** para enviar evidencias, evaluaciones firmadas y sellos digitales (PDF, Word, Excel, imágenes) con confirmación inmediata por correo.
- 📊 **Matriz de Validación en Tiempo Real (Pipeline):** Cuadrícula integral alumno vs. documento con filtros por carrera, búsqueda por control y **actualizaciones masivas en lote (*batch updates*)**.
- 🎨 **Diseñador Visual de Formularios (Form Builder):** Lienzo interactivo con **@dnd-kit** para crear o modificar formatos arrastrando campos (texto, fechas, selectores, radios), mapeando coordenadas físicas de Excel (`C12`, `E13`) y vinculando columnas de base de datos sin escribir código.
- 📬 **Buzón Oficial de Recepción:** Auditoría en tiempo real de cada documento entregado por los estudiantes, descarga directa y herramientas de diagnóstico de conectividad de correo.
- ⏰ **Detector y Notificador Automático de Adeudos:** Identifica en 1 clic a los alumnos con formatos atrasados o rechazados y despacha correos masivos con plantillas HTML institucionales personalizadas.
- 📑 **Generador de Reportes y Bitácoras Oficiales en Excel:**
  - **Bitácora de Seguimiento Oficial al Prestante:** Con membrete del TecNM/ITST, clasificación por fases y resaltado visual en amarillo (`#FFFF00`) en entregas pendientes.
  - **Padrón Oficial de Alumnos del Periodo:** Listado general para firmas y acreditación.
  - **Reporte de Alumnos en el Tec:** Filtro de servicio social prestado internamente.
- 👥 **Gestión del Padrón e Importación Masiva:** CRUD completo de prestadores e importación de listas desde archivos Excel procesadas con **Pandas**.
- 🧹 **Depuración Inteligente de Almacenamiento:** Auditoría del consumo en disco con opción de purga selectiva de archivos pertenecientes a alumnos con servicio concluido, protegiendo la base de datos.
- 🐳 **Despliegue Contenedorizado:** Todo el ecosistema (Frontend Nginx, Backend Flask y Base de Datos MySQL 8.0) se levanta con un solo comando mediante `./run.sh`.

---

## 🛠️ Stack Tecnológico

### Frontend (Cliente Web)
- **Framework & Build Tool:** React 18 + Vite 5 (Fast Refresh & Rollup bundling)
- **Enrutamiento:** React Router DOM 6 con protección inteligente por roles (`ADMIN` vs `ALUMNO`)
- **Iconografía:** Lucide React (+100 iconos vectoriales SVG)
- **Drag & Drop:** `@dnd-kit/core`, `@dnd-kit/sortable` y `@dnd-kit/utilities`
- **Carga de Archivos:** React Dropzone
- **Modales & Notificaciones:** SweetAlert2
- **Cliente HTTP:** Axios & Fetch API nativa (con cabeceras `Authorization: Bearer <token>`)
- **Diseño & UI:** CSS3 Moderno con Glassmorphism (cristal esmerilado, verde esmeralda y blanco institucional)

### Backend (API RESTful)
- **Lenguaje & Framework:** Python 3.11+ / Flask 3.0 con arquitectura modular de Blueprints
- **Seguridad & Tokens:** PyJWT (HMAC-SHA256) + Werkzeug
- **Autenticación Cloud:** MSAL (Microsoft Authentication Library for Python)
- **Automatización Office:** `openpyxl` (hojas de cálculo Excel) + `python-docx` (documentos Word)
- **Ciencia de Datos & Análisis:** `pandas` + `numpy` (importación masiva y análisis de padrones)
- **Procesamiento Gráfico:** Pillow (PIL) para firmas y sellos digitales
- **Conector de Base de Datos:** `mysql-connector-python` (Pool nativo con transacciones seguras)
- **Servicio de Correo:** Requests (Microsoft Graph API v1.0) con contingencia en `smtplib` / STARTTLS

### Base de Datos & Persistencia
- **Motor:** MySQL Server 8.0 / MariaDB con cotejamiento `utf8mb4_unicode_ci`
- **Modelo:** 18 tablas relacionales con integridad referencial, disparadores y llaves foráneas

### Infraestructura & Despliegue
- **Contenedores:** Docker & Docker Compose
- **Servidor Web Producción:** Nginx Alpine (proxy inverso a `/api/`, compresión Gzip y soporte SPA)

---

## 📂 Estructura del Repositorio

```text
├── backend/
│   ├── controllers/            # Blueprints Flask (auth, admin, alumno, forms, reportes...)
│   │   ├── auth_bp.py          # Autenticación Microsoft OAuth2 y emisión de JWT
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
│   ├── generados/              # Directorio de formatos generados
│   ├── app.py                  # Fábrica de la aplicación Flask y rutas base
│   ├── config.py               # Configuración central y variables de entorno
│   ├── database.py             # Conector Singleton a MySQL
│   ├── requirements.txt        # Dependencias de Python
│   └── Dockerfile              # Imagen Docker del Backend
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Form Builder, Canvas, Iconos y ErrorBoundary
│   │   ├── layouts/            # Layouts maestros (AdminLayout, StudentLayout)
│   │   ├── pages/
│   │   │   ├── auth/           # Login y LoginCallback (Microsoft SSO)
│   │   │   ├── admin/          # 14 módulos de administración, validación y reportes
│   │   │   └── student/        # Workspace, Expediente, Llenado y Subida
│   │   ├── App.jsx             # Enrutador principal y control de acceso
│   │   ├── main.jsx            # Punto de entrada de React
│   │   └── index.css           # Tokens de diseño Glassmorphism y botones
│   ├── nginx.conf              # Configuración Nginx para producción y proxy /api/
│   ├── package.json            # Dependencias de Node.js
│   ├── vite.config.js          # Configuración de Vite
│   └── Dockerfile              # Imagen Docker del Frontend (Multi-stage)
│
├── docker/
│   └── init.sql                # Script de inicialización de BD (esquema completo y catálogos)
├── docker-compose.yml          # Orquestador de servicios (db, backend, frontend)
├── .env.docker.example         # Plantilla de variables de entorno
├── run.sh                      # Script ejecutable de inicio rápido en 1 clic
├── schema_completo.sql         # Esquema completo de base de datos
├── DOCKER_INSTRUCTIONS.md      # Manual de despliegue con Docker
├── reporte.md                  # Reporte técnico detallado del sistema
├── readme.txt                  # Manual del sistema en texto plano
└── README.md                   # Esta documentación
```

---

## 🚀 Puesta en Marcha

### Opción A: Despliegue con Docker (Recomendado)

El proyecto incluye un script de automatización que construye las imágenes, crea los volúmenes, levanta los contenedores e inicializa la base de datos de manera automática:

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/Sistema-de-automatizacion-para-documentos-de-servicio-social.git
cd Sistema-de-automatizacion-para-documentos-de-servicio-social

# 2. Conceder permisos de ejecución e iniciar todo el sistema
chmod +x run.sh
./run.sh
```

#### 🌐 URLs de Acceso Directo:
- **Frontend Web:** [http://localhost:5173](http://localhost:5173)
- **API Backend REST:** [http://localhost:5000](http://localhost:5000)
- **Base de Datos MySQL:** `localhost:3306` (BD: `servicio_social_itst`, Usuario: `root`)

#### 🛠️ Comandos de Mantenimiento del Script:
```bash
./run.sh logs      # Ver registros en tiempo real de todos los servicios
./run.sh stop      # Detener todos los contenedores
./run.sh restart   # Reiniciar los servicios
./run.sh clean     # Detener y reiniciar la base de datos desde cero
```

---

### Opción B: Ejecución Manual (Sin Docker)

#### 1. Base de Datos (MySQL)
```bash
mysql -u root -p
CREATE DATABASE servicio_social_itst CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE servicio_social_itst;
SOURCE docker/init.sql;
```

#### 2. Backend (Flask)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate       # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Configura tus credenciales de BD y Azure
python app.py
```

#### 3. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Variables de Entorno (`.env`)

Copia `.env.docker.example` o `.env.example` para personalizar las credenciales:

```env
# Base de Datos MySQL
DB_HOST=localhost               # En Docker usar: db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=servicio_social_itst

# Tokens y Seguridad
SECRET_KEY=clave_secreta_flask
JWT_SECRET=clave_secreta_jwt
FRONTEND_URL=http://localhost:5173

# Microsoft Azure / Entra ID (SSO y Microsoft Graph API)
MS_CLIENT_ID=tu_client_id_azure
MS_CLIENT_SECRET=tu_client_secret_azure
TENANT_ID=common
AUTHORITY=https://login.microsoftonline.com/common
```

---

## 📊 Capacidad de Almacenamiento (500 Alumnos)

| Componente | Parámetros y Estimación | Espacio en Disco |
| :--- | :--- | :--- |
| **Documentos Generados y Subidos** | 500 alumnos × 100 a 150 archivos (promedio 200 KB) | **10.00 a 15.00 GB** |
| **Base de Datos MySQL** | Metadatos de 75,000 entregas, tablas relacionales e índices | **~0.40 GB** (400 MB) |
| **Código y Dependencias** | Backend Flask + Frontend Nginx build + Librerías | **~0.47 GB** (471 MB) |
| **CAPACIDAD TOTAL RECOMENDADA** | **Espacio exclusivo requerido para un ciclo de 500 alumnos** | **11 GB a 16 GB** |

---

## 🏛️ Créditos Institucionales

Desarrollado para el **Departamento y Coordinación de Servicio Social**  
**Instituto Tecnológico Superior de Teziutlán (ITST)**  
*Tecnológico Nacional de México (TecNM) • Puebla, México.*

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia oficial institucional del [Tecnológico Nacional de México / ITST](LICENSE).
