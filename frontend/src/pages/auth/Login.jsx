import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle, ArrowRight } from 'lucide-react';
import RaccoonIcon from '../../components/RaccoonIcon';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role');
    if (token && role) {
      if (role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (role === 'ALUMNO') {
        navigate('/student', { replace: true });
      }
    }
  }, [navigate]);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isLanAccess = currentHost !== 'localhost' && currentHost !== '127.0.0.1';

  const [loadingTest, setLoadingTest] = React.useState(false);
  const [showTestProfiles, setShowTestProfiles] = React.useState(isLanAccess);
  const [customEmail, setCustomEmail] = React.useState('');

  const handleMicrosoftLogin = () => {
    const host = window.location.hostname || 'localhost';
    const origin = window.location.origin;
    window.location.href = `http://${host}:5000/api/auth/login?origin=${encodeURIComponent(origin)}`;
  };

  const handleTestLogin = async (email, asRole = null) => {
    setLoadingTest(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, as_role: asRole })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_role', data.user.tipo);
        localStorage.setItem('user_email', data.user.correo || '');
        localStorage.setItem('user_name', data.user.nombre || '');
        if (data.user.rol) localStorage.setItem('user_admin_rol', data.user.rol);
        if (data.user.no_control) localStorage.setItem('user_control', data.user.no_control);
        if (data.user.carrera) localStorage.setItem('user_carrera', data.user.carrera);

        if (data.user.tipo === 'ADMIN') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/student', { replace: true });
        }
      } else {
        alert(data.error || 'No se pudo iniciar sesión de prueba');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor');
    } finally {
      setLoadingTest(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      background: 'radial-gradient(ellipse at top, #064e3b 0%, #022c22 45%, #051610 100%)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Glow Effects */}
      <div style={{ position: 'absolute', width: '420px', height: '420px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.25)', filter: 'blur(130px)', top: '10%', left: '20%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: '380px', height: '380px', borderRadius: '50%', background: 'rgba(52, 211, 153, 0.18)', filter: 'blur(110px)', bottom: '10%', right: '20%', pointerEvents: 'none' }} />

      {/* Main Glass Card */}
      <div style={{ 
        background: 'rgba(6, 30, 22, 0.85)', 
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '3rem 2.5rem', 
        borderRadius: '24px', 
        border: '1px solid rgba(16, 185, 129, 0.2)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 35px rgba(16, 185, 129, 0.2)', 
        textAlign: 'center', 
        maxWidth: '460px', 
        width: '100%',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Institutional Icon */}
        <div style={{ 
          width: '62px', 
          height: '62px', 
          borderRadius: '18px', 
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 25px rgba(16, 185, 129, 0.45)'
        }}>
          <RaccoonIcon size={36} color="white" />
        </div>

        <h1 style={{ color: '#ffffff', margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Servicio Social ITST
        </h1>
        <p style={{ color: '#a7f3d0', margin: '0 0 1.75rem 0', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Sistema Institucional de Automatización y Gestión Documental
        </p>

        {/* LAN Indicator Badge */}
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.4rem', 
          backgroundColor: 'rgba(16, 185, 129, 0.12)', 
          border: '1px solid rgba(16, 185, 129, 0.25)', 
          padding: '0.35rem 0.8rem', 
          borderRadius: '20px', 
          color: '#6ee7b7', 
          fontSize: '0.78rem',
          fontWeight: 600,
          marginBottom: '1.5rem'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          <span>Red Local: http://{currentHost}:5173</span>
        </div>

        {/* Microsoft SSO Button */}
        <button 
          onClick={handleMicrosoftLogin}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.85rem', 
            width: '100%', 
            padding: '0.95rem 1.25rem', 
            backgroundColor: '#ffffff', 
            color: '#0f172a', 
            border: 'none', 
            borderRadius: '12px', 
            fontSize: '0.95rem', 
            fontWeight: 700, 
            cursor: 'pointer', 
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 15px rgba(255, 255, 255, 0.15)',
            marginBottom: '1.25rem'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 255, 255, 0.25)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 255, 255, 0.15)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 21 21">
            <path fill="#f35325" d="M1 1h9v9H1z"/>
            <path fill="#81bc06" d="M11 1h9v9h-9z"/>
            <path fill="#05a6f0" d="M1 11h9v9H1z"/>
            <path fill="#ffba08" d="M11 11h9v9h-9z"/>
          </svg>
          Iniciar sesión con Microsoft
        </button>

        {/* Quick Test Profiles Accordion */}
        <div style={{ marginTop: '1rem', textAlign: 'left' }}>
          <button
            type="button"
            onClick={() => setShowTestProfiles(!showTestProfiles)}
            style={{
              background: 'none',
              border: 'none',
              color: '#34d399',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              width: '100%',
              padding: '0.4rem 0',
              textDecoration: 'underline'
            }}
          >
            {showTestProfiles ? '▲ Ocultar perfiles de prueba en red' : '▼ Acceso Rápido para Pruebas en Red Local'}
          </button>

          {showTestProfiles && (
            <div style={{
              marginTop: '0.75rem',
              padding: '1rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#a7f3d0', fontWeight: 600, marginBottom: '0.25rem' }}>
                Selecciona un perfil para ingresar al instante desde cualquier teléfono o PC:
              </div>

              <button
                disabled={loadingTest}
                onClick={() => handleTestLogin('l23te0037@teziutlan.tecnm.mx', 'ADMIN')}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #059669',
                  backgroundColor: '#064e3b',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>👑 Administrador (José Manuel)</span>
                <span style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>SuperAdmin →</span>
              </button>

              <button
                disabled={loadingTest}
                onClick={() => handleTestLogin('l23te0048@teziutlan.tecnm.mx', 'ALUMNO')}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  backgroundColor: 'rgba(6, 78, 59, 0.5)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>🎓 Alumna (Maria Elena - 23TE0048)</span>
                <span style={{ fontSize: '0.7rem', color: '#a7f3d0' }}>Servicio Activo →</span>
              </button>

              <button
                disabled={loadingTest}
                onClick={() => handleTestLogin('l20te0467@teziutlan.tecnm.mx', 'ALUMNO')}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  backgroundColor: 'rgba(6, 78, 59, 0.5)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>🎓 Alumno (Daniel Fidel - 20TE0467)</span>
                <span style={{ fontSize: '0.7rem', color: '#a7f3d0' }}>Estudiante →</span>
              </button>

              {/* Iniciar con cualquier otro correo institucional */}
              <div style={{
                marginTop: '0.5rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                <label style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 600 }}>
                  O escribe cualquier correo institucional registrado:
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="email"
                    placeholder="ej. alumno@teziutlan.tecnm.mx"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customEmail.trim()) {
                        handleTestLogin(customEmail.trim());
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    disabled={loadingTest || !customEmail.trim()}
                    onClick={() => handleTestLogin(customEmail.trim())}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#10b981',
                      color: '#061e16',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Entrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security badge */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.78rem' }}>
          <ShieldCheck size={16} color="#10b981" />
          <span>Acceso institucional ITST (@teziutlan.tecnm.mx)</span>
        </div>
      </div>
    </div>
  );
}
