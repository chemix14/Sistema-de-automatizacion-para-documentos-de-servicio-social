import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, 
  Download, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileSpreadsheet, 
  FileCheck, 
  Send, 
  Info, 
  HelpCircle,
  X,
  FileUp,
  Mail,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function FormEntregaArchivo() {
  const { idDocumento } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [docData, setDocData] = useState(null);
  const [entregaPrevia, setEntregaPrevia] = useState(null);
  const [alumnoInfo, setAlumnoInfo] = useState(null);
  const [correoRecepcion, setCorreoRecepcion] = useState('');

  // Archivo a subir
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  const fileInputRef = useRef(null);
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    const fetchDocInfo = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/alumno/formatos/documento-info/${idDocumento}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          Swal.fire('Error', data.error || 'No se pudo cargar la información del documento', 'error');
          navigate('/student/formatos');
          return;
        }

        setDocData(data.documento);
        setEntregaPrevia(data.entrega);
        setAlumnoInfo(data.alumno);
        setCorreoRecepcion(data.correo_recepcion || 'serviciosocial@teziutlan.tecnm.mx');
      } catch (err) {
        console.error('Error al cargar datos del documento:', err);
        Swal.fire('Error de Conexión', 'No se pudo conectar con el servidor', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (idDocumento) {
      fetchDocInfo();
    }
  }, [idDocumento, navigate]);

  // Validar y seleccionar archivo
  const handleFileSelect = (file) => {
    setFileError('');
    if (!file) return;

    // Extensiones permitidas: pdf, excel, word, imágenes
    const allowedExtensions = ['.pdf', '.xlsx', '.xls', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.webp'];
    const fileNameLower = file.name.toLowerCase();
    const isValid = allowedExtensions.some(ext => fileNameLower.endsWith(ext));

    if (!isValid) {
      setFileError('Tipo de archivo no válido. Solo se admiten documentos en formato PDF, Excel (.xlsx), Word (.docx) o imágenes (.png, .jpg).');
      return;
    }

    // Tamaño máximo: 20 MB
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError('El archivo seleccionado supera el límite de 20 MB. Comprímelo o usa un formato más ligero.');
      return;
    }

    setSelectedFile(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Descargar la plantilla oficial
  const handleDownloadTemplate = () => {
    window.open(`http://localhost:5000/api/alumno/formatos/descargar-plantilla/${idDocumento}`, '_blank');
  };

  // Descargar entrega previa si existe
  const handleDownloadPrevEntrega = () => {
    if (entregaPrevia?.id_entrega) {
      window.open(`http://localhost:5000/api/alumno/formatos/descargar-generado/${entregaPrevia.id_entrega}`, '_blank');
    }
  };

  // Enviar archivo
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      Swal.fire({
        title: 'Selecciona un Archivo',
        text: 'Debes subir tu archivo requisitado en la columna derecha antes de continuar.',
        icon: 'warning',
        confirmButtonColor: '#059669'
      });
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Confirmar Entrega de Formato?',
      html: `
        <div style="text-align: left; font-size: 0.95rem; color: #334155;">
          <p style="margin-bottom: 0.75rem;">
            Estás a punto de entregar el documento <strong>${docData?.nombre_documento} (${docData?.clave})</strong>.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 0.75rem;">
            <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 4px;">Archivo adjunto:</div>
            <div style="font-weight: 700; color: #0f172a; word-break: break-all;">📎 ${selectedFile.name}</div>
            <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
              Tamaño: ${(selectedFile.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 10px 14px; border-radius: 6px;">
            <div style="font-size: 0.8rem; color: #065f46; font-weight: 700;">DESTINO OFICIAL POR OUTLOOK:</div>
            <div style="font-size: 0.85rem; color: #047857; margin-top: 2px;">
              ${correoRecepcion}
            </div>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Enviar a Revisión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8'
    });

    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    Swal.fire({
      title: 'Enviando documento oficial...',
      text: 'Guardando en tu expediente digital y remitiendo por Microsoft Graph (Outlook)...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const formData = new FormData();
      formData.append('archivo', selectedFile);
      if (observaciones) {
        formData.append('observaciones', observaciones);
      }

      const res = await fetch(`http://localhost:5000/api/alumno/formatos/entregar-archivo/${idDocumento}`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        Swal.fire('Error en la Entrega', result.error || 'No se pudo completar la entrega del archivo.', 'error');
        setSubmitting(false);
        return;
      }

      const isEmailSent = result.envio_status === 'ENVIADO';

      await Swal.fire({
        icon: isEmailSent ? 'success' : 'info',
        title: isEmailSent ? '¡Formato Entregado y Notificado por Correo!' : '¡Formato Entregado y Guardado!',
        html: `
          <div style="text-align: left; font-size: 0.95rem; color: #334155;">
            <p style="margin-bottom: 0.75rem;">
              Tu documento <strong>${docData?.nombre_documento}</strong> ha sido cargado con éxito y registrado en tu expediente digital en estado <strong>En Revisión</strong>.
            </p>
            ${isEmailSent ? `
              <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 6px; margin-bottom: 0.75rem;">
                <div style="font-size: 0.8rem; color: #065f46; font-weight: 700; text-transform: uppercase;">✔ Notificación Enviada por Outlook:</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #047857; margin-top: 2px;">
                  ${result.correo_destino}
                </div>
                <div style="font-size: 0.78rem; color: #059669; margin-top: 4px;">
                  Archivo registrado: <code>${result.filename}</code>
                </div>
              </div>
            ` : `
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 0.75rem;">
                <div style="font-size: 0.8rem; color: #92400e; font-weight: 700; text-transform: uppercase;">Aviso de Correo Outlook:</div>
                <div style="font-size: 0.85rem; color: #78350f; margin-top: 2px;">
                  El documento quedó registrado en tu expediente digital. No obstante, el correo no se remitió automáticamente por Outlook hacia <strong>${result.correo_destino}</strong>.
                </div>
              </div>
            `}
            <p style="font-size: 0.85rem; color: #64748b; margin: 0;">
              El departamento de Servicio Social validará tu archivo y actualizará su estado.
            </p>
          </div>
        `,
        confirmButtonText: 'Ir a Mi Expediente',
        confirmButtonColor: '#059669'
      });

      navigate('/student/expediente');
    } catch (err) {
      console.error(err);
      Swal.fire('Error de Conexión', 'Ocurrió un error al enviar el archivo al servidor.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper para icono según formato de archivo
  const getFileIcon = (filename) => {
    if (!filename) return <FileText size={24} color="#059669" />;
    const lower = filename.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      return <FileSpreadsheet size={24} color="#10b981" />;
    }
    if (lower.endsWith('.pdf')) {
      return <FileText size={24} color="#ef4444" />;
    }
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
      return <FileText size={24} color="#2563eb" />;
    }
    return <FileCheck size={24} color="#8b5cf6" />;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#047857', fontWeight: 600 }}>Cargando información oficial del formato...</p>
      </div>
    );
  }

  const isApproved = (entregaPrevia?.estado || '').toUpperCase() === 'APROBADO';
  const isUnderReview = (entregaPrevia?.estado || '').toUpperCase() === 'EN_REVISION';
  const isObserved = (entregaPrevia?.estado || '').toUpperCase() === 'OBSERVADO';

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Botón Volver */}
      <button 
        onClick={() => navigate(-1)}
        className="btn btn-secondary"
        style={{ marginBottom: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} /> Volver a Formatos
      </button>

      {/* Banner de Encabezado Institucional */}
      <div style={{
        background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(2, 44, 34, 0.25)',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ 
              backgroundColor: '#a7f3d0', 
              color: '#064e3b', 
              fontSize: '0.78rem', 
              fontWeight: 800, 
              padding: '0.25rem 0.65rem', 
              borderRadius: '6px',
              letterSpacing: '0.5px'
            }}>
              {docData?.clave || 'FORMATO OFICIAL'}
            </span>
            <span style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.15)', 
              color: '#ecfdf5', 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              padding: '0.25rem 0.65rem', 
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              Etapa: {docData?.etapa || 'GENERAL'}
            </span>
            <span style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.15)', 
              color: '#ecfdf5', 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              padding: '0.25rem 0.65rem', 
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Sparkles size={12} color="#a7f3d0" /> Modalidad: Descarga y Carga Directa
            </span>
          </div>

          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
            {docData?.nombre_documento}
          </h1>
          <p style={{ margin: 0, color: '#a7f3d0', fontSize: '0.92rem', lineHeight: 1.5 }}>
            Descarga la plantilla institucional en tu equipo, llena los datos requeridos junto con los sellos y firmas pertinentes, y súbela en el panel de entrega para su revisión por correo y expediente.
          </p>
        </div>

        {/* Estado actual del documento si ya existe entrega previa */}
        {entregaPrevia && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            minWidth: '220px'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#a7f3d0', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Estado Actual en Expediente:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              {isApproved && <span style={{ color: '#86efac', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle2 size={18} /> Aprobado</span>}
              {isUnderReview && <span style={{ color: '#fde047', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={18} /> En Revisión</span>}
              {isObserved && <span style={{ color: '#fca5a5', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertCircle size={18} /> Con Observaciones</span>}
              {!isApproved && !isUnderReview && !isObserved && <span style={{ color: '#cbd5e1', fontWeight: 800, fontSize: '1.05rem' }}>{entregaPrevia.estado || 'PENDIENTE'}</span>}
            </div>
            {entregaPrevia.fecha_subida && (
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                Última entrega: {entregaPrevia.fecha_subida}
              </div>
            )}
            {entregaPrevia.ruta_archivo && (
              <button 
                onClick={handleDownloadPrevEntrega}
                style={{
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: '#a7f3d0',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Download size={13} /> Descargar archivo entregado
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid de 2 Columnas: Lado 1 (Descarga) y Lado 2 (Subida) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.75rem',
        alignItems: 'stretch'
      }}>

        {/* ========================================================== */}
        {/* COLUMNA 1 (IZQUIERDA): DESCARGAR PLANTILLA OFICIAL */}
        {/* ========================================================== */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '10px', 
                backgroundColor: '#ecfdf5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#059669'
              }}>
                <Download size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Paso 1
                </span>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>
                  Descargar Formato Oficial
                </h2>
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Descarga la plantilla aprobada por la Coordinación de Servicio Social correspondiente a este trámite.
            </p>

            {/* Tarjeta con detalles de la plantilla */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                <div style={{ marginTop: '0.2rem' }}>
                  {getFileIcon(docData?.plantilla_excel)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                    Plantilla Vinculada al Proceso:
                  </div>
                  <div style={{ 
                    fontSize: '0.95rem', 
                    fontWeight: 700, 
                    color: '#0f172a', 
                    marginTop: '2px', 
                    wordBreak: 'break-word' 
                  }}>
                    {docData?.plantilla_excel || `${docData?.clave || 'Formato'}_Plantilla_Oficial.xlsx`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ShieldCheck size={14} /> Membrete Institucional Vigente ITST
                  </div>
                </div>
              </div>
            </div>

            {/* Instrucciones de llenado */}
            <div style={{
              borderLeft: '3px solid #059669',
              paddingLeft: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', color: '#0f172a', fontWeight: 700 }}>
                Procedimiento sugerido:
              </h4>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.6 }}>
                <li style={{ marginBottom: '0.35rem' }}>Haz clic en <strong>Descargar Plantilla Oficial</strong>.</li>
                <li style={{ marginBottom: '0.35rem' }}>Abre el archivo y rellena tus datos académicos, actividades o evaluaciones según corresponda.</li>
                <li style={{ marginBottom: '0.35rem' }}>Recaba las firmas del responsable de la dependencia y tu firma de estudiante.</li>
                <li>Guarda tu documento (puede ser en <strong>.xlsx</strong>, <strong>.docx</strong> o exportado a <strong>.pdf</strong>) y súbelo en la columna derecha.</li>
              </ol>
            </div>
          </div>

          {/* Botón de Descarga Prominente */}
          <div>
            <button
              onClick={handleDownloadTemplate}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
              }}
            >
              <Download size={18} /> Descargar Plantilla Oficial
            </button>
            <div style={{ textAlign: 'center', marginTop: '0.6rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              Descarga directa desde los repositorios oficiales de la institución
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* COLUMNA 2 (DERECHA): SUBIR ARCHIVO REQUISITADO */}
        {/* ========================================================== */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '10px', 
                backgroundColor: '#eff6ff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <UploadCloud size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Paso 2
                </span>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>
                  Subir Formato Requisitado
                </h2>
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Selecciona o arrastra tu archivo completo y firmado para enviarlo a revisión oficial.
            </p>

            {/* Input oculto */}
            <input 
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              style={{ display: 'none' }}
            />

            {/* Drop Zone o Tarjeta de Archivo Seleccionado */}
            {!selectedFile ? (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  border: isDragging ? '2px dashed #059669' : '2px dashed #cbd5e1',
                  backgroundColor: isDragging ? '#ecfdf5' : '#f8fafc',
                  borderRadius: '12px',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: isDragging ? '#d1fae5' : '#e2e8f0',
                  color: isDragging ? '#059669' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}>
                  <FileUp size={26} />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  Arrastra tu archivo aquí o haz clic para examinar
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Admite formatos <strong>.PDF</strong>, <strong>.XLSX</strong>, <strong>.DOCX</strong> o <strong>Imágenes</strong>
                </div>
                <span style={{ 
                  display: 'inline-block',
                  backgroundColor: 'white', 
                  border: '1px solid #cbd5e1', 
                  color: '#475569', 
                  fontSize: '0.72rem', 
                  fontWeight: 700, 
                  padding: '0.25rem 0.65rem', 
                  borderRadius: '20px' 
                }}>
                  Máx. 20 MB por archivo
                </span>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: 'white',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getFileIcon(selectedFile.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '0.92rem', 
                      fontWeight: 700, 
                      color: '#065f46', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }} title={selectedFile.name}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '2px' }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB • Listo para entrega
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                    title="Seleccionar otro archivo"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '0.4rem',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Quitar archivo seleccionado"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {fileError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.8rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{fileError}</span>
              </div>
            )}

            {/* Campo Opcional de Observaciones del Alumno */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Notas u Observaciones para el Revisor (Opcional):
              </label>
              <textarea 
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Escribe algún comentario sobre tu entrega (ej. firmas adjuntas, aclaraciones de fecha)..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Botón de Entrega Principal */}
          <div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedFile}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                backgroundColor: !selectedFile ? '#94a3b8' : '#059669',
                borderColor: !selectedFile ? '#94a3b8' : '#059669',
                cursor: !selectedFile ? 'not-allowed' : 'pointer',
                boxShadow: !selectedFile ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.25)',
                opacity: submitting ? 0.7 : 1
              }}
            >
              <Send size={18} /> {submitting ? 'Enviando documento...' : 'Enviar Formato a Revisión y Remitir por Correo'}
            </button>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.35rem', 
              marginTop: '0.6rem', 
              fontSize: '0.75rem', 
              color: '#64748b' 
            }}>
              <Mail size={13} color="#059669" /> Notificación y acuse automático hacia <strong>{correoRecepcion}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
