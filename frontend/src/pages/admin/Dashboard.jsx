import React from 'react';

export default function Dashboard() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#0f172a', marginBottom: '1.5rem' }}>Métricas Iniciales</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#64748b', margin: 0, fontSize: '0.875rem', textTransform: 'uppercase' }}>Alumnos Activos</h3>
          <p style={{ color: '#0f172a', fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0 0 0' }}>1,204</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#64748b', margin: 0, fontSize: '0.875rem', textTransform: 'uppercase' }}>Proyectos en Borrador</h3>
          <p style={{ color: '#0f172a', fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0 0 0' }}>45</p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#64748b', margin: 0, fontSize: '0.875rem', textTransform: 'uppercase' }}>Expedientes por Revisar</h3>
          <p style={{ color: '#ef4444', fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0 0 0' }}>12</p>
        </div>
      </div>
    </div>
  );
}
