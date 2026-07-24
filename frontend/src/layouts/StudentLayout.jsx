import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';

export default function StudentLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    window.location.href = 'http://localhost:5000/api/auth/logout';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      <header style={{ backgroundColor: '#1e293b', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Portal del Alumno</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/student" style={{ color: 'white', textDecoration: 'none' }}>Mi Proyecto</Link>
          <Link to="/student/expediente" style={{ color: 'white', textDecoration: 'none' }}>Expediente</Link>
          <Link to="/student/formatos" style={{ color: 'white', textDecoration: 'none' }}>Formatos</Link>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>Salir</button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}
