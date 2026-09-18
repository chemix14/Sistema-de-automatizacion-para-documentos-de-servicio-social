import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  Search, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  FolderKanban, 
  RefreshCw, 
  X, 
  Eye, 
  Plus, 
  Save, 
  Trash2, 
  User, 
  Calendar, 
  MapPin, 
  FileText, 
  GraduationCap 
} from 'lucide-react';

export default function ProyectosAuditoria() {
  const [proyectos, setProyectos] = useState([]);
  const [alumnosList, setAlumnosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModalidad, setFilterModalidad] = useState('');
  const [filterEstatus, setFilterEstatus] = useState('');

  // Modales
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [formData, setFormData] = useState({});

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
        setProyectos([]);
        setLoading(false);
      });
  };

  const fetchAlumnos = () => {
    fetch('http://127.0.0.1:5000/api/admin/alumnos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAlumnosList(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchProyectos();
    fetchAlumnos();
  }, []);

  const handleOpenEdit = (p) => {
    setFormData({
      id_proyecto: p.id_proyecto,
      no_control: p.no_control || '',
      nombre_alumno: p.nombre_alumno || '',
      carrera: p.carrera || '',
      nombre_proyecto: p.nombre_proyecto || '',
      objetivo: p.objetivo || '',
      modalidad: p.modalidad || 'PRESENCIAL',
      programa_institucional: p.programa_institucional || 'DESARROLLO SUSTENTABLE',
      tipo_programa: p.tipo_programa || 'DESARROLLO SUSTENTABLE',
      fecha_inicio: p.fecha_inicio || '',
      fecha_fin: p.fecha_fin || '',
      estatus: p.estatus || 'Activo',
      responsable_nombre: p.responsable_nombre || '',
      responsable_cargo: p.responsable_cargo || '',
      supervisor_nombre: p.supervisor_nombre || '',
      supervisor_cargo: p.supervisor_cargo || '',
      id_dependencia: p.id_dependencia,
      dependencia_nombre: p.dependencia_nombre || p.dependencia || '',
      titular_dependencia: p.titular_dependencia || '',
      cargo_titular_dependencia: p.cargo_titular_dependencia || p.cargo_titular || '',
      calle_dependencia: p.calle_dependencia || '',
      colonia_dependencia: p.colonia_dependencia || '',
      ciudad_dependencia: p.ciudad_dependencia || '',
      estado_dependencia: p.estado_dependencia || '',
      cp_dependencia: p.cp_dependencia || '',
      telefono_dependencia: p.telefono_dependencia || '',
      correo_dependencia: p.correo_dependencia || ''
    });
    setSelectedProject(p);
    setIsEditModalOpen(true);
  };

  const handleOpenView = (p) => {
    setSelectedProject(p);
    setIsViewModalOpen(true);
  };

  const handleOpenNew = () => {
    setFormData({
      no_control: alumnosList[0]?.no_control || '',
      nombre_proyecto: '',
      objetivo: '',
      modalidad: 'PRESENCIAL',
      programa_institucional: 'DESARROLLO SUSTENTABLE',
      tipo_programa: 'DESARROLLO SUSTENTABLE',
      fecha_inicio: '2026-02-01',
      fecha_fin: '2026-08-01',
      estatus: 'Activo',
      responsable_nombre: '',
      responsable_cargo: '',
      supervisor_nombre: '',
      supervisor_cargo: '',
      dependencia_nombre: 'Instituto Tecnológico Superior de Teziutlán',
      titular_dependencia: '',
      cargo_titular_dependencia: '',
      calle_dependencia: 'Fracc. Aire Libre s/n',
      colonia_dependencia: 'Aire Libre',
      ciudad_dependencia: 'Teziutlán',
      estado_dependencia: 'Puebla',
      cp_dependencia: '73960',
      telefono_dependencia: '',
      correo_dependencia: ''
    });
    setIsNewModalOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!formData.nombre_proyecto) {
      Swal.fire('Atención', 'El nombre del proyecto es obligatorio', 'warning');
      return;
    }

    Swal.fire({ title: 'Actualizando proyecto...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    fetch(`http://127.0.0.1:5000/api/admin/proyectos/${formData.id_proyecto}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        Swal.fire('¡Actualizado!', data.message || 'Proyecto y dependencia actualizados exitosamente.', 'success');
        setIsEditModalOpen(false);
        fetchProyectos();
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(() => Swal.fire('Error', 'Error al conectar con el servidor', 'error'));
  };

  const handleSaveNew = (e) => {
    e.preventDefault();
    if (!formData.nombre_proyecto || !formData.no_control) {
      Swal.fire('Atención', 'Selecciona un alumno e ingresa el nombre del proyecto', 'warning');
      return;
    }

    Swal.fire({ title: 'Registrando proyecto...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    fetch('http://127.0.0.1:5000/api/admin/proyectos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        Swal.fire('¡Registrado!', data.message || 'Proyecto registrado exitosamente.', 'success');
        setIsNewModalOpen(false);
        fetchProyectos();
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(() => Swal.fire('Error', 'Error al conectar con el servidor', 'error'));
  };

  const handleDelete = (id_proyecto, nombre_proyecto) => {
    Swal.fire({
      title: '¿Eliminar Proyecto?',
      html: `Estás a punto de eliminar el proyecto: <b>${nombre_proyecto}</b>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar proyecto',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/admin/proyectos/${id_proyecto}`, {
          method: 'DELETE'
        })
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('Eliminado', data.message || 'Proyecto eliminado', 'success');
            fetchProyectos();
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => Swal.fire('Error', 'Error de conexión', 'error'));
      }
    });
  };

  const filteredProyectos = proyectos.filter(p => {
    const matchSearch = (p.nombre_alumno || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.no_control || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.carrera || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.nombre_proyecto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.dependencia_nombre || p.dependencia || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchModalidad = filterModalidad ? (p.modalidad === filterModalidad) : true;
    const matchEstatus = filterEstatus ? (p.estatus === filterEstatus) : true;

    return matchSearch && matchModalidad && matchEstatus;
  });

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
            Auditoría Integral de Proyectos y Dependencias
          </h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
            Supervisa, valida y edita todos los datos de los proyectos de Servicio Social, asesores y dependencias receptoras.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={handleOpenNew}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> Registrar Proyecto
          </button>
          <button 
            onClick={fetchProyectos}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Refrescar
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Buscar por proyecto, alumno, dependencia, carrera..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <select 
          value={filterModalidad}
          onChange={e => setFilterModalidad(e.target.value)}
          className="form-select"
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="">Todas las Modalidades</option>
          {Array.from(new Set([...proyectos.map(p => p.modalidad), 'ESC', 'MIX', 'ESM'].filter(Boolean))).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select 
          value={filterEstatus}
          onChange={e => setFilterEstatus(e.target.value)}
          className="form-select"
          style={{ width: 'auto', minWidth: '160px' }}
        >
          <option value="">Todos los Estatus</option>
          <option value="Activo">Activo</option>
          <option value="Finalizado">Finalizado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>

      {/* Tabla Completa de Proyectos */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Cargando proyectos de servicio social...</div>
          </div>
        ) : filteredProyectos.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FolderKanban size={42} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>No se encontraron proyectos registrados.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '1rem', fontWeight: 800 }}>ID</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>Estudiante Asignado</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>Nombre del Proyecto</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>Dependencia Receptora</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>Supervisión y Asesoría</th>
                <th style={{ padding: '1rem', fontWeight: 800, textAlign: 'center' }}>Vigencia</th>
                <th style={{ padding: '1rem', fontWeight: 800, textAlign: 'center' }}>Modalidad</th>
                <th style={{ padding: '1rem', fontWeight: 800, textAlign: 'center' }}>Estatus</th>
                <th style={{ padding: '1rem', fontWeight: 800, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProyectos.map((p, idx) => (
                <tr 
                  key={p.id_proyecto}
                  style={{ 
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fcfcfd'}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#94a3b8' }}>
                    #{p.id_proyecto}
                  </td>

                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.nombre_alumno}</div>
                    <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>{p.no_control} • {p.carrera}</div>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', maxWidth: '320px', whiteSpace: 'normal' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>{p.nombre_proyecto}</div>
                    {p.programa_institucional && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Prog: {p.programa_institucional}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', maxWidth: '250px', whiteSpace: 'normal' }}>
                    <div style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Building2 size={13} color="#059669" /> {p.dependencia_nombre || p.dependencia || 'Sin dependencia'}
                    </div>
                    {p.titular_dependencia && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Titular: {p.titular_dependencia}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.76rem' }}>
                    <div><strong>Resp:</strong> {p.responsable_nombre || 'N/A'}</div>
                    <div style={{ color: '#64748b' }}><strong>Sup:</strong> {p.supervisor_nombre || 'N/A'}</div>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.75rem', color: '#475569' }}>
                    <div>{p.fecha_inicio || 'N/E'}</div>
                    <div style={{ color: '#94a3b8' }}>al {p.fecha_fin || 'N/E'}</div>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{ 
                      fontSize: '0.74rem', 
                      fontWeight: 700, 
                      padding: '0.2rem 0.55rem', 
                      borderRadius: '6px', 
                      backgroundColor: p.modalidad === 'ESC' ? '#ecfdf5' : (p.modalidad === 'MIX' ? '#fef3c7' : (p.modalidad === 'ESM' ? '#f3e8ff' : '#f1f5f9')), 
                      color: p.modalidad === 'ESC' ? '#047857' : (p.modalidad === 'MIX' ? '#b45309' : (p.modalidad === 'ESM' ? '#6b21a8' : '#475569')) 
                    }}>
                      {p.modalidad || 'N/E'}
                    </span>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span className={`badge ${p.estatus === 'Activo' ? 'badge-success' : 'badge-warning'}`}>
                      {p.estatus || 'Activo'}
                    </span>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleOpenView(p)}
                        style={{ background: '#f1f5f9', border: 'none', color: '#475569', padding: '0.35rem', borderRadius: '6px', cursor: 'pointer' }}
                        title="Ver Ficha Completa del Proyecto"
                      >
                        <Eye size={15} />
                      </button>

                      <button 
                        onClick={() => handleOpenEdit(p)}
                        style={{ background: '#ecfdf5', border: 'none', color: '#059669', padding: '0.35rem', borderRadius: '6px', cursor: 'pointer' }}
                        title="Editar Proyecto y Dependencia"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button 
                        onClick={() => handleDelete(p.id_proyecto, p.nombre_proyecto)}
                        style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '0.35rem', borderRadius: '6px', cursor: 'pointer' }}
                        title="Eliminar Proyecto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE EDICIÓN / REGISTRO COMPLETO DEL PROYECTO */}
      {(isEditModalOpen || isNewModalOpen) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }} className="animate-fade-in">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {isEditModalOpen ? `Editar Proyecto #${formData.id_proyecto}` : 'Registrar Nuevo Proyecto de Servicio Social'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                  {isEditModalOpen ? `Alumno: ${formData.nombre_alumno} (${formData.no_control})` : 'Ingresa la información oficial del proyecto y la dependencia receptora.'}
                </p>
              </div>
              <button 
                onClick={() => { setIsEditModalOpen(false); setIsNewModalOpen(false); }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={isEditModalOpen ? handleSaveEdit : handleSaveNew}>
              
              {/* Sección 1: Datos del Proyecto */}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem', borderBottom: '1px solid #ecfdf5', paddingBottom: '0.35rem' }}>
                1. Información Oficial del Proyecto
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {isNewModalOpen && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Estudiante Asignado *</label>
                    <select 
                      value={formData.no_control} 
                      onChange={e => {
                        const nc = e.target.value;
                        const alu = alumnosList.find(a => a.no_control === nc);
                        setFormData({ 
                          ...formData, 
                          no_control: nc, 
                          modalidad: alu?.modalidad || formData.modalidad || 'ESC' 
                        });
                      }}
                      className="form-select"
                      required
                    >
                      {alumnosList.map(a => (
                        <option key={a.no_control} value={a.no_control}>
                          {a.no_control} - {a.nombre} ({a.carrera}) {a.modalidad ? `[${a.modalidad}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Nombre del Proyecto *</label>
                  <input 
                    type="text" 
                    value={formData.nombre_proyecto} 
                    onChange={e => setFormData({ ...formData, nombre_proyecto: e.target.value })} 
                    className="form-input" 
                    required
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Objetivo General</label>
                  <textarea 
                    value={formData.objetivo} 
                    onChange={e => setFormData({ ...formData, objetivo: e.target.value })} 
                    className="form-input" 
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Describe el objetivo y alcance del proyecto..."
                  />
                </div>

                <div>
                  <label className="form-label">Modalidad</label>
                  <select 
                    value={formData.modalidad} 
                    onChange={e => setFormData({ ...formData, modalidad: e.target.value })} 
                    className="form-select"
                  >
                    <option value="ESC">ESC (Escolarizada)</option>
                    <option value="MIX">MIX (Mixta)</option>
                    <option value="ESM">ESM (Sabatino)</option>
                    <option value="PRESENCIAL">PRESENCIAL</option>
                    <option value="A DISTANCIA">A DISTANCIA</option>
                    <option value="HÍBRIDO">HÍBRIDO</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Programa Institucional</label>
                  <input 
                    type="text" 
                    value={formData.programa_institucional} 
                    onChange={e => setFormData({ ...formData, programa_institucional: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    value={formData.fecha_inicio} 
                    onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Fecha de Término</label>
                  <input 
                    type="date" 
                    value={formData.fecha_fin} 
                    onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Estatus del Proyecto</label>
                  <select 
                    value={formData.estatus} 
                    onChange={e => setFormData({ ...formData, estatus: e.target.value })} 
                    className="form-select"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Sección 2: Dependencia Receptora */}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem', borderBottom: '1px solid #ecfdf5', paddingBottom: '0.35rem' }}>
                2. Dependencia Receptora
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Nombre de la Dependencia *</label>
                  <input 
                    type="text" 
                    value={formData.dependencia_nombre} 
                    onChange={e => setFormData({ ...formData, dependencia_nombre: e.target.value })} 
                    className="form-input" 
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Titular de la Dependencia</label>
                  <input 
                    type="text" 
                    value={formData.titular_dependencia} 
                    onChange={e => setFormData({ ...formData, titular_dependencia: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Cargo del Titular</label>
                  <input 
                    type="text" 
                    value={formData.cargo_titular_dependencia} 
                    onChange={e => setFormData({ ...formData, cargo_titular_dependencia: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Calle y Número</label>
                  <input 
                    type="text" 
                    value={formData.calle_dependencia} 
                    onChange={e => setFormData({ ...formData, calle_dependencia: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Colonia / Barrio</label>
                  <input 
                    type="text" 
                    value={formData.colonia_dependencia} 
                    onChange={e => setFormData({ ...formData, colonia_dependencia: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Ciudad / Municipio</label>
                  <input 
                    type="text" 
                    value={formData.ciudad_dependencia} 
                    onChange={e => setFormData({ ...formData, ciudad_dependencia: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Teléfono de Contacto</label>
                  <input 
                    type="tel" 
                    value={formData.telefono_dependencia} 
                    onChange={e => setFormData({ ...formData, telefono_dependencia: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={formData.correo_dependencia} 
                    onChange={e => setFormData({ ...formData, correo_dependencia: e.target.value })} 
                    className="form-input" 
                  />
                </div>
              </div>

              {/* Sección 3: Supervisión y Responsables */}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem', borderBottom: '1px solid #ecfdf5', paddingBottom: '0.35rem' }}>
                3. Responsables y Supervisores
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label className="form-label">Responsable en la Dependencia</label>
                  <input 
                    type="text" 
                    value={formData.responsable_nombre} 
                    onChange={e => setFormData({ ...formData, responsable_nombre: e.target.value })} 
                    className="form-input" 
                    placeholder="Ej. Ing. Carlos Robles"
                  />
                </div>

                <div>
                  <label className="form-label">Cargo del Responsable</label>
                  <input 
                    type="text" 
                    value={formData.responsable_cargo} 
                    onChange={e => setFormData({ ...formData, responsable_cargo: e.target.value })} 
                    className="form-input" 
                    placeholder="Ej. Jefe de Sistemas"
                  />
                </div>

                <div>
                  <label className="form-label">Supervisor / Asesor Docente (ITST)</label>
                  <input 
                    type="text" 
                    value={formData.supervisor_nombre} 
                    onChange={e => setFormData({ ...formData, supervisor_nombre: e.target.value })} 
                    className="form-input" 
                    placeholder="Ej. Dra. Patricia Gómez"
                  />
                </div>

                <div>
                  <label className="form-label">Cargo del Supervisor</label>
                  <input 
                    type="text" 
                    value={formData.supervisor_cargo} 
                    onChange={e => setFormData({ ...formData, supervisor_cargo: e.target.value })} 
                    className="form-input" 
                    placeholder="Ej. Docente Asesor"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <button 
                  type="button" 
                  onClick={() => { setIsEditModalOpen(false); setIsNewModalOpen(false); }} 
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Save size={16} /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZACIÓN RÁPIDA (FICHA DEL PROYECTO) */}
      {isViewModalOpen && selectedProject && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }} className="animate-fade-in">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase' }}>Ficha Técnica del Proyecto #{selectedProject.id_proyecto}</div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0 0' }}>
                  {selectedProject.nombre_proyecto}
                </h2>
              </div>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Estudiante</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{selectedProject.nombre_alumno}</div>
                <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>{selectedProject.no_control} • {selectedProject.carrera}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Modalidad y Estatus</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{selectedProject.modalidad} ({selectedProject.estatus})</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Vigencia: {selectedProject.fecha_inicio} al {selectedProject.fecha_fin}</div>
              </div>
            </div>

            {selectedProject.objetivo && (
              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#f1f5f9', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>Objetivo General</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>{selectedProject.objetivo}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Building2 size={16} color="#059669" /> Dependencia Receptora
                </h4>
                <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div><strong>Nombre:</strong> {selectedProject.dependencia_nombre || selectedProject.dependencia || 'N/A'}</div>
                  <div><strong>Titular:</strong> {selectedProject.titular_dependencia || 'N/A'} ({selectedProject.cargo_titular_dependencia || selectedProject.cargo_titular || 'N/A'})</div>
                  <div><strong>Dirección:</strong> {selectedProject.calle_dependencia || ''}, {selectedProject.colonia_dependencia || ''}, {selectedProject.ciudad_dependencia || ''}</div>
                  <div><strong>Contacto:</strong> {selectedProject.telefono_dependencia || 'N/A'} • {selectedProject.correo_dependencia || 'N/A'}</div>
                </div>
              </div>

              <div style={{ padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>Asesoría y Supervisión</h4>
                <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div><strong>Responsable del Proyecto:</strong> {selectedProject.responsable_nombre || 'N/A'}</div>
                  <div><strong>Cargo Responsable:</strong> {selectedProject.responsable_cargo || 'N/A'}</div>
                  <div style={{ marginTop: '0.4rem' }}><strong>Supervisor / Asesor ITST:</strong> {selectedProject.supervisor_nombre || 'N/A'}</div>
                  <div><strong>Cargo Asesor:</strong> {selectedProject.supervisor_cargo || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(selectedProject);
                }} 
                className="btn btn-primary"
              >
                <Edit3 size={15} /> Editar Proyecto
              </button>
              <button 
                onClick={() => setIsViewModalOpen(false)} 
                className="btn btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
