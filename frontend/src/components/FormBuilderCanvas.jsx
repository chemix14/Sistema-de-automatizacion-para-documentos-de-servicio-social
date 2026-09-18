import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, Trash2, ArrowUp, ArrowDown, UploadCloud, 
  Sparkles, FileSpreadsheet, Lock, AlertCircle, PlusCircle, Check, Image as ImageIcon
} from 'lucide-react';

function getFieldDynamicCanvasState(field, simulatedValues = {}, allFields = []) {
  let isVisible = true;
  let isReadOnly = !!field.solo_lectura;
  let isRequired = !!field.requerido;

  if (field.habilitar_condicion && field.condicion_campo) {
    const targetValue = simulatedValues[field.condicion_campo] || '';
    const expectedValue = field.condicion_valor || '';
    
    let conditionMet = false;
    switch (field.condicion_operador) {
      case 'igual': conditionMet = (String(targetValue).trim().toLowerCase() === String(expectedValue).trim().toLowerCase()); break;
      case 'diferente': conditionMet = (String(targetValue).trim().toLowerCase() !== String(expectedValue).trim().toLowerCase()); break;
      case 'contiene': conditionMet = String(targetValue).toLowerCase().includes(String(expectedValue).toLowerCase()); break;
      case 'mayor': conditionMet = parseFloat(targetValue) > parseFloat(expectedValue); break;
      case 'menor': conditionMet = parseFloat(targetValue) < parseFloat(expectedValue); break;
      default: conditionMet = (String(targetValue).trim().toLowerCase() === String(expectedValue).trim().toLowerCase());
    }

    if (field.condicion_accion === 'ocultar') isVisible = !conditionMet;
    if (field.condicion_accion === 'mostrar') isVisible = conditionMet;
    if (field.condicion_accion === 'deshabilitar') {
      if (conditionMet) isReadOnly = true;
    }
    if (field.condicion_accion === 'habilitar') {
      if (conditionMet) isReadOnly = false;
    }
    if (field.condicion_accion === 'requerir') {
      if (conditionMet) isRequired = true;
    }
  }

  if (allFields && Array.isArray(allFields)) {
    for (const src of allFields) {
      if (src.habilitar_condicion_llenado && Array.isArray(src.reglas_llenado) && src.campo_objetivo_llenado === field.nombre_variable) {
        const srcVal = simulatedValues[src.nombre_variable];
        if (srcVal !== undefined && srcVal !== null && String(srcVal).trim() !== '') {
          const matched = src.reglas_llenado.find(r => 
            String(r.opcion || '').trim().toLowerCase() === String(srcVal).trim().toLowerCase()
          );
          if (matched) {
            if (matched.bloquear_edicion === false || matched.bloquear_edicion === 0) {
              isReadOnly = false;
            } else if (matched.bloquear_edicion === true || matched.bloquear_edicion === 1) {
              isReadOnly = true;
            }
          }
        }
      }
    }
  }

  return { isVisible, isReadOnly, isRequired };
}

const getColumnWidth = (ancho_columna) => {
  switch (ancho_columna) {
    case 'col-md-6': return 'calc(50% - 0.75rem)';
    case 'col-md-4': return 'calc(33.33% - 1rem)';
    case 'col-md-3': return 'calc(25% - 1.125rem)';
    case 'col-12':
    default: 
      return '100%';
  }
};

const getColumnLabel = (ancho_columna) => {
  switch (ancho_columna) {
    case 'col-md-6': return '50%';
    case 'col-md-4': return '33%';
    case 'col-md-3': return '25%';
    default: return '100%';
  }
};

function FilePreviewZone({ field }) {
  const [isDragActive, setIsDragActive] = useState(false);

  return (
    <div 
      onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
      onDragOver={(e) => { e.preventDefault(); if (!isDragActive) setIsDragActive(true); }}
      onDrop={(e) => { e.preventDefault(); setIsDragActive(false); }}
      style={{
        border: `2px dashed ${isDragActive ? '#2563eb' : '#cbd5e1'}`,
        backgroundColor: isDragActive ? '#eff6ff' : '#f8fafc',
        borderRadius: '12px',
        padding: '1.5rem 1rem',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
    >
      <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: isDragActive ? '#dbeafe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.65rem auto', color: isDragActive ? '#2563eb' : '#0284c7' }}>
        <ImageIcon size={24} />
      </div>
      <h4 style={{ margin: '0 0 0.35rem 0', color: '#1e293b', fontSize: '0.9rem', fontWeight: 700 }}>
        Subida de Imagen para Plantilla Excel
      </h4>
      <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.78rem', color: '#64748b' }}>
        Solo imágenes (PNG, JPG, WEBP) • Máx {field.tamano_max_mb || 5} MB
      </p>

      {/* Badges de tamaño y celda de Excel configurados */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
          📐 {field.ancho_imagen || 150} × {field.alto_imagen || 120} px
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', backgroundColor: field.celda_excel ? '#ecfdf5' : '#fef2f2', color: field.celda_excel ? '#065f46' : '#991b1b', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
          📍 Celda: {field.celda_excel ? field.celda_excel.toUpperCase() : 'Sin celda asignada'}
        </span>
      </div>
    </div>
  );
}

function SortableField({ field, isSelected, onSelect, value, onChange, onRemove, onMove, simulatedValues, allFields }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });

  const dynamicState = getFieldDynamicCanvasState(field, simulatedValues, allFields);
  const isHidden = !dynamicState.isVisible;
  const isReadOnly = dynamicState.isReadOnly;
  const isRequired = dynamicState.isRequired;

  const isHeading = field.tipo_campo === 'heading';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    flex: `0 0 ${isHeading ? '100%' : getColumnWidth(field.ancho_columna)}`,
    display: 'flex', 
    flexDirection: 'column',
    opacity: isHidden ? 0.35 : 1, 
    outline: isHidden ? '2px dashed #ef4444' : 'none',
    position: 'relative',
    marginTop: isHeading ? '1.25rem' : '0',
    marginBottom: isHeading ? '0.5rem' : '0',
  };

  const options = field.opciones && field.opciones.length > 0 
    ? field.opciones 
    : (field.placeholder ? field.placeholder.split(',').map(s=>s.trim()) : ['Opción 1', 'Opción 2']);

  const isHorizontal = field.alineacion_opciones === 'horizontal';
  const optionsStyle = {
    display: 'flex', 
    flexDirection: isHorizontal ? 'row' : 'column', 
    flexWrap: isHorizontal ? 'wrap' : 'nowrap',
    gap: isHorizontal ? '1rem' : '0.5rem',
    marginTop: '0.35rem'
  };

  const hasSmartData = field.fuente_contexto && field.fuente_contexto !== 'NINGUNO' && field.fuente_columna;

  const renderInputPreview = () => {
    switch (field.tipo_campo) {
      case 'textarea':
        return (
          <textarea 
            className="form-input" 
            rows="3" 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={field.placeholder || "Simular respuesta del estudiante..."} 
            disabled={isReadOnly}
            style={{ fontSize: '0.88rem', ...(isReadOnly ? { backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' } : {}) }}
          />
        );
      case 'select':
        return (
          <select 
            className="form-select" 
            value={value} 
            onChange={e => onChange(e.target.value)}
            disabled={isReadOnly}
            style={{ fontSize: '0.88rem', ...(isReadOnly ? { backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' } : {}) }}
          >
            <option value="">Seleccionar una opción...</option>
            {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
          </select>
        );
      case 'radio': {
        const radioOpts = (field.opciones && field.opciones.length > 0)
          ? field.opciones
          : ['Opción 1', 'Opción 2', 'Opción 3'];
        const isHoriz = field.alineacion_opciones !== 'vertical';
        return (
          <div style={{
            display: 'flex',
            flexDirection: isHoriz ? 'row' : 'column',
            flexWrap: isHoriz ? 'wrap' : 'nowrap',
            gap: isHoriz ? '0.75rem' : '0.5rem',
            marginTop: '0.4rem'
          }}>
            {radioOpts.map((opt, i) => {
              const optStr = typeof opt === 'string' ? opt : (opt?.label || opt?.value || String(opt || ''));
              const isChecked = value === optStr;
              return (
                <label 
                  key={i} 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.45rem', 
                    fontSize: '0.86rem', 
                    color: isChecked ? '#1e3a8a' : '#1e293b', 
                    cursor: isReadOnly ? 'not-allowed' : 'pointer',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: isChecked ? '#eff6ff' : '#f8fafc',
                    border: isChecked ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input 
                    type="radio" 
                    name={`canvas_${field.id || field.nombre_variable}`}
                    checked={isChecked}
                    onChange={() => onChange(optStr)}
                    disabled={isReadOnly}
                    style={{ width: '15px', height: '15px', accentColor: '#2563eb', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                  /> 
                  <span style={{ fontWeight: isChecked ? 700 : 500 }}>{optStr}</span>
                </label>
              );
            })}
          </div>
        );
      }
      case 'checkbox':
        if (options.length === 0) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <input 
                type="checkbox" 
                name={field.nombre_variable}
                checked={!!value}
                onChange={(e) => onChange(e.target.checked ? (field.placeholder || field.etiqueta || 'Marcado') : '')}
                disabled={isReadOnly}
                style={{ width: '16px', height: '16px', accentColor: '#059669' }}
              />
              <span style={{ fontSize: '0.86rem', color: '#334155' }}>{field.placeholder || field.etiqueta || 'Confirmar'}</span>
            </div>
          );
        }
        return (
          <div style={optionsStyle}>
            {options.map((opt, i) => (
              <label key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.86rem', color: '#1e293b', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  name={field.nombre_variable}
                  checked={value === opt || (Array.isArray(value) && value.includes(opt))}
                  onChange={(e) => onChange(e.target.checked ? opt : '')}
                  disabled={isReadOnly}
                  style={{ width: '15px', height: '15px', accentColor: '#059669' }}
                /> 
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'file':
        return <FilePreviewZone field={field} />;
      case 'heading':
        return null;
      case 'date':
        return (
          <input 
            type="date" 
            className="form-input" 
            value={value || (field.usar_fecha_actual ? new Date().toISOString().split('T')[0] : '')} 
            onChange={e => onChange(e.target.value)} 
            min={field.fecha_minima || ''}
            max={field.fecha_maxima || ''}
            disabled={isReadOnly}
            style={{ fontSize: '0.88rem', ...(isReadOnly ? { backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' } : {}) }}
          />
        );
      default:
        return (
          <input 
            type="text" 
            className="form-input" 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={field.placeholder || "Simular respuesta del estudiante..."} 
            disabled={isReadOnly}
            style={{ fontSize: '0.88rem', ...(isReadOnly ? { backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' } : {}) }}
          />
        );
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`canvas-card-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(field.id)}
    >
      <div style={{
        padding: isHeading ? '0.75rem 1rem' : '1.15rem',
        borderRadius: '14px',
        backgroundColor: isHeading ? 'transparent' : '#ffffff',
        border: isHeading 
          ? (isSelected ? '2px dashed #059669' : '1px dashed #e2e8f0') 
          : (isSelected ? '2px solid #059669' : '1px solid #e2e8f0'),
        boxShadow: isSelected 
          ? '0 0 0 4px rgba(5, 150, 105, 0.12), 0 4px 12px rgba(0,0,0,0.05)' 
          : (isHeading ? 'none' : '0 1px 3px rgba(0,0,0,0.04)'),
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative'
      }}>
        
        {/* Cabecera del campo / Badges de Mapeo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isHeading ? '0.25rem' : '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div 
              {...attributes} 
              {...listeners} 
              style={{ cursor: 'grab', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '2px' }}
              title="Arrastrar para reordenar"
              onPointerDown={(e) => onSelect(field.id)}
            >
              <GripVertical size={16} />
            </div>

            {!isHeading && (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                {field.tipo_campo} • {getColumnLabel(field.ancho_columna)}
              </span>
            )}
          </div>

          {/* Badges de Smart Data & Excel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            {hasSmartData && (
              <span 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  padding: '2px 7px', 
                  borderRadius: '10px', 
                  backgroundColor: '#ecfdf5', 
                  color: '#065f46', 
                  border: '1px solid #a7f3d0', 
                  fontSize: '0.7rem', 
                  fontWeight: 800 
                }}
                title="Sincronizado bidireccionalmente con la base de datos"
              >
                <Sparkles size={11} color="#059669" /> DB: {field.fuente_contexto}.{field.fuente_columna}
              </span>
            )}

            {field.modo_mapeo_excel === 'individual' && field.mapeo_excel_avanzado && field.mapeo_excel_avanzado.length > 0 ? (
              <span 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  padding: '2px 7px', 
                  borderRadius: '10px', 
                  backgroundColor: '#f5f3ff', 
                  color: '#6d28d9', 
                  border: '1px solid #ddd6fe', 
                  fontSize: '0.7rem', 
                  fontWeight: 800 
                }}
                title={`Mapeo individual: ${field.mapeo_excel_avanzado.length} opciones configuradas a celdas`}
              >
                <FileSpreadsheet size={11} color="#7c3aed" /> Multi ({field.mapeo_excel_avanzado.length})
              </span>
            ) : field.celda_excel ? (
              <span 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  padding: '2px 7px', 
                  borderRadius: '10px', 
                  backgroundColor: '#eff6ff', 
                  color: '#1e40af', 
                  border: '1px solid #bfdbfe', 
                  fontSize: '0.7rem', 
                  fontWeight: 800 
                }}
                title="Mapeado a la plantilla Excel oficial (Casilla única)"
              >
                <FileSpreadsheet size={11} color="#2563eb" /> {field.celda_excel}
              </span>
            ) : null}

            {field.habilitar_condicion_llenado && (field.reglas_llenado?.length > 0 || field.campo_objetivo_llenado) && (
              <span 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  padding: '2px 7px', 
                  borderRadius: '10px', 
                  backgroundColor: '#f0fdf4', 
                  color: '#166534', 
                  border: '1px solid #86efac', 
                  fontSize: '0.7rem', 
                  fontWeight: 800 
                }}
                title={field.campo_objetivo_llenado === 'self' || !field.campo_objetivo_llenado
                  ? 'Lógica de llenado condicional activa: asigna texto al valor de este campo'
                  : `Lógica de llenado condicional activa: llena el campo "${field.campo_objetivo_llenado}"`}
              >
                <Sparkles size={11} color="#059669" /> Auto-Texto
              </span>
            )}

            {isRequired && (
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontWeight: 700 }}>
                Obligatorio
              </span>
            )}

            {isReadOnly && (
              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <Lock size={10} /> Lectura
              </span>
            )}
          </div>
        </div>

        {/* Renderizado de etiqueta e input */}
        <div>
          {isHeading ? (
            (() => {
              const Tag = field.tamano_texto || 'h2';
              const fontSizes = { h2: '1.4rem', h3: '1.2rem', h4: '1.05rem' };
              const fontSize = fontSizes[Tag];
              return (
                <div style={{ marginTop: '0.25rem' }}>
                  <Tag style={{ margin: '0 0 0.35rem 0', color: '#064e3b', fontSize: fontSize, fontWeight: 800, letterSpacing: '-0.3px' }}>
                    {field.etiqueta || 'Título de Sección'}
                  </Tag>
                  {field.texto_ayuda && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
                      {field.texto_ayuda}
                    </p>
                  )}
                  <hr style={{ border: 'none', borderBottom: '2px solid #e2e8f0', margin: '0.75rem 0 0 0' }} />
                </div>
              );
            })()
          ) : (
            <>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                {field.etiqueta || 'Campo sin etiqueta'} {field.requerido && <span style={{ color: '#ef4444' }}>*</span>}
              </label>

              {field.texto_ayuda && (
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem', lineHeight: 1.35 }}>
                  {field.texto_ayuda}
                </div>
              )}

              {renderInputPreview()}
            </>
          )}
        </div>

        {/* Toolbar flotante al estar seleccionado */}
        {isSelected && (
          <div style={{ 
            position: 'absolute', 
            top: '-14px', 
            right: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.2rem', 
            background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', 
            borderRadius: '8px', 
            padding: '3px 6px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 20
          }}>
            <button 
              onClick={(e) => { e.stopPropagation(); onMove(field.id, 'up'); }} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: '#a7f3d0', display: 'flex', alignItems: 'center' }} 
              title="Mover arriba"
            >
              <ArrowUp size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onMove(field.id, 'down'); }} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: '#a7f3d0', display: 'flex', alignItems: 'center' }} 
              title="Mover abajo"
            >
              <ArrowDown size={14} />
            </button>
            <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)', margin: '0 2px' }}></div>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(field.id); }} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: '#fca5a5', display: 'flex', alignItems: 'center' }} 
              title="Eliminar campo"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FormBuilderCanvas({ fields, selectedFieldId, onSelectField, simulatedValues, onSimulateChange, onRemoveField, onMoveField }) {
  if (fields.length === 0) {
    return (
      <div style={{
        minHeight: '450px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed #cbd5e1',
        borderRadius: '16px',
        padding: '3rem 2rem',
        backgroundColor: '#fafbfc',
        textAlign: 'center'
      }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '18px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <PlusCircle size={32} />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          El formulario está vacío
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '380px', lineHeight: 1.5, margin: 0 }}>
          Haz clic en cualquier tipo de campo de la <strong>Paleta Izquierda</strong> para comenzar a estructurar tu formato oficial.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', paddingBottom: '3rem' }}>
      {fields.map(field => {
        return (
          <SortableField 
            key={field.id} 
            field={field} 
            isSelected={selectedFieldId === field.id}
            onSelect={onSelectField}
            value={simulatedValues[field.nombre_variable] || ''}
            onChange={(val) => onSimulateChange(field.nombre_variable, val)}
            onRemove={onRemoveField}
            onMove={onMoveField}
            simulatedValues={simulatedValues}
            allFields={fields}
          />
        );
      })}
    </div>
  );
}

export default FormBuilderCanvas;
