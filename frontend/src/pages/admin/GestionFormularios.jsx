import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function GestionFormularios() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCatalog = () => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/forms/catalog')
      .then(res => res.json())
      .then(data => {
        setCatalog(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching catalog:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleDelete = (id_formulario, nombre) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Estás a punto de desvincular el formulario: ${nombre}. Esto eliminará la interfaz dinámica pero conservará el documento oficial en el catálogo.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, desvincular',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/forms/${id_formulario}`, {
          method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('Desvinculado!', 'El formulario ha sido desvinculado.', 'success');
            fetchCatalog();
          } else {
            Swal.fire('Error', 'Hubo un problema al desvincular el formulario.', 'error');
          }
        })
        .catch(() => {
          Swal.fire('Error', 'Hubo un problema al conectar con el servidor.', 'error');
        });
      }
    });
  };

  const handleUploadTemplate = async (id_documento, nombre_documento) => {
    const { value: file } = await Swal.fire({
      title: 'Subir Plantilla Oficial',
      text: `Selecciona el archivo Excel o Word para "${nombre_documento}"`,
      input: 'file',
      inputAttributes: {
        'accept': '.xlsx,.xls,.docx,.doc',
        'aria-label': 'Subir plantilla'
      },
      showCancelButton: true,
      confirmButtonText: 'Subir Archivo',
      cancelButtonText: 'Cancelar'
    });

    if (file) {
      const formData = new FormData();
      formData.append('plantilla', file);

      Swal.fire({
        title: 'Subiendo...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      fetch(`http://127.0.0.1:5000/api/forms/catalog/${id_documento}/upload_template`, {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          Swal.fire('¡Subida exitosa!', 'La plantilla se ha vinculado correctamente.', 'success');
          fetchCatalog();
        } else {
          Swal.fire('Error', data.error, 'error');
        }
      })
      .catch(() => {
        Swal.fire('Error', 'No se pudo conectar al servidor.', 'error');
      });
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0f172a', margin: 0 }}>Catálogo de Documentos Oficiales</h1>
        <button 
          onClick={() => navigate('/admin/formularios/nuevo')}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          + Crear Formato y Formulario
        </button>
      </div>

      <div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>Cargando catálogo...</div>
        ) : catalog.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>No hay documentos registrados.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {catalog.map(doc => (
              <div key={doc.id_documento} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #e2e8f0', transition: 'transform 0.2s, box-shadow 0.2s' }} className="form-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>{doc.clave}</span>
                  {doc.tiene_formulario === 1 ? (
                    <span style={{ padding: '0.25rem 0.6rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Configurado</span>
                  ) : (
                    <span style={{ padding: '0.25rem 0.6rem', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Sin Formulario</span>
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#0f172a', fontWeight: 600, lineHeight: 1.4 }}>{doc.nombre_documento}</h3>
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        Etapa: {doc.etapa}
                      </span>
                    </div>
                    {!doc.plantilla_existe && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
                        <span>⚠️ Plantilla física faltante</span>
                        <button 
                          onClick={() => handleUploadTemplate(doc.id_documento, doc.nombre_documento)}
                          style={{ padding: '0.25rem 0.5rem', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          Subir Archivo
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem' }}>
                  {doc.tiene_formulario === 1 ? (
                    <>
                      <button 
                        onClick={() => navigate(`/admin/formularios/editar/${doc.id_formulario}`)}
                        style={{ flex: 1, padding: '0.6rem', backgroundColor: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.2s' }}
                      >
                        Modificar
                      </button>
                      <button 
                        onClick={() => handleDelete(doc.id_formulario, doc.nombre_documento)}
                        style={{ padding: '0.6rem', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.2s' }}
                        title="Desvincular"
                      >
                        Eliminar
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => navigate(`/admin/formularios/nuevo?docId=${doc.id_documento}`)}
                      style={{ width: '100%', padding: '0.6rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(59,130,246,0.3)' }}
                    >
                      Diseñar Interfaz
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
