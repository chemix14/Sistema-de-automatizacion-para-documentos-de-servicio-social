import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Calendar, Save, FileText, CheckCircle } from 'lucide-react';

export default function ConfiguracionCalendario() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/admin/configuracion')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    if (!config.nombre_oficial) {
      Swal.fire('Atención', 'Debes ingresar el nombre oficial del periodo escolar.', 'warning');
      return;
    }

    // Validaciones cruzadas
    for (let i = 1; i <= 3; i++) {
      const start = config[`inicio_bimestre_${i}`];
      const end = config[`fin_bimestre_${i}`];
      const startEnt = config[`inicio_entrega_bim_${i}`];
      const endEnt = config[`limite_entrega_bim_${i}`];

      if (start && end && start > end) {
        Swal.fire('Error', `La fecha de inicio del Bimestre ${i} no puede ser posterior a la de fin.`, 'error');
        return;
      }
      if (startEnt && endEnt && startEnt > endEnt) {
        Swal.fire('Error', `La fecha de inicio de entrega del Bimestre ${i} no puede ser posterior a la de cierre.`, 'error');
        return;
      }
    }

    if (config.apertura_expediente && config.cierre_expediente && config.apertura_expediente > config.cierre_expediente) {
        Swal.fire('Error', `La apertura de expedientes inicial no puede ser posterior al cierre.`, 'error');
        return;
    }

    if (config.apertura_expediente_final && config.cierre_expediente_final && config.apertura_expediente_final > config.cierre_expediente_final) {
        Swal.fire('Error', `La apertura de expedientes finales no puede ser posterior al cierre.`, 'error');
        return;
    }

    Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    fetch('http://127.0.0.1:5000/api/admin/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) Swal.fire('Éxito', 'Calendario y Periodo guardado correctamente', 'success');
      else Swal.fire('Error', data.error, 'error');
    })
    .catch(() => Swal.fire('Error', 'No se pudo conectar', 'error'));
  };

  const renderBimestreCard = (num) => (
    <div key={num} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', color: '#0f172a', borderBottom: '2px solid #3b82f6', paddingBottom: '0.5rem', display: 'inline-block' }}>Fase: Bimestre {num}</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>Inicio de la Fase</label>
          <input type="date" name={`inicio_bimestre_${num}`} value={config[`inicio_bimestre_${num}`] || ''} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>Fin de la Fase</label>
          <input type="date" name={`fin_bimestre_${num}`} value={config[`fin_bimestre_${num}`] || ''} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        </div>
      </div>

      <h4 style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Periodo de Entrega (Retardos)</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>Apertura de Plataforma</label>
          <input type="date" name={`inicio_entrega_bim_${num}`} value={config[`inicio_entrega_bim_${num}`] || ''} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>Cierre Límite (Retardo)</label>
          <input type="date" name={`limite_entrega_bim_${num}`} value={config[`limite_entrega_bim_${num}`] || ''} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        </div>
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: '2rem' }}>Cargando configuración...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={28} color="#3b82f6" /> Calendario Oficial de Periodos
        </h1>
        <button 
          onClick={handleSave}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px rgba(59,130,246,0.3)' }}
        >
          <Save size={18} /> Guardar Calendario Completo
        </button>
      </div>

      <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '1.05rem' }}>
        Configura el nombre del periodo escolar activo y las fechas límite de cada una de las fases institucionales para chequear retardos y cierres automáticos.
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* TARJETA DE PERIODO ESCOLAR */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', borderBottom: '2px solid #8b5cf6', paddingBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
             <FileText size={20} color="#8b5cf6" /> Configuración de Periodo Escolar
          </h3>
          <div style={{ maxWidth: '600px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#64748b', fontWeight: 600 }}>Nombre Oficial del Periodo</label>
            <input 
              type="text" 
              name="nombre_oficial" 
              placeholder="Ejemplo: AGOSTO - DICIEMBRE 2026"
              value={config.nombre_oficial || ''} 
              onChange={handleChange} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', textTransform: 'uppercase' }} 
            />
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Este nombre aparecerá en la documentación generada y en los reportes.</p>
          </div>
        </div>

        {/* CONTENEDOR DE FASES GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
            
            {/* ETAPA INICIAL */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#0f172a', borderBottom: '2px solid #10b981', paddingBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} color="#10b981"/> Fase: Inscripciones (Inicial)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>Apertura de Expedientes</label>
                        <input type="date" name="apertura_expediente" value={config.apertura_expediente || ''} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>Cierre Límite</label>
                        <input type="date" name="cierre_expediente" value={config.cierre_expediente || ''} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                </div>
            </div>

            {/* BIMESTRES */}
            {[1, 2, 3].map(renderBimestreCard)}

            {/* ETAPA FINAL */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#0f172a', borderBottom: '2px solid #f59e0b', paddingBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} color="#f59e0b"/> Fase: Liberación (Final)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>Apertura de Expedientes Finales</label>
                        <input type="date" name="apertura_expediente_final" value={config.apertura_expediente_final || ''} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>Cierre Límite</label>
                        <input type="date" name="cierre_expediente_final" value={config.cierre_expediente_final || ''} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                </div>
            </div>

        </div>
      </form>
    </div>
  );
}
