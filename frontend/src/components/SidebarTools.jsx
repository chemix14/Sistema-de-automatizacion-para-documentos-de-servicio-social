import React from 'react';
import { 
  Type, Calendar, CheckSquare, AlignLeft, ChevronDown, 
  UploadCloud, Image, Heading, Plus, Sparkles, LayoutGrid, CircleDot
} from 'lucide-react';

const fieldCategories = [
  {
    category: 'Estructura & Separadores',
    items: [
      { 
        tipo_campo: 'heading', 
        etiqueta: 'Título / Sección', 
        desc: 'Organiza el formulario por apartados', 
        icon: Heading, 
        color: '#059669',
        bgColor: '#ecfdf5' 
      },
    ]
  },
  {
    category: 'Campos de Texto',
    items: [
      { 
        tipo_campo: 'text', 
        etiqueta: 'Texto Corto', 
        desc: 'Nombres, códigos, correos, etc.', 
        icon: Type, 
        color: '#2563eb',
        bgColor: '#eff6ff' 
      },
      { 
        tipo_campo: 'textarea', 
        etiqueta: 'Área de Texto', 
        desc: 'Descripciones, objetivos y justificaciones', 
        icon: AlignLeft, 
        color: '#0891b2',
        bgColor: '#ecfeff' 
      },
    ]
  },
  {
    category: 'Selección y Fechas',
    items: [
      { 
        tipo_campo: 'radio', 
        etiqueta: 'Opción Múltiple', 
        desc: 'Preguntas con opciones en horizontal', 
        icon: CircleDot, 
        color: '#6366f1',
        bgColor: '#eef2ff',
        alineacion_opciones: 'horizontal',
        opciones: ['Opción 1', 'Opción 2', 'Opción 3'],
        modo_mapeo_excel: 'unica'
      },
      { 
        tipo_campo: 'select', 
        etiqueta: 'Menú Desplegable', 
        desc: 'Seleccionar una opción de una lista', 
        icon: ChevronDown, 
        color: '#8b5cf6',
        bgColor: '#f5f3ff' 
      },
      { 
        tipo_campo: 'date', 
        etiqueta: 'Fecha Oficial', 
        desc: 'Selector de fecha estándar', 
        icon: Calendar, 
        color: '#f59e0b',
        bgColor: '#fffbeb' 
      },
      { 
        tipo_campo: 'checkbox', 
        etiqueta: 'Casilla de Verificación', 
        desc: 'Opciones múltiples o confirmaciones SI / NO', 
        icon: CheckSquare, 
        color: '#10b981',
        bgColor: '#ecfdf5' 
      },
    ]
  },
  {
    category: 'Imágenes & Plantilla Excel',
    items: [
      { 
        tipo_campo: 'file', 
        etiqueta: 'Subida de Imagen', 
        desc: 'Fotografías, firmas o sellos para incrustar en Excel', 
        icon: Image, 
        color: '#0284c7',
        bgColor: '#f0f9ff',
        extensiones_permitidas: '.png, .jpg, .jpeg, .webp',
        tamano_max_mb: 5,
        ancho_imagen: 150,
        alto_imagen: 120
      }
    ]
  }
];

function SidebarTools({ onAddField }) {
  return (
    <div className="sidebar-left" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff', width: '290px' }}>
      <div className="sidebar-header" style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', color: 'white', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LayoutGrid size={18} color="#6ee7b7" />
          <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.2px' }}>Paleta de Campos</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1rem' }}>
        <div style={{ padding: '0.65rem 0.85rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Sparkles size={16} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
          <p style={{ fontSize: '0.78rem', color: '#065f46', margin: 0, lineHeight: 1.4 }}>
            Haz clic en cualquier elemento para insertarlo de inmediato en tu formulario.
          </p>
        </div>

        {fieldCategories.map((group, gIdx) => (
          <div key={gIdx} style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#64748b', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
              {group.category}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {group.items.map((field) => {
                const Icon = field.icon;
                return (
                  <div
                    key={field.tipo_campo}
                    onClick={() => onAddField(field)}
                    className="tool-card-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = field.color;
                      e.currentTarget.style.backgroundColor = '#fbfcfe';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.03)';
                    }}
                  >
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: field.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: field.color,
                      flexShrink: 0
                    }}>
                      <Icon size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {field.etiqueta}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {field.desc}
                      </div>
                    </div>

                    <div style={{ color: '#cbd5e1' }}>
                      <Plus size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SidebarTools;
