import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  HardDrive, 
  Trash2, 
  UserCheck, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Filter, 
  ShieldCheck, 
  FileText, 
  Clock, 
  Sparkles,
  Info,
  Layers,
  ArrowDownCircle
} from 'lucide-react';

export default function MantenimientoAlmacenamiento() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstatus, setFilterEstatus] = useState('TODOS'); // 'TODOS', 'FINALIZADOS', 'ACTIVOS'

  const fetchResumen = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/mantenimiento/resumen');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        Swal.fire('Error', json.error || 'No se pudo obtener el resumen de almacenamiento', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Error de conexión con el servidor backend.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumen();
  }, []);

  // Eliminar archivos por criterio (TODOS o FINALIZADOS)
  const handleEliminarCriterio = (criterio) => {
    const esTodos = criterio === 'TODOS';
    const titulo = esTodos 
      ? '¿Eliminar TODOS los Archivos Generados?' 
      : '¿Depurar Archivos de Alumnos Finalizados?';

    const textoHtml = esTodos
      ? `Estás a punto de eliminar <b>TODOS</b> los documentos generados en el servidor (${data?.total_archivos || 0} archivos, ${data?.espacio_total_formateado || '0 B'}).<br/><br/><span style="color: #dc2626; font-weight: 700;">⚠️ Esta acción liberará todo el espacio y los alumnos activos deberán regenerar sus formatos al volver a ingresar.</span>`
      : `Se eliminarán únicamente los archivos de los alumnos con servicio social <b>FINALIZADO / CONCLUIDO</b> (${data?.archivos_finalizados_count || 0} archivos, ${data?.archivos_finalizados_formateado || '0 B'}).<br/><br/><span style="color: #059669; font-weight: 700;">🛡️ Los archivos de los alumnos activos quedarán 100% protegidos e intactos.</span>`;

    const confirmColor = esTodos ? '#dc2626' : '#059669';
    const confirmText = esTodos ? 'Sí, eliminar todos' : 'Sí, depurar finalizados';

    Swal.fire({
      title: titulo,
      html: textoHtml,
      icon: esTodos ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: '#94a3b8',
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar',
      focusCancel: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        setActionLoading(true);
        try {
          const res = await fetch('http://localhost:5000/api/admin/mantenimiento/eliminar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ criterio })
          });
          const json = await res.json();
          if (res.ok) {
            Swal.fire({
              title: '¡Depuración Exitosa!',
              text: json.message || 'Se liberó espacio en el servidor correctamente.',
              icon: 'success',
              confirmButtonColor: '#059669'
            });
            fetchResumen();
          } else {
            Swal.fire('Error', json.error || 'No se pudo completar la depuración', 'error');
          }
        } catch (err) {
          console.error(err);
          Swal.fire('Error', 'Fallo de conexión al procesar la depuración.', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // Eliminar un archivo individual
  const handleEliminarIndividual = (nombreArchivo, fsizeStr) => {
    Swal.fire({
      title: '¿Eliminar archivo específico?',
      html: `¿Deseas eliminar permanentemente el archivo <b>${nombreArchivo}</b> (${fsizeStr}) del servidor?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar archivo',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch('http://localhost:5000/api/admin/mantenimiento/eliminar-archivo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_archivo: nombreArchivo })
          });
          const json = await res.json();
          if (res.ok) {
            Swal.fire('¡Eliminado!', json.message, 'success');
            fetchResumen();
          } else {
            Swal.fire('Error', json.error || 'No se pudo eliminar el archivo', 'error');
          }
        } catch (err) {
          console.error(err);
          Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
        }
      }
    });
  };

  // Filtrado de la tabla de archivos
  const archivosFiltrados = (data?.archivos || []).filter(arch => {
    // Filtro estatus
    if (filterEstatus === 'FINALIZADOS' && !arch.es_finalizado) return false;
    if (filterEstatus === 'ACTIVOS' && arch.es_finalizado) return false;

    // Filtro búsqueda texto
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (arch.nombre_archivo || '').toLowerCase().includes(term) ||
      (arch.no_control || '').toLowerCase().includes(term) ||
      (arch.nombre_alumno || '').toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Encabezado Principal */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
            }}>
              <HardDrive size={22} color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                Mantenimiento y Depuración de Almacenamiento
              </h1>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                Audita el almacenamiento de documentos generados y depura archivos de forma selectiva o masiva
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={fetchResumen} 
          disabled={loading || actionLoading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, padding: '0.65rem 1.1rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar Estadísticas
        </button>
      </div>

      {/* Tarjetas de Métricas (KPIs) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
        gap: '1.25rem', 
        marginBottom: '2rem' 
      }}>
        {/* KPI 1: Espacio Total */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '16px', 
          padding: '1.4rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.1rem'
        }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: '14px', 
            backgroundColor: '#ecfdf5', 
            color: '#059669', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <HardDrive size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Almacenamiento Total
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {loading ? '...' : (data?.espacio_total_formateado || '0 B')}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {loading ? '...' : `${data?.total_archivos || 0} archivos generados`}
            </span>
          </div>
        </div>

        {/* KPI 2: Alumnos Finalizados */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '16px', 
          padding: '1.4rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.1rem'
        }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: '14px', 
            backgroundColor: '#eff6ff', 
            color: '#2563eb', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <UserCheck size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alumnos Concluidos
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e40af', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {loading ? '...' : (data?.archivos_finalizados_formateado || '0 B')}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>
              {loading ? '...' : `${data?.archivos_finalizados_count || 0} archivos listos para depurar`}
            </span>
          </div>
        </div>

        {/* KPI 3: Alumnos Activos */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '16px', 
          padding: '1.4rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.1rem'
        }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: '14px', 
            backgroundColor: '#fef3c7', 
            color: '#d97706', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Users size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alumnos en Proceso
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309', lineHeight: 1.2, marginTop: '0.15rem' }}>
              {loading ? '...' : (data?.archivos_activos_formateado || '0 B')}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
              {loading ? '...' : `${data?.archivos_activos_count || 0} archivos protegidos`}
            </span>
          </div>
        </div>

        {/* KPI 4: Estado de Salud */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '16px', 
          padding: '1.4rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.1rem'
        }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: '14px', 
            backgroundColor: '#ecfdf5', 
            color: '#059669', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Estado del Servidor
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', lineHeight: 1.2, marginTop: '0.25rem' }}>
              {data?.total_archivos === 0 ? 'Limpio y Óptimo' : 'Operativo'}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Directorio /backend/generados
            </span>
          </div>
        </div>
      </div>

      {/* Bloque de Acciones de Depuración */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2.5rem' 
      }}>
        {/* Acción 1: Depurar Alumnos Concluidos (Recomendada) */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '18px', 
          padding: '1.75rem', 
          border: '1px solid #d1fae5', 
          boxShadow: '0 4px 16px rgba(5, 150, 105, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '6px', 
            height: '100%', 
            backgroundColor: '#059669' 
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <span style={{ 
                backgroundColor: '#ecfdf5', 
                color: '#059669', 
                fontWeight: 800, 
                fontSize: '0.72rem', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Recomendada • Segura
              </span>
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#064e3b' }}>
              Depurar Alumnos con Servicio Concluido
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
              Elimina exclusivamente los documentos generados de estudiantes que ya han acreditado o concluido su servicio social (estatus <b>Finalizado</b>), preservando intactos los archivos de quienes continúan activos.
            </p>

            <div style={{ 
              backgroundColor: '#f8fafc', 
              borderRadius: '10px', 
              padding: '0.75rem 1rem', 
              marginTop: '1.25rem',
              fontSize: '0.82rem',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Archivos elegibles para depurar:</span>
              <span style={{ fontWeight: 800, color: '#059669' }}>
                {data?.archivos_finalizados_count || 0} archivos ({data?.archivos_finalizados_formateado || '0 B'})
              </span>
            </div>
          </div>

          <button
            onClick={() => handleEliminarCriterio('FINALIZADOS')}
            disabled={actionLoading || (data?.archivos_finalizados_count || 0) === 0}
            className="btn btn-primary"
            style={{ 
              marginTop: '1.5rem', 
              padding: '0.75rem 1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: (data?.archivos_finalizados_count || 0) === 0 ? 'not-allowed' : 'pointer',
              opacity: (data?.archivos_finalizados_count || 0) === 0 ? 0.6 : 1
            }}
          >
            <UserCheck size={18} />
            Depurar Alumnos Finalizados
          </button>
        </div>

        {/* Acción 2: Depuración Masiva Total */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '18px', 
          padding: '1.75rem', 
          border: '1px solid #fee2e2', 
          boxShadow: '0 4px 16px rgba(220, 38, 38, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '6px', 
            height: '100%', 
            backgroundColor: '#dc2626' 
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <span style={{ 
                backgroundColor: '#fef2f2', 
                color: '#dc2626', 
                fontWeight: 800, 
                fontSize: '0.72rem', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Acción Global • Cuidado
              </span>
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#7f1d1d' }}>
              Eliminar Todos los Archivos Generados
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
              Borra absolutamente todos los documentos y reportes generados por cualquier alumno en el servidor. Recomendado al iniciar un nuevo ciclo escolar o tras una auditoría oficial de ciclo.
            </p>

            <div style={{ 
              backgroundColor: '#f8fafc', 
              borderRadius: '10px', 
              padding: '0.75rem 1rem', 
              marginTop: '1.25rem',
              fontSize: '0.82rem',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Total en el servidor:</span>
              <span style={{ fontWeight: 800, color: '#dc2626' }}>
                {data?.total_archivos || 0} archivos ({data?.espacio_total_formateado || '0 B'})
              </span>
            </div>
          </div>

          <button
            onClick={() => handleEliminarCriterio('TODOS')}
            disabled={actionLoading || (data?.total_archivos || 0) === 0}
            className="btn"
            style={{ 
              marginTop: '1.5rem', 
              padding: '0.75rem 1.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.92rem',
              backgroundColor: '#dc2626',
              color: 'white',
              cursor: (data?.total_archivos || 0) === 0 ? 'not-allowed' : 'pointer',
              opacity: (data?.total_archivos || 0) === 0 ? 0.6 : 1
            }}
          >
            <Trash2 size={18} />
            Eliminar Todos los Archivos
          </button>
        </div>
      </div>

      {/* Tabla Detallada de Archivos */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '18px', 
        padding: '1.5rem', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Inventario de Archivos en Servidor
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {archivosFiltrados.length} de {data?.total_archivos || 0} archivos mostrados
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Filtros de estatus */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '0.2rem', borderRadius: '10px' }}>
              <button
                onClick={() => setFilterEstatus('TODOS')}
                style={{
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: filterEstatus === 'TODOS' ? 'white' : 'transparent',
                  color: filterEstatus === 'TODOS' ? '#0f172a' : '#64748b',
                  boxShadow: filterEstatus === 'TODOS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                Todos ({data?.total_archivos || 0})
              </button>
              <button
                onClick={() => setFilterEstatus('FINALIZADOS')}
                style={{
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: filterEstatus === 'FINALIZADOS' ? 'white' : 'transparent',
                  color: filterEstatus === 'FINALIZADOS' ? '#059669' : '#64748b',
                  boxShadow: filterEstatus === 'FINALIZADOS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                Finalizados ({data?.archivos_finalizados_count || 0})
              </button>
              <button
                onClick={() => setFilterEstatus('ACTIVOS')}
                style={{
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: filterEstatus === 'ACTIVOS' ? 'white' : 'transparent',
                  color: filterEstatus === 'ACTIVOS' ? '#d97706' : '#64748b',
                  boxShadow: filterEstatus === 'ACTIVOS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                Activos ({data?.archivos_activos_count || 0})
              </button>
            </div>

            {/* Barra de búsqueda */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por alumno o archivo..."
                className="form-control"
                style={{ paddingLeft: '2.2rem', fontSize: '0.82rem', borderRadius: '10px' }}
              />
            </div>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Cargando inventario de archivos...</p>
          </div>
        ) : (data?.total_archivos || 0) === 0 ? (
          <div style={{ 
            padding: '4rem 1.5rem', 
            textAlign: 'center', 
            backgroundColor: '#f8fafc', 
            borderRadius: '14px',
            border: '2px dashed #cbd5e1'
          }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              backgroundColor: '#ecfdf5', 
              color: '#059669', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
              Directorio Completamente Limpio
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
              No existen archivos generados pendientes en el servidor. El almacenamiento se encuentra en su estado óptimo.
            </p>
          </div>
        ) : archivosFiltrados.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>No se encontraron archivos que coincidan con los filtros aplicados.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Archivo</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Alumno / Matrícula</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Estatus Servicio</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Tamaño</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Fecha Generación</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {archivosFiltrados.map((arch) => (
                  <tr key={arch.nombre_archivo} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.86rem' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <FileText size={18} color="#059669" />
                        <div>
                          <span style={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>
                            {arch.nombre_archivo}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>
                        {arch.nombre_alumno}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                        {arch.no_control}
                      </span>
                    </td>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      {arch.es_finalizado ? (
                        <span style={{ 
                          padding: '0.25rem 0.65rem', 
                          borderRadius: '20px', 
                          backgroundColor: '#ecfdf5', 
                          color: '#059669', 
                          fontSize: '0.74rem', 
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <CheckCircle2 size={12} /> Finalizado
                        </span>
                      ) : (
                        <span style={{ 
                          padding: '0.25rem 0.65rem', 
                          borderRadius: '20px', 
                          backgroundColor: '#fef3c7', 
                          color: '#b45309', 
                          fontSize: '0.74rem', 
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <Clock size={12} /> {arch.estatus_alumno || 'Activo'}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#334155' }}>
                      {arch.tamano_formateado}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {arch.fecha_modificacion || 'N/A'}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleEliminarIndividual(arch.nombre_archivo, arch.tamano_formateado)}
                        className="btn btn-sm btn-secondary"
                        style={{ 
                          color: '#dc2626', 
                          borderColor: '#fee2e2', 
                          backgroundColor: '#fff5f5', 
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px'
                        }}
                        title="Eliminar archivo específico"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
