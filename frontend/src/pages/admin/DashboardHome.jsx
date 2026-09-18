import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FolderKanban, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  FileSpreadsheet, 
  Calendar,
  ShieldCheck
} from 'lucide-react';
import RaccoonIcon from '../../components/RaccoonIcon';

export default function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    alumnos_activos: 0,
    proyectos_activos: 0,
    documentos_pendientes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setStats(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stats:", err);
        setLoading(false);
      });
  }, []);

  const statCards = [
    {
      title: 'Alumnos en Sistema',
      count: stats.alumnos_activos,
      subtitle: 'Alumnos registrados',
      icon: Users,
      color: '#059669',
      lightBg: '#ecfdf5',
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      link: '/admin/alumnos'
    },
    {
      title: 'Proyectos Activos',
      count: stats.proyectos_activos,
      subtitle: 'En dependencias vinculadas',
      icon: FolderKanban,
      color: '#0d9488',
      lightBg: '#f0fdfa',
      gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
      link: '/admin/proyectos'
    },
    {
      title: 'Expedientes por Revisar',
      count: stats.documentos_pendientes,
      subtitle: 'Entregas en validación',
      icon: Clock,
      color: '#d97706',
      lightBg: '#fffbeb',
      gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      link: '/admin/validacion'
    }
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Banner de Bienvenida */}
      <div style={{ 
        background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)', 
        borderRadius: '20px', 
        padding: '2.5rem', 
        color: 'white', 
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(2, 44, 34, 0.35)',
        border: '1px solid rgba(16, 185, 129, 0.25)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '700px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '1rem', border: '1px solid rgba(110, 231, 183, 0.25)' }}>
            <RaccoonIcon size={16} color="#34d399" /> Plataforma Integral ITST • Los Mapaches
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            Bienvenido, José Manuel Méndez
          </h1>
          <p style={{ color: '#d1fae5', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
            Supervisa en tiempo real el ciclo de servicio social, valida entregas de expedientes, genera formatos automatizados y configura el calendario oficial.
          </p>
        </div>
      </div>

      {/* Tarjetas de Estadísticas Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {statCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div 
              key={idx} 
              onClick={() => navigate(c.link)}
              style={{ 
                backgroundColor: 'white', 
                borderRadius: '16px', 
                padding: '1.75rem', 
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = c.color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {c.title}
                </span>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
                  {loading ? '...' : c.count}
                </div>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
                  {c.subtitle}
                </span>
              </div>

              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '16px', 
                background: c.gradient,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: `0 8px 16px -4px ${c.color}60`
              }}>
                <Icon size={28} color="white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Módulos de Acceso Rápido */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
        Acciones Rápidas
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div 
          onClick={() => navigate('/admin/validacion')}
          style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#059669'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>Matriz de Validación</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
            Aprueba o solicita correcciones a las entregas de expedientes de los prestadores de servicio.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669', fontWeight: 700, fontSize: '0.85rem' }}>
            Ir a Validación <ArrowRight size={16} />
          </div>
        </div>

        <div 
          onClick={() => navigate('/admin/formularios')}
          style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#0d9488'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: '#f0fdfa', color: '#0d9488' }}>
              <FileSpreadsheet size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>Creador de Formatos</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
            Diseña formularios interactivos con mapeo automático de celdas a plantillas oficiales en Excel y Word.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0d9488', fontWeight: 700, fontSize: '0.85rem' }}>
            Gestionar Formatos <ArrowRight size={16} />
          </div>
        </div>

        <div 
          onClick={() => navigate('/admin/configuracion')}
          style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#047857'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#047857' }}>
              <Calendar size={22} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>Calendario Oficial</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
            Establece los periodos escolares y las fechas de corte para cada uno de los bimestres.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#047857', fontWeight: 700, fontSize: '0.85rem' }}>
            Configurar Fechas <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
