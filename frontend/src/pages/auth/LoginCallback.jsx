import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LoginCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const reason = params.get('reason');

    if (token) {
      // Decode JWT roughly to know where to redirect
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_role', payload.tipo);
        
        if (payload.tipo === 'ADMIN' || payload.tipo === 'DOCENTE') {
          navigate('/admin');
        } else {
          navigate('/student');
        }
      } catch (e) {
        console.error("Invalid token format", e);
        navigate('/login');
      }
    } else if (reason) {
      alert("Error de autenticación: " + reason);
      navigate('/login');
    } else {
      navigate('/login');
    }
  }, [location, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Autenticando...</p>
    </div>
  );
}
