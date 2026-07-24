import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { UserPlus, Trash2, RotateCcw } from 'lucide-react';

export default function PersonalAdmin() {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', correo: '', rol: 'Admin' });

  const fetchPersonal = () => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/admin/personal')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPersonal(data);
        } else {
          setPersonal([]);
          if (data.error) console.error(data.error);
        }
        setLoading(false);
      })
      .catch(() => {
        setPersonal([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPersonal();
  }, []);

  const handleToggleStatus = (id_usuario, nombre, activoActual) => {
    const accionTexto = activoActual ? 'desactivar' : 'reactivar';
    const accionEndpointTexto = activoActual ? 'Desactivado' : 'Reactivado';
    const iconType = activoActual ? 'warning' : 'question';
    const confirmColor = activoActual ? '#ef4444' : '#10b981';

    Swal.fire({
      title: `${activoActual ? 'Desactivar' : 'Reactivar'} Cuenta`,
      text: `¿Estás seguro de ${accionTexto} a ${nombre}?`,
      icon: iconType,
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonText: 'Cancelar',
      confirmButtonText: `Sí, ${activoActual ? 'Desactivar' : 'Reactivar'}`
    }).then(result => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/admin/personal/${id_usuario}/estatus`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: activoActual ? 0 : 1 })
        })
          .then(res => res.json())
          .then(data => {
            if (!data.error) {
              Swal.fire('Éxito', `Usuario ${accionEndpointTexto}`, 'success');
              fetchPersonal();
            } else Swal.fire('Error', data.error, 'error');
          });
      }
    });
  };

  const handleRoleChange = (id_usuario, nuevoRol) => {
    fetch(`http://127.0.0.1:5000/api/admin/personal/${id_usuario}/rol`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: nuevoRol })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.error) {
            Swal.fire({
                title: 'Rol Actualizado',
                text: 'Los permisos se han guardado.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            fetchPersonal();
        } else {
            Swal.fire('Error', data.error, 'error');
        }
    });
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    fetch('http://127.0.0.1:5000/api/admin/personal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoUsuario)
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        Swal.fire('Creado', 'Personal agregado correctamente. Podrá iniciar sesión con Microsoft.', 'success');
        setShowModal(false);
        setNuevoUsuario({ nombre: '', correo: '', rol: 'Admin' });
        fetchPersonal();
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0f172a', margin: 0 }}>Personal Administrativo</h1>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <UserPlus size={18} /> Agregar Administrador
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando personal...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Nombre</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Correo Institucional</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Rol de Acceso</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Estatus</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {personal.map(p => (
                <tr key={p.id_usuario} style={{ borderBottom: '1px solid #f1f5f9', opacity: p.activo ? 1 : 0.6 }}>
                  <td style={{ padding: '1rem', color: '#0f172a', fontWeight: 500 }}>{p.nombre}</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{p.correo}</td>
                  <td style={{ padding: '1rem' }}>
                    <select
                        value={p.rol || 'Admin'}
                        onChange={(e) => handleRoleChange(p.id_usuario, e.target.value)}
                        disabled={!p.activo}
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: p.rol === 'SuperAdmin' ? '#e0e7ff' : '#f1f5f9',
                            color: p.rol === 'SuperAdmin' ? '#4338ca' : '#334155',
                            fontWeight: 600,
                            cursor: p.activo ? 'pointer' : 'not-allowed',
                            outline: 'none'
                        }}
                    >
                        <option value="SuperAdmin">Super Admin (IT)</option>
                        <option value="Admin">Administrador (Gestor)</option>
                        <option value="Coordinador">Coordinador</option>
                        <option value="Docente">Docente Revisador</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {p.activo ? (
                      <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.875rem' }}>Activo</span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.875rem' }}>Inactivo</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {p.activo ? (
                      <button 
                        onClick={() => handleToggleStatus(p.id_usuario, p.nombre, p.activo)}
                        style={{ padding: '0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                        title="Desactivar Usuario"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleToggleStatus(p.id_usuario, p.nombre, p.activo)}
                        style={{ padding: '0.5rem', backgroundColor: '#d1fae5', color: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                        title="Reactivar Usuario"
                      >
                        <RotateCcw size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#0f172a' }}>Nuevo Administrador</h2>
            <form onSubmit={handleAddSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b' }}>Nombre Completo</label>
                <input required type="text" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b' }}>Correo Institucional</label>
                <input required type="email" value={nuevoUsuario.correo} onChange={e => setNuevoUsuario({...nuevoUsuario, correo: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', color: '#64748b' }}>Rol</label>
                <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="Admin">Administrador (Gestor)</option>
                  <option value="SuperAdmin">Super Admin (IT)</option>
                  <option value="Coordinador">Coordinador</option>
                  <option value="Docente">Docente Revisador</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Crear Cuenta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
