import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  Mail, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Bell, 
  MessageSquare, 
  RefreshCw, 
  Trash2, 
  Calendar, 
  Clock, 
  UserCheck, 
  Check, 
  Info,
  ShieldCheck
} from 'lucide-react';

export default function AvisosNotificaciones() {
  const [loadingAdeudos, setLoadingAdeudos] = useState(false);
  const [loadingPublicar, setLoadingPublicar] = useState(false);
  const [activeTab, setActiveTab] = useState('avisos'); // 'avisos' | 'historial'

  // Formulario Aviso General
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [autor, setAutor] = useState('Coordinación de Residencias y Servicio Social');
  const [enviarCorreo, setEnviarCorreo] = useState(true);

  // Datos
  const [avisos, setAvisos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchAvisos = () => {
    const token = localStorage.getItem('auth_token');
    fetch('http://127.0.0.1:5000/api/admin/avisos-generales', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAvisos(data);
      })
      .catch(() => {});
  };

  const fetchHistorial = () => {
    const token = localStorage.getItem('auth_token');
    fetch('http://127.0.0.1:5000/api/admin/historial-notificaciones', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setHistorial(data);
      })
      .catch(() => {});
  };

  const refreshAll = () => {
    setLoadingData(true);
    const token = localStorage.getItem('auth_token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    Promise.all([
      fetch('http://127.0.0.1:5000/api/admin/avisos-generales', { headers: authHeader }).then(r => r.json()).then(d => Array.isArray(d) && setAvisos(d)).catch(() => {}),
      fetch('http://127.0.0.1:5000/api/admin/historial-notificaciones', { headers: authHeader }).then(r => r.json()).then(d => Array.isArray(d) && setHistorial(d)).catch(() => {})
    ]).finally(() => setLoadingData(false));
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // 1. Envío Masivo Automático a Alumnos con Adeudos o Rechazos
  const handleNotifyIncumplidos = () => {
    Swal.fire({
      title: '¿Enviar Avisos de Adeudos?',
      html: `
        <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0.5rem;">
          Se conectará con la API de <strong>Microsoft Graph</strong> para enviar un correo institucional personalizado con el desglose exacto de formatos en estado <strong>Pendiente</strong> o <strong>Rechazado</strong> a cada alumno que presente adeudos.
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '🚀 Sí, enviar correos masivos',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        setLoadingAdeudos(true);
        Swal.fire({
          title: 'Enviando notificaciones...',
          html: 'Procesando formatos y despachando correos vía Microsoft Graph API...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const token = localStorage.getItem('auth_token');
        fetch('http://127.0.0.1:5000/api/admin/notificar-adeudos', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        })
          .then(res => res.json())
          .then(data => {
            setLoadingAdeudos(false);
            if (!data.error) {
              const total = data.total_notificados || 0;
              const exitosos = data.total_exitosos !== undefined ? data.total_exitosos : total;
              Swal.fire({
                title: exitosos > 0 ? '¡Avisos Enviados por Outlook!' : '¡Avisos Procesados!',
                html: `
                  <p style="color: #059669; font-weight: 700; font-size: 1.05rem;">
                    Se enviaron recordatorios a <strong>${total}</strong> alumnos con formatos pendientes o rechazados.
                  </p>
                  <p style="font-size: 0.85rem; color: #334155; margin-top: 0.4rem;">
                    ✔ Entregados vía Microsoft Graph: <strong>${exitosos}</strong> correos.
                  </p>
                  <p style="font-size: 0.82rem; color: #64748b; margin-top: 0.4rem;">
                    Cada correo incluye el detalle de documentos faltantes y el enlace para ingresar al sistema.
                  </p>
                `,
                icon: 'success'
              });
              fetchHistorial();
            } else {
              Swal.fire('Atención', data.error || 'Error al procesar el envío', 'info');
            }
          })
          .catch(() => {
            setLoadingAdeudos(false);
            Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
          });
      }
    });
  };

  // 2. Publicar Aviso General a Todos los Alumnos
  const handlePublicarAviso = (e) => {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) {
      Swal.fire('Atención', 'Por favor ingresa el título y el mensaje del aviso.', 'warning');
      return;
    }

    setLoadingPublicar(true);
    Swal.fire({
      title: 'Publicando aviso...',
      html: enviarCorreo ? 'Guardando aviso y enviando copias por correo institucional a todos los alumnos...' : 'Guardando aviso institucional...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const token = localStorage.getItem('auth_token');
    fetch('http://127.0.0.1:5000/api/admin/avisos-generales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        autor: autor.trim(),
        enviar_correo: enviarCorreo
      })
    })
    .then(res => res.json())
    .then(data => {
      setLoadingPublicar(false);
      if (!data.error) {
        Swal.fire({
          title: '¡Aviso Publicado!',
          text: data.message || 'El aviso se ha publicado correctamente.',
          icon: 'success'
        });
        setTitulo('');
        setContenido('');
        fetchAvisos();
        fetchHistorial();
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(() => {
      setLoadingPublicar(false);
      Swal.fire('Error', 'Error al conectar con el servidor', 'error');
    });
  };

  // 3. Eliminar Aviso General (Individual)
  const handleDeleteAviso = (id_aviso, tituloAviso) => {
    Swal.fire({
      title: '¿Eliminar Comunicado?',
      text: `Se eliminará el aviso: "${tituloAviso}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        const token = localStorage.getItem('auth_token');
        fetch(`http://127.0.0.1:5000/api/admin/avisos-generales/${id_aviso}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('Eliminado', 'Aviso eliminado', 'success');
            fetchAvisos();
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => Swal.fire('Error', 'Error al eliminar aviso', 'error'));
      }
    });
  };

  // 4. Eliminar TODOS los Avisos Generales (Masivo)
  const handleDeleteAllAvisos = () => {
    if (avisos.length === 0) return;
    Swal.fire({
      title: '¿Eliminar TODOS los avisos?',
      html: `
        <p style="color: #475569; font-size: 0.92rem; margin-bottom: 0.5rem;">
          Se eliminarán de forma permanente los <strong>${avisos.length}</strong> comunicados publicados en la plataforma para liberar espacio.
        </p>
        <p style="color: #dc2626; font-size: 0.85rem; font-weight: 700;">
          ⚠️ Esta acción no se puede deshacer.
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '🗑️ Sí, eliminar todos',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        const token = localStorage.getItem('auth_token');
        fetch('http://127.0.0.1:5000/api/admin/avisos-generales/todos', {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('¡Eliminados!', data.message || 'Se eliminaron todos los avisos.', 'success');
            fetchAvisos();
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => Swal.fire('Error', 'Error al eliminar los avisos', 'error'));
      }
    });
  };

  // 5. Eliminar Registro Individual de Notificación por Correo
  const handleDeleteNotificacion = (id_notificacion, destinatario) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: `Se eliminará este registro de correo enviado a ${destinatario || 'este estudiante'}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        const token = localStorage.getItem('auth_token');
        fetch(`http://127.0.0.1:5000/api/admin/historial-notificaciones/${id_notificacion}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            Swal.fire({
              title: 'Eliminado',
              text: 'Registro eliminado correctamente.',
              icon: 'success',
              timer: 1400,
              showConfirmButton: false
            });
            fetchHistorial();
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => Swal.fire('Error', 'Error al eliminar el registro', 'error'));
      }
    });
  };

  // 6. Vaciar TODO el Historial de Correos (Masivo)
  const handleDeleteAllHistorial = () => {
    if (historial.length === 0) return;
    Swal.fire({
      title: '¿Vaciar Todo el Historial?',
      html: `
        <p style="color: #475569; font-size: 0.92rem; margin-bottom: 0.5rem;">
          Se eliminarán de forma permanente los <strong>${historial.length}</strong> registros del historial de correos enviados, liberando el almacenamiento de plantillas HTML en la base de datos.
        </p>
        <p style="color: #64748b; font-size: 0.82rem;">
          ℹ️ Los correos electrónicos que ya llegaron a las bandejas de entrada de los alumnos en Outlook no se verán afectados.
        </p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: '🗑️ Sí, vaciar historial completo',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        const token = localStorage.getItem('auth_token');
        fetch('http://127.0.0.1:5000/api/admin/historial-notificaciones/todos', {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        .then(r => r.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('¡Historial Vaciado!', data.message || 'Se vació el historial de notificaciones.', 'success');
            fetchHistorial();
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => Swal.fire('Error', 'Error al vaciar el historial', 'error'));
      }
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Encabezado del Módulo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={28} color="#059669" /> Avisos y Notificaciones Institucionales
          </h1>
          <p style={{ color: '#64748b', margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
            Publica comunicados oficiales en el tablero del estudiante y despacha notificaciones automáticas por correo institucional de Microsoft Graph.
          </p>
        </div>

        <button 
          onClick={() => { fetchAvisos(); fetchHistorial(); }}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} /> Refrescar
        </button>
      </div>

      {/* Grid Superior: 2 Módulos de Acción Principal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Tarjeta 1: Notificación Automática Masiva de Adeudos (Microsoft Graph) */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={26} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.65rem', borderRadius: '20px', backgroundColor: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <ShieldCheck size={14} /> Microsoft Graph API
              </span>
            </div>
            
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Notificación Automática de Formatos Pendientes o Rechazados
            </h2>
            
            <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Escanea el estado de la <strong>Matriz de Validación</strong> y envía automáticamente un correo institucional a cada estudiante que tenga formatos en estado <strong>Pendiente</strong> o <strong>Rechazado</strong> con su lista detallada de adeudos.
            </p>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Check size={14} color="#10b981" /> <span>Desglose automático por cada documento faltante</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Check size={14} color="#10b981" /> <span>Incluye observaciones de corrección si fue rechazado</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Check size={14} color="#10b981" /> <span>Botón de acceso directo al portal de formatos</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleNotifyIncumplidos}
            disabled={loadingAdeudos}
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', fontWeight: 700 }}
          >
            <Send size={16} /> {loadingAdeudos ? 'Enviando Correos...' : '🚀 Enviar Avisos Masivos a Alumnos con Adeudos'}
          </button>
        </div>

        {/* Tarjeta 2: Redactar y Publicar Comunicado General */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={26} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.65rem', borderRadius: '20px', backgroundColor: '#f0fdf4', color: '#166534' }}>
              Todos los Alumnos
            </span>
          </div>
          
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Publicar Aviso General
          </h2>

          <form onSubmit={handlePublicarAviso} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Título del Comunicado *</label>
              <input 
                type="text" 
                placeholder="Ej. Fechas Límite para Entrega del Bimestre 1..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Mensaje Oficial *</label>
              <textarea 
                rows="3" 
                placeholder="Escribe el cuerpo del comunicado que se publicará en la plataforma y se enviará a los alumnos..."
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                className="form-input"
                style={{ resize: 'vertical' }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                <input 
                  type="checkbox" 
                  checked={enviarCorreo} 
                  onChange={e => setEnviarCorreo(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#059669' }}
                />
                Enviar copia por correo institucional a TODOS los alumnos
              </label>

              <button 
                type="submit"
                disabled={loadingPublicar}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.25rem', backgroundColor: '#0f172a', borderColor: '#0f172a' }}
              >
                <Send size={15} /> {loadingPublicar ? 'Publicando...' : '📢 Publicar Aviso'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Pestañas de Navegación Inferior */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('avisos')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 1rem',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'avisos' ? '#059669' : '#64748b',
            borderBottom: activeTab === 'avisos' ? '3px solid #059669' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Bell size={17} /> Avisos Generales Publicados ({avisos.length})
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.75rem 1rem',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'historial' ? '#059669' : '#64748b',
            borderBottom: activeTab === 'historial' ? '3px solid #059669' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Clock size={17} /> Historial de Correos y Notificaciones ({historial.length})
        </button>
      </div>

      {/* Contenido de la Pestaña 1: Avisos Generales Publicados */}
      {activeTab === 'avisos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {avisos.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.88rem', color: '#475569' }}>
                Total de comunicados en el sistema: <strong style={{ color: '#0f172a' }}>{avisos.length}</strong>
              </span>
              <button
                onClick={handleDeleteAllAvisos}
                className="btn btn-secondary"
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderColor: '#fecaca',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '0.45rem 0.9rem',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={15} /> Eliminar Todos los Avisos
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem' }}>
            {avisos.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', backgroundColor: 'white', padding: '3.5rem', textAlign: 'center', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                <Bell size={42} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>No hay comunicados publicados aún.</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Redacta un nuevo aviso en el formulario superior para notificar a la comunidad estudiantil.</p>
              </div>
            ) : (
              avisos.map(av => (
                <div key={av.id_aviso} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} /> {av.fecha_publicacion}
                      </span>
                      <button 
                        onClick={() => handleDeleteAviso(av.id_aviso, av.titulo)}
                        style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer' }}
                        title="Eliminar Aviso"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                      {av.titulo}
                    </h3>

                    <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-line', margin: '0 0 1rem 0' }}>
                      {av.contenido}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                    Emisor: {av.autor}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Contenido de la Pestaña 2: Historial de Envíos por Correo */}
      {activeTab === 'historial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {historial.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.88rem', color: '#475569' }}>
                Total de registros almacenados: <strong style={{ color: '#0f172a' }}>{historial.length}</strong>
              </span>
              <button
                onClick={handleDeleteAllHistorial}
                className="btn btn-secondary"
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderColor: '#fecaca',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '0.45rem 0.9rem',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={15} /> Vaciar Todo el Historial
              </button>
            </div>
          )}

          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
            {historial.length === 0 ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                <Mail size={42} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>No hay registros de correos enviados.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '1rem', fontWeight: 800 }}>Fecha y Hora</th>
                    <th style={{ padding: '1rem', fontWeight: 800 }}>Destinatario</th>
                    <th style={{ padding: '1rem', fontWeight: 800 }}>No. Control</th>
                    <th style={{ padding: '1rem', fontWeight: 800 }}>Tipo de Aviso</th>
                    <th style={{ padding: '1rem', fontWeight: 800 }}>Asunto del Correo</th>
                    <th style={{ padding: '1rem', fontWeight: 800, textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '1rem', fontWeight: 800, textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h, idx) => (
                    <tr 
                      key={h.id_notificacion || idx}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfcfd'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                        {h.fecha_envio}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{h.nombre_destinatario || 'Estudiante'}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{h.destinatario}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#059669' }}>
                        {h.no_control || '-'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          backgroundColor: h.tipo_aviso === 'ADEUDO_FORMATOS' ? '#ffedd5' : '#ecfdf5',
                          color: h.tipo_aviso === 'ADEUDO_FORMATOS' ? '#c2410c' : '#047857'
                        }}>
                          {h.tipo_aviso === 'ADEUDO_FORMATOS' ? '⚠️ Adeudo de Formatos' : '📢 Aviso General'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#334155', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.asunto}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span className={`badge ${h.estado_envio === 'ENVIADO' ? 'badge-success' : 'badge-primary'}`}>
                          {h.estado_envio || 'ENVIADO'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteNotificacion(h.id_notificacion, h.destinatario || h.nombre_destinatario)}
                          title="Eliminar este registro del historial"
                          style={{
                            background: '#fee2e2',
                            border: 'none',
                            color: '#dc2626',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
