import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { UserPlus, UserCheck, UserX, Shield, Mail, RefreshCw, X, ShieldAlert, Trash2 } from 'lucide-react';

export default function PersonalAdmin() {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', correo: '', rol: 'Administrador' });

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
    const confirmColor = activoActual ? '#ef4444' : '#10b981';

    Swal.fire({
      title: `${activoActual ? 'Desactivar' : 'Reactivar'} Cuenta`,
      text: `¿Estás seguro de ${accionTexto} el acceso a ${nombre}?`,
      icon: activoActual ? 'warning' : 'question',
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
              Swal.fire('¡Listo!', `Usuario ${accionEndpointTexto} correctamente.`, 'success');
              fetchPersonal();
            } else Swal.fire('Error', data.error, 'error');
          });
      }
    });
  };

  const handleDeletePersonal = (id_usuario, nombre) => {
    Swal.fire({
      title: '¿Eliminar Administrador?',
      text: `¿Estás seguro de quitar los privilegios de administrador a "${nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, Eliminar'
    }).then(result => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/admin/personal/${id_usuario}`, { method: 'DELETE' })
          .then(res => res.json())
          .then(data => {
            if (!data.error) {
              Swal.fire('Eliminado', 'Se retiraron los privilegios de administrador.', 'success');
              fetchPersonal();
            } else {
              Swal.fire('Error', data.error, 'error');
            }
          })
          .catch(() => Swal.fire('Error', 'Error de conexión', 'error'));
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
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 1500
            });
            Toast.fire({ icon: 'success', title: 'Rol actualizado' });
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
        Swal.fire('¡Éxito!', 'Personal agregado correctamente. Podrá iniciar sesión con Microsoft.', 'success');
        setShowModal(false);
        setNuevoUsuario({ nombre: '', correo: '', rol: 'Administrador' });
        fetchPersonal();
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(() => Swal.fire('Error', 'No se pudo conectar con el servidor', 'error'));
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
            Personal y Roles Administrativos
          </h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
            Gestiona los permisos y roles de acceso del personal de Servicio Social y Vinculación.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchPersonal} className="btn btn-secondary">
            <RefreshCw size={16} />
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <UserPlus size={18} /> Agregar Personal
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando personal...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Usuario / Nombre</th>
                <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Correo Institucional</th>
                <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Rol Asignado</th>
                <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Estatus</th>
                <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {personal.map((p, idx) => (
                <tr key={p.id_usuario || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor='#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor='white'}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                        {(p.nombre || p.nombres || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                          {p.nombre || `${p.nombres || ''} ${p.apellido_paterno || ''}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: '#475569', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={14} color="#94a3b8" />
                      <span>{p.correo || p.correo_institucional}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <select 
                      value={p.rol === 'Admin' ? 'Administrador' : p.rol === 'Servicio_Social' ? 'Revisor' : (p.rol || 'Administrador')} 
                      onChange={(e) => handleRoleChange(p.id_usuario, e.target.value)}
                      className="form-select"
                      style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      <option value="Administrador">Administrador</option>
                      <option value="Revisor">Revisor / Servicio Social</option>
                      <option value="SuperAdmin">SuperAdmin</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                    <span className={`badge ${p.activo ? 'badge-success' : 'badge-danger'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleToggleStatus(p.id_usuario, p.nombre || p.nombres, p.activo)}
                        className={p.activo ? "btn btn-danger" : "btn btn-secondary"}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                        title={p.activo ? "Desactivar acceso" : "Reactivar acceso"}
                      >
                        {p.activo ? <UserX size={14} /> : <UserCheck size={14} />} {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button 
                        onClick={() => handleDeletePersonal(p.id_usuario, p.nombre || p.nombres)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        title="Eliminar privilegios de administrador"
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

      {/* Modal Agregar Personal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2.25rem', borderRadius: '20px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem', fontWeight: 800 }}>
                Nuevo Personal Administrativo
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input required type="text" placeholder="Ej. Lic. Claudia Ramírez" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Correo Institucional (@teziutlan.tecnm.mx)</label>
                <input required type="email" placeholder="ejemplo@teziutlan.tecnm.mx" value={nuevoUsuario.correo} onChange={e => setNuevoUsuario({...nuevoUsuario, correo: e.target.value})} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Rol de Acceso</label>
                <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})} className="form-select">
                  <option value="Administrador">Administrador General</option>
                  <option value="Revisor">Coordinador / Revisor de Servicio Social</option>
                  <option value="SuperAdmin">SuperAdmin (Acceso Total)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar Personal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
