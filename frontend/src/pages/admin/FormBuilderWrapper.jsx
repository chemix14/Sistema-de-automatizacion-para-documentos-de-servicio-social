import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import FormBuilderCanvas from '../../components/FormBuilderCanvas';
import PropertiesPanel from '../../components/PropertiesPanel';
import SidebarTools from '../../components/SidebarTools';
import { Save } from 'lucide-react';

function FormBuilderWrapper() {
  const [formFields, setFormFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [simulatedValues, setSimulatedValues] = useState({});
  const [formName, setFormName] = useState('Nuevo Formulario');
  const [formDescription, setFormDescription] = useState('');
  const [etapa, setEtapa] = useState('INICIAL');
  const [plantillaFile, setPlantillaFile] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('docId');

  useEffect(() => {
    if (id) {
      fetch(`http://127.0.0.1:5000/api/forms/${id}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setFormName(data.nombre || 'Formulario');
            setFormDescription(data.descripcion || '');
            
            let fields = [];
            if (data.secciones) {
              data.secciones.sort((a, b) => a.orden - b.orden).forEach((sec, sIdx) => {
                if (sec.titulo && sec.titulo !== 'Sección Única') {
                  fields.push({
                    id: `heading_sec_${sec.id_seccion}`,
                    nombre_variable: `heading_sec_${sec.id_seccion}`,
                    tipo_campo: 'heading',
                    etiqueta: sec.titulo,
                    texto_ayuda: sec.descripcion,
                    ancho_columna: 'col-12',
                    orden: (sIdx * 1000)
                  });
                }
                if (sec.campos) {
                  fields = fields.concat(sec.campos.map(c => ({
                    ...c,
                    id: `field_${c.id_campo}`,
                    opciones: c.opciones_json ? JSON.parse(c.opciones_json) : [],
                    habilitar_condicion: !!c.condicion_campo,
                    orden: (sIdx * 1000) + c.orden
                  })));
                }
              });
            }
            if (data.campos_sin_seccion) {
              fields = fields.concat(data.campos_sin_seccion.map(c => ({
                ...c,
                id: `field_${c.id_campo}`,
                opciones: c.opciones_json ? JSON.parse(c.opciones_json) : [],
                habilitar_condicion: !!c.condicion_campo,
                orden: 999000 + c.orden
              })));
            }
            fields.sort((a, b) => a.orden - b.orden);
            setFormFields(fields);
          }
        });
    }
  }, [id]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      setFormFields((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddField = (fieldConfig) => {
    const newField = {
      ...fieldConfig,
      id: `field_${Date.now()}`,
      nombre_variable: `var_${Date.now()}`,
      requerido: false
    };
    setFormFields([...formFields, newField]);
  };

  const updateField = (f_id, newProps) => {
    setFormFields(formFields.map(f => f.id === f_id ? { ...f, ...newProps } : f));
  };

  const handleSimulateChange = (variableName, value) => {
    setSimulatedValues(prev => ({ ...prev, [variableName]: value }));
  };

  const handleRemoveField = (f_id) => {
    setFormFields(formFields.filter(f => f.id !== f_id));
    if (selectedFieldId === f_id) setSelectedFieldId(null);
  };

  const handleMoveField = (f_id, direction) => {
    setFormFields(items => {
      const index = items.findIndex(item => item.id === f_id);
      if (index === -1) return items;
      if (direction === 'up' && index > 0) {
        const newItems = [...items];
        [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        return newItems;
      }
      if (direction === 'down' && index < items.length - 1) {
        const newItems = [...items];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        return newItems;
      }
      return items;
    });
  };

  const selectedField = formFields.find(f => f.id === selectedFieldId);

  const saveForm = async () => {
    if (!formName) {
      Swal.fire('Error', 'El formulario debe tener un nombre', 'error');
      return;
    }

    if (!id && !docId && !plantillaFile) {
      Swal.fire('Error', 'Debes subir una plantilla (Excel o Word) obligatoriamente para crear un documento nuevo.', 'error');
      return;
    }

    const esquema = {
      descripcion: formDescription,
      tipo_formulario: 'CON_CAMPOS',
      secciones: [
        {
          titulo: 'Sección Única',
          orden: 1,
          campos: formFields.map((f, idx) => {
            const base = {
              nombre_variable: f.nombre_variable,
              etiqueta: f.etiqueta,
              tipo_campo: f.tipo_campo,
              ancho_columna: f.ancho_columna || 'col-12',
              requerido: f.requerido ? 1 : 0,
              texto_ayuda: f.texto_ayuda || null,
              orden: idx + 1,
              celda_excel: f.celda_excel,
              fuente_contexto: f.fuente_contexto || 'NINGUNO',
              fuente_columna: f.fuente_columna || null
            };
            if (f.tipo_campo === 'heading') {
              return { ...base, tipo_campo: 'heading', etiqueta: f.etiqueta };
            }
            if (['select', 'radio', 'checkbox'].includes(f.tipo_campo)) {
              return { ...base, opciones: f.opciones || [] };
            }
            return base;
          })
        }
      ]
    };

    const formData = new FormData();
    if (plantillaFile) {
      formData.append('plantilla', plantillaFile);
    }
    if (docId) {
      formData.append('id_documento', docId);
    }
    formData.append('etapa', etapa);
    formData.append('nombre', formName);
    formData.append('esquema', JSON.stringify(esquema));

    const method = id ? 'PUT' : 'POST';
    const url = id ? `http://127.0.0.1:5000/api/forms/${id}` : `http://127.0.0.1:5000/api/forms/`;

    fetch(url, {
      method,
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        Swal.fire('Guardado', 'Formulario guardado correctamente', 'success').then(() => {
          navigate('/admin/formularios');
        });
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(err => {
      Swal.fire('Error', 'No se pudo conectar al servidor', 'error');
    });
  };

  return (
    <div className="app-container" style={{ height: '100vh', display: 'flex' }}>
      <SidebarTools onAddField={handleAddField} />
      <div className="canvas-area" style={{ flex: 1, display: 'block', backgroundColor: '#f1f5f9', overflowY: 'auto' }}>
        <div className="header-toolbar" style={{ margin: '0 auto', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 2rem', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                value={formName} 
                onChange={e => setFormName(e.target.value)}
                style={{ fontSize: '1.25rem', fontWeight: 'bold', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '0.2rem', width: '300px' }}
                placeholder="Nombre del Formulario"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => navigate('/admin/formularios')} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', color: '#475569', fontWeight: 600, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              <button className="btn btn-primary glass" onClick={saveForm} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', fontWeight: 600, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                <Save size={18} /> Guardar
              </button>
            </div>
          </div>
          
          {!docId && !id && (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#475569', margin: 0 }}>Etapa Institucional:</label>
                <select value={etapa} onChange={e => setEtapa(e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '0.875rem', outline: 'none' }}>
                  <option value="INICIAL">INICIAL</option>
                  <option value="BIMESTRE_1">BIMESTRE 1</option>
                  <option value="BIMESTRE_2">BIMESTRE 2</option>
                  <option value="BIMESTRE_3">BIMESTRE 3</option>
                  <option value="FINAL">FINAL</option>
                </select>
              </div>
              <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#475569', margin: 0 }}>Plantilla Oficial (Word/Excel):</label>
                <input type="file" onChange={e => setPlantillaFile(e.target.files[0])} accept=".xlsx,.docx" style={{ fontSize: '0.875rem', color: '#64748b' }} />
              </div>
            </div>
          )}
          {(docId || id) && (
            <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid #bbf7d0' }}>
              Documento Oficial Vinculado
            </div>
          )}
        </div>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="form-canvas">
            <SortableContext items={formFields} strategy={verticalListSortingStrategy}>
              <FormBuilderCanvas 
                fields={formFields} 
                selectedFieldId={selectedFieldId}
                onSelectField={setSelectedFieldId}
                simulatedValues={simulatedValues}
                onSimulateChange={handleSimulateChange}
                onRemoveField={handleRemoveField}
                onMoveField={handleMoveField}
              />
            </SortableContext>
            {formFields.length === 0 && (
              <div style={{textAlign: 'center', color: '#94a3b8', marginTop: '4rem'}}>
                <p>Arrastra campos aquí o haz clic en la barra lateral para agregarlos.</p>
              </div>
            )}
          </div>
        </DndContext>
      </div>

      {/* Columna 3: Propiedades */}
      <PropertiesPanel 
        selectedField={selectedField} 
        onUpdateField={updateField} 
        allFields={formFields}
      />
    </div>
  );
}

export default FormBuilderWrapper;
