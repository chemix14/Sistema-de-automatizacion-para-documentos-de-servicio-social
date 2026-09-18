import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import RaccoonIcon from '../../components/RaccoonIcon';

export default function LoginCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const reason = params.get('reason');

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_role', payload.tipo);
        localStorage.setItem('user_email', payload.correo || '');
        localStorage.setItem('user_name', payload.nombre || '');
        if (payload.rol) localStorage.setItem('user_admin_rol', payload.rol);
        if (payload.no_control) localStorage.setItem('user_control', payload.no_control);
        if (payload.carrera) localStorage.setItem('user_carrera', payload.carrera);
        
        // Redirección estricta según el rol verificado en base de datos
        if (payload.tipo === 'ADMIN' || payload.rol === 'SuperAdmin' || payload.rol === 'Administrador') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/student', { replace: true });
        }
      } catch (e) {
        console.error("Invalid token format", e);
        navigate('/login', { replace: true });
      }
    } else if (reason) {
      alert("Error de autenticación: " + reason);
      navigate('/login', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [location, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: '#061e16',
      color: '#ffffff',
      gap: '1rem'
    }}>
      <div style={{ 
        width: '56px', 
        height: '56px', 
        borderRadius: '16px', 
        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        boxShadow: '0 8px 25px rgba(16, 185, 129, 0.45)',
        animation: 'pulse 1.5s infinite'
      }}>
        <RaccoonIcon size={32} color="white" />
      </div>
      <p style={{ fontSize: '1rem', fontWeight: 600, color: '#a7f3d0', margin: 0 }}>
        Iniciando sesión en Servicio Social ITST...
      </p>
    </div>
  );
}
