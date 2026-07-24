import React from 'react';

export default function Workspace() {
  return (
    <div>
      <h1 style={{ color: '#0f172a', marginBottom: '1.5rem' }}>Mi Workspace de Servicio Social</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>Datos del Proyecto</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Aún no tienes un proyecto registrado. Navega a Expediente para iniciar tu Formato FRPS-01.</p>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>Progreso del Expediente</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Elemento de timeline dummy */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3b82f6', boxShadow: '0 0 0 4px #eff6ff' }}></div>
              <div>
                <h4 style={{ margin: 0, color: '#1e293b' }}>Solicitud de Servicio Social (FRPS-01)</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Estado: Disponible</p>
              </div>
            </div>
            
            <div style={{ width: '2px', height: '20px', backgroundColor: '#e2e8f0', marginLeft: '5px' }}></div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', opacity: 0.5 }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#94a3b8' }}></div>
              <div>
                <h4 style={{ margin: 0, color: '#1e293b' }}>Carta de Presentación (DRPS-01)</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Estado: Bloqueado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
