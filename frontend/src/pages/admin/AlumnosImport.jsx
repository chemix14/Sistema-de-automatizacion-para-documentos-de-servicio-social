import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Swal from 'sweetalert2';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Search, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  Eye, 
  Plus, 
  X, 
  Save, 
  GraduationCap, 
  Mail, 
  Phone, 
  MapPin, 
  BookOpen, 
  UserCheck 
} from 'lucide-react';

export default function AlumnosImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const [alumnos, setAlumnos] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCarrera, setFilterCarrera] = useState('');

  // Modales
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [formData, setFormData] = useState({});

  const fetchAlumnos = () => {
    setLoadingAlumnos(true);
    fetch('http://127.0.0.1:5000/api/admin/alumnos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlumnos(data);
        } else {
          setAlumnos([]);
        }
        setLoadingAlumnos(false);
      })
      .catch(() => {
        setAlumnos([]);
        setLoadingAlumnos(false);
      });
  };

  const fetchCarreras = () => {
    fetch('http://127.0.0.1:5000/api/admin/reportes/carreras')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCarreras(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAlumnos();
    fetchCarreras();
  }, []);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const handleUpload = () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const data = new FormData();
    data.append('archivo_excel', file);

    fetch('http://127.0.0.1:5000/api/admin/alumnos/importar', {
      method: 'POST',
      body: data
    })
    .then(res => res.json())
    .then(resData => {
      setLoading(false);
      if (resData.error) {
        Swal.fire('Error', resData.error, 'error');
      } else {
        const det = resData.detalles || {};
        setResult(det);
        const errMsg = det.errores && det.errores.length > 0 
          ? `<br><small style="color: #dc2626;">Hubo advertencias en ${det.errores.length} fila(s).</small>` 
          : '';
        Swal.fire({
          icon: 'success',
          title: '¡Importación Finalizada!',
          html: `<b>${det.insertados || 0}</b> alumnos insertados.<br><b>${det.actualizados || 0}</b> actualizados.${errMsg}`
        });
        setFile(null);
        fetchAlumnos();
      }
    })
    .catch(err => {
      setLoading(false);
      console.error(err);
      Swal.fire('Error', 'Hubo un error de conexión con el servidor', 'error');
    });
  };

  const handleOpenEdit = (alumno) => {
    setFormData({
      no_control: alumno.no_control || '',
      nombre: alumno.nombre || '',
      carrera: alumno.carrera || '',
      id_carrera: alumno.id_carrera || '',
      modalidad: alumno.modalidad || '',
      semestre: alumno.semestre || '7',
      sexo: alumno.sexo || '',
      telefono: alumno.telefono || '',
      correo_institucional: alumno.correo_institucional || '',
      correo_personal: alumno.correo_personal || '',
      calle: alumno.calle || '',
      colonia: alumno.colonia || '',
      ciudad: alumno.ciudad || '',
      estado: alumno.estado || '',
      domicilio: alumno.domicilio || '',
      creditos_aprobados: alumno.creditos_aprobados || 0,
      periodos_cursados: alumno.periodos_cursados || 0,
      estatus: alumno.estatus || 'Activo'
    });
    setSelectedAlumno(alumno);
    setIsEditModalOpen(true);
  };

  const handleOpenView = (alumno) => {
    setSelectedAlumno(alumno);
    setIsViewModalOpen(true);
  };

  const handleOpenNew = () => {
    setFormData({
      no_control: '',
      nombre: '',
      carrera: carreras[0]?.nombre || '',
      id_carrera: carreras[0]?.id_carrera || '',
      modalidad: 'ESC',
      semestre: '7',
      sexo: 'Masculino',
      telefono: '',
      correo_institucional: '',
      correo_personal: '',
      calle: '',
      colonia: '',
      ciudad: 'Teziutlán',
      estado: 'Puebla',
      domicilio: '',
      creditos_aprobados: 180,
      periodos_cursados: 6,
      estatus: 'Activo'
    });
    setIsNewModalOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.no_control) {
      Swal.fire('Atención', 'Nombre y número de control son obligatorios', 'warning');
      return;
    }

    fetch(`http://127.0.0.1:5000/api/admin/alumnos/${formData.no_control}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        Swal.fire('¡Actualizado!', data.message || 'Información del alumno guardada con éxito', 'success');
        setIsEditModalOpen(false);
        fetchAlumnos();
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(() => Swal.fire('Error', 'Error al conectar con el servidor', 'error'));
  };

  const handleSaveNew = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.no_control) {
      Swal.fire('Atención', 'Nombre y número de control son obligatorios', 'warning');
      return;
    }

    fetch('http://127.0.0.1:5000/api/admin/alumnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        Swal.fire('¡Registrado!', data.message || 'Alumno registrado con éxito', 'success');
        setIsNewModalOpen(false);
        fetchAlumnos();
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(() => Swal.fire('Error', 'Error al conectar con el servidor', 'error'));
  };

  const handleDelete = (no_control, nombre) => {
    Swal.fire({
      title: `¿Eliminar a ${nombre}?`,
      text: `Se eliminará el expediente del alumno con No. Control ${no_control}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar alumno',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/admin/alumnos/${no_control}`, {
          method: 'DELETE'
        })
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('Eliminado', data.message || 'Alumno eliminado', 'success');
            fetchAlumnos();
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => Swal.fire('Error', 'Error de conexión', 'error'));
      }
    });
  };

  const filteredAlumnos = alumnos.filter(a => {
    const matchSearch = (a.no_control || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (a.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (a.correo_institucional || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (a.telefono || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCarrera = filterCarrera ? (a.carrera === filterCarrera) : true;
    return matchSearch && matchCarrera;
  });

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
            Gestión y Padrón de Alumnos
          </h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
            Consulta la información completa de cada estudiante, edita sus datos personales o importa listas oficiales en Excel.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={handleOpenNew}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> Registrar Alumno
          </button>
          <button 
            onClick={fetchAlumnos}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Refrescar
          </button>
        </div>
      </div>

      {/* Zona Colapsable de Importación Excel */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={18} color="#10b981" /> Importación Masiva desde Excel (Control Escolar)
          </h2>
          <span style={{ fontSize: '0.75rem', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
            Estructura: NOMBRE | NO. CONTROL | CARRERA | MOD | SEM | SEXO | CORREO INST.
          </span>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 1rem 0' }}>
          El sistema lee automáticamente los datos a partir de la fila 6 (columnas F a M), omite la columna EST y vincula cada alumno con su carrera y usuario.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div 
            {...getRootProps()} 
            style={{
              flex: 1,
              minWidth: '280px',
              border: `2px dashed ${isDragActive ? '#059669' : '#cbd5e1'}`,
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              backgroundColor: isDragActive ? '#f0fdf4' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <input {...getInputProps()} />
            <UploadCloud size={28} style={{ color: '#059669', margin: '0 auto 0.4rem' }} />
            {file ? (
              <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                Archivo: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            ) : (
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Arrastra tu archivo <strong>.xlsx</strong> o haz clic para seleccionarlo
              </p>
            )}
          </div>

          <button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem', height: 'fit-content' }}
          >
            {loading ? 'Procesando...' : 'Iniciar Importación'}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: '1rem', padding: '0.85rem', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '0.85rem', color: '#065f46' }}>
            ✓ Importación completada: <strong>{result.insertados || 0}</strong> insertados, <strong>{result.actualizados || 0}</strong> actualizados.
          </div>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, no. control, correo o teléfono..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <select 
          value={filterCarrera}
          onChange={e => setFilterCarrera(e.target.value)}
          className="form-select"
          style={{ width: 'auto', minWidth: '240px' }}
        >
          <option value="">Todas las Carreras ({alumnos.length})</option>
          {carreras.map(c => (
            <option key={c.id_carrera || c.nombre} value={c.nombre}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabla Completa de Alumnos con Toda su Información */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
        {loadingAlumnos ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Cargando catálogo de alumnos...</div>
          </div>
        ) : filteredAlumnos.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <Users size={42} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>No se encontraron alumnos.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '1rem', fontWeight: 800 }}>No. Control</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>Estudiante</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>Carrera</th>
                <th style={{ padding: '1rem', fontWeight: 800, textAlign: 'center' }}>Modalidad</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>Semestre</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>Contacto</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>Domicilio</th>
                <th style={{ padding: '1rem', fontWeight: 800, textAlign: 'center' }}>Créditos / Periodos</th>
                <th style={{ padding: '1rem', fontWeight: 800, textAlign: 'center' }}>Estatus</th>
                <th style={{ padding: '1rem', fontWeight: 800, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlumnos.map((a, idx) => (
                <tr 
                  key={a.no_control}
                  style={{ 
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fcfcfd'}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#059669' }}>
                    {a.no_control}
                  </td>
                  
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{a.nombre}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{a.sexo || 'Sin especificar'}</div>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                    <div style={{ fontWeight: 600 }}>{a.carrera}</div>
                    {a.nombre_proyecto && (
                      <div style={{ fontSize: '0.72rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <span>📁 {a.nombre_proyecto.length > 30 ? `${a.nombre_proyecto.substring(0, 30)}...` : a.nombre_proyecto}</span>
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{ 
                      backgroundColor: a.modalidad === 'ESC' ? '#ecfdf5' : (a.modalidad === 'MIX' ? '#fef3c7' : '#f1f5f9'), 
                      color: a.modalidad === 'ESC' ? '#047857' : (a.modalidad === 'MIX' ? '#b45309' : '#475569'), 
                      padding: '0.2rem 0.55rem', 
                      borderRadius: '6px', 
                      fontWeight: 700, 
                      fontSize: '0.74rem' 
                    }}>
                      {a.modalidad || 'N/E'}
                    </span>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 600 }}>
                    {a.semestre}° Semestre
                  </td>

                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155' }}>
                      <Mail size={12} color="#64748b" /> {a.correo_institucional || 'Sin correo inst.'}
                    </div>
                    {a.telefono && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.74rem', marginTop: '0.15rem' }}>
                        <Phone size={11} color="#94a3b8" /> {a.telefono}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.76rem' }}>
                    <div>{a.calle ? `${a.calle}, ${a.colonia || ''}` : (a.domicilio || 'No especificado')}</div>
                    <div>{a.ciudad ? `${a.ciudad}, ${a.estado || ''}` : ''}</div>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{a.creditos_aprobados || 0}</span> cred. / <span style={{ color: '#64748b' }}>{a.periodos_cursados || 0} per.</span>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span className={`badge ${a.estatus === 'Activo' ? 'badge-success' : 'badge-warning'}`}>
                      {a.estatus || 'Activo'}
                    </span>
                  </td>

                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleOpenView(a)}
                        style={{ background: '#f1f5f9', border: 'none', color: '#475569', padding: '0.35rem', borderRadius: '6px', cursor: 'pointer' }}
                        title="Ver Ficha Completa"
                      >
                        <Eye size={15} />
                      </button>

                      <button 
                        onClick={() => handleOpenEdit(a)}
                        style={{ background: '#ecfdf5', border: 'none', color: '#059669', padding: '0.35rem', borderRadius: '6px', cursor: 'pointer' }}
                        title="Editar Información"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button 
                        onClick={() => handleDelete(a.no_control, a.nombre)}
                        style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '0.35rem', borderRadius: '6px', cursor: 'pointer' }}
                        title="Eliminar Alumno"
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

      {/* MODAL DE EDICIÓN / REGISTRO COMPLETO DE ALUMNO */}
      {(isEditModalOpen || isNewModalOpen) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }} className="animate-fade-in">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {isEditModalOpen ? `Editar Información: ${formData.nombre}` : 'Registrar Nuevo Estudiante'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                  No. Control: <strong style={{ color: '#059669' }}>{formData.no_control || 'Nuevo'}</strong>
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
              
              {/* Sección 1: Datos Generales */}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem', borderBottom: '1px solid #ecfdf5', paddingBottom: '0.35rem' }}>
                1. Datos Académicos y de Identificación
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">No. de Control *</label>
                  <input 
                    type="text" 
                    value={formData.no_control} 
                    onChange={e => setFormData({ ...formData, no_control: e.target.value.toUpperCase() })} 
                    className="form-input" 
                    readOnly={isEditModalOpen}
                    required
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Nombre Completo *</label>
                  <input 
                    type="text" 
                    value={formData.nombre} 
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
                    className="form-input" 
                    required
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Carrera Oficial *</label>
                  <select 
                    value={formData.carrera} 
                    onChange={e => {
                      const cObj = carreras.find(c => c.nombre === e.target.value);
                      setFormData({ 
                        ...formData, 
                        carrera: e.target.value,
                        id_carrera: cObj?.id_carrera || formData.id_carrera 
                      });
                    }} 
                    className="form-select"
                    required
                  >
                    {carreras.map(c => (
                      <option key={c.id_carrera || c.nombre} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Modalidad (MOD)</label>
                  <input 
                    type="text" 
                    value={formData.modalidad} 
                    onChange={e => setFormData({ ...formData, modalidad: e.target.value.toUpperCase() })} 
                    className="form-input" 
                    placeholder="Ej. MIX, ESM, ESC"
                  />
                </div>

                <div>
                  <label className="form-label">Semestre</label>
                  <select 
                    value={formData.semestre} 
                    onChange={e => setFormData({ ...formData, semestre: e.target.value })} 
                    className="form-select"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => (
                      <option key={s} value={s}>{s}° Semestre</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Sexo</label>
                  <select 
                    value={formData.sexo} 
                    onChange={e => setFormData({ ...formData, sexo: e.target.value })} 
                    className="form-select"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Estatus de Matrícula</label>
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

              {/* Sección 2: Contacto y Comunicación */}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem', borderBottom: '1px solid #ecfdf5', paddingBottom: '0.35rem' }}>
                2. Contacto y Comunicación
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">Correo Institucional</label>
                  <input 
                    type="email" 
                    value={formData.correo_institucional} 
                    onChange={e => setFormData({ ...formData, correo_institucional: e.target.value })} 
                    className="form-input" 
                    placeholder="l23te0000@teziutlan.tecnm.mx"
                  />
                </div>

                <div>
                  <label className="form-label">Correo Personal</label>
                  <input 
                    type="email" 
                    value={formData.correo_personal} 
                    onChange={e => setFormData({ ...formData, correo_personal: e.target.value })} 
                    className="form-input" 
                    placeholder="ejemplo@gmail.com"
                  />
                </div>

                <div>
                  <label className="form-label">Teléfono / WhatsApp</label>
                  <input 
                    type="tel" 
                    value={formData.telefono} 
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })} 
                    className="form-input" 
                    placeholder="231 123 4567"
                  />
                </div>
              </div>

              {/* Sección 3: Domicilio */}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem', borderBottom: '1px solid #ecfdf5', paddingBottom: '0.35rem' }}>
                3. Domicilio Particular
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">Calle y Número</label>
                  <input 
                    type="text" 
                    value={formData.calle} 
                    onChange={e => setFormData({ ...formData, calle: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Colonia / Barrio</label>
                  <input 
                    type="text" 
                    value={formData.colonia} 
                    onChange={e => setFormData({ ...formData, colonia: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Ciudad / Municipio</label>
                  <input 
                    type="text" 
                    value={formData.ciudad} 
                    onChange={e => setFormData({ ...formData, ciudad: e.target.value })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Estado</label>
                  <input 
                    type="text" 
                    value={formData.estado} 
                    onChange={e => setFormData({ ...formData, estado: e.target.value })} 
                    className="form-input" 
                  />
                </div>
              </div>

              {/* Sección 4: Avance de Créditos */}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem', borderBottom: '1px solid #ecfdf5', paddingBottom: '0.35rem' }}>
                4. Avance de Créditos y Periodos
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label className="form-label">Créditos Aprobados (Mínimo 180)</label>
                  <input 
                    type="number" 
                    value={formData.creditos_aprobados} 
                    onChange={e => setFormData({ ...formData, creditos_aprobados: parseInt(e.target.value) || 0 })} 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Periodos / Semestres Cursados</label>
                  <input 
                    type="number" 
                    value={formData.periodos_cursados} 
                    onChange={e => setFormData({ ...formData, periodos_cursados: parseInt(e.target.value) || 0 })} 
                    className="form-input" 
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

      {/* MODAL DE VISUALIZACIÓN RÁPIDA (DETALLES COMPLETOS) */}
      {isViewModalOpen && selectedAlumno && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }} className="animate-fade-in">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase' }}>Ficha del Estudiante</div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0 0' }}>
                  {selectedAlumno.nombre}
                </h2>
              </div>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>No. de Control</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>{selectedAlumno.no_control}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Carrera</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>{selectedAlumno.carrera}</div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Semestre, Sexo y Mod.</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                  {selectedAlumno.semestre}° Semestre ({selectedAlumno.sexo || 'N/E'}) {selectedAlumno.modalidad ? `• Mod: ${selectedAlumno.modalidad}` : ''}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Créditos Aprobados</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>{selectedAlumno.creditos_aprobados || 0} Créditos ({selectedAlumno.periodos_cursados || 0} periodos)</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>Contacto</h4>
                <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div><strong>Institucional:</strong> {selectedAlumno.correo_institucional || 'N/A'}</div>
                  <div><strong>Personal:</strong> {selectedAlumno.correo_personal || 'N/A'}</div>
                  <div><strong>Teléfono:</strong> {selectedAlumno.telefono || 'N/A'}</div>
                </div>
              </div>

              <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>Domicilio</h4>
                <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div><strong>Calle:</strong> {selectedAlumno.calle || 'N/A'}</div>
                  <div><strong>Colonia:</strong> {selectedAlumno.colonia || 'N/A'}</div>
                  <div><strong>Ciudad / Estado:</strong> {selectedAlumno.ciudad || ''} {selectedAlumno.estado || ''}</div>
                </div>
              </div>
            </div>

            {selectedAlumno.nombre_proyecto && (
              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>Proyecto de Servicio Social Asignado</h4>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#15803d' }}>{selectedAlumno.nombre_proyecto}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(selectedAlumno);
                }} 
                className="btn btn-primary"
              >
                <Edit3 size={15} /> Editar Alumno
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
