import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function FormRenderer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formSchema, setFormSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the form schema
    fetch(`http://localhost:5000/api/forms/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          Swal.fire('Error', data.error, 'error');
          navigate('/student/formatos');
        } else {
          setFormSchema(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        Swal.fire('Error', 'No se pudo cargar el formulario', 'error');
        setLoading(false);
      });
  }, [id, navigate]);

  const handleChange = (campoId, value) => {
    setFormData(prev => ({
      ...prev,
      [campoId]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Datos capturados:", formData);
    
    // For now, just show an alert with the collected data
    Swal.fire({
      title: 'Formulario Completado',
      text: 'Los datos han sido recolectados exitosamente (ver consola). Próximamente se conectará con el guardado en base de datos.',
      icon: 'success',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3b82f6'
    }).then(() => {
      navigate('/student/formatos');
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ color: '#64748b', fontSize: '1.2rem' }}>Cargando diseño del formulario...</div>
      </div>
    );
  }

  if (!formSchema) return null;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      <button 
        onClick={() => navigate('/student/formatos')}
        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}
      >
        <i className="fas fa-arrow-left"></i> Volver a Formatos
      </button>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Header del Formulario */}
        <div style={{ backgroundColor: '#0f172a', color: 'white', padding: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600' }}>{formSchema.titulo}</h1>
          {formSchema.descripcion && (
            <p style={{ margin: '0.5rem 0 0 0', color: '#cbd5e1', fontSize: '1rem' }}>{formSchema.descripcion}</p>
          )}
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
          
          {/* Render Sections */}
          {formSchema.secciones && formSchema.secciones.map(sec => (
            <div key={sec.id_seccion} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                {sec.titulo}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {sec.campos.map(campo => (
                  <FieldRenderer 
                    key={campo.id_campo} 
                    campo={campo} 
                    value={formData[campo.id_campo] || ''} 
                    onChange={(val) => handleChange(campo.id_campo, val)} 
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Render Unsectioned Fields */}
          {formSchema.campos_sin_seccion && formSchema.campos_sin_seccion.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                Otros Datos
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {formSchema.campos_sin_seccion.map(campo => (
                  <FieldRenderer 
                    key={campo.id_campo} 
                    campo={campo} 
                    value={formData[campo.id_campo] || ''} 
                    onChange={(val) => handleChange(campo.id_campo, val)} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
            <button 
              type="button" 
              onClick={() => navigate('/student/formatos')}
              style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: '1px solid #cbd5e1', color: '#64748b', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
              onMouseEnter={e => e.target.style.backgroundColor = '#f8fafc'}
              onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              style={{ padding: '0.75rem 2rem', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(59,130,246,0.3)' }}
              onMouseEnter={e => e.target.style.backgroundColor = '#2563eb'}
              onMouseLeave={e => e.target.style.backgroundColor = '#3b82f6'}
            >
              Guardar Datos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente auxiliar para renderizar cada campo
function FieldRenderer({ campo, value, onChange }) {
  const isRequired = campo.validacion_regex ? true : false; // Simplificado para este ejemplo
  
  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: campo.solo_lectura ? '#f1f5f9' : 'white',
    color: '#1e293b',
    fontSize: '1rem',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const handleFocus = (e) => {
    if(!campo.solo_lectura) {
      e.target.style.borderColor = '#3b82f6';
      e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
    }
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = '#cbd5e1';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
        {campo.etiqueta} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      
      {campo.tipo_campo === 'text' && (
        <input 
          type="text" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          readOnly={campo.solo_lectura}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={`Ingresa ${campo.etiqueta.toLowerCase()}`}
        />
      )}

      {campo.tipo_campo === 'number' && (
        <input 
          type="number" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          readOnly={campo.solo_lectura}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )}

      {campo.tipo_campo === 'date' && (
        <input 
          type="date" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          readOnly={campo.solo_lectura}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )}

      {campo.tipo_campo === 'select' && (
        <select 
          value={value} 
          onChange={e => onChange(e.target.value)}
          disabled={campo.solo_lectura}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          <option value="">Selecciona una opción...</option>
          {/* Opciones dummy por ahora */}
          <option value="opcion1">Opción 1</option>
          <option value="opcion2">Opción 2</option>
        </select>
      )}

      {campo.tipo_campo === 'textarea' && (
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          readOnly={campo.solo_lectura}
          style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={`Ingresa ${campo.etiqueta.toLowerCase()}`}
        />
      )}
    </div>
  );
}
