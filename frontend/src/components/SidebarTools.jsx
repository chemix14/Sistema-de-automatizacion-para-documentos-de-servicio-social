import React from 'react';
import { Type, Calendar, CheckSquare, AlignLeft, ChevronDown, UploadCloud, Heading } from 'lucide-react';

const fieldTypes = [
  { tipo_campo: 'heading', etiqueta: 'Título / Sección', icon: Heading },
  { tipo_campo: 'text', etiqueta: 'Texto Corto', icon: Type },
  { tipo_campo: 'textarea', etiqueta: 'Texto Largo', icon: AlignLeft },
  { tipo_campo: 'date', etiqueta: 'Fecha', icon: Calendar },
  { tipo_campo: 'select', etiqueta: 'Menú Desplegable', icon: ChevronDown },
  { tipo_campo: 'checkbox', etiqueta: 'Casilla de Verificación', icon: CheckSquare },
  { tipo_campo: 'file', etiqueta: 'Subir Archivo', icon: UploadCloud }
];

function SidebarTools({ onAddField }) {
  return (
    <div className="sidebar-left">
      <div className="sidebar-header">
        Campos Disponibles
      </div>
      <div style={{ padding: '1rem' }}>
        <p style={{fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
          Haz clic para añadir campos al formulario.
        </p>
        
        {fieldTypes.map((field) => {
          const Icon = field.icon;
          return (
            <div 
              key={field.tipo_campo} 
              className="draggable-item"
              onClick={() => onAddField(field)}
              style={{cursor: 'pointer'}}
            >
              <Icon size={18} color="var(--primary)" />
              <span style={{fontWeight: 500, fontSize: '0.9rem'}}>{field.etiqueta}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SidebarTools;
