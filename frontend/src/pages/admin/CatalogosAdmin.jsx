import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Database, Plus, Edit2, Trash2 } from 'lucide-react';

export default function CatalogosAdmin() {
  const [activeTab, setActiveTab] = useState('carreras'); // En el futuro se pueden agregar más tablas aquí
  
  // Estado para la tabla de Carreras
  const [carreras, setCarreras] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para el modal de Carreras
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id_carrera: null, clave: '', nombre: '', activa: 1 });

  const fetchCarreras = () => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/admin/catalogos/carreras')
      .then(res => res.json())
      .then(data => {
        setCarreras(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setCarreras([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'carreras') {
      fetchCarreras();
    }
  }, [activeTab]);

  const openNewModal = () => {
    setIsEditing(false);
    setFormData({ id_carrera: null, clave: '', nombre: '', activa: 1 });
    setShowModal(true);
  };

  const openEditModal = (carrera) => {
    setIsEditing(true);
    setFormData({ ...carrera });
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const url = isEditing 
      ? `http://127.0.0.1:5000/api/admin/catalogos/carreras/${formData.id_carrera}`
      : 'http://127.0.0.1:5000/api/admin/catalogos/carreras';
    
    const method = isEditing ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        Swal.fire('Error', data.error, 'error');
      } else {
        Swal.fire('Éxito', data.message, 'success');
        setShowModal(false);
        fetchCarreras();
      }
    })
    .catch(() => Swal.fire('Error', 'Error de conexión', 'error'));
  };

  const handleDelete = (id_carrera, nombre) => {
    Swal.fire({
      title: '¿Eliminar Carrera?',
      text: `Estás a punto de eliminar "${nombre}". Esto podría fallar si hay alumnos asignados a ella.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, Eliminar'
    }).then(result => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/admin/catalogos/carreras/${id_carrera}`, { method: 'DELETE' })
          .then(res => res.json())
          .then(data => {
            if (data.error) {
              Swal.fire('Error al eliminar', 'Es probable que esta carrera ya tenga alumnos asignados. Error: ' + data.error, 'error');
            } else {
              Swal.fire('Eliminada', 'La carrera ha sido eliminada.', 'success');
              fetchCarreras();
            }
          })
          .catch(() => Swal.fire('Error', 'Error de conexión', 'error'));
      }
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Database size={32} color="#3b82f6" />
          Mantenimiento de Tablas (Catálogos)
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('carreras')}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: activeTab === 'carreras' ? '#3b82f6' : '#f8fafc', 
            color: activeTab === 'carreras' ? 'white' : '#475569', 
            border: activeTab === 'carreras' ? 'none' : '1px solid #cbd5e1', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          Carreras Educativas
        </button>
        <button 
          onClick={() => Swal.fire('Próximamente', 'Esta tabla se agregará en futuras actualizaciones.', 'info')}
          style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#f8fafc', 
            color: '#94a3b8', 
            border: '1px solid #e2e8f0', 
            borderRadius: '6px', 
            cursor: 'not-allowed', 
            fontWeight: 600 
          }}
        >
          Dependencias (Próximamente)
        </button>
      </div>

      {activeTab === 'carreras' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button 
              onClick={openNewModal}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} /> Nueva Carrera
            </button>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando catálogo...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Clave</th>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Nombre Completo</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Estado</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {carreras.map(c => (
                    <tr key={c.id_carrera} style={{ borderBottom: '1px solid #f1f5f9', opacity: c.activa ? 1 : 0.5 }}>
                      <td style={{ padding: '1rem', color: '#64748b' }}>{c.id_carrera}</td>
                      <td style={{ padding: '1rem', color: '#0f172a', fontWeight: 600 }}>{c.clave}</td>
                      <td style={{ padding: '1rem', color: '#334155' }}>{c.nombre}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {c.activa ? (
                          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#d1fae5', color: '#059669', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>ACTIVA</span>
                        ) : (
                          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>INACTIVA</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => openEditModal(c)}
                            style={{ padding: '0.5rem', backgroundColor: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(c.id_carrera, c.nombre)}
                            style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* MODAL DE CARRERAS */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#0f172a' }}>{isEditing ? 'Editar Carrera' : 'Nueva Carrera'}</h2>
            
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>Clave (Acrónimo)</label>
                <input 
                  required 
                  type="text" 
                  value={formData.clave} 
                  onChange={e => setFormData({...formData, clave: e.target.value.toUpperCase()})} 
                  placeholder="Ej: ISC, IND, MEC..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }} 
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b', fontWeight: 600 }}>Nombre de la Carrera</label>
                <input 
                  required 
                  type="text" 
                  value={formData.nombre} 
                  onChange={e => setFormData({...formData, nombre: e.target.value.toUpperCase()})} 
                  placeholder="Ej: INGENIERÍA EN SISTEMAS..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }} 
                />
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#334155', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.activa === 1} 
                    onChange={e => setFormData({...formData, activa: e.target.checked ? 1 : 0})} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  Carrera Activa (Disponible para alumnos)
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 1.5rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
