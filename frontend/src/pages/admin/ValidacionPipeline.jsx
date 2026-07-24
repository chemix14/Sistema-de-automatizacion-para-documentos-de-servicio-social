import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function ValidacionPipeline() {
  const [pipeline, setPipeline] = useState([]);
  const [etapasData, setEtapasData] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchPipeline = () => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/admin/matriz-validacion')
      .then(res => res.json())
      .then(data => {
        if (data.etapas && data.alumnos) {
          setEtapasData(data.etapas);
          setPipeline(data.alumnos);
        } else {
          setPipeline([]);
          if (data.error) console.error(data.error);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setPipeline([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const handleStatusChange = (id_proyecto, id_documento, nuevo_estado) => {
    if (!id_proyecto) {
      Swal.fire('Atención', 'Este alumno no ha iniciado un proyecto aún.', 'warning');
      return;
    }

    fetch('http://127.0.0.1:5000/api/admin/matriz-validacion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_proyecto,
        id_documento,
        nuevo_estado,
        comentarios: ''
      })
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
        Toast.fire({ icon: 'success', title: 'Estado actualizado' });
        
        setPipeline(prev => prev.map(p => {
          if (p.id_proyecto === id_proyecto) {
            return {
              ...p,
              documentos: {
                ...p.documentos,
                [id_documento]: nuevo_estado
              }
            };
          }
          return p;
        }));
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(() => Swal.fire('Error', 'Error de conexión', 'error'));
  };

  const getStatusColor = (estado) => {
    switch(estado) {
      case 'APROBADO': return '#10b981';
      case 'RECHAZADO': return '#ef4444';
      case 'EN_REVISION': return '#f59e0b';
      case 'DISPONIBLE': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  const ordenEtapas = ['INICIAL', 'BIMESTRE_1', 'BIMESTRE_2', 'BIMESTRE_3', 'FINAL'];
  const etapasPresentes = ordenEtapas.filter(e => etapasData[e] && etapasData[e].length > 0);

  // Generamos un array plano de todos los documentos en orden
  const todosLosDocumentos = [];
  etapasPresentes.forEach(e => {
    etapasData[e].forEach(doc => {
      todosLosDocumentos.push(doc);
    });
  });

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#0f172a', marginBottom: '1.5rem' }}>Pipeline de Validación de Expedientes</h1>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'auto', maxHeight: '70vh' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando pipeline...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <tr>
                <th rowSpan={2} style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600, position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 11, borderBottom: '2px solid #e2e8f0' }}>Control</th>
                <th rowSpan={2} style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600, position: 'sticky', left: '100px', backgroundColor: '#f8fafc', zIndex: 11, borderBottom: '2px solid #e2e8f0' }}>Nombre Alumno</th>
                
                {etapasPresentes.map(etp => (
                  <th key={etp} colSpan={etapasData[etp].length} style={{ padding: '0.5rem 1rem', textAlign: 'center', color: '#1e293b', fontWeight: 700, borderBottom: '1px solid #cbd5e1', borderLeft: '1px solid #e2e8f0' }}>
                    {etp.replace('_', ' ')}
                  </th>
                ))}
              </tr>
              <tr>
                {etapasPresentes.map(etp => 
                  etapasData[etp].map(doc => (
                    <th key={doc.id_documento} style={{ padding: '0.5rem 1rem', textAlign: 'center', color: '#475569', fontWeight: 600, borderBottom: '2px solid #e2e8f0', borderLeft: '1px solid #f1f5f9', fontSize: '0.875rem' }}>
                      {doc.nombre}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {pipeline.map(row => (
                <tr key={row.no_control} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', color: '#64748b', position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1 }}>{row.no_control}</td>
                  <td style={{ padding: '1rem', color: '#0f172a', fontWeight: 500, position: 'sticky', left: '100px', backgroundColor: 'white', zIndex: 1 }}>{row.nombre_alumno}</td>
                  
                  {todosLosDocumentos.map(doc => {
                    let estadoActual = row.documentos[doc.id_documento];
                    if (!estadoActual) {
                      // El documento 1 (Solicitud de Servicio Social) siempre debe estar DISPONIBLE por defecto
                      estadoActual = (doc.id_documento === 1 || doc.nombre === 'Solicitud de Servicio Social') ? 'DISPONIBLE' : 'BLOQUEADO';
                    }
                    const color = getStatusColor(estadoActual);
                    return (
                      <td key={doc.id_documento} style={{ padding: '0.5rem', textAlign: 'center', borderLeft: '1px solid #f8fafc' }}>
                        <select 
                          value={estadoActual}
                          onChange={(e) => handleStatusChange(row.id_proyecto, doc.id_documento, e.target.value)}
                          style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '4px', 
                            border: `1px solid ${color}`,
                            color: color,
                            backgroundColor: `${color}10`,
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          <option value="BLOQUEADO">Bloqueado</option>
                          <option value="DISPONIBLE">Disponible</option>
                          <option value="EN_REVISION">En Revisión</option>
                          <option value="APROBADO">Aprobado</option>
                          <option value="RECHAZADO">Rechazado</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
