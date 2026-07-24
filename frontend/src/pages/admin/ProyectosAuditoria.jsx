import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Search, Edit2, CheckCircle, XCircle } from 'lucide-react';

export default function ProyectosAuditoria() {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [selectedProject, setSelectedProject] = useState(null);

  const fetchProyectos = () => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/admin/proyectos')
      .then(res => res.json())
      .then(data => {
        setProyectos(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProyectos();
  }, []);

  const handleUpdate = (e) => {
    e.preventDefault();
    Swal.fire({
      title: 'Actualizando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    fetch(`http://127.0.0.1:5000/api/admin/proyectos/${selectedProject.id_proyecto}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedProject)
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        Swal.fire('Error', data.error, 'error');
      } else {
        Swal.fire('Éxito', 'Proyecto y dependencia actualizados', 'success');
        setSelectedProject(null);
        fetchProyectos();
      }
    })
    .catch(err => Swal.fire('Error', 'Hubo un error de conexión', 'error'));
  };

  const filteredProyectos = proyectos.filter(p => 
    (p.nombre_alumno?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.no_control?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (p.nombre_proyecto?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0f172a', margin: 0 }}>Auditoría de Proyectos</h1>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} color="#64748b" style={{ position: 'absolute', top: '10px', left: '10px' }} />
          <input 
            type="text" 
            placeholder="Buscar por alumno, control o proyecto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando proyectos...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Alumno</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Proyecto</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Dependencia</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Estado (Básico)</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProyectos.map(p => {
                const hasProject = p.id_proyecto != null;
                const completeness = hasProject && p.nombre_proyecto && p.dependencia !== 'PENDIENTE';
                return (
                  <tr key={p.no_control} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem' }}>
                      <p style={{ margin: 0, fontWeight: 500, color: '#0f172a' }}>{p.nombre_alumno}</p>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{p.no_control} | {p.carrera || 'N/A'}</p>
                    </td>
                    <td style={{ padding: '1rem', color: '#475569' }}>
                      {p.nombre_proyecto || <span style={{color: '#94a3b8', fontStyle: 'italic'}}>Sin Proyecto Asignado</span>}
                    </td>
                    <td style={{ padding: '1rem', color: '#475569' }}>
                      {p.dependencia || <span style={{color: '#94a3b8', fontStyle: 'italic'}}>N/A</span>}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {!hasProject ? <span style={{color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600}}>VACÍO</span> : (completeness ? <CheckCircle color="#10b981" /> : <XCircle color="#ef4444" />)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {hasProject && (
                        <button 
                          onClick={() => setSelectedProject({...p, dependencia: {nombre: p.dependencia, titular_dependencia: p.titular_dependencia, cargo_titular: p.cargo_titular, telefono_dependencia: p.telefono_dependencia, correo_dependencia: p.correo_dependencia}})}
                          style={{ padding: '0.5rem', backgroundColor: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          title="Auditar Proyecto"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedProject && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#0f172a' }}>Auditoría: {selectedProject.nombre_alumno}</h2>
              <button onClick={() => setSelectedProject(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <form onSubmit={handleUpdate}>
              <h3 style={{ color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Datos del Proyecto</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b' }}>Nombre del Proyecto</label>
                  <input required type="text" value={selectedProject.nombre_proyecto || ''} onChange={e => setSelectedProject({...selectedProject, nombre_proyecto: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b' }}>Modalidad</label>
                  <select value={selectedProject.modalidad || ''} onChange={e => setSelectedProject({...selectedProject, modalidad: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="DISTANCIA">Distancia</option>
                    <option value="HÍBRIDA">Híbrida</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b' }}>Fecha Inicio</label>
                  <input type="date" value={selectedProject.fecha_inicio || ''} onChange={e => setSelectedProject({...selectedProject, fecha_inicio: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b' }}>Fecha Fin</label>
                  <input type="date" value={selectedProject.fecha_fin || ''} onChange={e => setSelectedProject({...selectedProject, fecha_fin: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <h3 style={{ color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginTop: '1.5rem' }}>Datos de la Dependencia (Se clonará al guardar)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b' }}>Nombre Dependencia</label>
                  <input type="text" value={selectedProject.dependencia.nombre || ''} onChange={e => setSelectedProject({...selectedProject, dependencia: {...selectedProject.dependencia, nombre: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b' }}>Titular</label>
                  <input type="text" value={selectedProject.dependencia.titular_dependencia || ''} onChange={e => setSelectedProject({...selectedProject, dependencia: {...selectedProject.dependencia, titular_dependencia: e.target.value}})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setSelectedProject(null)} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
