import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, ArrowUp, ArrowDown, Database, Sparkles, FileSpreadsheet, 
  Settings2, Sliders, Info, Eye, Check, Search, Layers, CheckCircle2,
  Calendar, ShieldCheck, ChevronDown, FileText, Lock, Image as ImageIcon
} from 'lucide-react';

function ColumnSearchSelect({ fuenteContexto, value, onChange }) {
  const [columns, setColumns] = useState([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  // Cargar columnas cuando cambia la entidad de la base de datos
  useEffect(() => {
    if (!fuenteContexto || fuenteContexto === 'NINGUNO') {
      setColumns([]);
      return;
    }
    
    setLoading(true);
    fetch(`http://localhost:5000/api/esquema/columnas?fuente=${fuenteContexto}`)
      .then(res => res.json())
      .then(data => {
        const columnsArray = Array.isArray(data) ? data : [];
        setColumns(columnsArray);
      })
      .catch(err => {
        console.error("Error fetching columns:", err);
        setColumns([]);
      })
      .finally(() => setLoading(false));
  }, [fuenteContexto]);

  // Sincronizar búsqueda interna
  useEffect(() => {
    if (value) {
      // Buscar si existe un label descriptivo para este valor
      const found = columns.find(c => (typeof c === 'object' ? c.campo === value : c === value));
      if (found && typeof found === 'object') {
        setSearch(found.label);
      } else {
        setSearch(value);
      }
    } else {
      setSearch('');
    }
  }, [value, columns]);

  // Cerrar dropdown al hacer click afuera
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
  const safeSearch = (search || '').toLowerCase();
  
  const filteredColumns = safeColumns.filter(col => {
    if (typeof col === 'object') {
      return (
        (col.label && col.label.toLowerCase().includes(safeSearch)) ||
        (col.campo && col.campo.toLowerCase().includes(safeSearch))
      );
    }
    return typeof col === 'string' && col.toLowerCase().includes(safeSearch);
  });

  const selectedColObj = columns.find(c => (typeof c === 'object' ? c.campo === value : c === value));

  return (
    <div className="form-group" ref={wrapperRef} style={{ marginBottom: '1rem' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
        <Database size={14} className="text-emerald-600" /> Columna de la Base de Datos
      </label>
      
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <input 
            type="text" 
            className="form-input" 
            style={{ 
              paddingRight: '2rem', 
              fontSize: '0.85rem', 
              fontWeight: 500,
              backgroundColor: value ? '#f0fdf4' : 'white',
              borderColor: value ? '#86efac' : '#cbd5e1'
            }}
            placeholder={loading ? "Cargando columnas..." : "Buscar columna en la tabla..."}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            disabled={loading}
          />
          <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#94a3b8' }}>
            <Search size={15} />
          </div>
        </div>

        {value && (
          <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.6rem', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.75rem' }}>
            <span style={{ color: '#065f46', fontWeight: 600 }}>
              Campo DB vinculado: <code style={{ backgroundColor: 'white', padding: '1px 5px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>{value}</code>
            </span>
            <button 
              type="button"
              onClick={() => { onChange(''); setSearch(''); }}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
            >
              Desvincular
            </button>
          </div>
        )}

        {isOpen && (
          <ul style={{ 
            position: 'absolute', zIndex: 100, width: '100%', 
            maxHeight: '220px', overflowY: 'auto', 
            background: 'white', border: '1px solid #cbd5e1', 
            borderRadius: '10px', margin: '4px 0 0 0', padding: '4px', listStyle: 'none',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
          }}>
            {filteredColumns.length === 0 ? (
              <li style={{ padding: '0.75rem', fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center' }}>
                {loading ? "Cargando esquema..." : "No se encontraron columnas coincidentes"}
              </li>
            ) : (
              filteredColumns.map((col, idx) => {
                const colName = typeof col === 'object' ? col.campo : col;
                const colLabel = typeof col === 'object' ? col.label : col;
                const colTipo = typeof col === 'object' ? col.tipo : 'texto';
                const isSelected = value === colName;

                return (
                  <li 
                    key={colName || idx} 
                    style={{ 
                      padding: '0.55rem 0.75rem', 
                      cursor: 'pointer', 
                      borderRadius: '6px',
                      marginBottom: '2px',
                      backgroundColor: isSelected ? '#ecfdf5' : 'white',
                      borderLeft: isSelected ? '3px solid #059669' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => {
                      setSearch(colLabel);
                      onChange(colName);
                      setIsOpen(false);
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'white'; }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }}>
                        {colLabel}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <code>{colName}</code>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', textTransform: 'uppercase', fontWeight: 700 }}>
                        {colTipo}
                      </span>
                      {isSelected && <Check size={14} color="#059669" />}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function PropertiesPanel({ selectedField, onUpdateField, allFields = [] }) {
  if (!selectedField) {
    return (
      <div className="sidebar-right" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#022c22', color: 'white' }}>
          <Settings2 size={18} color="#6ee7b7" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Propiedades del Campo</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#64748b' }}>
            <Sliders size={28} />
          </div>
          <h4 style={{ color: '#334155', margin: '0 0 0.5rem 0', fontWeight: 700, fontSize: '1rem' }}>Ningún campo seleccionado</h4>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.5, maxWidth: '240px' }}>
            Haz clic sobre cualquier campo en el lienzo para ajustar su etiqueta, validaciones y mapeo de datos.
          </p>
        </div>
      </div>
    );
  }

  const fieldOptions = Array.isArray(selectedField.opciones)
    ? selectedField.opciones
    : (typeof selectedField.opciones === 'string' ? (() => { try { const p = JSON.parse(selectedField.opciones); return Array.isArray(p) ? p : []; } catch(e) { return []; } })() : []);

  const fieldRules = Array.isArray(selectedField.reglas_llenado)
    ? selectedField.reglas_llenado
    : (typeof selectedField.reglas_llenado === 'string' ? (() => { try { const p = JSON.parse(selectedField.reglas_llenado); return Array.isArray(p) ? p : []; } catch(e) { return []; } })() : []);

  const fieldMapeoAvanzado = Array.isArray(selectedField.mapeo_excel_avanzado)
    ? selectedField.mapeo_excel_avanzado
    : (typeof selectedField.mapeo_excel_avanzado === 'string' ? (() => { try { const p = JSON.parse(selectedField.mapeo_excel_avanzado); return Array.isArray(p) ? p : []; } catch(e) { return []; } })() : []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    const updates = {
      [name]: type === 'checkbox' ? checked : value
    };

    if (name === 'etiqueta' && selectedField.tipo_campo !== 'heading') {
      const slug = value
        .trim()
        .toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '')
        .substring(0, 50)
        .replace(/_+$/, '');
      updates.nombre_variable = slug || `VAR_${Date.now()}`;
    }

    if (name === 'nombre_variable') {
      updates.nombre_variable = value
        .toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '')
        .substring(0, 80);
    }

    onUpdateField(selectedField.id, updates);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...fieldOptions];
    newOptions[index] = value;
    onUpdateField(selectedField.id, { opciones: newOptions });
  };

  const addOption = () => {
    const newOptions = [...fieldOptions, `Opción ${fieldOptions.length + 1}`];
    onUpdateField(selectedField.id, { opciones: newOptions });
  };

  const removeOption = (index) => {
    const newOptions = fieldOptions.filter((_, i) => i !== index);
    onUpdateField(selectedField.id, { opciones: newOptions });
  };

  const moveOption = (index, direction) => {
    const newOptions = [...fieldOptions];
    if (direction === 'up' && index > 0) {
      [newOptions[index], newOptions[index - 1]] = [newOptions[index - 1], newOptions[index]];
    } else if (direction === 'down' && index < newOptions.length - 1) {
      [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
    }
    onUpdateField(selectedField.id, { opciones: newOptions });
  };

  const handleAdvancedMappingChange = (index, field, value) => {
    const newMappings = [...fieldMapeoAvanzado];
    newMappings[index] = { ...(newMappings[index] || {}), [field]: value };
    onUpdateField(selectedField.id, { mapeo_excel_avanzado: newMappings });
  };

  const addAdvancedMapping = () => {
    const mappedValues = (fieldMapeoAvanzado || []).map(m => (m.valor_opcion || '').trim().toLowerCase());
    const unmapped = fieldOptions.find(o => {
      const oStr = typeof o === 'string' ? o : (o?.label || o?.value || String(o || ''));
      return !mappedValues.includes(oStr.trim().toLowerCase());
    });
    const defaultVal = unmapped
      ? (typeof unmapped === 'string' ? unmapped : (unmapped?.label || unmapped?.value || ''))
      : (fieldOptions[0] ? (typeof fieldOptions[0] === 'string' ? fieldOptions[0] : (fieldOptions[0]?.label || fieldOptions[0]?.value || '')) : '');
    const newMappings = [...fieldMapeoAvanzado, { valor_opcion: defaultVal, celda_excel: '', texto_excel: 'X' }];
    onUpdateField(selectedField.id, { mapeo_excel_avanzado: newMappings });
  };

  const removeAdvancedMapping = (index) => {
    const newMappings = fieldMapeoAvanzado.filter((_, i) => i !== index);
    onUpdateField(selectedField.id, { mapeo_excel_avanzado: newMappings });
  };

  const syncAdvancedMappingFromOptions = () => {
    const opts = fieldOptions;
    if (opts.length === 0) return;
    const existingMappings = fieldMapeoAvanzado;
    const newMappings = opts.map(opt => {
      const optStr = typeof opt === 'string' ? opt : (opt?.label || opt?.value || String(opt || ''));
      const found = existingMappings.find(m => (m.valor_opcion || '').trim().toLowerCase() === optStr.trim().toLowerCase());
      return found || { valor_opcion: optStr, celda_excel: '', texto_excel: 'X' };
    });
    onUpdateField(selectedField.id, { mapeo_excel_avanzado: newMappings });
  };

  const handleFillRuleChange = (index, field, value) => {
    const newRules = [...fieldRules];
    newRules[index] = { ...(newRules[index] || {}), [field]: value };
    onUpdateField(selectedField.id, { reglas_llenado: newRules });
  };

  const addFillRule = () => {
    const newRules = [...fieldRules, { opcion: '', texto: '', bloquear_edicion: true }];
    onUpdateField(selectedField.id, { reglas_llenado: newRules });
  };

  const removeFillRule = (index) => {
    const newRules = fieldRules.filter((_, i) => i !== index);
    onUpdateField(selectedField.id, { reglas_llenado: newRules });
  };

  const syncFillRulesFromOptions = () => {
    const opts = fieldOptions;
    if (opts.length === 0) return;
    const existing = fieldRules;
    const newRules = opts.map(opt => {
      const optStr = typeof opt === 'string' ? opt : (opt?.label || opt?.value || String(opt || ''));
      const found = existing.find(r => (r.opcion || '').trim().toLowerCase() === optStr.trim().toLowerCase());
      if (found) return found;
      const isNo = optStr.trim().toLowerCase() === 'no';
      return { 
        opcion: optStr, 
        texto: '', 
        bloquear_edicion: !isNo 
      };
    });
    onUpdateField(selectedField.id, { reglas_llenado: newRules });
  };

  const isAdvancedType = ['select', 'radio', 'checkbox'].includes(selectedField.tipo_campo);
  const currentMappingMode = selectedField.modo_mapeo_excel || 
    ((fieldMapeoAvanzado.length > 0 && !selectedField.celda_excel) ? 'individual' : 'unica');
  const isHeading = selectedField.tipo_campo === 'heading';
  const isFile = selectedField.tipo_campo === 'file';

  return (
    <div className="sidebar-right" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>
      
      {/* Cabecera del Panel */}
      <div className="sidebar-header" style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', color: 'white', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings2 size={18} color="#6ee7b7" />
          <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.2px' }}>Propiedades del Campo</span>
        </div>
        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#a7f3d0', fontWeight: 700, textTransform: 'uppercase' }}>
          {selectedField.tipo_campo === 'radio' ? 'Opción Múltiple' : selectedField.tipo_campo}
        </span>
      </div>

      {/* Contenido scrolleable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

        {/* 1. SECCIÓN PRINCIPAL: TEXTOS & ETIQUETAS */}
        <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.85rem' }}>
            <Layers size={14} color="#059669" /> Configuración Básica
          </div>

          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
              {isHeading ? "Texto del Título" : "Etiqueta Visible para el Alumno"}
            </label>
            <input 
              type="text" 
              className="form-input" 
              name="etiqueta" 
              value={selectedField.etiqueta || ''} 
              onChange={handleChange} 
              placeholder="ej. Nombre de la Dependencia"
              style={{ fontSize: '0.88rem' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
              {isHeading ? "Descripción o Subtítulo" : "Texto de Ayuda (Tooltip)"}
            </label>
            <textarea 
              className="form-input" 
              name="texto_ayuda" 
              rows="2"
              value={selectedField.texto_ayuda || ''} 
              onChange={handleChange} 
              placeholder="Instrucciones breves para el estudiante..."
              style={{ fontSize: '0.82rem', resize: 'vertical' }}
            />
          </div>

          {isHeading ? (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Jerarquía del Título</label>
              <select 
                className="form-select" 
                name="tamano_texto"
                value={selectedField.tamano_texto || 'h2'}
                onChange={handleChange}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="h2">Grande (Título de Sección H2)</option>
                <option value="h3">Mediano (Subtítulo H3)</option>
                <option value="h4">Pequeño (Apartado H4)</option>
              </select>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                Nombre de Variable Interna
              </label>
              <input 
                type="text" 
                className="form-input" 
                name="nombre_variable" 
                value={selectedField.nombre_variable || ''} 
                onChange={handleChange} 
                placeholder="ej. NOMBRE_DEPENDENCIA"
                style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#0369a1', backgroundColor: '#f0f9ff' }}
              />
            </div>
          )}
        </div>

        {/* 2. SMART DATA Y SINCRONIZACIÓN DE BASE DE DATOS */}
        {!isHeading && (
          <div style={{ marginBottom: '1.5rem', backgroundColor: '#f0fdf4', padding: '1.1rem', borderRadius: '14px', border: '1px solid #86efac', boxShadow: '0 2px 8px -2px rgba(16, 185, 129, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Sparkles size={16} color="#059669" /> Smart Data ITST
              </div>
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#d1fae5', color: '#047857', fontWeight: 800 }}>
                2-Way Sync
              </span>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#047857', lineHeight: 1.4, margin: '0 0 1rem 0' }}>
              <strong>Autollenado y actualización:</strong> Vincula este campo a la base de datos institucional. Se precargará con los datos del alumno y, al enviarse, actualizará automáticamente la información para los administradores.
            </p>

            <div className="form-group" style={{ marginBottom: '0.85rem' }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                Entidad / Tabla de Datos
              </label>
              <select 
                className="form-select" 
                name="fuente_contexto"
                value={selectedField.fuente_contexto || 'NINGUNO'}
                onChange={handleChange}
                style={{ fontSize: '0.85rem', borderColor: selectedField.fuente_contexto !== 'NINGUNO' ? '#059669' : '#cbd5e1' }}
              >
                <option value="NINGUNO">Ninguno (Entrada manual del alumno)</option>
                <option value="ALUMNO">👤 Datos del Alumno (alumnos)</option>
                <option value="PROYECTO">📁 Datos del Proyecto (proyectos_servicio)</option>
                <option value="ACTIVIDADES">📋 Programa de Actividades (actividades_proyecto)</option>
                <option value="DEPENDENCIA">🏢 Datos de la Dependencia (dependencias)</option>
                <option value="PERIODO">📅 Periodo y Calendario Oficial (periodos)</option>
                <option value="SISTEMA">⚙️ Configuración Global del ITST (sistema)</option>
              </select>
            </div>

            {selectedField.fuente_contexto && selectedField.fuente_contexto !== 'NINGUNO' && (
              <ColumnSearchSelect 
                fuenteContexto={selectedField.fuente_contexto}
                value={selectedField.fuente_columna || ''}
                onChange={(val) => onUpdateField(selectedField.id, { fuente_columna: val })}
              />
            )}
          </div>
        )}
{!isHeading && (
          <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.85rem' }}>
              <FileSpreadsheet size={15} color="#059669" /> {isFile ? 'Configuración de Imagen' : 'Mapeo a Plantilla Excel'}
            </div>

            {isFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <ImageIcon size={18} color="#2563eb" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#1e40af', lineHeight: 1.4 }}>
                    <strong>Incrustación de Imagen:</strong> La imagen subida por el alumno se colocará automáticamente en la celda indicada del documento Excel con el tamaño en píxeles configurado aquí.
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                    📍 Casilla del Excel donde se colocará
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      name="celda_excel" 
                      placeholder="ej. B15 o E30" 
                      value={selectedField.celda_excel || ''} 
                      onChange={handleChange} 
                      style={{ fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', width: '130px', borderColor: selectedField.celda_excel ? '#2563eb' : '#cbd5e1' }}
                    />
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Coordenada exacta de anclaje (ej. B15, G20).
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', display: 'block' }}>
                    📐 Tamaño de la Imagen en el Excel (Píxeles)
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.6rem' }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Ancho (px)</label>
                      <input 
                        type="number"
                        className="form-input"
                        value={selectedField.ancho_imagen || 150}
                        onChange={(e) => onUpdateField(selectedField.id, { ancho_imagen: parseInt(e.target.value) || 150 })}
                        min="20"
                        max="1500"
                        style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Alto (px)</label>
                      <input 
                        type="number"
                        className="form-input"
                        value={selectedField.alto_imagen || 120}
                        onChange={(e) => onUpdateField(selectedField.id, { alto_imagen: parseInt(e.target.value) || 120 })}
                        min="20"
                        max="1500"
                        style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '0.35rem' }}>
                    Sugerencias de tamaño institucional:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => onUpdateField(selectedField.id, { ancho_imagen: 140, alto_imagen: 70 })}
                      style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 600, borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (selectedField.ancho_imagen === 140 && selectedField.alto_imagen === 70) ? '#dbeafe' : '#ffffff', color: '#1e293b', cursor: 'pointer' }}
                    >
                      🖋️ Firma / Sello (140×70)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateField(selectedField.id, { ancho_imagen: 120, alto_imagen: 150 })}
                      style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 600, borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (selectedField.ancho_imagen === 120 && selectedField.alto_imagen === 150) ? '#dbeafe' : '#ffffff', color: '#1e293b', cursor: 'pointer' }}
                    >
                      👤 Foto Infantil (120×150)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateField(selectedField.id, { ancho_imagen: 260, alto_imagen: 180 })}
                      style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 600, borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: (selectedField.ancho_imagen === 260 && selectedField.alto_imagen === 180) ? '#dbeafe' : '#ffffff', color: '#1e293b', cursor: 'pointer' }}
                    >
                      📄 Comprobante (260×180)
                    </button>
                  </div>
                </div>
              </div>
            ) : !isAdvancedType ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Celda de Destino en Excel
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    name="celda_excel" 
                    placeholder="ej. C12 o B5" 
                    value={selectedField.celda_excel || ''} 
                    onChange={handleChange} 
                    style={{ fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', width: '120px' }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Coordenada exacta en la plantilla oficial.
                  </span>
                </div>
              </div>
            ) : (
              <div>
                {/* Selector de modo de llenado: 1. Texto de la opción en casilla única vs 2. Texto personalizado por opción */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '0.45rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Opciones de Llenado hacia Excel:
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    {/* Opción 1: Texto en casilla única */}
                    <div
                      onClick={() => onUpdateField(selectedField.id, { modo_mapeo_excel: 'unica' })}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: currentMappingMode === 'unica' ? '2px solid #059669' : '1px solid #cbd5e1',
                        backgroundColor: currentMappingMode === 'unica' ? '#ecfdf5' : '#ffffff',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: currentMappingMode === 'unica' ? '5px solid #059669' : '2px solid #94a3b8',
                        backgroundColor: '#ffffff',
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.82rem', color: currentMappingMode === 'unica' ? '#065f46' : '#1e293b' }}>
                          <FileSpreadsheet size={15} color={currentMappingMode === 'unica' ? '#059669' : '#64748b'} />
                          1. Texto en Casilla Única
                        </div>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3 }}>
                          Coloca el texto de la opción seleccionada directamente en una casilla fija.
                        </p>
                      </div>
                    </div>

                    {/* Opción 2: Texto personalizado por opción */}
                    <div
                      onClick={() => {
                        onUpdateField(selectedField.id, { modo_mapeo_excel: 'individual' });
                        if ((!selectedField.mapeo_excel_avanzado || selectedField.mapeo_excel_avanzado.length === 0) && (selectedField.opciones || []).length > 0) {
                          syncAdvancedMappingFromOptions();
                        }
                      }}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: currentMappingMode === 'individual' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        backgroundColor: currentMappingMode === 'individual' ? '#f0f9ff' : '#ffffff',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: currentMappingMode === 'individual' ? '5px solid #0284c7' : '2px solid #94a3b8',
                        backgroundColor: '#ffffff',
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.82rem', color: currentMappingMode === 'individual' ? '#0369a1' : '#1e293b' }}>
                          <Sliders size={15} color={currentMappingMode === 'individual' ? '#0284c7' : '#64748b'} />
                          2. Texto Personalizado por Opción
                        </div>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3 }}>
                          Coloca un texto diferente en la casilla que elijas al seleccionar cada opción.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido según el modo de mapeo */}
                {currentMappingMode === 'unica' ? (
                  <div style={{ backgroundColor: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                      Casilla de Destino en Excel
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        name="celda_excel" 
                        placeholder="ej. C12 o D8" 
                        value={selectedField.celda_excel || ''} 
                        onChange={handleChange} 
                        style={{ fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', width: '120px' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.3 }}>
                        Coordenada donde se estampará el texto de la opción elegida.
                      </span>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#047857', backgroundColor: '#ecfdf5', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #a7f3d0', lineHeight: 1.35 }}>
                      💡 <strong>Comportamiento:</strong> Al seleccionar cualquier opción, su propio texto (ej. <em>"{selectedField.opciones?.[0] || 'Opción 1'}"</em>) se escribirá directamente en la celda <strong>{selectedField.celda_excel ? selectedField.celda_excel.toUpperCase() : '[Casilla]'}</strong>.
                    </div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#ffffff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                          Reglas por Opción
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {(selectedField.mapeo_excel_avanzado || []).length} regla(s) configurada(s)
                        </span>
                      </div>
                      {(selectedField.opciones || []).length > 0 && (
                        <button
                          type="button"
                          onClick={syncAdvancedMappingFromOptions}
                          style={{
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#0284c7',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Cargar todas las opciones del campo automáticamente"
                        >
                          <Sparkles size={12} color="#0284c7" /> Cargar Opciones
                        </button>
                      )}
                    </div>

                    {/* Lista de Reglas en formato Tarjetas limpias */}
                    {(selectedField.mapeo_excel_avanzado || []).map((mapItem, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          marginBottom: '0.65rem', 
                          padding: '0.65rem 0.75rem', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px', 
                          backgroundColor: '#f8fafc'
                        }}
                      >
                        {/* Cabecera de la Regla */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800 }}>
                              {idx + 1}
                            </span>
                            Al seleccionar la opción:
                          </span>
                          <button 
                            type="button"
                            onClick={() => removeAdvancedMapping(idx)} 
                            style={{ 
                              background: '#fee2e2', 
                              border: 'none', 
                              color: '#ef4444', 
                              cursor: 'pointer', 
                              padding: '3px 6px', 
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '0.7rem'
                            }}
                            title="Eliminar regla"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Selector de la Opción */}
                        <div style={{ marginBottom: '0.5rem' }}>
                          {fieldOptions.length > 0 ? (
                            <select 
                              className="form-select" 
                              value={mapItem.valor_opcion || ''} 
                              onChange={e => handleAdvancedMappingChange(idx, 'valor_opcion', e.target.value)} 
                              style={{ 
                                fontSize: '0.82rem', 
                                width: '100%', 
                                padding: '0.4rem 0.5rem', 
                                backgroundColor: '#ffffff', 
                                fontWeight: 700, 
                                color: '#0f172a',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px'
                              }}
                            >
                              <option value="">-- Elige qué opción activa esta regla --</option>
                              {fieldOptions.map((opt, oIdx) => {
                                const optStr = typeof opt === 'string' ? opt : (opt?.label || opt?.value || String(opt || ''));
                                return <option key={oIdx} value={optStr}>{optStr}</option>;
                              })}
                              {mapItem.valor_opcion && !fieldOptions.some(o => (typeof o === 'string' ? o : (o?.label || o?.value)) === mapItem.valor_opcion) && (
                                <option value={mapItem.valor_opcion}>{mapItem.valor_opcion}</option>
                              )}
                            </select>
                          ) : (
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="Escribe la opción" 
                              value={mapItem.valor_opcion || ''} 
                              onChange={e => handleAdvancedMappingChange(idx, 'valor_opcion', e.target.value)} 
                              style={{ fontSize: '0.82rem', width: '100%', backgroundColor: '#ffffff' }}
                            />
                          )}
                        </div>

                        {/* Campos Casilla y Texto en dos columnas con labels */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                              Casilla Excel:
                            </label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="ej. D15" 
                              value={mapItem.celda_excel || ''} 
                              onChange={e => handleAdvancedMappingChange(idx, 'celda_excel', e.target.value)} 
                              style={{ fontSize: '0.82rem', width: '100%', textTransform: 'uppercase', fontWeight: 700, textAlign: 'center', backgroundColor: '#ffffff' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                              Texto a colocar:
                            </label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="ej. X" 
                              value={mapItem.texto_excel !== undefined ? mapItem.texto_excel : 'X'} 
                              onChange={e => handleAdvancedMappingChange(idx, 'texto_excel', e.target.value)} 
                              style={{ fontSize: '0.82rem', width: '100%', textAlign: 'center', fontWeight: 700, color: '#0369a1', backgroundColor: '#ffffff' }}
                              title="Texto que se estampará en la casilla al elegir esta opción (ej. X, 5, SI, Aprobado)"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!selectedField.mapeo_excel_avanzado || selectedField.mapeo_excel_avanzado.length === 0) && (
                      <div style={{ textAlign: 'center', padding: '1rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '0.5rem' }}>
                        <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                          No hay reglas configuradas.<br />
                          Haz clic en <strong>+ Añadir Regla</strong> o en <strong>Cargar Opciones</strong>.
                        </p>
                      </div>
                    )}

                    <button 
                      type="button"
                      className="btn" 
                      style={{ width: '100%', marginTop: '0.35rem', border: '1px dashed #0284c7', color: '#0284c7', background: '#f0f9ff', fontSize: '0.8rem', padding: '0.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }} 
                      onClick={addAdvancedMapping}
                    >
                      + Añadir Regla de Opción
                    </button>

                    <div style={{ fontSize: '0.72rem', color: '#0369a1', backgroundColor: '#f0f9ff', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #bae6fd', marginTop: '0.65rem', lineHeight: 1.35 }}>
                      💡 <strong>Comportamiento:</strong> Al seleccionar una opción en el formulario, se colocará en la casilla indicada el <strong>texto diferente</strong> que hayas escrito en esa regla (ejemplo: colocar <em>"X"</em> en <strong>E12</strong>, o colocar <em>"5"</em> en <strong>F14</strong>).
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3.5. RESTRICCIÓN DE FORMATO DE IMAGEN */}
        {isFile && (
          <div style={{ marginBottom: '1.5rem', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              <ShieldCheck size={16} color="#059669" /> Restricción de Archivo
            </div>

            <div style={{ marginBottom: '0.65rem' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#15803d', display: 'block', marginBottom: '2px' }}>
                Formatos de Imagen Permitidos
              </label>
              <div style={{ padding: '6px 10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                🖼️ Solo Imágenes (.PNG, .JPG, .JPEG, .WEBP)
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: '#047857', lineHeight: 1.3 }}>
                Garantiza que el alumno únicamente suba imágenes válidas que puedan ser incrustadas en la plantilla Excel oficial.
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#15803d', display: 'block', marginBottom: '2px' }}>
                Límite Máximo de Tamaño (MB)
              </label>
              <input 
                type="number"
                className="form-input"
                value={selectedField.tamano_max_mb || 5}
                onChange={(e) => onUpdateField(selectedField.id, { tamano_max_mb: parseInt(e.target.value) || 5 })}
                min="1"
                max="25"
                style={{ fontSize: '0.85rem', width: '90px' }}
              />
            </div>
          </div>
        )}

        {isAdvancedType && (
          <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>Opciones del Campo</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{fieldOptions.length} opciones</span>
            </div>

            {['radio', 'checkbox'].includes(selectedField.tipo_campo) && (
              <div style={{ marginBottom: '0.85rem', padding: '0.6rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  Disposición / Orientación en Pantalla:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                  <button
                    type="button"
                    onClick={() => onUpdateField(selectedField.id, { alineacion_opciones: 'horizontal' })}
                    style={{
                      padding: '0.45rem 0.6rem',
                      fontSize: '0.78rem',
                      fontWeight: selectedField.alineacion_opciones !== 'vertical' ? 700 : 500,
                      borderRadius: '6px',
                      border: selectedField.alineacion_opciones !== 'vertical' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: selectedField.alineacion_opciones !== 'vertical' ? '#eff6ff' : '#ffffff',
                      color: selectedField.alineacion_opciones !== 'vertical' ? '#1e40af' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ↔️ Horizontal (en fila)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateField(selectedField.id, { alineacion_opciones: 'vertical' })}
                    style={{
                      padding: '0.45rem 0.6rem',
                      fontSize: '0.78rem',
                      fontWeight: selectedField.alineacion_opciones === 'vertical' ? 700 : 500,
                      borderRadius: '6px',
                      border: selectedField.alineacion_opciones === 'vertical' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: selectedField.alineacion_opciones === 'vertical' ? '#eff6ff' : '#ffffff',
                      color: selectedField.alineacion_opciones === 'vertical' ? '#1e40af' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ↕️ Vertical (en columna)
                  </button>
                </div>
              </div>
            )}

            {fieldOptions.map((opt, idx) => {
              const optStr = typeof opt === 'string' ? opt : (opt?.label || opt?.value || String(opt || ''));
              return (
                <div key={idx} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button onClick={() => moveOption(idx, 'up')} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx > 0 ? 'pointer' : 'default', opacity: idx > 0 ? 1 : 0.25, padding: 0 }}><ArrowUp size={12} /></button>
                    <button onClick={() => moveOption(idx, 'down')} disabled={idx === fieldOptions.length - 1} style={{ background: 'none', border: 'none', cursor: idx < fieldOptions.length - 1 ? 'pointer' : 'default', opacity: idx < fieldOptions.length - 1 ? 1 : 0.25, padding: 0 }}><ArrowDown size={12} /></button>
                  </div>
                  <input type="text" className="form-input" value={optStr} onChange={e => handleOptionChange(idx, e.target.value)} style={{ flex: 1, fontSize: '0.85rem' }} />
                  <button onClick={() => removeOption(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#ef4444' }}><Trash2 size={16} /></button>
                </div>
              );
            })}

            <button className="btn" style={{ width: '100%', marginTop: '0.5rem', border: '1px dashed #059669', color: '#059669', background: 'transparent', fontSize: '0.82rem' }} onClick={addOption}>
              + Añadir Opción
            </button>
          </div>
        )}

        {/* 5. DISEÑO Y ANCHO DE COLUMNA */}
        <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
            Distribución & Ancho
          </div>

          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Ancho en el Formulario</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
              {[
                { val: 'col-12', label: '100%' },
                { val: 'col-md-6', label: '50%' },
                { val: 'col-md-4', label: '33%' },
                { val: 'col-md-3', label: '25%' }
              ].map(w => (
                <button
                  key={w.val}
                  type="button"
                  onClick={() => onUpdateField(selectedField.id, { ancho_columna: w.val })}
                  style={{
                    padding: '0.45rem 0',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: (selectedField.ancho_columna || 'col-md-6') === w.val ? '2px solid #059669' : '1px solid #cbd5e1',
                    backgroundColor: (selectedField.ancho_columna || 'col-md-6') === w.val ? '#ecfdf5' : 'white',
                    color: (selectedField.ancho_columna || 'col-md-6') === w.val ? '#065f46' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Validaciones: Requerido y Solo Lectura */}
          {!isHeading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                <input 
                  type="checkbox" 
                  name="requerido" 
                  checked={!!selectedField.requerido} 
                  onChange={handleChange} 
                  style={{ width: '16px', height: '16px', accentColor: '#059669' }}
                />
                Campo Obligatorio (Requerido)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                <input 
                  type="checkbox" 
                  name="solo_lectura" 
                  checked={!!selectedField.solo_lectura} 
                  onChange={handleChange} 
                  style={{ width: '16px', height: '16px', accentColor: '#059669' }}
                />
                Solo Lectura (El alumno no puede modificarlo)
              </label>
            </div>
          )}
        </div>

        {/* 6. LÓGICA CONDICIONAL */}
        {!isHeading && (
          <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="habilitar_condicion" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                <input 
                  type="checkbox" 
                  checked={!!selectedField.habilitar_condicion} 
                  onChange={(e) => onUpdateField(selectedField.id, { habilitar_condicion: e.target.checked })} 
                  id="habilitar_condicion"
                  style={{ width: '16px', height: '16px', accentColor: '#059669' }}
                />
                Lógica Condicional (Visibilidad)
              </label>
            </div>

            {selectedField.habilitar_condicion && (
              <div style={{ marginTop: '0.85rem', padding: '0.85rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>¿De qué campo depende?</label>
                <select 
                  className="form-select" 
                  name="condicion_campo" 
                  value={selectedField.condicion_campo || ''} 
                  onChange={handleChange} 
                  style={{ marginBottom: '0.5rem', fontSize: '0.82rem' }}
                >
                  <option value="">Selecciona un campo...</option>
                  {allFields.filter(f => f.id !== selectedField.id && f.tipo_campo !== 'heading').map(f => (
                    <option key={f.id} value={f.nombre_variable}>{f.etiqueta} ({f.nombre_variable})</option>
                  ))}
                </select>

                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Condición</label>
                <select 
                  className="form-select" 
                  name="condicion_operador" 
                  value={selectedField.condicion_operador || 'igual'} 
                  onChange={handleChange} 
                  style={{ marginBottom: '0.5rem', fontSize: '0.82rem' }}
                >
                  <option value="igual">Es igual a</option>
                  <option value="diferente">Es diferente a</option>
                  <option value="contiene">Contiene</option>
                  <option value="mayor">Mayor que</option>
                  <option value="menor">Menor que</option>
                </select>

                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Valor esperado</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="condicion_valor" 
                  value={selectedField.condicion_valor || ''} 
                  onChange={handleChange} 
                  style={{ marginBottom: '0.5rem', fontSize: '0.82rem' }}
                  placeholder="ej. SI, Privada, etc."
                />

                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Acción a realizar</label>
                <select 
                  className="form-select" 
                  name="condicion_accion" 
                  value={selectedField.condicion_accion || 'mostrar'} 
                  onChange={handleChange}
                  style={{ fontSize: '0.82rem' }}
                >
                  <option value="mostrar">Mostrar este campo</option>
                  <option value="ocultar">Ocultar este campo</option>
                  <option value="requerir">Hacer requerido</option>
                  <option value="deshabilitar">Deshabilitar (Solo Lectura)</option>
                  <option value="habilitar">Habilitar para edición (Quitar Solo Lectura)</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* 7. LÓGICA CONDICIONAL: LLENADO AUTOMÁTICO DE TEXTO */}
        {['checkbox', 'select', 'radio'].includes(selectedField.tipo_campo) && (
          <div style={{ marginBottom: '1.5rem', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1px solid #86efac', boxShadow: '0 2px 8px -2px rgba(16, 185, 129, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="habilitar_condicion_llenado" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>
                <input 
                  type="checkbox" 
                  checked={!!selectedField.habilitar_condicion_llenado} 
                  onChange={(e) => {
                    const checked = e.target.checked;
                    let initialRules = selectedField.reglas_llenado || [];
                    if (checked && initialRules.length === 0) {
                      const opts = selectedField.opciones && selectedField.opciones.length > 0 
                        ? selectedField.opciones 
                        : ['SI', 'NO'];
                      initialRules = opts.map(o => ({ 
                        opcion: o, 
                        texto: '', 
                        bloquear_edicion: String(o).trim().toLowerCase() !== 'no' 
                      }));
                    }
                    onUpdateField(selectedField.id, { 
                      habilitar_condicion_llenado: checked,
                      reglas_llenado: initialRules,
                      campo_objetivo_llenado: selectedField.campo_objetivo_llenado || 'self'
                    });
                  }} 
                  id="habilitar_condicion_llenado"
                  style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
                />
                <Sparkles size={15} color="#059669" /> Lógica Condicional (Llenado)
              </label>
              <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 800 }}>
                Auto-Texto
              </span>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#047857', margin: '0.4rem 0 0.85rem 0', lineHeight: 1.4 }}>
              Asigna textos automáticos y controla si la casilla se bloquea (Solo Lectura) o se habilita para edición según la opción elegida.
            </p>

            {selectedField.habilitar_condicion_llenado && (
              <div style={{ padding: '0.85rem', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* ¿Dónde colocar el texto? */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', marginBottom: '0.35rem', display: 'block' }}>
                    ¿Dónde se colocará el texto generado?
                  </label>
                  <select 
                    className="form-select" 
                    name="campo_objetivo_llenado" 
                    value={selectedField.campo_objetivo_llenado || 'self'} 
                    onChange={handleChange} 
                    style={{ fontSize: '0.82rem', borderColor: '#86efac', width: '100%' }}
                  >
                    <option value="self">🎯 En este mismo campo (valor del campo / Celda Excel)</option>
                    <optgroup label="Llenar otro campo del formulario:">
                      {allFields.filter(f => f.id !== selectedField.id && f.tipo_campo !== 'heading').map(f => (
                        <option key={f.id} value={f.nombre_variable}>
                          📝 {f.etiqueta} ({f.nombre_variable})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block', lineHeight: 1.3 }}>
                    {selectedField.campo_objetivo_llenado === 'self' || !selectedField.campo_objetivo_llenado
                      ? 'El texto se aplicará directamente a este campo.'
                      : `Al marcar una opción, se actualizará el campo "${selectedField.campo_objetivo_llenado}".`}
                  </span>
                </div>

                {/* Encabezado de reglas y sincronización */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', margin: 0 }}>
                    Reglas por cada opción:
                  </label>
                  {fieldOptions && fieldOptions.length > 0 && (
                    <button 
                      type="button"
                      onClick={syncFillRulesFromOptions}
                      style={{ 
                        background: '#ecfdf5', 
                        border: '1px solid #a7f3d0', 
                        color: '#065f46', 
                        borderRadius: '6px', 
                        padding: '3px 8px', 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Sincronizar filas con las opciones actuales del campo"
                    >
                      <Check size={12} /> Sincronizar opciones
                    </button>
                  )}
                </div>

                {/* Lista de reglas de llenado por opción */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {fieldRules.map((rule, idx) => {
                    const ruleObj = typeof rule === 'object' && rule !== null ? rule : { opcion: String(rule || ''), texto: '', bloquear_edicion: true };
                    const isLock = ruleObj.bloquear_edicion !== false;
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          backgroundColor: '#f8fafc', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0', 
                          padding: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Fila superior: selección de opción y eliminar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#065f46', backgroundColor: '#d1fae5', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                              Si elige:
                            </span>
                            {fieldOptions && fieldOptions.length > 0 ? (
                              <select 
                                className="form-select"
                                value={ruleObj.opcion || ''}
                                onChange={e => handleFillRuleChange(idx, 'opcion', e.target.value)}
                                style={{ fontSize: '0.8rem', fontWeight: 700, padding: '3px 6px', height: '28px', flex: 1, minWidth: 0 }}
                              >
                                <option value="">-- Elige opción --</option>
                                {fieldOptions.map((opt, oIdx) => {
                                  const optStr = typeof opt === 'string' ? opt : (opt?.label || opt?.value || String(opt || ''));
                                  return <option key={oIdx} value={optStr}>{optStr}</option>;
                                })}
                              </select>
                            ) : (
                              <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Ej. SI, NO..."
                                value={ruleObj.opcion || ''} 
                                onChange={e => handleFillRuleChange(idx, 'opcion', e.target.value)}
                                style={{ fontSize: '0.8rem', fontWeight: 700, padding: '3px 6px', height: '28px', flex: 1, minWidth: 0 }}
                              />
                            )}
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeFillRule(idx)} 
                            style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Eliminar regla"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Texto a colocar */}
                        <div>
                          <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600, marginBottom: '2px', display: 'block' }}>
                            Texto a colocar automáticamente:
                          </label>
                          <textarea 
                            className="form-input" 
                            rows="2"
                            placeholder={`Texto automático para "${ruleObj.opcion || 'esta opción'}" (vacío si el alumno escribe)...`}
                            value={ruleObj.texto || ''} 
                            onChange={e => handleFillRuleChange(idx, 'texto', e.target.value)}
                            style={{ fontSize: '0.8rem', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>

                        {/* Control de edición / bloqueo */}
                        {selectedField.campo_objetivo_llenado && selectedField.campo_objetivo_llenado !== 'self' && (
                          <div style={{ backgroundColor: isLock ? '#f1f5f9' : '#ecfdf5', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${isLock ? '#cbd5e1' : '#a7f3d0'}` }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.74rem', color: isLock ? '#334155' : '#065f46', fontWeight: 700, margin: 0 }}>
                              <input 
                                type="checkbox" 
                                checked={isLock} 
                                onChange={e => handleFillRuleChange(idx, 'bloquear_edicion', e.target.checked)}
                                style={{ width: '14px', height: '14px', accentColor: isLock ? '#475569' : '#059669' }}
                              />
                              {isLock ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Lock size={12} color="#64748b" /> Bloquear casilla destino (Solo Lectura)
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  ✏️ Habilitar casilla destino para edición libre
                                </span>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button 
                    type="button"
                    className="btn" 
                    style={{ width: '100%', border: '1px dashed #059669', color: '#059669', background: '#f0fdf4', fontSize: '0.78rem', padding: '0.5rem', fontWeight: 700, borderRadius: '8px' }} 
                    onClick={addFillRule}
                  >
                    + Añadir Otra Opción de Llenado
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

class PropertiesPanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error in PropertiesPanel:", error, errorInfo);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.selectedField?.id !== this.props.selectedField?.id && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="sidebar-right" style={{ padding: '1.5rem', backgroundColor: '#fff' }}>
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '12px', color: '#991b1b' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, fontSize: '0.9rem' }}>Error al cargar propiedades</h4>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', lineHeight: 1.4 }}>
              Ocurrió un error inesperado al renderizar este campo: {this.state.error?.message}
            </p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })} 
              className="btn btn-sm"
              style={{ backgroundColor: '#dc2626', color: 'white', fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px' }}
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return <PropertiesPanel {...this.props} />;
  }
}

export default PropertiesPanelErrorBoundary;
