import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  Inbox, 
  Mail, 
  Save, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  CheckSquare,
  Clock, 
  AlertCircle, 
  FileSpreadsheet, 
  RefreshCw,
  Send,
  Building2,
  Calendar,
  Settings,
  AlertTriangle,
  Key
} from 'lucide-react';

export default function BuzonRecepcionAdmin() {
  const navigate = useNavigate();
  const [correoRecepcion, setCorreoRecepcion] = useState('');
  const [periodoOficial, setPeriodoOficial] = useState('');
  const [stats, setStats] = useState({ total_entregas: 0, total_en_revision: 0, total_aprobados: 0, total_rechazados: 0 });
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [hasMsToken, setHasMsToken] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [showSmtp, setShowSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.office365.com',
    port: 587,
    user: '',
    password: '',
    remitente: '',
    use_tls: true,
    has_password: false
  });

  const token = localStorage.getItem('auth_token');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Cargar configuración y estadísticas
      const resConfig = await fetch('http://localhost:5000/api/admin/recepcion-config', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const dataConfig = await resConfig.json();
      if (dataConfig.correo_recepcion_formatos) {
        setCorreoRecepcion(dataConfig.correo_recepcion_formatos);
        setPeriodoOficial(dataConfig.periodo_oficial || 'Periodo Oficial');
        if (dataConfig.stats) setStats(dataConfig.stats);
        if (dataConfig.smtp) setSmtpConfig(prev => ({ ...prev, ...dataConfig.smtp }));
        setHasMsToken(Boolean(dataConfig.has_ms_token));
        setCurrentUserEmail(dataConfig.current_user_email || '');
      }

      // 2. Cargar entregas recibidas
      const resEntregas = await fetch('http://localhost:5000/api/admin/entregas-recibidas', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const dataEntregas = await resEntregas.json();
      if (Array.isArray(dataEntregas)) {
        setEntregas(dataEntregas);
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron cargar los datos de recepción', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!correoRecepcion || !correoRecepcion.includes('@')) {
      Swal.fire('Correo Inválido', 'Ingresa una dirección de correo válida para realizar la prueba.', 'warning');
      return;
    }

    setTestingEmail(true);
    Swal.fire({
      title: 'Enviando correo de prueba a Outlook...',
      text: `Conectando con el servidor y remitiendo a: ${correoRecepcion}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const res = await fetch('http://localhost:5000/api/admin/probar-correo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ correo_destino: correoRecepcion })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Correo Entregado a Outlook!',
          html: `<p style="color: #065f46; font-size: 0.95rem;">${data.message}</p>`,
          confirmButtonColor: '#059669'
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Atención con el Servicio de Correo',
          html: `
            <div style="text-align: left; font-size: 0.9rem; color: #334155;">
              <p style="margin-bottom: 8px;"><strong>Diagnóstico de entrega:</strong></p>
              <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 10px 14px; border-radius: 6px; color: #991b1b; font-size: 0.85rem; line-height: 1.5;">
                ${data.error || 'No se pudo completar el envío a Outlook.'}
              </div>
              <div style="margin-top: 14px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <p style="font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">¿Cómo resolverlo?</p>
                <ol style="margin: 0; padding-left: 18px; font-size: 0.82rem; color: #475569; line-height: 1.5;">
                  <li><strong>Vía Microsoft Graph:</strong> Cierra sesión y vuelve a iniciarla con tu cuenta de Microsoft para conceder el permiso delegado de envío.</li>
                  <li><strong>Vía SMTP:</strong> Despliega el apartado de "Configuración Alternativa SMTP" abajo e ingresa las credenciales de tu buzón institucional.</li>
                </ol>
              </div>
            </div>
          `,
          confirmButtonColor: '#059669'
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error de Red', 'No se pudo comunicar con el servidor para probar el correo.', 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSavingSmtp(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/recepcion-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          correo_recepcion_formatos: correoRecepcion,
          smtp: smtpConfig
        })
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Configuración SMTP Guardada',
          text: 'Las credenciales SMTP del servidor han sido actualizadas.',
          confirmButtonColor: '#059669'
        });
        fetchData();
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar la configuración SMTP', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Error de conexión con el servidor', 'error');
    } finally {
      setSavingSmtp(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCorreo = async (e) => {
    e.preventDefault();
    if (!correoRecepcion || !correoRecepcion.includes('@')) {
      Swal.fire('Correo Inválido', 'Por favor ingresa una dirección de correo institucional válida.', 'warning');
      return;
    }

    setSavingEmail(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/recepcion-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ correo_recepcion_formatos: correoRecepcion })
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Correo Actualizado',
          text: `Todos los archivos Excel entregados por los alumnos se enviarán a: ${correoRecepcion}`,
          confirmButtonColor: '#059669'
        });
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar la configuración', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Error de conexión con el servidor', 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  const filteredEntregas = entregas.filter(item => {
    const matchesSearch = 
      (item.nombre_alumno || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.no_control || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nombre_documento || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.clave_formato || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFiltro = filtroEstado === 'TODOS' || (item.estado || '').toUpperCase() === filtroEstado;

    return matchesSearch && matchesFiltro;
  });

  return (
    <div style={{ padding: '0 0 3rem 0' }} className="animate-fade-in">
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
        padding: '2.5rem 2rem',
        borderRadius: '20px',
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.25)',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            padding: '0.25rem 0.75rem', 
            borderRadius: '20px', 
            backgroundColor: 'rgba(255, 255, 255, 0.12)', 
            fontSize: '0.8rem', 
            fontWeight: 700, 
            color: '#6ee7b7', 
            marginBottom: '0.75rem', 
            border: '1px solid rgba(110, 231, 183, 0.2)' 
          }}>
            <Inbox size={14} /> Recepción y Despacho Automatizado Outlook
          </div>
          <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Buzón de Recepción de Formatos
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#d1fae5', fontSize: '0.95rem', maxWidth: '650px' }}>
            Configura el correo institucional de destino al que se envían todos los Excel generados cuando los alumnos completan sus formatos, y supervisa las entregas recibidas.
          </p>
        </div>

        <button 
          onClick={fetchData} 
          disabled={loading}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar Datos
        </button>
      </div>

      {/* Tarjeta de Configuración de Correo Destino */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.75rem',
        marginBottom: '2rem',
        boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '10px', 
            backgroundColor: '#ecfdf5', 
            color: '#059669', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Mail size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              Correo de Recepción de Formatos Excel
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Los archivos .xlsx generados por los alumnos al enviar sus formularios se remitirán como archivo adjunto a esta dirección mediante Microsoft Graph (Outlook).
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCorreo} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 350px', position: 'relative' }}>
            <input 
              type="email"
              value={correoRecepcion}
              onChange={(e) => setCorreoRecepcion(e.target.value)}
              placeholder="ejemplo: serviciosocial@teziutlan.tecnm.mx"
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.75rem',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = '#059669'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>

          <button 
            type="submit"
            disabled={savingEmail}
            className="btn btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 700
            }}
          >
            <Save size={16} /> {savingEmail ? 'Guardando...' : 'Guardar Correo Destino'}
          </button>

          <button 
            type="button"
            onClick={handleTestEmail}
            disabled={testingEmail}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              backgroundColor: '#0284c7',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
          >
            <Send size={16} /> {testingEmail ? 'Probando...' : 'Probar Envío a Outlook'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#047857', backgroundColor: '#f0fdf4', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <CheckCircle2 size={15} />
            <span>Buzón activo en el servidor: <strong>{correoRecepcion || 'No definida'}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', padding: '0.6rem 1rem', borderRadius: '8px', border: hasMsToken ? '1px solid #bbf7d0' : '1px solid #fed7aa', backgroundColor: hasMsToken ? '#f0fdf4' : '#fff7ed', color: hasMsToken ? '#047857' : '#c2410c' }}>
            {hasMsToken ? (
              <>
                <CheckCircle2 size={15} color="#059669" />
                <span>Sesión de Microsoft autorizada para envío de correo (<code>Mail.Send</code> activo)</span>
              </>
            ) : (
              <>
                <AlertTriangle size={15} color="#ea580c" />
                <span>Sesión sin permiso delegado de Outlook. <a href="http://localhost:5000/api/auth/login" style={{ color: '#ea580c', fontWeight: 700, textDecoration: 'underline' }}>Reconectar cuenta Microsoft</a></span>
              </>
            )}
          </div>
        </div>

        {/* Toggle Configuración SMTP Alternativa */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <button
            type="button"
            onClick={() => setShowSmtp(!showSmtp)}
            style={{
              background: 'none',
              border: 'none',
              color: '#475569',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: 0
            }}
          >
            <Settings size={16} color="#059669" />
            <span>Configuración Alternativa SMTP (Office 365 / Institucional)</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{showSmtp ? '▲ Ocultar' : '▼ Expandir'}</span>
          </button>

          {showSmtp && (
            <form onSubmit={handleSaveSmtp} style={{ marginTop: '1rem', padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }} className="animate-fade-in">
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#64748b' }}>
                Si las directivas de acceso condicional del tenant de Azure bloquean la API Graph, el servidor utilizará este buzón SMTP para enviar los correos y adjuntos Excel a Outlook.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Servidor SMTP</label>
                  <input
                    type="text"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    className="form-input"
                    placeholder="smtp.office365.com"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Puerto</label>
                  <input
                    type="number"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                    className="form-input"
                    placeholder="587"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Usuario / Buzón Institucional</label>
                  <input
                    type="text"
                    value={smtpConfig.user}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                    className="form-input"
                    placeholder="serviciosocial@teziutlan.tecnm.mx"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Contraseña {smtpConfig.has_password && <span style={{ color: '#059669', fontSize: '0.72rem' }}>(Guardada)</span>}
                  </label>
                  <input
                    type="password"
                    value={smtpConfig.password || ''}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                    className="form-input"
                    placeholder={smtpConfig.has_password ? "•••••••••••• (dejar en blanco para mantener)" : "Contraseña de aplicación"}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingSmtp}
                className="btn btn-primary"
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
              >
                {savingSmtp ? 'Guardando...' : 'Guardar Credenciales SMTP'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Métricas / Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '1.25rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Total Recibidos</span>
            <FileSpreadsheet size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
            {stats.total_entregas}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Formatos procesados en Excel
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>En Revisión</span>
            <Clock size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#d97706', marginTop: '0.5rem' }}>
            {stats.total_en_revision}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Pendientes de dictamen
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Aprobados</span>
            <CheckCircle2 size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#059669', marginTop: '0.5rem' }}>
            {stats.total_aprobados}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Revisados satisfactoriamente
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Rechazados</span>
            <AlertCircle size={18} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#dc2626', marginTop: '0.5rem' }}>
            {stats.total_rechazados}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Con observaciones de corrección
          </div>
        </div>
      </div>

      {/* Tabla de Entregas Recibidas */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)'
      }}>
        {/* Controles de búsqueda y filtros */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Historial de Formatos Entregados ({filteredEntregas.length})
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Descarga directa de los archivos Excel enviados por los alumnos
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Buscador */}
            <div style={{ position: 'relative', width: '260px' }}>
              <input 
                type="text"
                placeholder="Buscar por alumno, control..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>

            {/* Filtro por estado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Filter size={15} color="#64748b" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#334155',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="EN_REVISION">En Revisión</option>
                <option value="APROBADO">Aprobados</option>
                <option value="RECHAZADO">Rechazados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listado */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto', color: '#059669' }} />
            <div style={{ fontWeight: 600 }}>Cargando entregas recibidas...</div>
          </div>
        ) : filteredEntregas.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Inbox size={30} />
            </div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1.1rem', fontWeight: 700 }}>
              No se encontraron entregas
            </h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
              {searchTerm || filtroEstado !== 'TODOS' ? 'No hay resultados que coincidan con los filtros aplicados.' : 'Aún no se han recibido formatos llenados por los alumnos.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Fecha de Entrega</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Alumno</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Formato</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Estado</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Archivo Generado</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntregas.map((item) => {
                  const estadoUpper = (item.estado || 'EN_REVISION').toUpperCase();
                  let badgeBg = '#fef3c7';
                  let badgeColor = '#d97706';
                  let estadoLabel = 'En Revisión';

                  if (estadoUpper === 'APROBADO') {
                    badgeBg = '#ecfdf5';
                    badgeColor = '#059669';
                    estadoLabel = 'Aprobado';
                  } else if (estadoUpper === 'RECHAZADO') {
                    badgeBg = '#fee2e2';
                    badgeColor = '#dc2626';
                    estadoLabel = 'Rechazado';
                  }

                  return (
                    <tr key={item.id_entrega} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '1rem 1.25rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, color: '#334155' }}>
                          <Calendar size={14} color="#94a3b8" />
                          {item.fecha_subida}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.nombre_alumno}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                              <span style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>{item.no_control}</span>
                              <span>{item.carrera}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/admin/validacion?no_control=${encodeURIComponent(item.no_control)}&id_documento=${item.id_documento || ''}&clave=${encodeURIComponent(item.clave_formato || '')}`)}
                            title={`Fijar y validar ${item.clave_formato} de ${item.nombre_alumno} en la Matriz de Validación`}
                            style={{
                              backgroundColor: '#ecfdf5',
                              border: '1.5px solid #10b981',
                              color: '#047857',
                              padding: '0.42rem 0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 3px rgba(16, 185, 129, 0.12)',
                              flexShrink: 0
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = '#059669';
                              e.currentTarget.style.color = '#ffffff';
                              e.currentTarget.style.borderColor = '#059669';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = '#ecfdf5';
                              e.currentTarget.style.color = '#047857';
                              e.currentTarget.style.borderColor = '#10b981';
                            }}
                          >
                            <CheckSquare size={13} /> Validar en Matriz
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.nombre_documento}</div>
                        <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '0.15rem' }}>
                          {item.clave_formato} • {item.etapa}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          padding: '0.25rem 0.7rem',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-block'
                        }}>
                          {estadoLabel}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600 }}>
                          <FileSpreadsheet size={15} />
                          {item.ruta_archivo}
                        </div>
                        {item.observaciones && (
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={item.observaciones}>
                            {item.observaciones}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <a
                          href={`http://localhost:5000/api/admin/entregas-recibidas/descargar/${item.id_entrega}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            color: '#059669',
                            borderColor: '#a7f3d0'
                          }}
                          title="Descargar copia del Excel entregado"
                        >
                          <Download size={14} /> Descargar Excel
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
