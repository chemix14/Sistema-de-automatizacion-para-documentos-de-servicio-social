import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function FormVisor() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchForms = () => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/forms/')
      .then(res => res.json())
      .then(data => {
        setForms(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching forms:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleDelete = (id, nombre) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Estás a punto de eliminar el formulario: ${nombre}. Esto lo ocultará del sistema.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`http://127.0.0.1:5000/api/forms/${id}`, {
          method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('Eliminado!', 'El formulario ha sido eliminado.', 'success');
            fetchForms();
          } else {
            Swal.fire('Error', 'Hubo un problema al eliminar el formulario.', 'error');
          }
        })
        .catch(() => {
          Swal.fire('Error', 'Hubo un problema al conectar con el servidor.', 'error');
        });
      }
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#0f172a', margin: 0 }}>Gestión de Formularios</h1>
        <button 
          onClick={() => navigate('/admin/formularios/nuevo')}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          + Nuevo Formulario
        </button>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando formularios...</div>
        ) : forms.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No hay formularios registrados.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Nombre</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Tipo</th>
                <th style={{ padding: '1rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {forms.map(form => (
                <tr key={form.id_formulario} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', color: '#64748b' }}>#{form.id_formulario}</td>
                  <td style={{ padding: '1rem', color: '#0f172a', fontWeight: 500 }}>{form.nombre}</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{form.tipo_formulario}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => navigate(`/admin/formularios/editar/${form.id_formulario}`)}
                      style={{ padding: '0.4rem 0.8rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', marginRight: '0.5rem', cursor: 'pointer' }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(form.id_formulario, form.nombre)}
                      style={{ padding: '0.4rem 0.8rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
