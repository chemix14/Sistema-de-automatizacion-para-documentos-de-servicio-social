import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FolderKanban, FileText, CheckSquare, LogOut, GraduationCap } from 'lucide-react';
import RaccoonIcon from '../components/RaccoonIcon';

export default function StudentLayout() {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    window.location.href = 'http://localhost:5000/api/auth/logout';
  };

  const navLinks = [
    { to: '/student', label: 'Mi Proyecto', icon: FolderKanban, exact: true },
    { to: '/student/expediente', label: 'Mi Expediente', icon: CheckSquare },
    { to: '/student/formatos', label: 'Formatos Oficiales', icon: FileText }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      {/* Top Navbar */}
      <header style={{ 
        backgroundColor: '#061e16', 
        color: 'white', 
        padding: '0 2rem', 
        height: '68px',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
          }}>
            <RaccoonIcon size={24} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>
              Portal del Estudiante
            </h2>
            <span style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 700 }}>Servicio Social ITST • Mapaches</span>
          </div>
        </div>

        {/* Navigation links */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact 
              ? location.pathname === link.to 
              : location.pathname.startsWith(link.to);

            return (
              <Link 
                key={link.to}
                to={link.to} 
                style={{ 
                  color: isActive ? '#ffffff' : '#94a3b8', 
                  fontWeight: isActive ? 700 : 500, 
                  textDecoration: 'none',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => !isActive && (e.currentTarget.style.backgroundColor='rgba(255,255,255,0.06)', e.currentTarget.style.color='white')}
                onMouseLeave={e => !isActive && (e.currentTarget.style.backgroundColor='transparent', e.currentTarget.style.color='#94a3b8')}
              >
                <Icon size={16} color={isActive ? '#34d399' : '#64748b'} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />

          <button 
            onClick={handleLogout} 
            style={{ 
              background: 'transparent', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              color: '#f87171', 
              padding: '0.45rem 0.9rem', 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {e.currentTarget.style.backgroundColor='#ef4444'; e.currentTarget.style.color='white'}}
            onMouseLeave={e => {e.currentTarget.style.backgroundColor='transparent'; e.currentTarget.style.color='#f87171'}}
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2.5rem 2rem', maxWidth: '1300px', margin: '0 auto', width: '100%' }} className="animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
