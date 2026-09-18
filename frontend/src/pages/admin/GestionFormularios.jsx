import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, 
  Plus, 
  FileCheck, 
  FileQuestion, 
  UploadCloud, 
  Edit3, 
  Trash2, 
  Layers,
  CheckCircle2,
  Tag,
  AlertTriangle,
  Unlink,
  Power,
  Eye,
  Copy
} from 'lucide-react';
import RaccoonIcon from '../../components/RaccoonIcon';

const ETAPAS_OFICIALES = ['APERTURA', 'BIMESTRE 1', 'BIMESTRE 2', 'BIMESTRE 3', 'LIBERACION'];

export default function GestionFormularios() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeEtapa, setActiveEtapa] = useState('TODAS');
  const navigate = useNavigate();

  const fetchCatalog = () => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/forms/catalog')
      .then(res => res.json())
      .then(data => {
        setCatalog(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching catalog:", err);
        setCatalog([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleUpdateEtapa = (id_documento, clave, nombre_documento, nueva_etapa) => {
    if (!nueva_etapa) return;

    fetch(`http://127.0.0.1:5000/api/forms/documento/${id_documento}/etapa`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: nueva_etapa })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true
        });
        Toast.fire({ icon: 'success', title: `Etapa cambiada a "${nueva_etapa}"` });
        
        setCatalog(prev => prev.map(d => d.id_documento === id_documento ? { ...d, etapa: nueva_etapa } : d));
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(() => {
      Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
    });
  };

  // Eliminar el documento y formulario por completo del sistema
  const handleDeleteDocumentoCompleto = (id_documento, clave, nombre) => {
    Swal.fire({
      title: `¿Eliminar "${clave || 'Formato'}" por completo?`,
      html: `Estás a punto de <b>eliminar permanentemente</b> el formato <b>${nombre}</b> del catálogo.<br/><br/><span style="color: #ef4444; font-size: 0.85rem;">⚠️ Esta acción eliminará la plantilla oficial, la interfaz dinámica y todas las entregas asociadas a este documento.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar por completo',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/forms/documento/${id_documento}`, {
          method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('¡Eliminado!', data.message || 'El documento ha sido eliminado del catálogo.', 'success');
            fetchCatalog();
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => {
          Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
        });
      }
    });
  };

  // Desvincular únicamente el formulario interactivo dejando el documento oficial en el catálogo
  const handleUnlinkForm = (id_formulario, nombre_documento) => {
    Swal.fire({
      title: '¿Desvincular Formulario?',
      html: `Estás a punto de <b>desvincular la interfaz dinámica</b> de <b>"${nombre_documento}"</b>.<br/><br/><span style="color: #64748b; font-size: 0.85rem;">ℹ️ El documento oficial se conservará en el catálogo y quedará en estado <b>Sin Formulario</b> para que puedas rediseñarlo cuando lo desees.</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, desvincular formulario',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/forms/${id_formulario}`, {
          method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('¡Desvinculado!', data.message || 'El formulario interactivo ha sido desvinculado.', 'success');
            setCatalog(prev => prev.map(d => d.id_formulario === id_formulario ? { ...d, tiene_formulario: 0, id_formulario: null } : d));
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => {
          Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
        });
      }
    });
  };

  // Desvincular el archivo de plantilla oficial de este formato
  const handleUnlinkTemplate = (id_documento, nombre_documento, plantilla_excel) => {
    Swal.fire({
      title: '¿Desvincular Plantilla Oficial?',
      html: `¿Deseas desvincular el archivo <b>${plantilla_excel || 'actual'}</b> del formato <b>"${nombre_documento}"</b>?<br/><br/><span style="color: #64748b; font-size: 0.85rem;">El formato oficial quedará sin plantilla asociada hasta que subas un archivo nuevo.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, desvincular plantilla',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/forms/catalog/${id_documento}/template`, {
          method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('¡Plantilla Desvinculada!', data.message || 'La plantilla oficial ha sido desvinculada exitosamente.', 'success');
            setCatalog(prev => prev.map(d => d.id_documento === id_documento ? { ...d, plantilla_existe: 0, plantilla_excel: null } : d));
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => {
          Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
        });
      }
    });
  };

  // Vincular o desvincular el formato del proceso activo de los alumnos
  const handleToggleActivo = (id_documento, nombre_documento, estado_actual) => {
    const esActivo = estado_actual === 1;
    Swal.fire({
      title: esActivo ? '¿Desvincular Formato del Proceso?' : '¿Vincular Formato al Proceso?',
      html: `¿Deseas <b>${esActivo ? 'desvincular del proceso' : 'vincular al proceso'}</b> el formato <b>"${nombre_documento}"</b>?<br/><br/><span style="color: #64748b; font-size: 0.85rem;">${
        esActivo 
          ? 'Los alumnos ya no tendrán que entregar este formato en su expediente escolar.' 
          : 'El formato volverá a requerirse y estará visible para los alumnos.'
      }</span>`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: esActivo ? '#64748b' : '#10b981',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: esActivo ? 'Sí, desvincular del proceso' : 'Sí, vincular al proceso',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/forms/catalog/${id_documento}/toggle_activo`, {
          method: 'PATCH'
        })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true
            });
            Toast.fire({ icon: 'success', title: data.message });
            setCatalog(prev => prev.map(d => d.id_documento === id_documento ? { ...d, activo: data.activo } : d));
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => {
          Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
        });
      }
    });
  };

  const handleUploadTemplate = async (id_documento, nombre_documento) => {
    const { value: file } = await Swal.fire({
      title: 'Subir Plantilla Oficial',
      text: `Selecciona el archivo Excel o Word para "${nombre_documento}"`,
      input: 'file',
      inputAttributes: {
        'accept': '.xlsx,.xls,.docx,.doc',
        'aria-label': 'Subir plantilla'
      },
      showCancelButton: true,
      confirmButtonText: 'Subir Archivo',
      cancelButtonText: 'Cancelar'
    });

    if (file) {
      const formData = new FormData();
      formData.append('plantilla', file);

      Swal.fire({
        title: 'Subiendo plantilla...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      fetch(`http://127.0.0.1:5000/api/forms/catalog/${id_documento}/upload_template`, {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          Swal.fire('¡Éxito!', 'La plantilla oficial ha sido actualizada.', 'success');
          fetchCatalog();
        } else {
          Swal.fire('Error', data.error, 'error');
        }
      })
      .catch(() => {
        Swal.fire('Error', 'No se pudo conectar al servidor.', 'error');
      });
    }
  };

  const handleDuplicateDocumento = (id_documento, nombre_documento) => {
    Swal.fire({
      title: 'Duplicar Formulario',
      html: `Se creará una <b>copia independiente</b> del formato <b>"${nombre_documento}"</b>.<br/><br/><span style="color: #64748b; font-size: 0.85rem;">La nueva copia se podrá editar de forma totalmente separada sin afectar al formato original.</span>`,
      input: 'text',
      inputValue: `${nombre_documento} (Copia)`,
      inputLabel: 'Nombre del nuevo formato duplicado:',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, duplicar formato',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Por favor escribe un nombre para el nuevo formato';
        }
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          title: 'Duplicando formato...',
          html: 'Clonando estructura, campos y plantilla...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        fetch(`http://127.0.0.1:5000/api/forms/documento/${id_documento}/duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nuevo_nombre: result.value.trim() })
        })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('¡Duplicado con éxito!', data.message || 'El formulario ha sido duplicado correctamente.', 'success');
            fetchCatalog();
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => {
          Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
        });
      }
    });
  };

  const tabs = ['TODAS', ...ETAPAS_OFICIALES];

  const filteredDocs = activeEtapa === 'TODAS' 
    ? catalog 
    : catalog.filter(d => (d.etapa || '').toUpperCase() === activeEtapa);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
            Catálogo de Formatos y Formularios
          </h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
            Gestiona los documentos oficiales, edita sus etapas, diseña interfaces o elimina formatos completos.
          </p>
        </div>
        <button 
          onClick={() => navigate('/admin/formularios/nuevo')}
          className="btn btn-primary"
        >
          <Plus size={18} /> Crear Nuevo Formato
        </button>
      </div>

      {/* Etapas Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        {tabs.map(etp => {
          const isActive = activeEtapa === etp;
          const count = etp === 'TODAS' 
            ? catalog.length 
            : catalog.filter(d => (d.etapa || '').toUpperCase() === etp).length;

          return (
            <button
              key={etp}
              onClick={() => setActiveEtapa(etp)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                color: isActive ? 'var(--primary)' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <span>{etp === 'TODAS' ? 'Todos los Formatos' : etp}</span>
              <span style={{ 
                fontSize: '0.72rem', 
                backgroundColor: isActive ? 'var(--primary)' : '#e2e8f0', 
                color: isActive ? 'white' : '#64748b', 
                padding: '0.1rem 0.45rem', 
                borderRadius: '10px',
                fontWeight: 700 
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid de Formatos */}
      <div>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            Cargando catálogo oficial...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <FileSpreadsheet size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600, color: '#64748b' }}>No se encontraron documentos en la etapa "{activeEtapa}".</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {filteredDocs.map(doc => {
              const hasForm = doc.tiene_formulario === 1;
              const currentEtapa = (doc.etapa || 'APERTURA').toUpperCase();

              return (
                <div 
                  key={doc.id_documento} 
                  style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '16px', 
                    padding: '1.5rem', 
                    border: doc.activo === 0 ? '1px dashed #cbd5e1' : '1px solid #e2e8f0', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    opacity: doc.activo === 0 ? 0.75 : 1
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = doc.activo === 0 ? '#94a3b8' : '#cbd5e1';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                    e.currentTarget.style.borderColor = doc.activo === 0 ? '#cbd5e1' : '#e2e8f0';
                  }}
                >
                  <div>
                    {/* Top Tag, Status & Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', backgroundColor: '#ecfdf5', padding: '0.2rem 0.55rem', borderRadius: '6px', letterSpacing: '0.3px' }}>
                        {doc.clave || `DOC-${doc.id_documento}`}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        {doc.activo === 0 && (
                          <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Power size={11} /> Desvinculado
                          </span>
                        )}

                        {hasForm ? (
                          <span className="badge badge-success">
                            <FileCheck size={13} /> Interfaz Activa
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} title="Este formato utiliza el formulario directo de descarga y subida de archivo para los alumnos">
                            <UploadCloud size={13} /> Entrega Directa
                          </span>
                        )}

                        <button 
                          onClick={() => handleToggleActivo(doc.id_documento, doc.nombre_documento, doc.activo)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: doc.activo === 1 ? '#10b981' : '#94a3b8',
                            cursor: 'pointer',
                            padding: '0.2rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.15s'
                          }}
                          title={doc.activo === 1 ? "Formato Vinculado al Proceso (clic para desvincular)" : "Formato Desvinculado del Proceso (clic para vincular)"}
                        >
                          <Power size={15} />
                        </button>

                        <button 
                          onClick={() => handleDuplicateDocumento(doc.id_documento, doc.nombre_documento)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#0284c7',
                            cursor: 'pointer',
                            padding: '0.2rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#0369a1'}
                          onMouseLeave={e => e.currentTarget.style.color = '#0284c7'}
                          title="Duplicar formulario (crear copia independiente)"
                        >
                          <Copy size={15} />
                        </button>

                        <button 
                          onClick={() => handleDeleteDocumentoCompleto(doc.id_documento, doc.clave, doc.nombre_documento)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '0.2rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                          title="Eliminar formato completo del catálogo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700, lineHeight: 1.4 }}>
                      {doc.nombre_documento}
                    </h3>

                    {/* Selector de Etapa Editable */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                          <Tag size={13} color="#059669" /> Etapa Oficial:
                        </label>
                        <select
                          value={currentEtapa}
                          onChange={(e) => handleUpdateEtapa(doc.id_documento, doc.clave, doc.nombre_documento, e.target.value)}
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: 'white',
                            color: '#1e293b',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                          title="Cambiar la etapa a la que pertenece este formato"
                        >
                          {ETAPAS_OFICIALES.map(et => (
                            <option key={et} value={et}>{et}</option>
                          ))}
                        </select>
                      </div>

                      {!doc.plantilla_existe ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fef2f2', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #fecaca' }}>
                          <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>⚠️ Sin archivo plantilla</span>
                          <button 
                            onClick={() => handleUploadTemplate(doc.id_documento, doc.nombre_documento)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Subir
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #bbf7d0', gap: '0.5rem' }}>
                          <div style={{ fontSize: '0.72rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.plantilla_excel}>
                            <FileSpreadsheet size={13} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.plantilla_excel || 'Plantilla Oficial Vinculada'}</span>
                          </div>
                          <button 
                            onClick={() => handleUnlinkTemplate(doc.id_documento, doc.nombre_documento, doc.plantilla_excel)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: '#d97706', 
                              fontWeight: 700, 
                              fontSize: '0.72rem', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.2rem', 
                              padding: '0.15rem 0.35rem', 
                              borderRadius: '4px', 
                              flexShrink: 0, 
                              transition: 'all 0.15s' 
                            }}
                            title="Desvincular archivo de plantilla"
                            onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#d97706'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <Unlink size={12} /> Desvincular
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem' }}>
                    {hasForm ? (
                      <>
                        <button 
                          onClick={() => navigate(`/admin/formularios/editar/${doc.id_formulario}`)}
                          className="btn btn-secondary"
                          style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem 0.6rem' }}
                        >
                          <Edit3 size={14} /> Editar Formulario
                        </button>
                        <button 
                          onClick={() => handleDuplicateDocumento(doc.id_documento, doc.nombre_documento)}
                          className="btn"
                          style={{ 
                            backgroundColor: '#f0f9ff', 
                            color: '#0284c7', 
                            border: '1px solid #bae6fd', 
                            fontSize: '0.82rem', 
                            padding: '0.5rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e0f2fe'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f0f9ff'; e.currentTarget.style.borderColor = '#bae6fd'; }}
                          title="Duplicar este formulario y crear una copia independiente"
                        >
                          <Copy size={14} /> Duplicar
                        </button>
                        <button 
                          onClick={() => handleUnlinkForm(doc.id_formulario, doc.nombre_documento)}
                          className="btn"
                          style={{ 
                            backgroundColor: '#fffbeb', 
                            color: '#b45309', 
                            border: '1px solid #fde68a', 
                            fontSize: '0.82rem', 
                            padding: '0.5rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fef3c7'; e.currentTarget.style.borderColor = '#f59e0b'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fffbeb'; e.currentTarget.style.borderColor = '#fde68a'; }}
                          title="Desvincular formulario dinámico (el documento continuará en el catálogo sin interfaz)"
                        >
                          <Unlink size={14} /> Desvincular Formulario
                        </button>
                        <button 
                          onClick={() => handleDeleteDocumentoCompleto(doc.id_documento, doc.clave, doc.nombre_documento)}
                          className="btn btn-danger"
                          style={{ padding: '0.5rem 0.75rem' }}
                          title="Eliminar formato completo del catálogo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => navigate(`/student/formatos/entrega-archivo/${doc.id_documento}`)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.82rem', padding: '0.5rem 0.65rem' }}
                          title="Previsualizar el formulario de descarga y subida tal como lo ven los alumnos"
                        >
                          <Eye size={14} /> Vista Alumno
                        </button>
                        <button 
                          onClick={() => navigate(`/admin/formularios/nuevo?docId=${doc.id_documento}`)}
                          className="btn btn-primary"
                          style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }}
                          title="Crear un formulario interactivo personalizado para este documento"
                        >
                          <RaccoonIcon size={15} color="white" /> Diseñar Interfaz
                        </button>
                        <button 
                          onClick={() => handleDuplicateDocumento(doc.id_documento, doc.nombre_documento)}
                          className="btn"
                          style={{ 
                            backgroundColor: '#f0f9ff', 
                            color: '#0284c7', 
                            border: '1px solid #bae6fd', 
                            fontSize: '0.82rem', 
                            padding: '0.5rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e0f2fe'; e.currentTarget.style.borderColor = '#38bdf8'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f0f9ff'; e.currentTarget.style.borderColor = '#bae6fd'; }}
                          title="Duplicar formato del catálogo y crear una copia independiente"
                        >
                          <Copy size={14} /> Duplicar
                        </button>
                        <button 
                          onClick={() => handleDeleteDocumentoCompleto(doc.id_documento, doc.clave, doc.nombre_documento)}
                          className="btn btn-danger"
                          style={{ padding: '0.5rem 0.65rem' }}
                          title="Eliminar formato completo del catálogo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
