import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Lock, ArrowLeft, Send, CheckCircle2, FileText, AlertTriangle, Download, Info, Image as ImageIcon } from 'lucide-react';

export function getFieldDynamicState(campo, formData, formSchema) {
  let isVisible = true;
  let isReadOnly = campo.solo_lectura === 1 || campo.solo_lectura === true;
  let isRequired = campo.requerido === 1 || campo.requerido === true;

  // 1. Evaluar Lógica Condicional directa (Visibilidad / Habilitación en este campo)
  if (campo.habilitar_condicion && campo.condicion_campo) {
    const depVal = formData[campo.condicion_campo] !== undefined 
      ? formData[campo.condicion_campo] 
      : '';
    const expectedVal = campo.condicion_valor !== undefined && campo.condicion_valor !== null
      ? String(campo.condicion_valor).trim().toLowerCase()
      : '';
    const actualVal = String(depVal || '').trim().toLowerCase();

    let conditionMet = false;
    switch (campo.condicion_operador) {
      case 'igual':
        conditionMet = (actualVal === expectedVal);
        break;
      case 'diferente':
        conditionMet = (actualVal !== expectedVal);
        break;
      case 'contiene':
        conditionMet = actualVal.includes(expectedVal);
        break;
      case 'mayor':
        conditionMet = parseFloat(actualVal) > parseFloat(expectedVal);
        break;
      case 'menor':
        conditionMet = parseFloat(actualVal) < parseFloat(expectedVal);
        break;
      default:
        conditionMet = (actualVal === expectedVal);
    }

    switch (campo.condicion_accion) {
      case 'mostrar':
        isVisible = conditionMet;
        break;
      case 'ocultar':
        isVisible = !conditionMet;
        break;
      case 'requerir':
        if (conditionMet) isRequired = true;
        break;
      case 'deshabilitar':
        if (conditionMet) {
          isReadOnly = true;
        } else {
          isReadOnly = campo.solo_lectura === 1 || campo.solo_lectura === true;
        }
        break;
      case 'habilitar':
        if (conditionMet) {
          isReadOnly = false;
        } else {
          isReadOnly = campo.solo_lectura === 1 || campo.solo_lectura === true;
        }
        break;
      default:
        break;
    }
  }

  // 2. Evaluar si algún campo origen con Lógica Condicional (Llenado) tiene a este campo como objetivo
  if (formSchema) {
    const allCampos = [];
    if (formSchema.secciones) {
      formSchema.secciones.forEach(sec => (sec.campos || []).forEach(c => allCampos.push(c)));
    }
    if (formSchema.campos_sin_seccion) {
      formSchema.campos_sin_seccion.forEach(c => allCampos.push(c));
    }

    for (const srcCampo of allCampos) {
      if (!srcCampo.reglas_transformacion) continue;
      let fillConfig = null;
      try {
        fillConfig = typeof srcCampo.reglas_transformacion === 'string'
          ? JSON.parse(srcCampo.reglas_transformacion)
          : srcCampo.reglas_transformacion;
      } catch (e) {
        fillConfig = null;
      }

      if (fillConfig && (fillConfig.habilitar === 1 || fillConfig.habilitar === true) && Array.isArray(fillConfig.reglas)) {
        const targetVar = fillConfig.campo_objetivo;
        if (targetVar === campo.nombre_variable || (targetVar === 'self' && srcCampo.id_campo === campo.id_campo)) {
          const srcVal = formData[srcCampo.id_campo] !== undefined 
            ? formData[srcCampo.id_campo] 
            : (formData[srcCampo.nombre_variable] !== undefined ? formData[srcCampo.nombre_variable] : '');
          
          if (srcVal !== undefined && srcVal !== null && String(srcVal).trim() !== '') {
            const normSrcVal = String(srcVal).trim().toLowerCase();
            const matched = fillConfig.reglas.find(r => 
              String(r.opcion || '').trim().toLowerCase() === normSrcVal
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
  }

  return { isVisible, isReadOnly, isRequired };
}

export default function FormRenderer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formSchema, setFormSchema] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [idDocumento, setIdDocumento] = useState(null);
  const [alumnoInfo, setAlumnoInfo] = useState(null);
  const [correoDestinoAviso, setCorreoDestinoAviso] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    
    const loadFormData = async () => {
      setLoading(true);
      try {
        // 1. Cargar el esquema del formulario
        const resForm = await fetch(`http://localhost:5000/api/forms/${id}`);
        const dataForm = await resForm.json();
        
        if (dataForm.error) {
          // Si no existe formulario dinámico para este ID, verificar si corresponde a un documento oficial
          try {
            const checkDoc = await fetch(`http://localhost:5000/api/alumno/formatos/documento-info/${id}`);
            const checkDocData = await checkDoc.json();
            if (checkDocData && checkDocData.documento) {
              navigate(`/student/formatos/entrega-archivo/${id}`, { replace: true });
              return;
            }
          } catch (e) {}
          Swal.fire('Error', dataForm.error, 'error');
          navigate('/student/formatos');
          return;
        }
        
        setFormSchema(dataForm);
        const docId = dataForm.id_documento;
        setIdDocumento(docId);

        // Si el formulario no tiene campos configurados (está vacío), redirigir a entrega directa
        let totalCampos = (dataForm.campos_sin_seccion || []).length;
        if (dataForm.secciones) {
          dataForm.secciones.forEach(sec => {
            totalCampos += (sec.campos || []).length;
          });
        }
        if (totalCampos === 0 && docId) {
          navigate(`/student/formatos/entrega-archivo/${docId}`, { replace: true });
          return;
        }

        // 2. Cargar datos de auto-llenado desde la base de datos del alumno
        try {
          const resAuto = await fetch(`http://localhost:5000/api/alumno/formatos/autollenar/${id}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          const dataAuto = await resAuto.json();
          if (dataAuto && dataAuto.prefill) {
            setFormData(dataAuto.prefill);
            if (dataAuto.alumno) setAlumnoInfo(dataAuto.alumno);
          }
        } catch (errAuto) {
          console.warn('No se pudo precargar autollenado:', errAuto);
        }

        // 3. Obtener correo destino configurado para mostrar aviso al alumno
        try {
          const resCfg = await fetch('http://localhost:5000/api/admin/recepcion-config');
          const dataCfg = await resCfg.json();
          if (dataCfg.correo_recepcion_formatos) {
            setCorreoDestinoAviso(dataCfg.correo_recepcion_formatos);
          }
        } catch (errCfg) {
          console.warn('Config aviso:', errCfg);
        }

        // 4. Verificar el estado del documento en el expediente del alumno
        try {
          const resExp = await fetch('http://localhost:5000/api/alumno/expediente', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          const expData = await resExp.json();
          if (expData.documentos && docId) {
            const matchingDoc = expData.documentos.find(d => d.id_documento === docId);
            if (matchingDoc && (matchingDoc.estado || '').toUpperCase() === 'BLOQUEADO') {
              setIsBlocked(true);
            }
          }
        } catch (errExp) {
          console.warn('Error expediente:', errExp);
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No se pudo cargar el formulario', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, [id, navigate]);

  const handleChange = (campo, value) => {
    setFormData(prev => {
      let next = {
        ...prev,
        [campo.id_campo]: value,
        [campo.nombre_variable]: value,
        ...(campo.columna_origen ? { [campo.columna_origen]: value } : {})
      };

      // Evaluar Lógica Condicional (Llenado Automático)
      let fillConfig = null;
      if (campo.reglas_transformacion) {
        try {
          fillConfig = typeof campo.reglas_transformacion === 'string' 
            ? JSON.parse(campo.reglas_transformacion) 
            : campo.reglas_transformacion;
        } catch (e) {
          fillConfig = null;
        }
      }

      if (fillConfig && (fillConfig.habilitar === 1 || fillConfig.habilitar === true) && Array.isArray(fillConfig.reglas)) {
        const targetVar = fillConfig.campo_objetivo;
        const valStr = String(value || '').trim().toLowerCase();
        const matched = fillConfig.reglas.find(r => 
          String(r.opcion || '').trim().toLowerCase() === valStr
        );

        if (matched) {
          const targetValue = matched.texto !== undefined && matched.texto !== null ? matched.texto : '';
          if (targetVar && targetVar !== 'self') {
            next[targetVar] = targetValue;
            if (formSchema) {
              const allCampos = [];
              if (formSchema.secciones) {
                formSchema.secciones.forEach(sec => (sec.campos || []).forEach(c => allCampos.push(c)));
              }
              if (formSchema.campos_sin_seccion) {
                formSchema.campos_sin_seccion.forEach(c => allCampos.push(c));
              }
              const targetField = allCampos.find(f => f.nombre_variable === targetVar);
              if (targetField) {
                next[targetField.id_campo] = targetValue;
                if (targetField.columna_origen) {
                  next[targetField.columna_origen] = targetValue;
                }
              }
            }
          } else {
            next[campo.nombre_variable] = targetValue;
            next[campo.id_campo] = targetValue;
          }
        }
      }

      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isBlocked) {
      Swal.fire('Formato Bloqueado', 'No es posible enviar este formulario porque está bloqueado por el administrador en tu expediente.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Confirmar Entrega Oficial?',
      html: `
        <div style="text-align: left; font-size: 0.93rem; color: #334155; line-height: 1.5;">
          <p>Al confirmar tu entrega se realizarán automáticamente las siguientes acciones:</p>
          <ul style="padding-left: 20px; margin: 10px 0;">
            <li><strong>Llenado Oficial:</strong> Se plasmarán tus datos en la plantilla Excel del ITST.</li>
            <li><strong>Descarga Local:</strong> Se descargará automáticamente una copia en tu dispositivo.</li>
            <li><strong>Despacho Outlook:</strong> Se remitirá el archivo adjunto al correo oficial de recepción: <strong>${correoDestinoAviso || 'serviciosocial@teziutlan.tecnm.mx'}</strong>.</li>
            <li><strong>Expediente:</strong> Pasará a estado <strong>En Revisión</strong>.</li>
          </ul>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Generar, Descargar y Enviar',
      cancelButtonText: 'Revisar Datos',
      confirmButtonColor: '#059669'
    });

    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    Swal.fire({
      title: 'Generando formato oficial...',
      text: 'Procesando celdas de Excel y despachando entrega por Microsoft Graph (Outlook)...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const token = localStorage.getItem('auth_token');

    try {
      const res = await fetch(`http://localhost:5000/api/alumno/formatos/entregar/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ formData })
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        Swal.fire('Error en la Entrega', result.error || 'No se pudo completar la entrega.', 'error');
        setSubmitting(false);
        return;
      }

      // 1. Descargar copia automáticamente en el navegador del alumno
      if (result.file_base64) {
        try {
          const byteCharacters = atob(result.file_base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = result.filename || `Entrega_${formSchema?.nombre || 'Formato'}.xlsx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
        } catch (dlErr) {
          console.error('Error al iniciar la descarga automática:', dlErr);
        }
      }

      // 2. Alerta de éxito o estado al estudiante
      const isEmailSent = result.envio_status === 'ENVIADO';
      
      await Swal.fire({
        icon: isEmailSent ? 'success' : 'info',
        title: isEmailSent ? '¡Formato Generado y Enviado por Outlook!' : '¡Formato Generado y Guardado!',
        html: `
          <div style="text-align: left; font-size: 0.95rem; color: #334155;">
            <p style="margin-bottom: 0.75rem;">
              Tu formato oficial se ha generado exitosamente y se ha <strong>descargado una copia en Excel (.xlsx)</strong> en tu equipo.
            </p>
            ${isEmailSent ? `
              <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 12px 16px; border-radius: 6px; margin-bottom: 0.75rem;">
                <div style="font-size: 0.8rem; color: #065f46; font-weight: 700; text-transform: uppercase;">✔ Correo Entregado a Outlook:</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #047857; margin-top: 2px;">
                  ${result.correo_destino || 'Buzón Oficial de Servicio Social'}
                </div>
                <div style="font-size: 0.78rem; color: #059669; margin-top: 4px;">
                  Archivo adjunto: <code>${result.filename}</code>
                </div>
              </div>
            ` : `
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 0.75rem;">
                <div style="font-size: 0.8rem; color: #92400e; font-weight: 700; text-transform: uppercase;">Aviso de Correo Outlook:</div>
                <div style="font-size: 0.85rem; color: #78350f; margin-top: 2px;">
                  El documento quedó registrado en tu expediente digital. No obstante, el correo no se remitió automáticamente por Outlook hacia <strong>${result.correo_destino}</strong>.
                </div>
                <div style="font-size: 0.78rem; color: #b45309; margin-top: 6px;">
                  <strong>Sugerencia:</strong> Cierra sesión e ingresa nuevamente con tu cuenta de Microsoft institucional para conceder permisos de envío por Outlook.
                </div>
              </div>
            `}
            <p style="font-size: 0.85rem; color: #64748b; margin: 0;">
              El documento se encuentra ahora en estado <strong>En Revisión</strong> en tu expediente digital.
            </p>
          </div>
        `,
        confirmButtonText: 'Ir a Mi Expediente',
        confirmButtonColor: '#059669'
      });

      navigate('/student/expediente');
    } catch (err) {
      console.error(err);
      Swal.fire('Error de Conexión', 'No se pudo establecer comunicación con el servidor para la entrega.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ color: '#047857', fontSize: '1.1rem', fontWeight: 600 }}>Cargando formulario y precargando tus datos institucionales...</div>
      </div>
    );
  }

  // Vista cuando el formato está BLOQUEADO en la matriz de validación
  if (isBlocked) {
    return (
      <div style={{ maxWidth: '650px', margin: '3rem auto', padding: '2.5rem', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', textAlign: 'center' }} className="animate-fade-in">
        <div style={{ width: '68px', height: '68px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
          <Lock size={34} />
        </div>
        
        <h2 style={{ color: '#0f172a', fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.75rem 0' }}>
          Formato Bloqueado
        </h2>
        
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem 0' }}>
          El documento <strong>{formSchema?.nombre || 'solicitado'}</strong> no se encuentra disponible para su captura en este momento porque está marcado como <strong>Bloqueado</strong> en la Matriz de Validación de tu expediente.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => navigate('/student/expediente')} className="btn btn-primary">
            <ArrowLeft size={16} /> Ver Mi Expediente
          </button>
          <button onClick={() => navigate('/student/formatos')} className="btn btn-secondary">
            Otros Formatos
          </button>
        </div>
      </div>
    );
  }

  if (!formSchema) return null;

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', paddingBottom: '3rem' }}>
      <button 
        onClick={() => navigate('/student/formatos')}
        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Volver a Catálogo de Formatos
      </button>

      <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        {/* Header del Formulario */}
        <div style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)', color: 'white', padding: '2.5rem 2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.65rem', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.12)', fontSize: '0.78rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '0.75rem', border: '1px solid rgba(110, 231, 183, 0.2)' }}>
            <FileText size={13} /> Formato Oficial ITST
          </div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
            {formSchema.titulo || formSchema.nombre}
          </h1>
          {formSchema.descripcion && (
            <p style={{ margin: '0.65rem 0 0 0', color: '#d1fae5', fontSize: '0.95rem' }}>
              {formSchema.descripcion}
            </p>
          )}

          {correoDestinoAviso && (
            <div style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', color: '#a7f3d0' }}>
              <Info size={14} /> Los formatos llenados se descargan en tu equipo y se envían por Outlook a: <strong>{correoDestinoAviso}</strong>
            </div>
          )}
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '2.25rem' }}>
          
          {/* Secciones */}
          {formSchema.secciones && formSchema.secciones.map(sec => (
            <div key={sec.id_seccion} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                {sec.titulo}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {sec.campos.map(campo => {
                  const dynamicState = getFieldDynamicState(campo, formData, formSchema);
                  if (!dynamicState.isVisible) return null;
                  const val = formData[campo.id_campo] !== undefined ? formData[campo.id_campo] : (formData[campo.nombre_variable] !== undefined ? formData[campo.nombre_variable] : '');
                  return (
                    <FieldRenderer 
                      key={campo.id_campo} 
                      campo={campo} 
                      value={val} 
                      dynamicState={dynamicState}
                      onChange={(nuevoVal) => handleChange(campo, nuevoVal)} 
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Campos sin sección */}
          {formSchema.campos_sin_seccion && formSchema.campos_sin_seccion.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800, borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                Campos Generales
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {formSchema.campos_sin_seccion.map(campo => {
                  const dynamicState = getFieldDynamicState(campo, formData, formSchema);
                  if (!dynamicState.isVisible) return null;
                  const val = formData[campo.id_campo] !== undefined ? formData[campo.id_campo] : (formData[campo.nombre_variable] !== undefined ? formData[campo.nombre_variable] : '');
                  return (
                    <FieldRenderer 
                      key={campo.id_campo} 
                      campo={campo} 
                      value={val} 
                      dynamicState={dynamicState}
                      onChange={(nuevoVal) => handleChange(campo, nuevoVal)} 
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
            <button 
              type="button" 
              onClick={() => navigate('/student/formatos')} 
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
            >
              <Send size={16} /> {submitting ? 'Procesando entrega...' : 'Enviar y Descargar Copia Oficial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldRenderer({ campo, value, dynamicState, onChange }) {
  if (campo.tipo_campo === 'heading') {
    return (
      <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: 800 }}>
          {campo.etiqueta}
        </h3>
        {campo.placeholder && (
          <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>{campo.placeholder}</p>
        )}
      </div>
    );
  }

  const isReadOnly = dynamicState ? dynamicState.isReadOnly : (campo.solo_lectura === 1);
  const isRequired = dynamicState ? dynamicState.isRequired : (campo.requerido === 1);

  let options = [];
  if (campo.opciones_json) {
    try {
      options = typeof campo.opciones_json === 'string' ? JSON.parse(campo.opciones_json) : campo.opciones_json;
    } catch {
      options = [];
    }
  } else if (Array.isArray(campo.opciones)) {
    options = campo.opciones;
  }

  const inputStyle = isReadOnly 
    ? { backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed', borderColor: '#cbd5e1' } 
    : {};

  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          {campo.etiqueta}
          {isRequired && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
        </span>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {campo.celda_excel && campo.celda_excel !== 'XX' && (
            <span style={{ fontSize: '0.68rem', backgroundColor: '#f0fdf4', color: '#059669', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, border: '1px solid #bbf7d0' }} title="Celda Excel vinculada">
              Excel: {campo.celda_excel}
            </span>
          )}
          {isReadOnly && (
            <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Lock size={10} /> Solo Lectura
            </span>
          )}
        </div>
      </label>

      {campo.tipo_campo === 'text' && (
        <input 
          type="text" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          readOnly={isReadOnly}
          required={isRequired}
          className="form-input"
          style={inputStyle}
          placeholder={campo.placeholder || `Ingresa ${campo.etiqueta.toLowerCase()}`}
        />
      )}

      {campo.tipo_campo === 'date' && (
        <input 
          type="date" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          readOnly={isReadOnly}
          required={isRequired}
          className="form-input"
          style={inputStyle}
        />
      )}

      {campo.tipo_campo === 'textarea' && (
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          readOnly={isReadOnly}
          required={isRequired}
          className="form-input"
          style={{ minHeight: '90px', resize: 'vertical', ...inputStyle }}
          placeholder={campo.placeholder || `Ingresa ${campo.etiqueta.toLowerCase()}`}
        />
      )}

      {campo.tipo_campo === 'select' && (
        <select 
          value={value} 
          onChange={e => onChange(e.target.value)}
          disabled={isReadOnly}
          required={isRequired}
          className="form-select"
          style={inputStyle}
        >
          <option value="">Selecciona una opción...</option>
          {Array.isArray(options) && options.map((opt, i) => (
            <option key={i} value={typeof opt === 'string' ? opt : opt.value || opt.label}>
              {typeof opt === 'string' ? opt : opt.label || opt.value}
            </option>
          ))}
        </select>
      )}

      {campo.tipo_campo === 'radio' && (
        <div style={{ 
          display: 'flex', 
          flexDirection: campo.alineacion_opciones === 'vertical' ? 'column' : 'row', 
          flexWrap: 'wrap', 
          gap: '0.65rem', 
          marginTop: '0.4rem' 
        }}>
          {((Array.isArray(options) && options.length > 0) ? options : ['Opción 1', 'Opción 2', 'Opción 3']).map((opt, i) => {
            const optStr = typeof opt === 'string' ? opt : (opt.label || opt.value || String(opt));
            const isSelected = value === optStr;
            return (
              <label 
                key={i} 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.45rem', 
                  fontSize: '0.88rem', 
                  color: isSelected ? '#1e3a8a' : '#334155', 
                  cursor: isReadOnly ? 'not-allowed' : 'pointer',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  border: isSelected ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                  boxShadow: isSelected ? '0 2px 4px rgba(59, 130, 246, 0.12)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <input 
                  type="radio" 
                  name={`radio_${campo.id_campo || campo.nombre_variable}`}
                  value={optStr}
                  checked={isSelected}
                  onChange={() => onChange(optStr)}
                  disabled={isReadOnly}
                  required={isRequired && !value}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                />
                <span style={{ fontWeight: isSelected ? 700 : 500 }}>{optStr}</span>
              </label>
            );
          })}
        </div>
      )}

      {campo.tipo_campo === 'checkbox' && (
        options.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: campo.alineacion_opciones === 'horizontal' ? 'row' : 'column', gap: '0.6rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
            {options.map((opt, i) => {
              const optStr = typeof opt === 'string' ? opt : (opt.label || opt.value);
              const isChecked = value === optStr || (Array.isArray(value) && value.includes(optStr));
              return (
                <label key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#1e293b', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}>
                  <input 
                    type="checkbox" 
                    name={campo.nombre_variable}
                    checked={isChecked}
                    onChange={(e) => {
                      onChange(e.target.checked ? optStr : '');
                    }}
                    disabled={isReadOnly}
                    style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                  />
                  <span>{optStr}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
            <input 
              type="checkbox" 
              id={`chk_${campo.id_campo}`}
              checked={!!value} 
              onChange={e => onChange(e.target.checked ? (campo.placeholder || campo.etiqueta || 'Marcado') : '')} 
              disabled={isReadOnly}
              style={{ width: '18px', height: '18px', cursor: isReadOnly ? 'not-allowed' : 'pointer', accentColor: '#059669' }}
            />
            <label htmlFor={`chk_${campo.id_campo}`} style={{ fontSize: '0.88rem', color: '#334155', cursor: isReadOnly ? 'not-allowed' : 'pointer', margin: 0 }}>
              {campo.placeholder || campo.etiqueta}
            </label>
          </div>
        )
      )}

      {campo.tipo_campo === 'file' && (
        <ImageUploadField 
          value={value}
          onChange={onChange}
          isReadOnly={isReadOnly}
          isRequired={isRequired}
          campo={campo}
        />
      )}
    </div>
  );
}

function ImageUploadField({ value, onChange, isReadOnly, isRequired, campo }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Formato no admitido',
        text: 'Este campo solo permite subir imágenes (.png, .jpg, .jpeg, .webp) para incrustar en el documento oficial.'
      });
      return;
    }

    const maxMb = campo.tamano_max_mb || 5;
    if (file.size > maxMb * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'Imagen demasiado pesada',
        text: `El tamaño máximo permitido es de ${maxMb} MB.`
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (isReadOnly) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  const hasImage = !!value && typeof value === 'string' && value.startsWith('data:image/');

  return (
    <div style={{ marginTop: '0.25rem' }}>
      <input 
        type="file"
        ref={inputRef}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        style={{ display: 'none' }}
        disabled={isReadOnly}
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {hasImage ? (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          padding: '0.85rem', 
          backgroundColor: '#f8fafc', 
          borderRadius: '12px', 
          border: '1px solid #cbd5e1' 
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            border: '1px solid #94a3b8',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img 
              src={value} 
              alt="Vista previa" 
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                ✓ Imagen lista para incrustar en Excel
              </span>
            </div>
            <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: '#64748b' }}>
              Se colocará en la celda {campo.celda_excel || 'configurada'} con tamaño {campo.ancho_imagen || 150} × {campo.alto_imagen || 120} px.
            </p>

            {!isReadOnly && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: 'white',
                    color: '#1e293b',
                    cursor: 'pointer'
                  }}
                >
                  Cambiar imagen
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fff1f2',
                    color: '#e11d48',
                    cursor: 'pointer'
                  }}
                >
                  Quitar
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isReadOnly && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!isReadOnly) setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? '#2563eb' : (isRequired && !value ? '#fca5a5' : '#cbd5e1')}`,
            backgroundColor: dragOver ? '#eff6ff' : (isReadOnly ? '#f1f5f9' : '#f8fafc'),
            borderRadius: '12px',
            padding: '1.5rem 1rem',
            textAlign: 'center',
            cursor: isReadOnly ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '50%', 
            backgroundColor: dragOver ? '#dbeafe' : '#f1f5f9', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 0.5rem auto', 
            color: dragOver ? '#2563eb' : '#64748b' 
          }}>
            <ImageIcon size={22} />
          </div>

          <h5 style={{ margin: '0 0 0.25rem 0', color: '#1e293b', fontSize: '0.86rem', fontWeight: 700 }}>
            {isReadOnly ? 'No hay imagen adjunta' : 'Haz clic o arrastra tu imagen aquí'}
          </h5>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
            Admite JPG, PNG o WEBP (máx. {campo.tamano_max_mb || 5} MB)
          </p>
        </div>
      )}
    </div>
  );
}
