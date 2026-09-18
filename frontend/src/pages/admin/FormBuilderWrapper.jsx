import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import FormBuilderCanvas from '../../components/FormBuilderCanvas';
import PropertiesPanel from '../../components/PropertiesPanel';
import SidebarTools from '../../components/SidebarTools';
import { Save, ArrowLeft, FileText, CheckCircle2, Sparkles, FolderKanban } from 'lucide-react';

function FormBuilderWrapper() {
  const [formFields, setFormFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [simulatedValues, setSimulatedValues] = useState({});
  const [formName, setFormName] = useState('Nuevo Formulario');
  const [formDescription, setFormDescription] = useState('');
  const [etapa, setEtapa] = useState('APERTURA');
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
            setFormName(data.nombre || data.titulo || data.nombre_documento || 'Formulario');
            setFormDescription(data.descripcion || '');
            if (data.etapa) {
              setEtapa(data.etapa.toUpperCase());
            }
            
            let rawCampos = [];
            if (data.secciones && data.secciones.length > 0) {
              data.secciones.sort((a, b) => (a.orden || 0) - (b.orden || 0)).forEach((sec, sIdx) => {
                const hasHeadingAlready = sec.campos && sec.campos.some(c => c.tipo_campo === 'heading');
                if (sec.titulo && sec.titulo !== 'Sección Única' && !hasHeadingAlready) {
                  rawCampos.push({
                    id_campo: `sec_${sec.id_seccion || sIdx}`,
                    tipo_campo: 'heading',
                    etiqueta: sec.titulo,
                    texto_ayuda: sec.descripcion || '',
                    ancho_columna: 'col-12',
                    orden: (sIdx * 1000)
                  });
                }
                if (sec.campos) {
                  sec.campos.forEach(c => {
                    rawCampos.push({
                      ...c,
                      orden: (sIdx * 1000) + (c.orden || 0)
                    });
                  });
                }
              });
            }
            if (data.campos_sin_seccion) {
              data.campos_sin_seccion.forEach(c => {
                rawCampos.push({
                  ...c,
                  orden: 999000 + (c.orden || 0)
                });
              });
            }

            rawCampos.sort((a, b) => (a.orden || 0) - (b.orden || 0));

            const fields = rawCampos.map(c => {
              let parsedOptions = [];
              if (c.opciones_json) {
                try {
                  parsedOptions = typeof c.opciones_json === 'string' ? JSON.parse(c.opciones_json) : c.opciones_json;
                } catch(e) {
                  parsedOptions = [];
                }
              }
              let parsedMapeoAvanzado = [];
              if (c.mapeo_excel_avanzado) {
                try {
                  parsedMapeoAvanzado = typeof c.mapeo_excel_avanzado === 'string' ? JSON.parse(c.mapeo_excel_avanzado) : c.mapeo_excel_avanzado;
                } catch(e) {
                  parsedMapeoAvanzado = [];
                }
              }
              let parsedReglas = { habilitar: false, campo_objetivo: 'self', reglas: [] };
              if (c.reglas_transformacion) {
                try {
                  parsedReglas = typeof c.reglas_transformacion === 'string' ? JSON.parse(c.reglas_transformacion) : c.reglas_transformacion;
                } catch(e) {
                  parsedReglas = { habilitar: false, campo_objetivo: 'self', reglas: [] };
                }
              }

              return {
                ...c,
                id: c.id ? c.id : (c.id_campo ? `field_${c.id_campo}` : `field_${c.nombre_variable || Date.now()}`),
                opciones: parsedOptions,
                mapeo_excel_avanzado: parsedMapeoAvanzado,
                habilitar_condicion: !!c.habilitar_condicion,
                condicion_campo: c.condicion_campo || '',
                condicion_operador: c.condicion_operador || 'igual',
                condicion_valor: c.condicion_valor || '',
                condicion_accion: c.condicion_accion || 'mostrar',
                habilitar_condicion_llenado: !!(parsedReglas?.habilitar),
                campo_objetivo_llenado: parsedReglas?.campo_objetivo || c.campo_objetivo || 'self',
                reglas_llenado: Array.isArray(parsedReglas?.reglas) ? parsedReglas.reglas : [],
                requerido: !!c.requerido,
                solo_lectura: !!c.solo_lectura,
                usar_fecha_actual: !!c.usar_fecha_actual,
                etiqueta: c.etiqueta || (c.tipo_campo === 'heading' ? 'Título de Sección' : ''),
                texto_ayuda: c.texto_ayuda || '',
                tamano_texto: c.tamano_texto || 'h2',
                ancho_columna: c.ancho_columna || (c.tipo_campo === 'heading' ? 'col-12' : 'col-md-6'),
                fuente_contexto: c.tabla_origen || c.fuente_contexto || 'NINGUNO',
                fuente_columna: c.columna_origen || c.fuente_columna || '',
                alineacion_opciones: c.alineacion_opciones || (c.tipo_campo === 'radio' ? 'horizontal' : 'vertical'),
                modo_mapeo_excel: c.modo_mapeo_excel || (parsedMapeoAvanzado.length > 0 && !c.celda_excel ? 'individual' : 'unica'),
                ancho_imagen: c.ancho_imagen || 150,
                alto_imagen: c.alto_imagen || 120,
                extensiones_permitidas: c.extensiones_permitidas || (c.tipo_campo === 'file' ? '.jpg, .jpeg, .png, .webp' : ''),
                tamano_max_mb: c.tamano_max_mb || 5
              };
            });
            setFormFields(fields);
          }
        });
    }
  }, [id]);

  useEffect(() => {
    if (docId && !id) {
      fetch(`http://127.0.0.1:5000/api/forms/documento/${docId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            if (data.nombre_documento) {
              setFormName(data.nombre_documento);
            }
            if (data.etapa) {
              setEtapa(data.etapa.toUpperCase());
            }
          }
        })
        .catch(err => console.error("Error cargando documento:", err));
    }
  }, [docId, id]);

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
      nombre_variable: fieldConfig.tipo_campo === 'heading' ? `heading_${Date.now()}` : `var_${Date.now()}`,
      etiqueta: fieldConfig.etiqueta || (fieldConfig.tipo_campo === 'heading' ? 'Título de Sección' : 'Nuevo Campo'),
      texto_ayuda: '',
      ancho_columna: fieldConfig.tipo_campo === 'heading' ? 'col-12' : 'col-md-6',
      requerido: false,
      solo_lectura: false,
      fuente_contexto: 'NINGUNO',
      fuente_columna: '',
      tamano_texto: 'h2',
      alineacion_opciones: fieldConfig.alineacion_opciones || (fieldConfig.tipo_campo === 'radio' ? 'horizontal' : 'vertical'),
      celda_excel: '',
      modo_mapeo_excel: fieldConfig.modo_mapeo_excel || 'unica',
      mapeo_excel_avanzado: fieldConfig.mapeo_excel_avanzado || [],
      opciones: fieldConfig.opciones || (['select', 'radio', 'checkbox'].includes(fieldConfig.tipo_campo) ? ['Opción 1', 'Opción 2', 'Opción 3'] : []),
      ancho_imagen: fieldConfig.ancho_imagen || 150,
      alto_imagen: fieldConfig.alto_imagen || 120,
      extensiones_permitidas: fieldConfig.tipo_campo === 'file' ? '.jpg, .jpeg, .png, .webp' : (fieldConfig.extensiones_permitidas || ''),
      tamano_max_mb: fieldConfig.tamano_max_mb || 5,
      habilitar_condicion_llenado: false,
      campo_objetivo_llenado: 'self',
      reglas_llenado: []
    };
    setFormFields([...formFields, newField]);
  };

  const updateField = (f_id, newProps) => {
    setFormFields(formFields.map(f => f.id === f_id ? { ...f, ...newProps } : f));
  };

  const handleSimulateChange = (variableName, value) => {
    setSimulatedValues(prev => {
      let next = { ...prev, [variableName]: value };
      
      const sourceField = formFields.find(f => f.nombre_variable === variableName);
      if (sourceField && sourceField.habilitar_condicion_llenado && Array.isArray(sourceField.reglas_llenado)) {
        const valStr = String(value || '').trim().toLowerCase();
        const matched = sourceField.reglas_llenado.find(r => 
          String(r.opcion || '').trim().toLowerCase() === valStr
        );
        const targetVar = sourceField.campo_objetivo_llenado;
        if (matched && targetVar && targetVar !== 'self') {
          next[targetVar] = matched.texto !== undefined ? matched.texto : '';
        }
      }
      return next;
    });
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
      titulo: formName,
      descripcion: formDescription,
      tipo_formulario: 'CON_CAMPOS',
      secciones: [
        {
          titulo: 'Sección Única',
          orden: 1,
          campos: (() => {
            const usedVars = new Set();
            return formFields.map((f, idx) => {
              let cleanVar = String(f.nombre_variable || `var_${idx + 1}`)
                .trim()
                .toUpperCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^A-Z0-9_]/g, '_')
                .substring(0, 80)
                .replace(/_+$/, '');
              if (!cleanVar) cleanVar = `VAR_${idx + 1}`;

              let finalVar = cleanVar;
              let suffix = 1;
              while (usedVars.has(finalVar)) {
                suffix++;
                finalVar = `${cleanVar.substring(0, 74)}_${suffix}`;
              }
              usedVars.add(finalVar);

              return {
                nombre_variable: finalVar,
                etiqueta: f.etiqueta || (f.tipo_campo === 'heading' ? 'Título de Sección' : `Campo ${idx + 1}`),
              tipo_campo: f.tipo_campo || 'text',
              placeholder: f.placeholder || null,
              texto_ayuda: f.texto_ayuda || null,
              tamano_texto: f.tamano_texto || 'h2',
              ancho_columna: f.tipo_campo === 'heading' ? 'col-12' : (f.ancho_columna || 'col-md-6'),
              requerido: f.requerido ? 1 : 0,
              solo_lectura: f.solo_lectura ? 1 : 0,
              orden: idx + 1,
              celda_excel: (f.modo_mapeo_excel === 'individual') ? null : (f.celda_excel || null),
              modo_mapeo_excel: f.modo_mapeo_excel || ((f.mapeo_excel_avanzado?.length > 0 && !f.celda_excel) ? 'individual' : 'unica'),
              fuente_contexto: f.fuente_contexto || 'NINGUNO',
              fuente_columna: f.fuente_columna || null,
              opciones: f.opciones || [],
              alineacion_opciones: f.alineacion_opciones || (f.tipo_campo === 'radio' ? 'horizontal' : 'vertical'),
              extensiones_permitidas: f.tipo_campo === 'file' ? (f.extensiones_permitidas || '.jpg, .jpeg, .png, .webp') : (f.extensiones_permitidas || null),
              tamano_max_mb: f.tamano_max_mb || null,
              ancho_imagen: f.ancho_imagen || 150,
              alto_imagen: f.alto_imagen || 120,
              usar_fecha_actual: f.usar_fecha_actual ? 1 : 0,
              fecha_minima: f.fecha_minima || null,
              fecha_maxima: f.fecha_maxima || null,
              mapeo_excel_avanzado: (f.modo_mapeo_excel === 'unica') ? [] : (f.mapeo_excel_avanzado || []),
              habilitar_condicion: f.habilitar_condicion ? 1 : 0,
              condicion_campo: f.condicion_campo || null,
              condicion_operador: f.condicion_operador || 'igual',
              condicion_valor: f.condicion_valor || null,
              condicion_accion: f.condicion_accion || 'mostrar',
              reglas_transformacion: JSON.stringify({
                habilitar: f.habilitar_condicion_llenado ? 1 : 0,
                campo_objetivo: f.campo_objetivo_llenado || 'self',
                reglas: f.reglas_llenado || []
              }),
              campo_objetivo: f.campo_objetivo_llenado || null,
              habilitar_condicion_llenado: f.habilitar_condicion_llenado ? 1 : 0
            };
          });
        })()
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
    <div className="app-container" style={{ height: '100vh', display: 'flex', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
      
      {/* 1. Columna Izquierda: Paleta de Herramientas */}
      <SidebarTools onAddField={handleAddField} />

      {/* 2. Columna Central: Lienzo de Trabajo */}
      <div className="canvas-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f1f5f9', overflowY: 'auto', padding: '1.25rem 2rem' }}>
        
        {/* Barra Superior Flotante del Formulario */}
        <div style={{
          width: '100%',
          maxWidth: '1050px',
          margin: '0 auto 1.5rem auto',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.05)',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px' }}>
              <button 
                onClick={() => navigate('/admin/formularios')} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#64748b', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  fontSize: '0.85rem', 
                  fontWeight: 700,
                  padding: '0.4rem 0.6rem',
                  borderRadius: '8px'
                }}
                className="hover:bg-slate-100"
                title="Regresar a Gestión de Formularios"
              >
                <ArrowLeft size={16} /> Volver
              </button>

              <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0' }}></div>

              <div style={{ flex: 1 }}>
                <input 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)}
                  style={{ 
                    fontSize: '1.35rem', 
                    fontWeight: 800, 
                    border: 'none', 
                    borderBottom: '2px solid #059669', 
                    padding: '0.2rem 0.5rem', 
                    width: '100%', 
                    color: '#0f172a', 
                    outline: 'none', 
                    backgroundColor: '#f8fafc', 
                    borderRadius: '6px 6px 0 0',
                    letterSpacing: '-0.3px'
                  }}
                  placeholder="Escribe el nombre oficial del formulario..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button 
                onClick={() => navigate('/admin/formularios')} 
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.1rem', fontSize: '0.88rem', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={saveForm}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.6rem 1.4rem', 
                  fontSize: '0.9rem', 
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                }}
              >
                <Save size={17} /> Guardar Formato
              </button>
            </div>
          </div>
          
          {/* Fila de Metadatos: Etapa, Plantilla y Estado */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Etapa:</label>
                <select 
                  value={etapa} 
                  onChange={e => setEtapa(e.target.value)} 
                  className="form-select" 
                  style={{ width: 'auto', padding: '0.3rem 0.75rem', fontSize: '0.82rem', fontWeight: 700, color: '#065f46', borderColor: '#a7f3d0', backgroundColor: '#ecfdf5', cursor: 'pointer' }}
                  title="Etapa del proceso de servicio social a la que pertenece este formato"
                >
                  <option value="APERTURA">APERTURA</option>
                  <option value="BIMESTRE 1">BIMESTRE 1</option>
                  <option value="BIMESTRE 2">BIMESTRE 2</option>
                  <option value="BIMESTRE 3">BIMESTRE 3</option>
                  <option value="LIBERACION">LIBERACIÓN</option>
                </select>
              </div>

              {!docId && !id && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Plantilla Excel/Word:</label>
                  <input 
                    type="file" 
                    onChange={e => setPlantillaFile(e.target.files[0])} 
                    accept=".xlsx,.docx" 
                    style={{ fontSize: '0.82rem', color: '#64748b' }} 
                  />
                </div>
              )}

              {(docId || id) && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem 0.85rem', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                  <CheckCircle2 size={14} color="#059669" />
                  <span>Documento Oficial Vinculado en el Catálogo</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
              <span>Campos en el lienzo: <strong>{formFields.length}</strong></span>
            </div>
          </div>
        </div>

        {/* Lienzo estilo Documento Oficial */}
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="form-canvas" style={{
            maxWidth: '1050px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            padding: '2.5rem',
            minHeight: '600px'
          }}>
            {/* Membrete del Lienzo */}
            <div style={{
              borderBottom: '2px solid #059669',
              paddingBottom: '1.25rem',
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '0.25rem' }}>
                  Instituto Tecnológico Superior de Teziutlán
                </div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                  {formName || 'Vista Previa del Formato Digital'}
                </h2>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                Simulación en tiempo real
              </div>
            </div>

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
          </div>
        </DndContext>
      </div>

      {/* 3. Columna Derecha: Panel de Propiedades y Smart Data */}
      <PropertiesPanel 
        selectedField={selectedField} 
        onUpdateField={updateField} 
        allFields={formFields}
      />
    </div>
  );
}

export default FormBuilderWrapper;

