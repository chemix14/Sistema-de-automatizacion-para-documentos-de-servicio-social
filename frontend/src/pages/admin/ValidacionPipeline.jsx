import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  Search, 
  CheckCircle2, 
  CheckSquare,
  AlertCircle, 
  Clock, 
  Lock, 
  RefreshCw, 
  Filter, 
  FileCheck,
  AlertTriangle,
  Layers,
  GraduationCap,
  Zap,
  Bookmark,
  FileClock
} from 'lucide-react';

export default function ValidacionPipeline() {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetNoControl = searchParams.get('no_control') || searchParams.get('search') || '';
  const targetDocId = searchParams.get('id_documento') ? parseInt(searchParams.get('id_documento'), 10) : null;
  const targetClave = searchParams.get('clave') || '';

  const [pipeline, setPipeline] = useState([]);
  const [etapasData, setEtapasData] = useState({});
  const [infoEtapas, setInfoEtapas] = useState({});
  const [periodoActivo, setPeriodoActivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(targetNoControl);
  const [filterCarrera, setFilterCarrera] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'PENDIENTE', 'EN_REVISION', 'RECHAZADO', 'APROBADO', 'COMPLETO'

  useEffect(() => {
    if (targetNoControl) {
      setSearchTerm(targetNoControl);
      setStatusFilter('ALL');
    }
  }, [targetNoControl]);

  useEffect(() => {
    if (targetNoControl && targetDocId && !loading && pipeline.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`target-cell-${targetNoControl}-${targetDocId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [targetNoControl, targetDocId, loading, pipeline]);

  const fetchPipeline = () => {
    setLoading(true);
    fetch('http://127.0.0.1:5000/api/admin/matriz-validacion')
      .then(res => res.json())
      .then(data => {
        if (data.etapas && data.alumnos) {
          setEtapasData(data.etapas);
          setPipeline(data.alumnos);
          if (data.info_etapas) {
            setInfoEtapas(data.info_etapas);
          }
          if (data.periodo_activo) {
            setPeriodoActivo(data.periodo_activo);
          }
        } else {
          setPipeline([]);
          if (data.error) console.error(data.error);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setPipeline([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const handleStatusChange = (id_proyecto, no_control, id_documento, nuevo_estado) => {
    fetch('http://127.0.0.1:5000/api/admin/matriz-validacion', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_proyecto,
        no_control,
        id_documento,
        nuevo_estado
      })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true
        });
        Toast.fire({ icon: 'success', title: `Estado actualizado a "${nuevo_estado.replace('_', ' ')}"` });
        
        const newProjId = data.id_proyecto || id_proyecto;
        setPipeline(prev => prev.map(p => {
          if ((id_proyecto && p.id_proyecto === id_proyecto) || (no_control && p.no_control === no_control)) {
            return {
              ...p,
              id_proyecto: newProjId,
              documentos: {
                ...p.documentos,
                [id_documento]: nuevo_estado
              }
            };
          }
          return p;
        }));
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(() => Swal.fire('Error', 'Error al conectar con el servidor', 'error'));
  };

  // Función para aplicar un estado masivamente a todos los alumnos para un documento
  const handleBatchStatusChange = (id_documento, clave, nombre, nuevo_estado) => {
    if (!nuevo_estado) return;

    const estadoLabels = {
      'PENDIENTE': 'Pendiente (Sin entregar) 📌',
      'DISPONIBLE': 'Disponible 📄',
      'EN_REVISION': 'En Revisión ⏳',
      'APROBADO': 'Aprobado ✅',
      'BLOQUEADO': 'Bloqueado 🔒',
      'RECHAZADO': 'Rechazado ❌'
    };

    Swal.fire({
      title: '¿Aplicar a todos los alumnos?',
      html: `¿Deseas marcar el documento <b>${clave || ''} - ${nombre || ''}</b> como <b>${estadoLabels[nuevo_estado] || nuevo_estado}</b> para los <b>${pipeline.length}</b> alumnos registrados?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aplicar cambio masivo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b'
    }).then(async (result) => {
      if (result.isConfirmed) {
        fetch('http://127.0.0.1:5000/api/admin/matriz-validacion/batch-documento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_documento,
            nuevo_estado
          })
        })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            Swal.fire('¡Aplicado con éxito!', data.message || `Se actualizó el documento para todos los alumnos.`, 'success');
            
            // Actualizar estado local en caliente
            setPipeline(prev => prev.map(p => ({
              ...p,
              documentos: {
                ...p.documentos,
                [id_documento]: nuevo_estado
              }
            })));
          } else {
            Swal.fire('Error', data.error, 'error');
          }
        })
        .catch(() => Swal.fire('Error', 'Error de conexión con el servidor', 'error'));
      }
    });
  };

  const getStatusColor = (estado) => {
    switch((estado || '').toUpperCase()) {
      case 'APROBADO': 
        return { text: '#065f46', bg: '#ecfdf5', border: '#10b981', label: 'Aprobado' };
      case 'RECHAZADO': 
        return { text: '#991b1b', bg: '#fef2f2', border: '#ef4444', label: 'Rechazado' };
      case 'EN_REVISION': 
        return { text: '#92400e', bg: '#fef3c7', border: '#f59e0b', label: 'En Revisión' };
      case 'PENDIENTE': 
        return { text: '#c2410c', bg: '#ffedd5', border: '#f97316', label: 'Pendiente' };
      case 'DISPONIBLE': 
        return { text: '#047857', bg: '#ecfdf5', border: '#34d399', label: 'Disponible' };
      case 'BLOQUEADO': 
      default:
        return { text: '#475569', bg: '#f1f5f9', border: '#cbd5e1', label: 'Bloqueado' };
    }
  };

  // Orden estricto de las 5 etapas oficiales
  const standardEtapasOrder = [
    'APERTURA', 'Apertura', 'INICIAL', 'Inicial',
    'BIMESTRE 1', 'Bimestre 1', 'BIMESTRE_1', 'Bimestral',
    'BIMESTRE 2', 'Bimestre 2', 'BIMESTRE_2',
    'BIMESTRE 3', 'Bimestre 3', 'BIMESTRE_3',
    'LIBERACION', 'Liberacion', 'Liberación', 'Final', 'FINAL'
  ];
  
  const presentKeys = Object.keys(etapasData || {});
  const etapasPresentes = [
    ...standardEtapasOrder.filter(k => presentKeys.includes(k) && etapasData[k] && etapasData[k].length > 0),
    ...presentKeys.filter(k => !standardEtapasOrder.includes(k) && etapasData[k] && etapasData[k].length > 0)
  ];

  // Documentos en orden plano
  const todosLosDocumentos = [];
  etapasPresentes.forEach(e => {
    (etapasData[e] || []).forEach(doc => {
      todosLosDocumentos.push(doc);
    });
  });

  // Métricas de estado para los filtros
  const metrics = useMemo(() => {
    let pendientesCount = 0;
    let enRevisionCount = 0;
    let rechazadosCount = 0;
    let completosCount = 0;
    let bloqueadosCount = 0;

    pipeline.forEach(alu => {
      const docs = alu.documentos || {};
      const vals = Object.values(docs);
      
      if (vals.some(v => v === 'BLOQUEADO')) {
        bloqueadosCount++;
      }
      if (vals.some(v => v === 'PENDIENTE')) {
        pendientesCount++;
      }
      if (vals.some(v => v === 'EN_REVISION')) {
        enRevisionCount++;
      }
      if (vals.some(v => v === 'RECHAZADO')) {
        rechazadosCount++;
      }
      if (todosLosDocumentos.length > 0 && todosLosDocumentos.every(d => docs[d.id_documento] === 'APROBADO')) {
        completosCount++;
      }
    });

    return {
      total: pipeline.length,
      bloqueados: bloqueadosCount,
      pendientes: pendientesCount,
      enRevision: enRevisionCount,
      rechazados: rechazadosCount,
      completos: completosCount
    };
  }, [pipeline, todosLosDocumentos]);

  // Filtros combinados
  const filteredAlumnos = useMemo(() => {
    return pipeline.filter(alu => {
      // 1. Filtro de búsqueda
      const matchSearch = (alu.no_control || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (alu.nombre_alumno || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (alu.carrera || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Filtro de carrera
      const matchCarrera = filterCarrera ? (alu.carrera === filterCarrera) : true;

      // 3. Filtro de estado
      const docs = alu.documentos || {};
      let matchStatus = true;

      if (statusFilter === 'BLOQUEADO') {
        matchStatus = todosLosDocumentos.some(d => (docs[d.id_documento] || 'BLOQUEADO') === 'BLOQUEADO');
      } else if (statusFilter === 'PENDIENTE') {
        matchStatus = todosLosDocumentos.some(d => (docs[d.id_documento] || 'BLOQUEADO') === 'PENDIENTE');
      } else if (statusFilter === 'EN_REVISION') {
        matchStatus = todosLosDocumentos.some(d => (docs[d.id_documento] || 'BLOQUEADO') === 'EN_REVISION');
      } else if (statusFilter === 'RECHAZADO') {
        matchStatus = todosLosDocumentos.some(d => (docs[d.id_documento] || 'BLOQUEADO') === 'RECHAZADO');
      } else if (statusFilter === 'APROBADO') {
        matchStatus = todosLosDocumentos.some(d => (docs[d.id_documento] || 'BLOQUEADO') === 'APROBADO');
      } else if (statusFilter === 'COMPLETO') {
        matchStatus = todosLosDocumentos.length > 0 && todosLosDocumentos.every(d => docs[d.id_documento] === 'APROBADO');
      }

      return matchSearch && matchCarrera && matchStatus;
    });
  }, [pipeline, searchTerm, filterCarrera, statusFilter, todosLosDocumentos]);

  const carrerasUnicas = Array.from(new Set(pipeline.map(a => a.carrera).filter(Boolean)));

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
            Matriz de Validación de Expedientes
          </h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
            Control y seguimiento de entregas por alumno con estados oficiales (Pendiente, Disponible, En Revisión, Aprobado, Rechazado y Bloqueado).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={fetchPipeline}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Actualizar Matriz
          </button>
        </div>
      </div>

      {/* Banner Informativo de Sincronización Automática con Calendario Oficial */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderLeft: '4px solid #059669',
        borderRadius: '12px',
        padding: '0.85rem 1.15rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ backgroundColor: '#ecfdf5', borderRadius: '8px', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} color="#059669" />
          </div>
          <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.4 }}>
            <strong style={{ color: '#0f172a' }}>Sincronización Automática con Calendario Oficial:</strong>
            {' '}Las etapas cuya fecha límite oficial ha vencido se marcan automáticamente como{' '}
            <span style={{ 
              backgroundColor: '#ffedd5', 
              color: '#c2410c', 
              fontWeight: 700, 
              padding: '0.15rem 0.5rem', 
              borderRadius: '6px', 
              fontSize: '0.78rem' 
            }}>
              PENDIENTE
            </span>
            {' '}para entrega extemporánea, sin requerir asignación manual.
          </div>
        </div>
        {periodoActivo && (
          <span style={{ 
            fontSize: '0.78rem', 
            fontWeight: 700, 
            color: '#065f46', 
            backgroundColor: '#d1fae5', 
            padding: '0.35rem 0.75rem', 
            borderRadius: '20px', 
            border: '1px solid #a7f3d0',
            whiteSpace: 'nowrap'
          }}>
            📅 Periodo Oficial: {periodoActivo.nombre_oficial || periodoActivo.clave}
          </span>
        )}
      </div>

      {/* Píldoras de Filtros Rápidos por Estado */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStatusFilter('ALL')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            border: statusFilter === 'ALL' ? '1px solid var(--primary)' : '1px solid #e2e8f0',
            backgroundColor: statusFilter === 'ALL' ? 'var(--primary-light)' : 'white',
            color: statusFilter === 'ALL' ? 'var(--primary)' : '#64748b',
            fontWeight: statusFilter === 'ALL' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <Layers size={15} /> Todos ({metrics.total})
        </button>

        <button
          onClick={() => setStatusFilter('BLOQUEADO')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            border: statusFilter === 'BLOQUEADO' ? '1px solid #64748b' : '1px solid #e2e8f0',
            backgroundColor: statusFilter === 'BLOQUEADO' ? '#f1f5f9' : 'white',
            color: statusFilter === 'BLOQUEADO' ? '#334155' : '#64748b',
            fontWeight: statusFilter === 'BLOQUEADO' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <Lock size={15} color="#475569" /> Con Documentos Bloqueados ({metrics.bloqueados})
        </button>

        <button
          onClick={() => setStatusFilter('PENDIENTE')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            border: statusFilter === 'PENDIENTE' ? '1px solid #f97316' : '1px solid #e2e8f0',
            backgroundColor: statusFilter === 'PENDIENTE' ? '#ffedd5' : 'white',
            color: statusFilter === 'PENDIENTE' ? '#c2410c' : '#64748b',
            fontWeight: statusFilter === 'PENDIENTE' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <FileClock size={15} color="#ea580c" /> Con Pendientes de Entrega ({metrics.pendientes})
        </button>

        <button
          onClick={() => setStatusFilter('EN_REVISION')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            border: statusFilter === 'EN_REVISION' ? '1px solid #f59e0b' : '1px solid #e2e8f0',
            backgroundColor: statusFilter === 'EN_REVISION' ? '#fef3c7' : 'white',
            color: statusFilter === 'EN_REVISION' ? '#92400e' : '#64748b',
            fontWeight: statusFilter === 'EN_REVISION' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <Clock size={15} color="#d97706" /> Con Entregas en Revisión ({metrics.enRevision})
        </button>

        <button
          onClick={() => setStatusFilter('RECHAZADO')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            border: statusFilter === 'RECHAZADO' ? '1px solid #ef4444' : '1px solid #e2e8f0',
            backgroundColor: statusFilter === 'RECHAZADO' ? '#fee2e2' : 'white',
            color: statusFilter === 'RECHAZADO' ? '#991b1b' : '#64748b',
            fontWeight: statusFilter === 'RECHAZADO' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <AlertCircle size={15} color="#dc2626" /> Con Documentos Rechazados ({metrics.rechazados})
        </button>

        <button
          onClick={() => setStatusFilter('COMPLETO')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            border: statusFilter === 'COMPLETO' ? '1px solid #10b981' : '1px solid #e2e8f0',
            backgroundColor: statusFilter === 'COMPLETO' ? '#d1fae5' : 'white',
            color: statusFilter === 'COMPLETO' ? '#065f46' : '#64748b',
            fontWeight: statusFilter === 'COMPLETO' ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          <CheckCircle2 size={15} color="#059669" /> Expediente Completo 100% ({metrics.completos})
        </button>
      </div>

      {/* Barra de Filtros de Texto y Carrera */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, no. control o carrera..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {carrerasUnicas.length > 0 && (
          <select 
            value={filterCarrera}
            onChange={e => setFilterCarrera(e.target.value)}
            className="form-select"
            style={{ width: 'auto', minWidth: '220px' }}
          >
            <option value="">Todas las Carreras</option>
            {carrerasUnicas.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {/* Banner de Validación Rápida si viene con parámetros desde el Buzón */}
      {targetNoControl && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1.5px solid #10b981',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)'
        }} className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ backgroundColor: '#059669', color: 'white', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckSquare size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#065f46', fontSize: '1rem' }}>
                Fijado para validación rápida: Alumno {targetNoControl} {targetClave ? `• Formato ${targetClave}` : ''}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#047857', marginTop: '0.15rem' }}>
                La celda correspondiente ha sido resaltada en la matriz para que puedas dictaminar su estado de entrega de manera inmediata.
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setSearchParams({});
            }}
            style={{
              backgroundColor: 'white',
              border: '1px solid #10b981',
              color: '#065f46',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            Quitar filtro / Ver todos los alumnos
          </button>
        </div>
      )}

      {/* Matriz Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflow: 'auto', maxHeight: '72vh', border: '1px solid #e2e8f0' }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Cargando matriz de validación...</div>
          </div>
        ) : filteredAlumnos.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <AlertTriangle size={40} color="#f59e0b" style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>No se encontraron alumnos con el filtro seleccionado.</p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: '#94a3b8' }}>Prueba cambiando el filtro de estado o la búsqueda.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <tr>
                <th rowSpan={2} style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 700, position: 'sticky', left: 0, backgroundColor: '#f8fafc', zIndex: 12, borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0', minWidth: '110px' }}>
                  No. Control
                </th>
                <th rowSpan={2} style={{ padding: '1rem', textAlign: 'left', color: '#475569', fontWeight: 700, position: 'sticky', left: '110px', backgroundColor: '#f8fafc', zIndex: 12, borderBottom: '2px solid #cbd5e1', borderRight: '2px solid #cbd5e1', minWidth: '240px' }}>
                  Estudiante / Carrera
                </th>
                
                {etapasPresentes.map(etp => {
                  const info = infoEtapas[etp] || {};
                  return (
                    <th key={etp} colSpan={etapasData[etp].length} style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#0f172a', fontWeight: 800, borderBottom: '1px solid #cbd5e1', borderLeft: '2px solid #cbd5e1', backgroundColor: '#f1f5f9', letterSpacing: '0.5px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{etp.toUpperCase().replace('_', ' ')}</span>
                        {info.fecha_limite_formato ? (
                          info.vencido ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              fontWeight: 700,
                              textTransform: 'none',
                              letterSpacing: 'normal',
                              border: '1px solid #fca5a5'
                            }} title={`Fecha límite oficial: ${info.fecha_limite_formato}. Documentos sin entregar se marcaron automáticamente como PENDIENTE.`}>
                              ⚠️ Límite Vencido: {info.fecha_limite_formato}
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: '0.7rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              fontWeight: 700,
                              textTransform: 'none',
                              letterSpacing: 'normal',
                              border: '1px solid #bae6fd'
                            }}>
                              ⏳ Límite: {info.fecha_limite_formato}
                            </span>
                          )
                        ) : (
                          <span style={{
                            fontSize: '0.68rem',
                            color: '#94a3b8',
                            fontWeight: 500,
                            textTransform: 'none',
                            letterSpacing: 'normal'
                          }}>
                            Sin fecha asignada
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
              <tr>
                {etapasPresentes.map(etp => 
                  etapasData[etp].map(doc => (
                    <th key={doc.id_documento} style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#475569', fontWeight: 600, borderBottom: '2px solid #cbd5e1', borderLeft: '1px solid #e2e8f0', fontSize: '0.78rem', minWidth: '160px', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, color: '#059669', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{doc.clave_formato || `DOC-${doc.id_documento}`}</span>
                      </div>
                      <div style={{ fontSize: '0.73rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', marginTop: '0.15rem' }} title={doc.nombre}>
                        {doc.nombre}
                      </div>

                      {/* Dropdown de Acción Masiva por Columna */}
                      <div style={{ marginTop: '0.45rem' }}>
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              handleBatchStatusChange(doc.id_documento, doc.clave_formato, doc.nombre, val);
                              e.target.value = '';
                            }
                          }}
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.25rem 0.45rem',
                            borderRadius: '12px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#059669',
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none',
                            width: '100%',
                            maxWidth: '150px',
                            textAlignLast: 'center',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}
                          title="Cambiar estado para todos los alumnos en este documento"
                        >
                          <option value="">Acción masiva...</option>
                          <option value="BLOQUEADO">🔒 Bloqueado para todos</option>
                          <option value="DISPONIBLE">📄 Disponible para todos</option>
                          <option value="PENDIENTE">📌 Pendiente para todos</option>
                          <option value="EN_REVISION">⏳ En Revisión para todos</option>
                          <option value="APROBADO">✅ Aprobado para todos</option>
                          <option value="RECHAZADO">❌ Rechazado para todos</option>
                        </select>
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {filteredAlumnos.map((row, rIdx) => (
                <tr key={row.no_control || rIdx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: rIdx % 2 === 0 ? 'white' : '#fcfcfd' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#059669', fontWeight: 800, position: 'sticky', left: 0, backgroundColor: rIdx % 2 === 0 ? 'white' : '#fcfcfd', zIndex: 2, borderRight: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                    {row.no_control}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', position: 'sticky', left: '110px', backgroundColor: rIdx % 2 === 0 ? 'white' : '#fcfcfd', zIndex: 2, borderRight: '2px solid #cbd5e1' }}>
                    <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.92rem' }}>{row.nombre_alumno}</div>
                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{row.carrera || 'Sin carrera asignada'}</div>
                  </td>
                  
                  {todosLosDocumentos.map(doc => {
                    let estadoActual = (row.documentos && row.documentos[doc.id_documento]) || 'BLOQUEADO';
                    const colors = getStatusColor(estadoActual);
                    const isTargetCell = Boolean(
                      targetNoControl && 
                      row.no_control === targetNoControl && 
                      targetDocId && 
                      doc.id_documento === targetDocId
                    );

                    return (
                      <td 
                        key={doc.id_documento} 
                        id={`target-cell-${row.no_control}-${doc.id_documento}`}
                        style={{ 
                          padding: isTargetCell ? '0.65rem 0.5rem' : '0.5rem', 
                          textAlign: 'center', 
                          borderLeft: isTargetCell ? '2px solid #059669' : '1px solid #f1f5f9',
                          backgroundColor: isTargetCell ? '#ecfdf5' : 'transparent',
                          boxShadow: isTargetCell ? 'inset 0 0 0 2px #059669, 0 0 14px rgba(5, 150, 105, 0.35)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isTargetCell && (
                          <div style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            color: '#065f46',
                            marginBottom: '0.3rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            letterSpacing: '0.2px'
                          }}>
                            <span>🎯</span> VALIDAR AQUÍ
                          </div>
                        )}
                        <select 
                          value={estadoActual}
                          onChange={(e) => handleStatusChange(row.id_proyecto, row.no_control, doc.id_documento, e.target.value)}
                          style={{ 
                            padding: isTargetCell ? '0.42rem 0.75rem' : '0.35rem 0.65rem', 
                            borderRadius: '20px', 
                            border: isTargetCell ? '2px solid #059669' : `1.5px solid ${colors.border}`,
                            color: colors.text,
                            backgroundColor: colors.bg,
                            fontWeight: 800,
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: isTargetCell ? '0.82rem' : '0.78rem',
                            transition: 'all 0.15s ease',
                            textAlignLast: 'center',
                            boxShadow: isTargetCell ? '0 2px 8px rgba(5, 150, 105, 0.25)' : 'none'
                          }}
                        >
                          <option value="BLOQUEADO">🔒 Bloqueado</option>
                          <option value="DISPONIBLE">📄 Disponible</option>
                          <option value="PENDIENTE">📌 Pendiente</option>
                          <option value="EN_REVISION">⏳ En Revisión</option>
                          <option value="APROBADO">✅ Aprobado</option>
                          <option value="RECHAZADO">❌ Rechazado</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
