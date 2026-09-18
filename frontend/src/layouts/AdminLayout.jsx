import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  CheckSquare, 
  FileSpreadsheet, 
  Bell, 
  Calendar, 
  Library, 
  UserCheck, 
  Inbox,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import RaccoonIcon from '../components/RaccoonIcon';

export default function AdminLayout() {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    window.location.href = 'http://localhost:5000/api/auth/logout';
  };

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/buzon-recepcion', label: 'Buzón de Recepción', icon: Inbox },
    { to: '/admin/alumnos', label: 'Gestión de Alumnos', icon: Users },
    { to: '/admin/proyectos', label: 'Auditoría Proyectos', icon: FolderKanban },
    { to: '/admin/validacion', label: 'Validar Expedientes', icon: CheckSquare },
    { to: '/admin/formularios', label: 'Creador de Formatos', icon: FileSpreadsheet },
    { to: '/admin/reportes', label: 'Bitácora y Reportes', icon: FileSpreadsheet },
    { to: '/admin/avisos', label: 'Avisos a Alumnos', icon: Bell },
    { to: '/admin/configuracion', label: 'Calendario Oficial', icon: Calendar },
    { to: '/admin/catalogos', label: 'Catálogos Carreras', icon: Library },
    { to: '/admin/personal', label: 'Personal y Accesos', icon: UserCheck },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '270px', 
        backgroundColor: '#061e16', 
        color: 'white', 
        display: 'flex', 
        flexDirection: 'column',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 20
      }}>
        {/* Brand Header */}
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
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
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
              Servicio Social
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              <span style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 700 }}>Mapaches ITST V2</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '1.25rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '0 0.75rem', marginBottom: '0.5rem', opacity: 0.8 }}>
            Navegación Principal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact 
              ? location.pathname === item.to 
              : location.pathname.startsWith(item.to);

            return (
              <Link 
                key={item.to}
                to={item.to} 
                style={{ 
                  color: isActive ? '#ffffff' : '#94a3b8', 
                  fontWeight: isActive ? 600 : 500, 
                  textDecoration: 'none', 
                  padding: '0.7rem 0.9rem', 
                  borderRadius: '10px', 
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  fontSize: '0.875rem',
                  transition: 'all 0.18s ease-in-out'
                }} 
                onMouseEnter={e => !isActive && (e.currentTarget.style.backgroundColor='rgba(255,255,255,0.05)', e.currentTarget.style.color='#f1f5f9')} 
                onMouseLeave={e => !isActive && (e.currentTarget.style.backgroundColor='transparent', e.currentTarget.style.color='#94a3b8')}
              >
                <Icon size={18} color={isActive ? '#34d399' : '#64748b'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem', padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'white' }}>
              JM
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                José Manuel Méndez
              </div>
              <div style={{ fontSize: '0.7rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <ShieldCheck size={12} /> SuperAdmin
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout} 
            style={{ 
              width: '100%', 
              padding: '0.6rem', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              color: '#f87171', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.2s' 
            }} 
            onMouseEnter={e => {e.currentTarget.style.backgroundColor='#ef4444'; e.currentTarget.style.color='white'}} 
            onMouseLeave={e => {e.currentTarget.style.backgroundColor='rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color='#f87171'}}
          >
            <LogOut size={15} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minWidth: 0 }}>
        {/* Top Navbar */}
        <header style={{ 
          height: '65px', 
          backgroundColor: 'white', 
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 15,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Panel Institucional</span>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
              {navItems.find(n => n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to))?.label || 'Módulo'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '20px', color: '#065f46', fontSize: '0.75rem', fontWeight: 700 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              Periodo: ENE-JUN 2026
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div style={{ flex: 1, padding: '2rem' }} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
