import React, { useEffect, useState } from 'react';

export default function DashboardHome() {
  const [stats, setStats] = useState({
    alumnos_activos: 0,
    proyectos_activos: 0,
    documentos_pendientes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setStats(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Cargando métricas...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#0f172a', marginBottom: '1.5rem' }}>Dashboard General</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
          <h3 style={{ color: '#64748b', margin: 0, fontSize: '0.875rem', textTransform: 'uppercase' }}>Alumnos Activos</h3>
          <p style={{ color: '#0f172a', fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0 0 0' }}>{stats.alumnos_activos}</p>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
          <h3 style={{ color: '#64748b', margin: 0, fontSize: '0.875rem', textTransform: 'uppercase' }}>Proyectos Activos</h3>
          <p style={{ color: '#0f172a', fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0 0 0' }}>{stats.proyectos_activos}</p>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ color: '#64748b', margin: 0, fontSize: '0.875rem', textTransform: 'uppercase' }}>Docs. Pendientes (Revisión)</h3>
          <p style={{ color: '#ef4444', fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0 0 0' }}>{stats.documentos_pendientes}</p>
        </div>

      </div>
    </div>
  );
}
