import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ArrowUp, ArrowDown, UploadCloud } from 'lucide-react';

function evaluateCondition(field, simulatedValues) {
  if (!field.habilitar_condicion || !field.condicion_campo) return true;

  const targetValue = simulatedValues[field.condicion_campo] || '';
  const expectedValue = field.condicion_valor || '';
  
  let conditionMet = false;
  switch (field.condicion_operador) {
    case 'igual': conditionMet = (targetValue === expectedValue); break;
    case 'diferente': conditionMet = (targetValue !== expectedValue); break;
    case 'contiene': conditionMet = targetValue.includes(expectedValue); break;
    case 'mayor': conditionMet = parseFloat(targetValue) > parseFloat(expectedValue); break;
    case 'menor': conditionMet = parseFloat(targetValue) < parseFloat(expectedValue); break;
    default: conditionMet = (targetValue === expectedValue);
  }

  if (field.condicion_accion === 'ocultar') return !conditionMet;
  if (field.condicion_accion === 'mostrar') return conditionMet;
  
  return true; 
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

function FilePreviewZone({ field }) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    // En el builder solo simulamos, no procesamos el archivo real.
  };

  return (
    <div 
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--border-color)'}`,
        backgroundColor: isDragActive ? '#f0f9ff' : '#f8fafc',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
    >
      <UploadCloud size={40} color={isDragActive ? 'var(--primary)' : 'var(--text-muted)'} style={{ marginBottom: '1rem' }} />
      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
        Arrastra y suelta tu archivo aquí o haz clic para explorar
      </h4>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {field.extensiones_permitidas ? `Formatos permitidos: ${field.extensiones_permitidas}` : 'Cualquier formato permitido'} 
        {field.tamano_max_mb ? ` (Máx ${field.tamano_max_mb}MB)` : ''}
      </p>
    </div>
  );
}

function SortableField({ field, isSelected, onSelect, value, onChange, isHidden, onRemove, onMove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });

  const isHeading = field.tipo_campo === 'heading';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    flex: `0 0 ${isHeading ? '100%' : getColumnWidth(field.ancho_columna)}`,
    display: 'flex', 
    flexDirection: 'column',
    opacity: isHidden ? 0.3 : 1, 
    outline: isHidden ? '2px dashed var(--danger)' : 'none',
    position: 'relative',
    backgroundColor: isHeading ? 'transparent' : undefined,
    boxShadow: isHeading ? 'none' : undefined,
    border: isHeading ? 'none' : undefined,
    padding: isHeading ? '0' : undefined,
    marginTop: isHeading ? '1.5rem' : undefined,
    marginBottom: isHeading ? '0' : undefined,
  };

  const options = field.opciones && field.opciones.length > 0 
    ? field.opciones 
    : (field.placeholder ? field.placeholder.split(',').map(s=>s.trim()) : ['Opción 1', 'Opción 2']);

  const isHorizontal = field.alineacion_opciones === 'horizontal';
  const optionsStyle = {
    display: 'flex', 
    flexDirection: isHorizontal ? 'row' : 'column', 
    flexWrap: isHorizontal ? 'wrap' : 'nowrap',
    gap: isHorizontal ? '1rem' : '0.5rem'
  };

  const renderInputPreview = () => {
    switch (field.tipo_campo) {
      case 'textarea':
        return <textarea className="form-input" rows="3" value={value} onChange={e => onChange(e.target.value)} placeholder="Simular valor..." />;
      case 'select':
        return (
          <select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
            <option value="">Seleccionar...</option>
            {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
          </select>
        );
      case 'radio':
      case 'checkbox':
        return (
          <div style={optionsStyle}>
            {options.map((opt, i) => (
              <label key={i} style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                <input 
                  type={field.tipo_campo} 
                  name={field.nombre_variable}
                  checked={value === opt || (Array.isArray(value) && value.includes(opt))}
                  onChange={(e) => onChange(e.target.checked ? opt : '')}
                /> 
                <span style={{color: 'var(--text-main)'}}>{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'file':
        return <FilePreviewZone field={field} />;
      case 'heading':
        return null; // Heading doesn't have an input, just the label structure
      case 'date':
        return (
          <input 
            type="date" 
            className="form-input" 
            value={value || (field.usar_fecha_actual ? new Date().toISOString().split('T')[0] : '')} 
            onChange={e => onChange(e.target.value)} 
            min={field.fecha_minima || ''}
            max={field.fecha_maxima || ''}
          />
        );
      default:
        return <input type="text" className="form-input" value={value} onChange={e => onChange(e.target.value)} placeholder="Simular valor..." />;
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`canvas-field ${isSelected ? 'selected' : ''} ${isHeading ? 'canvas-field-heading' : ''}`}
      onClick={() => onSelect(field.id)}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div 
          {...attributes} 
          {...listeners} 
          style={{ cursor: 'grab', padding: '0.5rem', marginTop: '-0.25rem', color: 'var(--text-muted)' }}
          onPointerDown={(e) => onSelect(field.id)}
        >
          <GripVertical size={20} />
        </div>
        
        <div style={{ flex: 1 }}>
          {field.tipo_campo === 'heading' ? (
            (() => {
              const Tag = field.tamano_texto || 'h2';
              const fontSizes = { h2: '1.5rem', h3: '1.25rem', h4: '1.1rem' };
              const fontSize = fontSizes[Tag];
              return (
                <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                  <Tag style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: fontSize, fontWeight: 600 }}>
                    {field.etiqueta || 'Título de Sección'}
                  </Tag>
                  {field.texto_ayuda && (
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {field.texto_ayuda}
                    </p>
                  )}
                  <hr style={{ border: 'none', borderBottom: '2px solid var(--border-color)', margin: '1rem 0 0 0' }} />
                </div>
              );
            })()
          ) : (
            <>
              <div style={{marginBottom: '0.5rem', fontWeight: 500}}>
                {field.etiqueta} {field.requerido && <span style={{color: 'var(--danger)'}}>*</span>}
                {isHidden && <span style={{marginLeft: '1rem', fontSize: '0.75rem', background: 'var(--danger)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px'}}>Oculto por Condición</span>}
              </div>
              
              {field.texto_ayuda && (
                <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem'}}>
                  {field.texto_ayuda}
                </div>
              )}
              
              {renderInputPreview()}
            </>
          )}
        </div>
      </div>

      {isSelected && (
        <div style={{ position: 'absolute', top: '-12px', right: '10px', display: 'flex', gap: '0.25rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
          <button onClick={(e) => { e.stopPropagation(); onMove(field.id, 'up'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }} title="Mover Arriba">
            <ArrowUp size={16} color="var(--text-main)" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMove(field.id, 'down'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }} title="Mover Abajo">
            <ArrowDown size={16} color="var(--text-main)" />
          </button>
          <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 4px' }}></div>
          <button onClick={(e) => { e.stopPropagation(); onRemove(field.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }} title="Eliminar Campo">
            <Trash2 size={16} color="var(--danger)" />
          </button>
        </div>
      )}
    </div>
  );
}

function FormBuilderCanvas({ fields, selectedFieldId, onSelectField, simulatedValues, onSimulateChange, onRemoveField, onMoveField }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', paddingBottom: '2rem' }}>
      {fields.map(field => {
        const isVisible = evaluateCondition(field, simulatedValues);
        return (
          <SortableField 
            key={field.id} 
            field={field} 
            isSelected={selectedFieldId === field.id}
            onSelect={onSelectField}
            value={simulatedValues[field.nombre_variable] || ''}
            onChange={(val) => onSimulateChange(field.nombre_variable, val)}
            isHidden={!isVisible}
            onRemove={onRemoveField}
            onMove={onMoveField}
          />
        );
      })}
    </div>
  );
}

export default FormBuilderCanvas;
