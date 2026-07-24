import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FormsDashboard() {
  const [noControl, setNoControl] = useState('L23TE0037'); // Default for testing
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/api/forms/catalog')
      .then(res => res.json())
      .then(data => {
        setCatalog(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching catalog:", err);
        setLoading(false);
      });
  }, []);

  const handleDownload = (clave) => {
    window.open(`http://localhost:5000/api/generador/generar/${clave}?no_control=${noControl}`, '_blank');
  };

  // Group forms by 'etapa'
  const groupedByEtapa = catalog.reduce((acc, doc) => {
    const etapa = doc.etapa || 1;
    if (!acc[etapa]) acc[etapa] = [];
    acc[etapa].push(doc);
    return acc;
  }, {});

  const etapas = Object.keys(groupedByEtapa).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>Gestión de Formatos de Servicio Social</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Completa y descarga tus documentos oficiales por etapas. (Alumno: {noControl})
      </p>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>Cargando formatos...</div>
      ) : catalog.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>No hay formatos disponibles actualmente.</div>
      ) : (
        etapas.map(etapa => (
          <section key={etapa} style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Etapa {etapa}</h2>
            <div style={gridStyle}>
              {groupedByEtapa[etapa].map(doc => {
                // Determine icon color based on etapa
                let colorKey = 'blue';
                if (etapa === '2') colorKey = 'orange';
                if (etapa === '3') colorKey = 'teal';

                return (
                  <div key={doc.id_documento} style={cardStyle}>
                    <div style={iconStyle(colorKey)}><i className="fas fa-file-alt"></i></div>
                    <h3 style={titleStyle}>{doc.clave}</h3>
                    <p style={descStyle}>{doc.nombre_documento}</p>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                      {doc.tiene_formulario === 1 && (
                        <button 
                          onClick={() => navigate(`/student/formatos/llenar/${doc.id_formulario}`)} 
                          style={btnStyle(colorKey, false)}
                        >
                          Llenar Formulario
                        </button>
                      )}
                      {doc.plantilla_existe === 1 && (
                        <button 
                          onClick={() => handleDownload(doc.clave)} 
                          style={btnStyle('gray', true)}
                        >
                          Descargar PDF/Excel
                        </button>
                      )}
                      {doc.tiene_formulario === 0 && doc.plantilla_existe === 0 && (
                         <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>Pendiente de configuración</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

const sectionStyle = {
  marginBottom: '3rem'
};

const sectionTitleStyle = {
  fontSize: '1.4rem',
  color: '#334155',
  borderBottom: '2px solid #e2e8f0',
  paddingBottom: '0.5rem',
  marginBottom: '1.5rem'
};

const gridStyle = {
  display: 'grid', 
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
  gap: '1.5rem'
};

const cardStyle = {
  backgroundColor: 'white',
  padding: '1.5rem',
  borderRadius: '16px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  border: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column'
};

const titleStyle = {
  fontSize: '1.1rem',
  color: '#1e293b',
  margin: '1rem 0 0.25rem 0',
  fontWeight: '600'
};

const descStyle = {
  color: '#64748b',
  fontSize: '0.875rem',
  marginBottom: '1.5rem',
  flexGrow: 1
};

const iconStyle = (color) => {
  const colors = {
    blue: { bg: '#eff6ff', c: '#3b82f6' },
    green: { bg: '#f0fdf4', c: '#22c55e' },
    purple: { bg: '#faf5ff', c: '#a855f7' },
    orange: { bg: '#fff7ed', c: '#f97316' },
    teal: { bg: '#f0fdfa', c: '#14b8a6' },
    gray: { bg: '#f1f5f9', c: '#64748b' }
  };
  return {
    width: '48px', height: '48px', borderRadius: '12px',
    backgroundColor: colors[color].bg, color: colors[color].c,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
  };
};

const btnStyle = (color, isOutline = false) => {
  const colors = {
    blue: '#3b82f6', green: '#22c55e', purple: '#a855f7', orange: '#f97316', teal: '#14b8a6', gray: '#475569'
  };
  return {
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    border: isOutline ? `1px solid ${colors[color]}` : 'none',
    backgroundColor: isOutline ? 'transparent' : colors[color],
    color: isOutline ? colors[color] : 'white',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1,
    textAlign: 'center',
    transition: 'all 0.2s',
    fontSize: '0.85rem'
  };
};
