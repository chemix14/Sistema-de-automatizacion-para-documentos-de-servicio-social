import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Lock, 
  FileText, 
  Download, 
  Edit3, 
  UploadCloud, 
  CheckSquare,
  Sparkles,
  Layers
} from 'lucide-react';

export default function ExpedienteEstudiante() {
  const [expedienteData, setExpedienteData] = useState({ documentos: [], no_control: '' });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchExpediente = () => {
    setLoading(true);
    const token = localStorage.getItem('auth_token');
    fetch('http://localhost:5000/api/alumno/expediente', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setExpedienteData(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExpediente();
  }, []);

  const handleDownload = (id_documento) => {
    window.open(`http://localhost:5000/api/alumno/formatos/descargar-plantilla/${id_documento}`, '_blank');
  };

  const getStatusBadge = (estado) => {
    switch((estado || '').toUpperCase()) {
      case 'APROBADO':
        return <span className="badge badge-success"><CheckCircle2 size={13} /> Aprobado</span>;
      case 'EN_REVISION':
        return <span className="badge badge-warning"><Clock size={13} /> En Revisión</span>;
      case 'RECHAZADO':
        return <span className="badge badge-danger"><AlertCircle size={13} /> Rechazado</span>;
      case 'PENDIENTE':
        return <span style={{ padding: '0.25rem 0.65rem', borderRadius: '20px', backgroundColor: '#ffedd5', color: '#c2410c', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={13} color="#ea580c" /> Pendiente</span>;
      case 'DISPONIBLE':
        return <span className="badge badge-primary"><Edit3 size={13} /> Disponible</span>;
      case 'BLOQUEADO':
      default:
        return <span style={{ padding: '0.25rem 0.65rem', borderRadius: '20px', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Lock size={13} /> Bloqueado</span>;
    }
  };

  const docs = expedienteData.documentos || [];
  const aprobadosCount = docs.filter(d => (d.estado || '').toUpperCase() === 'APROBADO').length;
  const progressPercent = docs.length > 0 ? Math.round((aprobadosCount / docs.length) * 100) : 0;

  // Group by Etapa
  const grouped = docs.reduce((acc, doc) => {
    const etp = doc.etapa || 'General';
    if (!acc[etp]) acc[etp] = [];
    acc[etp].push(doc);
    return acc;
  }, {});

  const etapasOrder = [
    'APERTURA', 'Apertura', 'INICIAL', 'Inicial',
    'BIMESTRE 1', 'Bimestre 1', 'BIMESTRE_1', 'Bimestral',
    'BIMESTRE 2', 'Bimestre 2', 'BIMESTRE_2',
    'BIMESTRE 3', 'Bimestre 3', 'BIMESTRE_3',
    'LIBERACION', 'Liberacion', 'Liberación', 'Final', 'FINAL'
  ];

  const presentKeys = Object.keys(grouped);
  const etapasOrdenadas = [
    ...etapasOrder.filter(k => presentKeys.includes(k) && grouped[k].length > 0),
    ...presentKeys.filter(k => !etapasOrder.includes(k) && grouped[k].length > 0)
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header & Progress Card */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
              Mi Expediente de Servicio Social
            </h1>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
              Seguimiento y estado de validación de todos tus documentos oficiales.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Progreso de Validación
            </span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>
              {progressPercent}%
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '20px', overflow: 'hidden' }}>
          <div 
            style={{ 
              width: `${progressPercent}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)', 
              borderRadius: '20px',
              transition: 'width 0.5s ease' 
            }} 
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
          <span>{aprobadosCount} de {docs.length} documentos aprobados</span>
          <span>Fase Actual: {etapasOrdenadas[0] || 'Apertura'}</span>
        </div>
      </div>

      {/* Document Sections Grouped by Etapa */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          Cargando tu expediente...
        </div>
      ) : (
        etapasOrdenadas.map(etp => (
          <div key={etp} style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Layers size={20} color="#059669" />
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>
                Etapa: {etp.toUpperCase().replace('_', ' ')}
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
              {grouped[etp].map(doc => {
                const isBlocked = (doc.estado || '').toUpperCase() === 'BLOQUEADO';
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
                      opacity: isBlocked ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', backgroundColor: '#ecfdf5', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                          {doc.clave}
                        </span>
                        {getStatusBadge(doc.estado)}
                      </div>

                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.02rem', color: '#0f172a', fontWeight: 700, lineHeight: 1.4 }}>
                        {doc.nombre_documento}
                      </h3>

                      {doc.fecha_limite_formato && (
                        <div style={{ fontSize: '0.78rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {doc.plazo_vencido ? (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>
                              ⚠️ Límite oficial concluido ({doc.fecha_limite_formato})
                            </span>
                          ) : (
                            <span style={{ color: '#0284c7', fontWeight: 500 }}>
                              ⏳ Límite oficial: {doc.fecha_limite_formato}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      {doc.tiene_formulario === 1 && !isBlocked && (
                        <button 
                          onClick={() => navigate(`/student/formatos/llenar/${doc.id_formulario}`)}
                          className="btn btn-primary"
                          style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem 0.8rem' }}
                        >
                          <Edit3 size={14} /> Llenar Formato
                        </button>
                      )}
                      {doc.tiene_formulario !== 1 && !isBlocked && (
                        <button 
                          onClick={() => navigate(`/student/formatos/entrega-archivo/${doc.id_documento}`)}
                          className="btn btn-primary"
                          style={{ 
                            flex: 1, 
                            fontSize: '0.82rem', 
                            padding: '0.5rem 0.8rem',
                            backgroundColor: doc.estado === 'APROBADO' ? '#059669' : doc.estado === 'EN_REVISION' ? '#f59e0b' : '#047857',
                            borderColor: doc.estado === 'APROBADO' ? '#059669' : doc.estado === 'EN_REVISION' ? '#f59e0b' : '#047857'
                          }}
                        >
                          <UploadCloud size={14} /> {doc.estado === 'EN_REVISION' ? 'En Revisión' : doc.estado === 'APROBADO' ? 'Aprobado' : 'Subir y Entregar'}
                        </button>
                      )}
                      {doc.plantilla_existe === 1 && !isBlocked && (
                        <button 
                          onClick={() => handleDownload(doc.id_documento)}
                          className="btn btn-secondary"
                          style={{ flex: 'initial', fontSize: '0.82rem', padding: '0.5rem 0.8rem' }}
                          title="Descargar plantilla oficial"
                        >
                          <Download size={14} /> Descargar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
