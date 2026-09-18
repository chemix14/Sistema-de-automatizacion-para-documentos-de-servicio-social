import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Edit3, 
  CheckCircle2, 
  Layers, 
  Lock, 
  Clock, 
  AlertCircle,
  UploadCloud 
} from 'lucide-react';

export default function FormsDashboard() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeEtapa, setActiveEtapa] = useState('TODAS');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch('http://localhost:5000/api/alumno/expediente', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.documentos) {
          setCatalog(data.documentos);
        } else {
          // Fallback al catálogo general si no hay sesión
          fetch('http://localhost:5000/api/forms/catalog')
            .then(r => r.json())
            .then(cat => setCatalog(Array.isArray(cat) ? cat : []));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching expediente:", err);
        setLoading(false);
      });
  }, []);

  const handleDownload = (clave, estado) => {
    if (estado === 'BLOQUEADO') {
      Swal.fire({
        title: 'Formato Bloqueado',
        text: 'Este documento se encuentra bloqueado actualmente por el Departamento de Servicio Social.',
        icon: 'info',
        confirmButtonColor: '#059669'
      });
      return;
    }
    window.open(`http://localhost:5000/api/generador/generar/${clave}`, '_blank');
  };

  const handleOpenForm = (id_formulario, estado, clave, nombre) => {
    if (estado === 'BLOQUEADO') {
      Swal.fire({
        title: 'Formato Bloqueado',
        html: `El formato <b>${clave} - ${nombre}</b> aún no ha sido habilitado por la Coordinación de Servicio Social.`,
        icon: 'warning',
        confirmButtonColor: '#059669'
      });
      return;
    }
    navigate(`/student/formatos/llenar/${id_formulario}`);
  };

  const handleOpenEntregaArchivo = (id_documento, estado, clave, nombre) => {
    if (estado === 'BLOQUEADO') {
      Swal.fire({
        title: 'Formato Bloqueado',
        html: `El formato <b>${clave} - ${nombre}</b> se encuentra temporalmente desvinculado del proceso.`,
        icon: 'warning',
        confirmButtonColor: '#059669'
      });
      return;
    }
    navigate(`/student/formatos/entrega-archivo/${id_documento}`);
  };

  const getStatusBadge = (estado) => {
    switch((estado || '').toUpperCase()) {
      case 'APROBADO':
        return <span className="badge badge-success"><CheckCircle2 size={12} /> Aprobado</span>;
      case 'EN_REVISION':
        return <span className="badge badge-warning"><Clock size={12} /> En Revisión</span>;
      case 'RECHAZADO':
        return <span className="badge badge-danger"><AlertCircle size={12} /> Requiere Corrección</span>;
      case 'PENDIENTE':
        return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '20px', backgroundColor: '#ffedd5', color: '#c2410c', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={12} color="#ea580c" /> Pendiente</span>;
      case 'BLOQUEADO':
        return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '20px', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Lock size={12} /> Bloqueado</span>;
      case 'DISPONIBLE':
      default:
        return <span className="badge badge-primary"><Edit3 size={12} /> Disponible</span>;
    }
  };

  const etapasUnicas = ['TODAS', ...Array.from(new Set(catalog.map(d => d.etapa).filter(Boolean)))];

  const filteredDocs = activeEtapa === 'TODAS' 
    ? catalog 
    : catalog.filter(d => d.etapa === activeEtapa);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
          Formatos Oficiales de Servicio Social
        </h1>
        <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
          Llena en línea tus formatos oficiales o descarga tus documentos generados automáticamente.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        {etapasUnicas.map(etp => (
          <button
            key={etp}
            onClick={() => setActiveEtapa(etp)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              border: activeEtapa === etp ? '1px solid var(--primary)' : '1px solid transparent',
              backgroundColor: activeEtapa === etp ? 'var(--primary-light)' : 'transparent',
              color: activeEtapa === etp ? 'var(--primary)' : '#64748b',
              fontWeight: activeEtapa === etp ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {etp === 'TODAS' ? 'Todos los Formatos' : etp}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          Cargando formatos disponibles...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <FileSpreadsheet size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ fontWeight: 600, color: '#64748b' }}>No hay formatos en esta etapa.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredDocs.map(doc => {
            const isBlocked = (doc.estado || '').toUpperCase() === 'BLOQUEADO';
            const isApproved = (doc.estado || '').toUpperCase() === 'APROBADO';
            const isUnderReview = (doc.estado || '').toUpperCase() === 'EN_REVISION';

            return (
              <div 
                key={doc.id_documento} 
                style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '16px', 
                  padding: '1.5rem', 
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  opacity: isBlocked ? 0.65 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  if (!isBlocked) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isBlocked ? '#64748b' : '#059669', backgroundColor: isBlocked ? '#f1f5f9' : '#ecfdf5', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                      {doc.clave}
                    </span>
                    {getStatusBadge(doc.estado)}
                  </div>

                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: isBlocked ? '#64748b' : '#0f172a', fontWeight: 700, lineHeight: 1.4 }}>
                    {doc.nombre_documento}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                    Etapa: {doc.etapa}
                  </span>
                </div>

                <div style={{ paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  {doc.tiene_formulario === 1 ? (
                    <button 
                      onClick={() => handleOpenForm(doc.id_formulario, doc.estado, doc.clave, doc.nombre_documento)} 
                      className={isBlocked ? "btn btn-secondary" : isApproved ? "btn btn-success" : "btn btn-primary"}
                      style={{ 
                        flex: 1, 
                        fontSize: '0.82rem', 
                        padding: '0.5rem 0.8rem',
                        cursor: isBlocked ? 'not-allowed' : 'pointer',
                        opacity: isBlocked ? 0.7 : 1
                      }}
                      title={isBlocked ? "Formato bloqueado temporalmente" : "Llenar formulario en línea"}
                    >
                      {isBlocked ? (
                        <><Lock size={14} /> Bloqueado</>
                      ) : isApproved ? (
                        <><CheckCircle2 size={14} /> Aprobado</>
                      ) : isUnderReview ? (
                        <><Clock size={14} /> En Revisión</>
                      ) : (
                        <><Edit3 size={14} /> Llenar en Línea</>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleOpenEntregaArchivo(doc.id_documento, doc.estado, doc.clave, doc.nombre_documento)} 
                      className={isBlocked ? "btn btn-secondary" : isApproved ? "btn btn-success" : isUnderReview ? "btn btn-secondary" : "btn btn-primary"}
                      style={{ 
                        flex: 1, 
                        fontSize: '0.82rem', 
                        padding: '0.5rem 0.8rem',
                        cursor: isBlocked ? 'not-allowed' : 'pointer',
                        opacity: isBlocked ? 0.7 : 1,
                        backgroundColor: isBlocked ? undefined : isApproved ? '#059669' : isUnderReview ? '#f59e0b' : '#047857',
                        color: (isApproved || isUnderReview || (!isBlocked && doc.tiene_formulario !== 1)) ? 'white' : undefined,
                        borderColor: isBlocked ? undefined : isApproved ? '#059669' : isUnderReview ? '#f59e0b' : '#047857'
                      }}
                      title={isBlocked ? "Formato bloqueado temporalmente" : "Descargar plantilla y entregar archivo firmado"}
                    >
                      {isBlocked ? (
                        <><Lock size={14} /> Bloqueado</>
                      ) : isApproved ? (
                        <><CheckCircle2 size={14} /> Aprobado</>
                      ) : isUnderReview ? (
                        <><Clock size={14} /> En Revisión</>
                      ) : (
                        <><UploadCloud size={14} /> Descargar y Subir</>
                      )}
                    </button>
                  )}
                  {doc.plantilla_existe === 1 && (
                    <button 
                      onClick={() => handleDownload(doc.clave, doc.estado)} 
                      className="btn btn-secondary"
                      style={{ 
                        flex: 'initial', 
                        fontSize: '0.82rem', 
                        padding: '0.5rem 0.8rem',
                        cursor: isBlocked ? 'not-allowed' : 'pointer',
                        opacity: isBlocked ? 0.6 : 1
                      }}
                      title={isBlocked ? "Descarga bloqueada" : "Descargar plantilla oficial"}
                    >
                      <Download size={14} /> Descargar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
