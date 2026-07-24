import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    window.location.href = 'http://localhost:5000/api/auth/logout';
  };

  const NavItem = ({ to, children }) => {
    // Check if current location matches 'to' exactly, or starts with it (for nested routes)
    // To avoid '/admin' matching '/admin/alumnos', we do an exact match for '/admin'
    const isActive = to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(to);
    
    return (
      <Link 
        to={to} 
        style={{ 
          color: isActive ? '#38bdf8' : '#cbd5e1', 
          fontWeight: isActive ? 600 : 400, 
          textDecoration: 'none', 
          padding: '0.75rem 1rem', 
          borderRadius: '6px', 
          backgroundColor: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent', 
          transition: 'all 0.2s ease-in-out' 
        }} 
        onMouseEnter={e => !isActive && (e.target.style.backgroundColor='rgba(255,255,255,0.05)')} 
        onMouseLeave={e => !isActive && (e.target.style.backgroundColor='transparent')}
      >
        {children}
      </Link>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f1f5f9' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#38bdf8' }}>Admin Panel V2</h2>
        </div>
        <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavItem to="/admin">Dashboard</NavItem>
          <NavItem to="/admin/alumnos">Importar Alumnos</NavItem>
          <NavItem to="/admin/proyectos">Auditoría Proyectos</NavItem>
          <NavItem to="/admin/validacion">Validar Expedientes</NavItem>
          <NavItem to="/admin/formularios">Creador Formularios</NavItem>
          <NavItem to="/admin/reportes">Reportes/Notificar</NavItem>
          <NavItem to="/admin/configuracion">Calendario Oficial</NavItem>
          <NavItem to="/admin/catalogos">Gestión de Catálogos</NavItem>
          <NavItem to="/admin/personal">Gestión Personal</NavItem>
        </nav>
        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '0.75rem', backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => {e.target.style.backgroundColor='#ef4444'; e.target.style.color='white'}} onMouseLeave={e => {e.target.style.backgroundColor='transparent'; e.target.style.color='#ef4444'}}>Cerrar Sesión</button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

