import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleMicrosoftLogin = () => {
    // Redirige al backend que iniciará el flujo OAuth con Microsoft
    window.location.href = 'http://localhost:5000/api/auth/login';
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <div style={{ background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ color: '#1e293b', marginBottom: '0.5rem', fontSize: '1.75rem' }}>Servicio Social V2</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Inicia sesión con tu cuenta institucional para acceder al portal.</p>
        
        <button 
          onClick={handleMicrosoftLogin}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', width: '100%', 
            padding: '0.85rem', backgroundColor: '#0f172a', color: 'white', border: 'none', 
            borderRadius: '6px', fontSize: '1rem', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' 
          }}
          onMouseEnter={e => e.target.style.backgroundColor = '#1e293b'}
          onMouseLeave={e => e.target.style.backgroundColor = '#0f172a'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21"><path fill="#f35325" d="M1 1h9v9H1z"/><path fill="#81bc06" d="M11 1h9v9h-9z"/><path fill="#05a6f0" d="M1 11h9v9H1z"/><path fill="#ffba08" d="M11 11h9v9h-9z"/></svg>
          Iniciar sesión con Microsoft
        </button>
      </div>
    </div>
  );
}
