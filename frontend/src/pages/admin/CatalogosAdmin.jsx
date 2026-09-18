import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Database, Plus, Edit3, Trash2, Library, GraduationCap, X, RefreshCw } from 'lucide-react';

export default function CatalogosAdmin() {
  const [activeTab, setActiveTab] = useState('carreras');
  const [carreras, setCarreras] = useState([]);
  const [loading, setLoading] = useState(false);
  
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
        Swal.fire('¡Éxito!', data.message || 'Carrera guardada con éxito', 'success');
        setShowModal(false);
        fetchCarreras();
      }
    })
    .catch(() => Swal.fire('Error', 'Error al conectar con el servidor', 'error'));
  };

  const handleDelete = (id_carrera, nombre) => {
    Swal.fire({
      title: '¿Eliminar Carrera?',
      text: `Estás a punto de eliminar "${nombre}".`,
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
              Swal.fire('Error al eliminar', data.error, 'error');
            } else {
              Swal.fire('Eliminada', 'La carrera ha sido eliminada del catálogo.', 'success');
              fetchCarreras();
            }
          })
          .catch(() => Swal.fire('Error', 'Error de conexión', 'error'));
      }
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
            Catálogos y Tablas Maestras
          </h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
            Administra las carreras universitarias y catálogos globales de la institución.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchCarreras} className="btn btn-secondary">
            <RefreshCw size={16} />
          </button>
          <button onClick={openNewModal} className="btn btn-primary">
            <Plus size={18} /> Nueva Carrera
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <button 
          onClick={() => setActiveTab('carreras')}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: activeTab === 'carreras' ? 'var(--primary-light)' : 'transparent', 
            color: activeTab === 'carreras' ? 'var(--primary)' : '#64748b', 
            border: activeTab === 'carreras' ? '1px solid var(--primary)' : '1px solid transparent', 
            borderRadius: '20px', 
            cursor: 'pointer', 
            fontWeight: activeTab === 'carreras' ? 700 : 500,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s'
          }}
        >
          <GraduationCap size={16} /> Carreras Institucionales ({carreras.length})
        </button>
      </div>

      {/* Table */}
      {activeTab === 'carreras' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando catálogo...</div>
          ) : carreras.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <Library size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontWeight: 600, color: '#64748b' }}>No hay carreras registradas en este momento.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Clave</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Nombre de la Carrera</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Estatus</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {carreras.map((c, idx) => (
                  <tr key={c.id_carrera || idx} style={{ borderBottom: '1px solid #f1f5f9', opacity: c.activa ? 1 : 0.6, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor='#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor='white'}>
                    <td style={{ padding: '1rem 1.25rem', color: '#059669', fontWeight: 800, fontSize: '0.9rem' }}>
                      {c.clave}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: '#0f172a', fontWeight: 600, fontSize: '0.92rem' }}>
                      {c.nombre}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <span className={`badge ${c.activa ? 'badge-success' : 'badge-danger'}`}>
                        {c.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          onClick={() => openEditModal(c)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}
                          title="Editar"
                        >
                          <Edit3 size={14} color="#059669" />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id_carrera, c.nombre)}
                          className="btn btn-danger"
                          style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2.25rem', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem', fontWeight: 800 }}>
                {isEditing ? 'Editar Carrera' : 'Nueva Carrera Universitaria'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Clave Institucional (Acrónimo)</label>
                <input 
                  required 
                  type="text" 
                  value={formData.clave} 
                  onChange={e => setFormData({...formData, clave: e.target.value.toUpperCase()})} 
                  placeholder="Ej: ISC, IIAS, IMEC..."
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nombre Completo de la Carrera</label>
                <input 
                  required 
                  type="text" 
                  value={formData.nombre} 
                  onChange={e => setFormData({...formData, nombre: e.target.value.toUpperCase()})} 
                  placeholder="Ej: INGENIERÍA INFORMÁTICA..."
                  className="form-input"
                />
              </div>

              <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input 
                  type="checkbox" 
                  id="carrera_activa"
                  checked={formData.activa === 1} 
                  onChange={e => setFormData({...formData, activa: e.target.checked ? 1 : 0})} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="carrera_activa" style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>
                  Carrera Activa (Disponible para alumnos de Servicio Social)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Carrera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
