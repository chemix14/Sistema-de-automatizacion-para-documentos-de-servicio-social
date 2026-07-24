import React, { useState, useEffect, useRef } from 'react';
import { Trash2, ArrowUp, ArrowDown } from 'lucide-react';

function ColumnSearchSelect({ fuenteContexto, value, onChange }) {
  const [columns, setColumns] = useState([]);
  const [search, setSearch] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  // Fetch data when context changes
  useEffect(() => {
    if (!fuenteContexto || fuenteContexto === 'NINGUNO') return;
    
    setLoading(true);
    
    // Only reset search if the incoming value is empty or not in the fetched list (checked later)
    // To prevent aggressive overwriting, we just fetch
    fetch(`http://127.0.0.1:5000/api/esquema/columnas?fuente=${fuenteContexto}`)
      .then(res => res.json())
      .then(data => {
        const columnsArray = Array.isArray(data) ? data : [];
        setColumns(columnsArray);
        // If current value is not in new columns, reset it
        if (value && !columnsArray.includes(value)) {
          onChange('');
          setSearch('');
        }
      })
      .catch(err => {
        console.error("Error fetching columns:", err);
        setColumns([]);
      })
      .finally(() => setLoading(false));
  }, [fuenteContexto]); // Depend on context change

  // Sync external value to internal search
  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeSearch = search || '';
  const filteredColumns = safeColumns.filter(col => 
    typeof col === 'string' && col.toLowerCase().includes(safeSearch.toLowerCase())
  );

  return (
    <div className="form-group" ref={wrapperRef}>
      <label className="form-label">Columna de Base de Datos</label>
      <div style={{ position: 'relative' }}>
        <input 
          type="text" 
          className="form-input" 
          placeholder={loading ? "Cargando columnas..." : "Buscar columna..."}
          value={search}
          onChange={(e) => {
             setSearch(e.target.value);
             setIsOpen(true);
             onChange(e.target.value); // Optimistic bind so it saves partially typed values too
          }}
          onFocus={() => setIsOpen(true)}
          disabled={loading}
        />
        {isOpen && filteredColumns.length > 0 && (
          <ul style={{ 
            position: 'absolute', zIndex: 10, width: '100%', 
            maxHeight: '150px', overflowY: 'auto', 
            background: 'white', border: '1px solid var(--border-color)', 
            borderRadius: '4px', margin: 0, padding: 0, listStyle: 'none',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            {filteredColumns.map(col => (
              <li 
                key={col} 
                style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}
                onClick={() => {
                  setSearch(col);
                  onChange(col);
                  setIsOpen(false);
                }}
                onMouseEnter={e => e.target.style.background = '#f8fafc'}
                onMouseLeave={e => e.target.style.background = 'white'}
              >
                {col}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PropertiesPanel({ selectedField, onUpdateField, allFields = [] }) {
  if (!selectedField) {
    return (
      <div className="sidebar-right">
        <div className="sidebar-header">Propiedades del Campo</div>
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Selecciona un campo en el canvas para editar sus propiedades.</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    const updates = {
      [name]: type === 'checkbox' ? checked : value
    };

    if (name === 'etiqueta' && selectedField.tipo_campo !== 'heading') {
      updates.nombre_variable = value.replace(/\s+/g, '_');
    }

    onUpdateField(selectedField.id, updates);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...(selectedField.opciones || [])];
    newOptions[index] = value;
    onUpdateField(selectedField.id, { opciones: newOptions });
  };

  const addOption = () => {
    const newOptions = [...(selectedField.opciones || []), `Opción ${(selectedField.opciones?.length || 0) + 1}`];
    onUpdateField(selectedField.id, { opciones: newOptions });
  };

  const removeOption = (index) => {
    const newOptions = (selectedField.opciones || []).filter((_, i) => i !== index);
    onUpdateField(selectedField.id, { opciones: newOptions });
  };

  const moveOption = (index, direction) => {
    const newOptions = [...(selectedField.opciones || [])];
    if (direction === 'up' && index > 0) {
      [newOptions[index], newOptions[index - 1]] = [newOptions[index - 1], newOptions[index]];
    } else if (direction === 'down' && index < newOptions.length - 1) {
      [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
    }
    onUpdateField(selectedField.id, { opciones: newOptions });
  };

  const handleAdvancedMappingChange = (index, field, value) => {
    const newMappings = [...(selectedField.mapeo_excel_avanzado || [])];
    newMappings[index] = { ...newMappings[index], [field]: value };
    onUpdateField(selectedField.id, { mapeo_excel_avanzado: newMappings });
  };

  const addAdvancedMapping = () => {
    const newMappings = [...(selectedField.mapeo_excel_avanzado || []), { valor_opcion: '', celda_excel: '', texto_excel: '' }];
    onUpdateField(selectedField.id, { mapeo_excel_avanzado: newMappings });
  };

  const removeAdvancedMapping = (index) => {
    const newMappings = selectedField.mapeo_excel_avanzado.filter((_, i) => i !== index);
    onUpdateField(selectedField.id, { mapeo_excel_avanzado: newMappings });
  };

  const isAdvancedType = ['select', 'radio', 'checkbox'].includes(selectedField.tipo_campo);
  const isHeading = selectedField.tipo_campo === 'heading';
  const isFile = selectedField.tipo_campo === 'file';

  return (
    <div className="sidebar-right">
      <div className="sidebar-header">Propiedades del Campo</div>
      
      <div className="form-group">
        <label className="form-label">{isHeading ? "Texto del Título" : "Etiqueta (Visible)"}</label>
        <input 
          type="text" 
          className="form-input" 
          name="etiqueta" 
          value={selectedField.etiqueta || ''} 
          onChange={handleChange} 
        />
      </div>

      <div className="form-group">
        <label className="form-label">{isHeading ? "Descripción o Instrucciones" : "Texto de Ayuda"}</label>
        <textarea 
          className="form-input" 
          name="texto_ayuda" 
          rows="2"
          value={selectedField.texto_ayuda || ''} 
          onChange={handleChange} 
        />
      </div>

      {isHeading && (
        <div className="form-group">
          <label className="form-label">Tamaño del Título</label>
          <select 
            className="form-select" 
            name="tamano_texto"
            value={selectedField.tamano_texto || 'h2'}
            onChange={handleChange}
          >
            <option value="h2">Grande (Título Principal)</option>
            <option value="h3">Mediano (Subtítulo)</option>
            <option value="h4">Pequeño (Apartado)</option>
          </select>
        </div>
      )}

      {!isHeading && (
        <>
          <div className="form-group">
            <label className="form-label">Nombre de Variable (Base de datos)</label>
            <input 
              type="text" 
              className="form-input" 
              name="nombre_variable" 
              value={selectedField.nombre_variable || ''} 
              onChange={handleChange} 
            />
          </div>

          {!isFile && (
            <>
              {!isAdvancedType ? (
                <div className="form-group">
                  <label className="form-label">Placeholder</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="placeholder" 
                    value={selectedField.placeholder || ''} 
                    onChange={handleChange} 
                  />
                </div>
              ) : (
                <div className="form-group" style={{ backgroundColor: '#f8fafc' }}>
                  <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 600 }}>Opciones Disponibles</label>
                  
                  {(selectedField.opciones || []).map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => moveOption(idx, 'up')} style={{ background: 'none', border: 'none', cursor: idx > 0 ? 'pointer' : 'default', opacity: idx > 0 ? 1 : 0.3, padding: 0 }} title="Mover arriba"><ArrowUp size={14} color="var(--text-muted)" /></button>
                        <button onClick={() => moveOption(idx, 'down')} style={{ background: 'none', border: 'none', cursor: idx < (selectedField.opciones?.length || 0) - 1 ? 'pointer' : 'default', opacity: idx < (selectedField.opciones?.length || 0) - 1 ? 1 : 0.3, padding: 0 }} title="Mover abajo"><ArrowDown size={14} color="var(--text-muted)" /></button>
                      </div>
                      <input type="text" className="form-input" value={opt} onChange={e => handleOptionChange(idx, e.target.value)} style={{ flex: 1 }} />
                      <button onClick={() => removeOption(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }} title="Eliminar opción"><Trash2 size={18} color="var(--danger)" /></button>
                    </div>
                  ))}
                  
                  <button className="btn" style={{ width: '100%', marginTop: '0.5rem', border: '1px dashed var(--primary)', color: 'var(--primary)', background: 'transparent' }} onClick={addOption}>
                    + Añadir Opción
                  </button>
                </div>
              )}
            </>
          )}

          {isFile && (
            <div className="form-group" style={{ backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 600 }}>Configuración de Archivo</label>
              <div style={{ marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Extensiones permitidas</label>
                <input type="text" className="form-input" name="extensiones_permitidas" placeholder="ej. .pdf, .jpg, .png" value={selectedField.extensiones_permitidas || ''} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Tamaño máximo (MB)</label>
                <input type="number" className="form-input" name="tamano_max_mb" placeholder="ej. 5" value={selectedField.tamano_max_mb || ''} onChange={handleChange} />
              </div>
            </div>
          )}

          {selectedField.tipo_campo === 'date' && (
            <div className="form-group" style={{ backgroundColor: '#fdf4ff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #f5d0fe' }}>
              <label className="form-label" style={{ color: '#c026d3', fontWeight: 600 }}>Restricciones de Fecha</label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  type="checkbox" 
                  name="usar_fecha_actual" 
                  id="usar_fecha_actual"
                  checked={selectedField.usar_fecha_actual || false} 
                  onChange={handleChange} 
                />
                <label className="form-label" htmlFor="usar_fecha_actual" style={{marginBottom: 0, fontSize: '0.85rem'}}>Usar fecha actual por defecto</label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Fecha Mínima</label>
                  <input type="date" className="form-input" name="fecha_minima" value={selectedField.fecha_minima || ''} onChange={handleChange} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Fecha Máxima</label>
                  <input type="date" className="form-input" name="fecha_maxima" value={selectedField.fecha_maxima || ''} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              name="requerido" 
              id="requerido"
              checked={selectedField.requerido || false} 
              onChange={handleChange} 
            />
            <label className="form-label" htmlFor="requerido" style={{marginBottom: 0}}>Campo Requerido</label>
          </div>
        </>
      )}

      {/* Controles de Diseño (Visibles para todos, incluso headings) */}
      <div className="sidebar-header" style={{marginTop: '1rem'}}>Diseño y Layout</div>

      <div className="form-group">
        <label className="form-label">Ancho del Campo</label>
        <select 
          className="form-select" 
          name="ancho_columna"
          value={selectedField.ancho_columna || 'col-12'}
          onChange={handleChange}
        >
          <option value="col-12">Fila completa (100%)</option>
          <option value="col-md-6">Mitad de fila (50%)</option>
          <option value="col-md-4">Tercio de fila (33%)</option>
          <option value="col-md-3">Cuarto de fila (25%)</option>
        </select>
      </div>

      {['checkbox', 'radio'].includes(selectedField.tipo_campo) && (
        <div className="form-group">
          <label className="form-label">Alineación de Opciones</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}><input type="radio" name="alineacion_opciones" value="vertical" checked={(selectedField.alineacion_opciones || 'vertical') === 'vertical'} onChange={handleChange} /> Vertical</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}><input type="radio" name="alineacion_opciones" value="horizontal" checked={selectedField.alineacion_opciones === 'horizontal'} onChange={handleChange} /> Horizontal</label>
          </div>
        </div>
      )}

      {!isHeading && (
        <>
          <div className="sidebar-header" style={{marginTop: '1rem'}}>
            Smart Data & Mapeo Excel
          </div>

          <div className="form-group">
            <label className="form-label">Fuente de Datos (Autollenado)</label>
            <select 
              className="form-select" 
              name="fuente_contexto"
              value={selectedField.fuente_contexto || 'NINGUNO'}
              onChange={handleChange}
            >
              <option value="NINGUNO">Ninguno (Ingreso manual)</option>
              <option value="ALUMNO">Datos del Alumno</option>
              <option value="PROYECTO">Datos del Proyecto</option>
              <option value="DEPENDENCIA">Datos de la Dependencia</option>
            </select>
          </div>

          {selectedField.fuente_contexto !== 'NINGUNO' && (
            <ColumnSearchSelect 
              fuenteContexto={selectedField.fuente_contexto}
              value={selectedField.fuente_columna || ''}
              onChange={(val) => onUpdateField(selectedField.id, { fuente_columna: val })}
            />
          )}

          {!isAdvancedType && !isFile ? (
            <div className="form-group">
              <label className="form-label">Celda Excel Destino</label>
              <input type="text" className="form-input" name="celda_excel" placeholder="ej. C12" value={selectedField.celda_excel || ''} onChange={handleChange} />
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem'}}>Coordenada en la plantilla donde se inyectará este valor.</p>
            </div>
          ) : isAdvancedType ? (
            <div className="form-group" style={{ backgroundColor: '#f8fafc' }}>
              <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 600 }}>Mapeo Avanzado Excel</label>
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>Asigna celdas específicas a cada opción.</p>
              {(selectedField.mapeo_excel_avanzado || []).map((mapItem, idx) => (
                <div key={idx} style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="text" className="form-input" placeholder="Opción" value={mapItem.valor_opcion} onChange={e => handleAdvancedMappingChange(idx, 'valor_opcion', e.target.value)} />
                    <input type="text" className="form-input" placeholder="Celda" style={{width: '80px'}} value={mapItem.celda_excel} onChange={e => handleAdvancedMappingChange(idx, 'celda_excel', e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" className="form-input" placeholder="Texto (Opcional, ej. X)" value={mapItem.texto_excel} onChange={e => handleAdvancedMappingChange(idx, 'texto_excel', e.target.value)} />
                    <button onClick={() => removeAdvancedMapping(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>&times;</button>
                  </div>
                </div>
              ))}
              <button className="btn" style={{ width: '100%', border: '1px dashed var(--primary)', color: 'var(--primary)', background: 'transparent' }} onClick={addAdvancedMapping}>+ Añadir Mapeo</button>
            </div>
          ) : null}

          {/* Lógica Condicional */}
          <div className="sidebar-header" style={{marginTop: '1rem'}}>Lógica Condicional (Visibilidad)</div>
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <input type="checkbox" checked={!!selectedField.habilitar_condicion} onChange={(e) => onUpdateField(selectedField.id, { habilitar_condicion: e.target.checked })} id="habilitar_condicion" />
              <label htmlFor="habilitar_condicion" className="form-label" style={{marginBottom: 0}}>Habilitar Lógica Condicional</label>
            </div>

            {selectedField.habilitar_condicion && (
              <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-md)' }}>
                <label className="form-label" style={{fontSize: '0.75rem'}}>¿De qué campo depende?</label>
                <select className="form-select" name="condicion_campo" value={selectedField.condicion_campo || ''} onChange={handleChange} style={{marginBottom: '0.5rem'}}>
                  <option value="">Selecciona un campo...</option>
                  {allFields.filter(f => f.id !== selectedField.id && f.tipo_campo !== 'heading').map(f => (
                    <option key={f.id} value={f.nombre_variable}>{f.etiqueta} ({f.nombre_variable})</option>
                  ))}
                </select>

                <label className="form-label" style={{fontSize: '0.75rem'}}>Condición</label>
                <select className="form-select" name="condicion_operador" value={selectedField.condicion_operador || 'igual'} onChange={handleChange} style={{marginBottom: '0.5rem'}}>
                  <option value="igual">Es igual a</option>
                  <option value="diferente">Es diferente a</option>
                  <option value="contiene">Contiene</option>
                  <option value="mayor">Mayor que</option>
                  <option value="menor">Menor que</option>
                </select>

                <label className="form-label" style={{fontSize: '0.75rem'}}>Valor esperado</label>
                <input type="text" className="form-input" name="condicion_valor" value={selectedField.condicion_valor || ''} onChange={handleChange} style={{marginBottom: '0.5rem'}} />

                <label className="form-label" style={{fontSize: '0.75rem'}}>Acción a realizar</label>
                <select className="form-select" name="condicion_accion" value={selectedField.condicion_accion || 'mostrar'} onChange={handleChange}>
                  <option value="mostrar">Mostrar este campo</option>
                  <option value="ocultar">Ocultar este campo</option>
                  <option value="requerir">Hacer requerido</option>
                  <option value="deshabilitar">Deshabilitar</option>
                </select>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}

export default PropertiesPanel;
