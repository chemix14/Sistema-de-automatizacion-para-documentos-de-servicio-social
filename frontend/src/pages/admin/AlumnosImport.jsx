import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Swal from 'sweetalert2';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, Users } from 'lucide-react';

export default function AlumnosImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const [alumnos, setAlumnos] = useState([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(true);

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

  useEffect(() => {
    fetchAlumnos();
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

    const formData = new FormData();
    formData.append('archivo_excel', file);

    fetch('http://127.0.0.1:5000/api/admin/alumnos/importar', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      setLoading(false);
      if (data.error) {
        Swal.fire('Error', data.error, 'error');
      } else {
        setResult(data.detalles);
        Swal.fire('¡Éxito!', 'Importación finalizada', 'success');
        setFile(null); // Clear after success
        fetchAlumnos(); // Refresh list
      }
    })
    .catch(err => {
      setLoading(false);
      console.error(err);
      Swal.fire('Error', 'Hubo un error de conexión', 'error');
    });
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Users size={32} color="#3b82f6" />
        Padrón de Alumnos
      </h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Sube el padrón escolar de Control Escolar (formato Excel) para actualizar o registrar a los alumnos de Servicio Social.</p>
      
      {/* SECCION DE IMPORTACION */}
      <div 
        {...getRootProps()} 
        style={{
          border: `2px dashed ${isDragActive ? '#3b82f6' : '#cbd5e1'}`,
          borderRadius: '12px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          backgroundColor: isDragActive ? '#eff6ff' : 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '1.5rem'
        }}
      >
        <input {...getInputProps()} />
        <UploadCloud size={48} color={isDragActive ? '#3b82f6' : '#94a3b8'} style={{ margin: '0 auto 1rem' }} />
        {
          isDragActive ?
            <p style={{ color: '#3b82f6', fontSize: '1.125rem', fontWeight: 600 }}>Suelta el archivo aquí...</p> :
            <p style={{ color: '#64748b', fontSize: '1.125rem' }}>Arrastra y suelta tu archivo Excel aquí, o haz clic para seleccionar</p>
        }
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>Soporta archivos .xlsx y .xls</p>
      </div>

      {file && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '1rem 1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <FileSpreadsheet size={24} color="#10b981" />
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{file.name}</p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{(file.size / 1024).toFixed(2)} KB</p>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); handleUpload(); }}
            disabled={loading}
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: loading ? '#94a3b8' : '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: 600 
            }}
          >
            {loading ? 'Procesando...' : 'Iniciar Importación'}
          </button>
        </div>
      )}

      {result && (
        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle color="#10b981" size={20} />
            Resumen de Importación
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #64748b' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase' }}>Filas Procesadas</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{result.procesados}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase' }}>Nuevos Alumnos</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{result.insertados}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase' }}>Actualizados</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{result.actualizados}</p>
            </div>
          </div>

          {result.errores && result.errores.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} /> Hubo {result.errores.length} advertencias/errores:
              </h4>
              <ul style={{ color: '#64748b', fontSize: '0.875rem', maxHeight: '150px', overflowY: 'auto', backgroundColor: 'white', padding: '1rem 2rem', borderRadius: '6px', border: '1px solid #fee2e2' }}>
                {result.errores.map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* SECCION DE LISTADO */}
      <h2 style={{ color: '#0f172a', margin: '2rem 0 1rem 0' }}>Directorio de Alumnos</h2>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loadingAlumnos ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando lista de alumnos...</div>
        ) : alumnos.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <Users size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No hay alumnos registrados. Importa el padrón escolar para comenzar.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <tr>
                    <th style={{ padding: '1rem', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>No. Control</th>
                    <th style={{ padding: '1rem', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Nombre Alumno</th>
                    <th style={{ padding: '1rem', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Carrera</th>
                    <th style={{ padding: '1rem', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Sem.</th>
                    <th style={{ padding: '1rem', color: '#475569', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Estado SSI</th>
                </tr>
                </thead>
                <tbody>
                {alumnos.map(a => (
                    <tr key={a.no_control} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor='#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor='white'}>
                    <td style={{ padding: '1rem', color: '#64748b', fontWeight: 500 }}>{a.no_control}</td>
                    <td style={{ padding: '1rem', color: '#0f172a', fontWeight: 600 }}>{a.nombre_alumno}</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{a.carrera || 'N/A'}</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{a.semestre || 'N/A'}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{ 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        backgroundColor: a.estatus === 'PENDIENTE' ? '#fef3c7' : (a.estatus === 'ACTIVO' ? '#d1fae5' : '#f1f5f9'),
                        color: a.estatus === 'PENDIENTE' ? '#d97706' : (a.estatus === 'ACTIVO' ? '#059669' : '#475569')
                        }}>
                        {a.estatus}
                        </span>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
