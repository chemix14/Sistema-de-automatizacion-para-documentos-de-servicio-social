import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderKanban, 
  CheckSquare, 
  Building2, 
  UserCheck, 
  Calendar, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  FileSpreadsheet
} from 'lucide-react';
import RaccoonIcon from '../../components/RaccoonIcon';

export default function Workspace() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch('http://localhost:5000/api/alumno/me', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(resData => {
        if (!resData.error) {
          setData(resData);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Cargando tu espacio de trabajo...
      </div>
    );
  }

  const alumno = data?.alumno || {
    nombre: 'José Manuel Méndez Muñoz',
    no_control: '23TE0037',
    carrera: 'Ingeniería Informática'
  };

  const proyecto = data?.proyecto || {
    nombre_proyecto: 'Automatización y Digitalización de Procesos de Servicio Social',
    nombre_dependencia: 'Instituto Tecnológico Superior de Teziutlán',
    titular_dependencia: 'Ing. Carlos Robles',
    modalidad: 'Presencial',
    estatus: 'Activo'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Banner de Alumno */}
      <div style={{ 
        background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)', 
        borderRadius: '20px', 
        padding: '2.5rem', 
        color: 'white', 
        marginBottom: '2rem',
        boxShadow: '0 10px 25px -5px rgba(2, 44, 34, 0.35)',
        border: '1px solid rgba(16, 185, 129, 0.25)'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.12)', fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '1rem', border: '1px solid rgba(110, 231, 183, 0.25)' }}>
          <RaccoonIcon size={16} color="#34d399" /> Servicio Social ITST • Mapaches
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
          Bienvenido(a), {alumno.nombre}
        </h1>
        <p style={{ color: '#d1fae5', fontSize: '0.95rem', margin: 0 }}>
          No. Control: <strong style={{ color: 'white' }}>{alumno.no_control}</strong> • Carrera: <strong style={{ color: 'white' }}>{alumno.nombre_carrera || alumno.carrera}</strong>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Tarjeta de Proyecto */}
        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669' }}>
              <FolderKanban size={20} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>
              Proyecto Asignado
            </h2>
          </div>

          <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem', fontWeight: 700, lineHeight: 1.4 }}>
            {proyecto.nombre_proyecto || 'Sin Proyecto Asignado'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.88rem' }}>
              <Building2 size={16} color="#059669" />
              <span>Dependencia: <strong>{proyecto.nombre_dependencia || 'H. Ayuntamiento / ITST'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.88rem' }}>
              <UserCheck size={16} color="#059669" />
              <span>Responsable: <strong>{proyecto.titular_dependencia || proyecto.responsable_proyecto || 'Lic. Responsable'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.88rem' }}>
              <Calendar size={16} color="#059669" />
              <span>Modalidad: <strong>{proyecto.modalidad || 'Presencial'}</strong></span>
            </div>
          </div>

          <span className="badge badge-success">
            <CheckCircle2 size={13} /> Proyecto {proyecto.estatus || 'Activo'}
          </span>
        </div>

        {/* Tarjeta de Acciones Rápidas */}
        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669' }}>
                <CheckSquare size={20} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>
                Expediente y Entregas
              </h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Consulta el estado de revisión de tus documentos, llena en línea tus reportes bimestrales y descarga los formatos institucionales.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/student/expediente')}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              Ver Mi Expediente <ArrowRight size={16} />
            </button>
            <button 
              onClick={() => navigate('/student/formatos')}
              className="btn btn-secondary"
            >
              <FileSpreadsheet size={16} /> Formatos Oficiales
            </button>
          </div>
        </div>
      </div>

      {/* Sección de Avisos Institucionales Vigentes */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <RaccoonIcon size={20} color="#059669" />
          <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
            Tablón de Avisos y Comunicados Oficiales
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Comunicado Oficial</span>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Coordinación de Servicio Social</span>
            </div>
            <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
              Atención a Fechas de Entrega y Llenado de Formatos Bimestrales
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', lineHeight: 1.5 }}>
              Recuerda verificar que todos tus formatos se encuentren en estado APROBADO. Si presentas algún documento en PENDIENTE o RECHAZADO, ingresa al apartado de Formatos Oficiales para subsanar los requisitos antes del cierre del periodo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
