import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  GraduationCap,
  FileClock,
  Edit3,
  Check,
  RotateCcw,
  Building2,
  Printer,
  Table,
  Sparkles,
  Users,
  Globe,
  Layers,
  Briefcase
} from 'lucide-react';

export default function ReportesOficiales() {
  // Pestaña activa: 'periodo' (Padrón General Periodo Actual) | 'tec' | 'bitacora'
  const [activeTab, setActiveTab] = useState('periodo');

  // Catálogo de carreras
  const [carreras, setCarreras] = useState([]);

  // ==========================================
  // ESTADO PESTAÑA: PADRÓN GENERAL (PERIODO ACTUAL)
  // ==========================================
  const [periodoData, setPeriodoData] = useState({
    periodo: '',
    carrera: 'TODAS',
    tipo_dependencia: 'TODAS',
    total: 0,
    total_periodo: 0,
    total_tec: 0,
    total_externos: 0,
    alumnos: []
  });
  const [selectedCarreraPeriodo, setSelectedCarreraPeriodo] = useState('');
  const [tipoDepPeriodo, setTipoDepPeriodo] = useState('TODAS');
  const [searchTermPeriodo, setSearchTermPeriodo] = useState('');
  const [loadingPeriodo, setLoadingPeriodo] = useState(true);
  const [downloadingPeriodo, setDownloadingPeriodo] = useState(false);

  // ==========================================
  // ESTADO PESTAÑA: SERVICIO SOCIAL EN EL TEC
  // ==========================================
  const [tecData, setTecData] = useState({
    periodo: '',
    carrera: 'TODAS',
    total: 0,
    alumnos: []
  });
  const [selectedCarreraTec, setSelectedCarreraTec] = useState('');
  const [searchTermTec, setSearchTermTec] = useState('');
  const [loadingTec, setLoadingTec] = useState(true);
  const [downloadingTec, setDownloadingTec] = useState(false);
  const [showEmptyRows, setShowEmptyRows] = useState(true);

  // ==========================================
  // ESTADO PESTAÑA: BITÁCORA DE SEGUIMIENTO
  // ==========================================
  const [reporteData, setReporteData] = useState({ 
    periodo: '', 
    carrera: 'TODAS', 
    fechas_fases: {}, 
    total_alumnos: 0, 
    alumnos: [] 
  });
  const [selectedCarrera, setSelectedCarrera] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Encabezados editables
  const [tituloDepto, setTituloDepto] = useState('DEPARTAMENTO DE RESIDENCIAS PROFESIONALES Y SERVICIO SOCIAL');
  const [tituloReporte, setTituloReporte] = useState('BITÁCORA DE SEGUIMIENTO AL PRESTANTE DE SERVICIO SOCIAL');
  const [isEditingHeaders, setIsEditingHeaders] = useState(false);

  // Cargar catálogo de todas las carreras institucionales
  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/admin/reportes/carreras')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCarreras(data);
        } else {
          fetch('http://127.0.0.1:5000/api/admin/catalogos/carreras')
            .then(r => r.json())
            .then(d => {
              if (Array.isArray(d)) setCarreras(d);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const fetchReporte = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCarrera && selectedCarrera !== 'TODAS') {
      params.append('carrera', selectedCarrera);
    }
    params.append('titulo_departamento', tituloDepto);
    params.append('titulo_reporte', tituloReporte);

    fetch(`http://127.0.0.1:5000/api/admin/reportes/bitacora-seguimiento?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.alumnos) {
          setReporteData(data);
        } else {
          setReporteData({ periodo: '', carrera: selectedCarrera || 'TODAS', fechas_fases: {}, total_alumnos: 0, alumnos: [] });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setReporteData({ periodo: '', carrera: selectedCarrera || 'TODAS', fechas_fases: {}, total_alumnos: 0, alumnos: [] });
        setLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'bitacora') {
      fetchReporte();
    }
  }, [selectedCarrera, activeTab]);

  // Cargar datos de Alumnos en el Tec
  const fetchAlumnosTec = () => {
    setLoadingTec(true);
    const params = new URLSearchParams();
    if (selectedCarreraTec && selectedCarreraTec !== 'TODAS') {
      params.append('carrera', selectedCarreraTec);
    }

    fetch(`http://127.0.0.1:5000/api/admin/reportes/alumnos-tec?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.alumnos) {
          setTecData(data);
        } else {
          setTecData({ periodo: '', carrera: selectedCarreraTec || 'TODAS', total: 0, alumnos: [] });
        }
        setLoadingTec(false);
      })
      .catch(err => {
        console.error(err);
        setTecData({ periodo: '', carrera: selectedCarreraTec || 'TODAS', total: 0, alumnos: [] });
        setLoadingTec(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'tec') {
      fetchAlumnosTec();
    }
  }, [selectedCarreraTec, activeTab]);

  // Cargar datos del Padrón General del Periodo Actual
  const fetchAlumnosPeriodo = () => {
    setLoadingPeriodo(true);
    const params = new URLSearchParams();
    if (selectedCarreraPeriodo && selectedCarreraPeriodo !== 'TODAS') {
      params.append('carrera', selectedCarreraPeriodo);
    }
    if (tipoDepPeriodo && tipoDepPeriodo !== 'TODAS') {
      params.append('tipo_dependencia', tipoDepPeriodo);
    }

    fetch(`http://127.0.0.1:5000/api/admin/reportes/alumnos-periodo?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.alumnos) {
          setPeriodoData(data);
        } else {
          setPeriodoData({ periodo: '', carrera: selectedCarreraPeriodo || 'TODAS', tipo_dependencia: tipoDepPeriodo, total: 0, total_periodo: 0, total_tec: 0, total_externos: 0, alumnos: [] });
        }
        setLoadingPeriodo(false);
      })
      .catch(err => {
        console.error(err);
        setPeriodoData({ periodo: '', carrera: selectedCarreraPeriodo || 'TODAS', tipo_dependencia: tipoDepPeriodo, total: 0, total_periodo: 0, total_tec: 0, total_externos: 0, alumnos: [] });
        setLoadingPeriodo(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'periodo') {
      fetchAlumnosPeriodo();
    }
  }, [selectedCarreraPeriodo, tipoDepPeriodo, activeTab]);

  // Descargar Excel Padrón General
  const handleDownloadExcelPeriodo = () => {
    setDownloadingPeriodo(true);
    const params = new URLSearchParams();
    if (selectedCarreraPeriodo && selectedCarreraPeriodo !== 'TODAS') {
      params.append('carrera', selectedCarreraPeriodo);
    }
    if (tipoDepPeriodo && tipoDepPeriodo !== 'TODAS') {
      params.append('tipo_dependencia', tipoDepPeriodo);
    }

    const url = `http://127.0.0.1:5000/api/admin/reportes/alumnos-periodo/excel?${params.toString()}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Error al generar Excel');
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const slugCarrera = (selectedCarreraPeriodo || 'TODAS').replace(/ /g, '_');
        a.download = `Padron_General_Servicio_Social_${slugCarrera}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDownloadingPeriodo(false);

        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        });
        Toast.fire({ icon: 'success', title: `Padrón General de Servicio Social descargado` });
      })
      .catch(err => {
        console.error(err);
        setDownloadingPeriodo(false);
        Swal.fire('Error', 'No se pudo descargar el padrón en Excel', 'error');
      });
  };

  // Descargar Excel Bitácora
  const handleDownloadExcel = () => {
    setDownloading(true);
    const params = new URLSearchParams();
    if (selectedCarrera && selectedCarrera !== 'TODAS') {
      params.append('carrera', selectedCarrera);
    }
    params.append('titulo_departamento', tituloDepto);
    params.append('titulo_reporte', tituloReporte);

    const url = `http://127.0.0.1:5000/api/admin/reportes/bitacora-seguimiento/excel?${params.toString()}`;
    
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Error al generar Excel');
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const slug = (selectedCarrera || 'TODAS').replace(/ /g, '_');
        a.download = `Bitacora_Seguimiento_Incumplidos_${slug}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDownloading(false);

        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        });
        Toast.fire({ icon: 'success', title: `Bitácora de ${selectedCarrera || 'Todas las Carreras'} descargada` });
      })
      .catch(err => {
        console.error(err);
        setDownloading(false);
        Swal.fire('Error', 'No se pudo descargar la bitácora en Excel', 'error');
      });
  };

  // Descargar Excel Alumnos Tec
  const handleDownloadExcelTec = () => {
    setDownloadingTec(true);
    const params = new URLSearchParams();
    if (selectedCarreraTec && selectedCarreraTec !== 'TODAS') {
      params.append('carrera', selectedCarreraTec);
    }

    const url = `http://127.0.0.1:5000/api/admin/reportes/alumnos-tec/excel?${params.toString()}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Error al generar Excel');
        return res.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const slug = (selectedCarreraTec || 'TODAS').replace(/ /g, '_');
        a.download = `Alumnos_Servicio_Social_Tec_${slug}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDownloadingTec(false);

        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        });
        Toast.fire({ icon: 'success', title: `Reporte de Servicio Social en Tec (${selectedCarreraTec || 'Todas'}) descargado` });
      })
      .catch(err => {
        console.error(err);
        setDownloadingTec(false);
        Swal.fire('Error', 'No se pudo descargar el reporte de Alumnos en el Tec', 'error');
      });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetHeaders = () => {
    setTituloDepto('DEPARTAMENTO DE RESIDENCIAS PROFESIONALES Y SERVICIO SOCIAL');
    setTituloReporte('BITÁCORA DE SEGUIMIENTO AL PRESTANTE DE SERVICIO SOCIAL');
    setIsEditingHeaders(false);
  };

  // Filtrado de alumnos Bitácora
  const filteredAlumnos = (reporteData.alumnos || []).filter(alu => {
    const matchSearch = (alu.no_control || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (alu.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (alu.carrera || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (alu.nombre_proyecto || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  // Filtrado de alumnos Padrón General
  const filteredAlumnosPeriodo = (periodoData.alumnos || []).filter(alu => {
    const search = searchTermPeriodo.toLowerCase();
    return (alu.no_control || '').toLowerCase().includes(search) ||
           (alu.nombre_alumno || '').toLowerCase().includes(search) ||
           (alu.carrera || '').toLowerCase().includes(search) ||
           (alu.dependencia || '').toLowerCase().includes(search) ||
           (alu.nombre_proyecto || '').toLowerCase().includes(search) ||
           (alu.supervisor_proyecto || '').toLowerCase().includes(search);
  });

  // Filtrado de alumnos Tec
  const filteredAlumnosTec = (tecData.alumnos || []).filter(alu => {
    const search = searchTermTec.toLowerCase();
    return (alu.no_control || '').toLowerCase().includes(search) ||
           (alu.nombre_alumno || '').toLowerCase().includes(search) ||
           (alu.carrera || '').toLowerCase().includes(search) ||
           (alu.nombre_proyecto || '').toLowerCase().includes(search) ||
           (alu.supervisor_proyecto || '').toLowerCase().includes(search);
  });

  const fechas = reporteData.fechas_fases || {};

  // Filas a desplegar en la tabla oficial (mínimo 10 para respetar la cuadrícula oficial de la plantilla)
  const totalDisplayRows = showEmptyRows ? Math.max(filteredAlumnosTec.length, 10) : filteredAlumnosTec.length;

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* Estilos para impresión limpia */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-table-container, #printable-table-container-periodo, 
          #printable-table-container *, #printable-table-container-periodo * {
            visibility: visible !important;
          }
          #printable-table-container, #printable-table-container-periodo {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 5px !important;
            border: 2px solid #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Menú de Pestañas Superiores */}
      <div className="no-print" style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        backgroundColor: '#f1f5f9', 
        padding: '0.4rem', 
        borderRadius: '14px', 
        marginBottom: '1.5rem',
        border: '1px solid #e2e8f0',
        width: 'fit-content',
        flexWrap: 'wrap'
      }}>
        {/* Pestaña 1: Padrón General del Periodo Actual */}
        <button
          onClick={() => setActiveTab('periodo')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'periodo' ? 800 : 600,
            fontSize: '0.9rem',
            backgroundColor: activeTab === 'periodo' ? '#ffffff' : 'transparent',
            color: activeTab === 'periodo' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'periodo' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={18} color={activeTab === 'periodo' ? '#059669' : '#64748b'} />
          <span>Padrón General (Periodo Actual)</span>
          <span style={{ 
            fontSize: '0.72rem', 
            backgroundColor: activeTab === 'periodo' ? '#ecfdf5' : '#e2e8f0', 
            color: activeTab === 'periodo' ? '#047857' : '#475569', 
            padding: '0.15rem 0.5rem', 
            borderRadius: '20px', 
            fontWeight: 700 
          }}>
            {periodoData.total_periodo || 'Activo'}
          </span>
        </button>

        {/* Pestaña 2: Servicio Social en el Tec */}
        <button
          onClick={() => setActiveTab('tec')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'tec' ? 800 : 600,
            fontSize: '0.9rem',
            backgroundColor: activeTab === 'tec' ? '#ffffff' : 'transparent',
            color: activeTab === 'tec' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'tec' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Building2 size={18} color={activeTab === 'tec' ? '#059669' : '#64748b'} />
          <span>Servicio Social en el Tec (Interno)</span>
          <span style={{ 
            fontSize: '0.72rem', 
            backgroundColor: activeTab === 'tec' ? '#ecfdf5' : '#e2e8f0', 
            color: activeTab === 'tec' ? '#047857' : '#475569', 
            padding: '0.15rem 0.5rem', 
            borderRadius: '20px', 
            fontWeight: 700 
          }}>
            Oficial
          </span>
        </button>

        {/* Pestaña 3: Bitácora de Seguimiento */}
        <button
          onClick={() => setActiveTab('bitacora')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'bitacora' ? 800 : 600,
            fontSize: '0.9rem',
            backgroundColor: activeTab === 'bitacora' ? '#ffffff' : 'transparent',
            color: activeTab === 'bitacora' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'bitacora' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <FileSpreadsheet size={18} color={activeTab === 'bitacora' ? '#059669' : '#64748b'} />
          <span>Bitácora de Seguimiento (Pendientes)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: PADRÓN GENERAL DE PRESTANTES DEL PERIODO ACTUAL                 */}
      {/* ========================================================================= */}
      {activeTab === 'periodo' && (
        <div>
          {/* Encabezado y Acciones */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Users size={28} color="#059669" /> Padrón General de Prestantes — Periodo Actual
              </h1>
              <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
                Listado oficial de todos los alumnos que realizan servicio social en el periodo activo en dependencias <strong>internas (Tec)</strong> y <strong>externas</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={fetchAlumnosPeriodo}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                title="Actualizar datos desde la base de datos"
              >
                <RefreshCw size={15} /> Refrescar
              </button>

              <button 
                onClick={handlePrint}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                title="Imprimir formato o guardar en PDF"
              >
                <Printer size={15} /> Imprimir / PDF
              </button>

              <button 
                onClick={handleDownloadExcelPeriodo}
                disabled={downloadingPeriodo || filteredAlumnosPeriodo.length === 0}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                <Download size={16} /> {downloadingPeriodo ? 'Generando Excel...' : `Exportar Excel ${selectedCarreraPeriodo ? `(${selectedCarreraPeriodo})` : '(Todas)'}`}
              </button>
            </div>
          </div>

          {/* Tarjetas de Métricas Resumen */}
          <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Prestantes</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{periodoData.total_periodo}</div>
                <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>Periodo: {periodoData.periodo}</div>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={24} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Internos en el Tec</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{periodoData.total_tec}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Dependencia Institucional</div>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={24} color="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dependencias Externas</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{periodoData.total_externos}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Ayuntamientos, Hospitales, etc.</div>
              </div>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="no-print" style={{ 
            backgroundColor: 'white', 
            padding: '1.25rem', 
            borderRadius: '16px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', 
            marginBottom: '1.5rem', 
            display: 'flex', 
            gap: '1.25rem', 
            flexWrap: 'wrap', 
            alignItems: 'center' 
          }}>
            {/* Selector de Carrera */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: '320px', flex: '1 1 320px' }}>
              <GraduationCap size={22} color="#059669" />
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: 0 }}>Carrera:</label>
              <select 
                value={selectedCarreraPeriodo} 
                onChange={e => setSelectedCarreraPeriodo(e.target.value)}
                className="form-select"
                style={{ flex: 1, fontWeight: 700, fontSize: '0.88rem' }}
              >
                <option value="">-- Todas las Carreras Institucionales --</option>
                {carreras.map(c => (
                  <option key={c.id_carrera || c.nombre} value={c.nombre}>
                    {c.clave ? `[${c.clave}] ` : ''}{c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Tipo Dependencia */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: '260px' }}>
              <Building2 size={20} color="#059669" />
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: 0 }}>Dependencia:</label>
              <select 
                value={tipoDepPeriodo} 
                onChange={e => setTipoDepPeriodo(e.target.value)}
                className="form-select"
                style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}
              >
                <option value="TODAS">-- Todas las Dependencias --</option>
                <option value="INTERNA_TEC">🏛️ Solo Internas (Tec)</option>
                <option value="EXTERNA">🏢 Solo Externas</option>
              </select>
            </div>

            {/* Buscador Rápido */}
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar por alumno, control, carrera, dependencia o proyecto..."
                value={searchTermPeriodo}
                onChange={e => setSearchTermPeriodo(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Resumen de Resultados */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0 0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
              PERIODO: {periodoData.periodo ? periodoData.periodo.toUpperCase() : 'FEBRERO – JUNIO 2026'}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#047857', backgroundColor: '#ecfdf5', padding: '0.25rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              {selectedCarreraPeriodo ? `Carrera: ${selectedCarreraPeriodo}` : 'Todas las Carreras'} — {filteredAlumnosPeriodo.length} alumno(s) en este filtro
            </span>
          </div>

          {/* TABLA DEL PADRÓN GENERAL */}
          <div 
            id="printable-table-container-periodo"
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
              overflow: 'hidden',
              border: '1px solid #cbd5e1',
              marginBottom: '2rem'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              {loadingPeriodo ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw className="animate-spin" size={32} color="#059669" style={{ margin: '0 auto 0.75rem' }} />
                  <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Cargando padrón del periodo actual...</div>
                </div>
              ) : filteredAlumnosPeriodo.length === 0 ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                  <CheckCircle2 size={42} color="#10b981" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    No se encontraron prestantes con los filtros seleccionados.
                  </p>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: '#94a3b8' }}>
                    Prueba cambiando de carrera o seleccionando 'Todas las Dependencias'.
                  </p>
                </div>
              ) : (
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  fontSize: '0.82rem',
                  fontFamily: 'Arial, sans-serif'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #1e293b', width: '45px', fontSize: '0.82rem' }}>
                        #
                      </th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, border: '1px solid #1e293b', minWidth: '220px', fontSize: '0.82rem' }}>
                        NOMBRE DEL ALUMNO
                      </th>
                      <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 800, border: '1px solid #1e293b', minWidth: '110px', fontSize: '0.82rem' }}>
                        NO. CONTROL
                      </th>
                      <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left', fontWeight: 800, border: '1px solid #1e293b', minWidth: '180px', fontSize: '0.82rem' }}>
                        CARRERA
                      </th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, border: '1px solid #1e293b', minWidth: '240px', fontSize: '0.82rem' }}>
                        DEPENDENCIA / INSTITUCIÓN
                      </th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, border: '1px solid #1e293b', minWidth: '280px', fontSize: '0.82rem' }}>
                        NOMBRE DEL PROYECTO
                      </th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, border: '1px solid #1e293b', minWidth: '200px', fontSize: '0.82rem' }}>
                        SUPERVISOR DEL PROYECTO
                      </th>
                      <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 800, border: '1px solid #1e293b', width: '95px', fontSize: '0.82rem' }}>
                        MODALIDAD
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlumnosPeriodo.map((alu, idx) => (
                      <tr 
                        key={alu.no_control || idx} 
                        style={{ 
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                        }}
                      >
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#64748b', border: '1px solid #e2e8f0' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a', border: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
                          {alu.nombre_alumno}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 800, color: '#059669', border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                          {alu.no_control}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#334155', border: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 600 }}>
                          {alu.carrera}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.3rem', 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              padding: '0.15rem 0.5rem', 
                              borderRadius: '6px',
                              width: 'fit-content',
                              backgroundColor: alu.es_en_tec ? '#ecfdf5' : '#fef3c7',
                              color: alu.es_en_tec ? '#047857' : '#b45309',
                              border: alu.es_en_tec ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                              {alu.es_en_tec ? '🏛️ TEC (Interno)' : '🏢 EXTERNA'}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>
                              {alu.dependencia}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#334155', border: '1px solid #e2e8f0', fontSize: '0.78rem', lineHeight: 1.35, textTransform: 'uppercase' }}>
                          {alu.nombre_proyecto}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', textTransform: 'uppercase' }}>{alu.supervisor_proyecto || '-'}</div>
                          {alu.supervisor_cargo && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              {alu.supervisor_cargo}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                          <span style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            padding: '0.2rem 0.55rem', 
                            borderRadius: '12px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569'
                          }}>
                            {alu.modalidad || 'PRESENCIAL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 1: SERVICIO SOCIAL EN EL TEC (TABLA SOLICITADA SEGÚN LA IMAGEN)      */}
      {/* ========================================================================= */}
      {activeTab === 'tec' && (
        <div>
          {/* Encabezado y Acciones */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Building2 size={28} color="#059669" /> Prestantes de Servicio Social en el Tec
              </h1>
              <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
                Alumnos detectados en la base de datos asignados al <strong>Instituto Tecnológico Superior de Teziutlán</strong>. Generable por carrera con formato oficial.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={fetchAlumnosTec}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                title="Actualizar datos desde la base de datos"
              >
                <RefreshCw size={15} /> Refrescar
              </button>

              <button 
                onClick={handlePrint}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                title="Imprimir formato o guardar en PDF"
              >
                <Printer size={15} /> Imprimir / PDF
              </button>

              <button 
                onClick={handleDownloadExcelTec}
                disabled={downloadingTec || filteredAlumnosTec.length === 0}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
              >
                <Download size={16} /> {downloadingTec ? 'Generando Excel...' : `Exportar Excel ${selectedCarreraTec ? `(${selectedCarreraTec})` : '(Todas)'}`}
              </button>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="no-print" style={{ 
            backgroundColor: 'white', 
            padding: '1.25rem', 
            borderRadius: '16px', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', 
            marginBottom: '1.5rem', 
            display: 'flex', 
            gap: '1.25rem', 
            flexWrap: 'wrap', 
            alignItems: 'center' 
          }}>
            {/* Selector de Carrera */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: '360px', flex: '1 1 360px' }}>
              <GraduationCap size={22} color="#059669" />
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: 0 }}>Generar por Carrera:</label>
              <select 
                value={selectedCarreraTec} 
                onChange={e => setSelectedCarreraTec(e.target.value)}
                className="form-select"
                style={{ flex: 1, fontWeight: 700, fontSize: '0.88rem' }}
              >
                <option value="">-- Todas las Carreras Institucionales --</option>
                {carreras.map(c => (
                  <option key={c.id_carrera || c.nombre} value={c.nombre}>
                    {c.clave ? `[${c.clave}] ` : ''}{c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Badge Informativo de Dependencia Detectada */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.85rem', borderRadius: '20px', backgroundColor: '#ecfdf5', color: '#059669', fontSize: '0.82rem', fontWeight: 700 }}>
              <Building2 size={15} color="#059669" />
              <span>Dependencia: Instituto Tecnológico Superior de Teziutlán</span>
            </div>

            {/* Buscador Rápido */}
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar por alumno, control, proyecto o supervisor..."
                value={searchTermTec}
                onChange={e => setSearchTermTec(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
              />
            </div>

            {/* Checkbox completar cuadrícula a 10 filas */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={showEmptyRows} 
                onChange={e => setShowEmptyRows(e.target.checked)} 
                style={{ width: '16px', height: '16px', accentColor: '#059669' }}
              />
              Formato cuadrícula 10 filas (como en plantilla)
            </label>
          </div>

          {/* Resumen de Resultados */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', padding: '0 0.25rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
              PERIODO: {tecData.periodo ? tecData.periodo.toUpperCase() : 'FEBRERO – JUNIO 2026'}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669', backgroundColor: '#ecfdf5', padding: '0.25rem 0.75rem', borderRadius: '8px' }}>
              {selectedCarreraTec ? `Carrera: ${selectedCarreraTec}` : 'Todas las Carreras'} — {filteredAlumnosTec.length} prestante(s) en el Tec
            </span>
          </div>

          {/* TABLA OFICIAL (REPLICANDO CON PRECISIÓN LA IMAGEN ADJUNTA) */}
          <div 
            id="printable-table-container"
            style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
              overflow: 'hidden',
              border: '2px solid #000000',
              marginBottom: '2rem'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              {loadingTec ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw className="animate-spin" size={32} color="#059669" style={{ margin: '0 auto 0.75rem' }} />
                  <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Detectando alumnos en el Tec...</div>
                </div>
              ) : (
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  fontSize: '0.82rem',
                  fontFamily: 'Arial, sans-serif'
                }}>
                  <thead>
                    {/* Fila de Encabezado: Color Negro con Texto Blanco en Negrita como en la Imagen */}
                    <tr style={{ backgroundColor: '#000000', color: '#ffffff' }}>
                      <th style={{ 
                        padding: '0.75rem 0.5rem', 
                        textAlign: 'center', 
                        fontWeight: 800, 
                        border: '1px solid #000000', 
                        width: '55px',
                        fontSize: '0.85rem',
                        letterSpacing: '0.5px'
                      }}>
                        NO.
                      </th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'center', 
                        fontWeight: 800, 
                        border: '1px solid #000000', 
                        width: '24%',
                        fontSize: '0.85rem',
                        letterSpacing: '0.5px'
                      }}>
                        NOMBRE DEL ALUMNO
                      </th>
                      <th style={{ 
                        padding: '0.75rem 0.75rem', 
                        textAlign: 'center', 
                        fontWeight: 800, 
                        border: '1px solid #000000', 
                        width: '14%',
                        fontSize: '0.85rem',
                        letterSpacing: '0.5px'
                      }}>
                        CONTROL
                      </th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'center', 
                        fontWeight: 800, 
                        border: '1px solid #000000', 
                        width: '40%',
                        fontSize: '0.85rem',
                        letterSpacing: '0.5px'
                      }}>
                        NOMBRE DEL PROYECTO
                      </th>
                      <th style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'center', 
                        fontWeight: 800, 
                        border: '1px solid #000000', 
                        width: '22%',
                        fontSize: '0.85rem',
                        letterSpacing: '0.5px'
                      }}>
                        SUPERVISOR DEL PROYECTO
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: totalDisplayRows }).map((_, idx) => {
                      const alu = filteredAlumnosTec[idx];
                      const rowNumber = idx + 1;

                      if (alu) {
                        return (
                          <tr 
                            key={alu.no_control || idx} 
                            style={{ 
                              borderBottom: '1px solid #000000',
                              minHeight: '48px'
                            }}
                          >
                            {/* Columna NO con borde derecho punteado como en la imagen */}
                            <td style={{ 
                              padding: '0.75rem 0.5rem', 
                              textAlign: 'center', 
                              fontWeight: 700, 
                              color: '#000000', 
                              borderLeft: '1px solid #000000',
                              borderRight: '1px dotted #000000',
                              borderBottom: '1px solid #000000'
                            }}>
                              {rowNumber}
                            </td>

                            {/* Columna NOMBRE DEL ALUMNO */}
                            <td style={{ 
                              padding: '0.75rem 1rem', 
                              textAlign: 'center', 
                              fontWeight: 700, 
                              color: '#000000', 
                              borderRight: '1px solid #000000',
                              borderBottom: '1px solid #000000',
                              textTransform: 'uppercase',
                              lineHeight: 1.3
                            }}>
                              <div>{alu.nombre_alumno}</div>
                              {(!selectedCarreraTec || selectedCarreraTec === 'TODAS') && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                  {alu.carrera}
                                </div>
                              )}
                            </td>

                            {/* Columna CONTROL */}
                            <td style={{ 
                              padding: '0.75rem 0.75rem', 
                              textAlign: 'center', 
                              fontWeight: 700, 
                              color: '#000000', 
                              borderRight: '1px solid #000000',
                              borderBottom: '1px solid #000000',
                              fontFamily: 'monospace, sans-serif',
                              fontSize: '0.88rem'
                            }}>
                              {alu.no_control}
                            </td>

                            {/* Columna NOMBRE DEL PROYECTO */}
                            <td style={{ 
                              padding: '0.75rem 1.25rem', 
                              textAlign: 'center', 
                              color: '#000000', 
                              borderRight: '1px solid #000000',
                              borderBottom: '1px solid #000000',
                              fontSize: '0.8rem',
                              lineHeight: 1.35,
                              textTransform: 'uppercase'
                            }}>
                              {alu.nombre_proyecto}
                            </td>

                            {/* Columna SUPERVISOR DEL PROYECTO */}
                            <td style={{ 
                              padding: '0.75rem 1rem', 
                              textAlign: 'center', 
                              color: '#000000', 
                              borderRight: '1px solid #000000',
                              borderBottom: '1px solid #000000',
                              fontSize: '0.82rem',
                              lineHeight: 1.3,
                              textTransform: 'uppercase'
                            }}>
                              <div style={{ fontWeight: 600 }}>{alu.supervisor_proyecto || '-'}</div>
                              {alu.supervisor_cargo && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  {alu.supervisor_cargo}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      }

                      // Fila vacía para completar la cuadrícula oficial de 10 renglones
                      return (
                        <tr 
                          key={`empty-${idx}`} 
                          style={{ 
                            borderBottom: '1px solid #000000',
                            height: '42px'
                          }}
                        >
                          <td style={{ 
                            padding: '0.75rem 0.5rem', 
                            textAlign: 'center', 
                            fontWeight: 700, 
                            color: '#000000', 
                            borderLeft: '1px solid #000000',
                            borderRight: '1px dotted #000000',
                            borderBottom: '1px solid #000000'
                          }}>
                            {rowNumber}
                          </td>
                          <td style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}></td>
                          <td style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}></td>
                          <td style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}></td>
                          <td style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: BITÁCORA DE SEGUIMIENTO (EXISTENTE CON DOCUMENTOS PENDIENTES)    */}
      {/* ========================================================================= */}
      {activeTab === 'bitacora' && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ color: '#0f172a', margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
                Bitácora de Seguimiento al Prestante
              </h1>
              <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
                Reporte oficial institucional de alumnos con entregas <strong>Pendientes</strong> según el <strong>Calendario Oficial</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button 
                onClick={() => setIsEditingHeaders(!isEditingHeaders)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
                title="Editar títulos oficiales del encabezado"
              >
                <Edit3 size={15} /> {isEditingHeaders ? 'Cerrar Edición' : 'Editar Encabezado'}
              </button>

              <button 
                onClick={fetchReporte}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCw size={16} /> Refrescar
              </button>

              <button 
                onClick={handleDownloadExcel}
                disabled={downloading || filteredAlumnos.length === 0}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                <Download size={16} /> {downloading ? 'Generando Excel...' : `Exportar Excel ${selectedCarrera ? `(${selectedCarrera})` : '(Todas)'}`}
              </button>
            </div>
          </div>

          {/* Panel de Edición de Encabezados (Si está activo) */}
          {isEditingHeaders && (
            <div style={{ backgroundColor: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '2px solid #10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)', marginBottom: '1.5rem' }} className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#047857', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Edit3 size={16} /> Personalizar Encabezados del Documento
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleResetHeaders} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <RotateCcw size={13} /> Restaurar Predeterminados
                  </button>
                  <button onClick={() => setIsEditingHeaders(false)} className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}>
                    <Check size={14} /> Listo
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#334155' }}>Título del Departamento (Fila 1)</label>
                  <input 
                    type="text" 
                    value={tituloDepto} 
                    onChange={e => setTituloDepto(e.target.value)} 
                    className="form-input"
                    placeholder="DEPARTAMENTO DE RESIDENCIAS PROFESIONALES Y SERVICIO SOCIAL"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#334155' }}>Título del Reporte (Fila 3)</label>
                  <input 
                    type="text" 
                    value={tituloReporte} 
                    onChange={e => setTituloReporte(e.target.value)} 
                    className="form-input"
                    placeholder="BITÁCORA DE SEGUIMIENTO AL PRESTANTE DE SERVICIO SOCIAL"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Controles de Filtros */}
          <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '1.5rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Selector de Carrera con Todas las Carreras de la Base de Datos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: '350px', flex: '1 1 350px' }}>
              <GraduationCap size={22} color="#059669" />
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: 0 }}>Carrera:</label>
              <select 
                value={selectedCarrera} 
                onChange={e => setSelectedCarrera(e.target.value)}
                className="form-select"
                style={{ flex: 1, fontWeight: 600 }}
              >
                <option value="">-- Todas las Carreras Institucionales --</option>
                {carreras.map(c => (
                  <option key={c.id_carrera || c.nombre} value={c.nombre}>
                    {c.clave ? `[${c.clave}] ` : ''}{c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Badge Informativo de Estado */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.45rem 0.85rem', borderRadius: '20px', backgroundColor: '#ffedd5', color: '#c2410c', fontSize: '0.82rem', fontWeight: 700 }}>
              <FileClock size={15} color="#ea580c" />
              <span>Filtro: Alumnos con mínimo 1 documento Pendiente</span>
            </div>

            {/* Buscador Rápido */}
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar por alumno, no. control o proyecto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Vista Previa de la Bitácora Oficial */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            
            {/* Encabezado Institucional del Reporte */}
            <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {tituloDepto}
              </h2>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1e293b', margin: '0.35rem 0 0', textTransform: 'uppercase' }}>
                {tituloReporte}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>
                  PERIODO: {reporteData.periodo ? reporteData.periodo.toUpperCase() : 'FEBRERO – JUNIO 2026'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c2410c', backgroundColor: '#ffedd5', padding: '0.25rem 0.75rem', borderRadius: '8px' }}>
                  {selectedCarrera ? `Carrera: ${selectedCarrera}` : 'Todas las Carreras'} — {filteredAlumnos.length} alumnos con pendientes
                </span>
              </div>
            </div>

            {/* Tabla con Estilo Idéntico al Excel */}
            <div style={{ overflowX: 'auto', maxHeight: '65vh' }}>
              {loading ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Cargando bitácora de seguimiento...</div>
                </div>
              ) : filteredAlumnos.length === 0 ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                  <CheckCircle2 size={42} color="#10b981" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    {selectedCarrera ? `No se encontraron alumnos con pendientes en la carrera de ${selectedCarrera}.` : 'No hay alumnos con documentos pendientes de entrega.'}
                  </p>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem', color: '#94a3b8' }}>
                    Todos los prestantes de esta selección tienen sus formatos al corriente.
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  <thead>
                    {/* Fila 5 de Excel: Bloques de Fase con Fondo Gris */}
                    <tr style={{ backgroundColor: '#808080', color: 'white' }}>
                      <th colSpan={5} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}></th>
                      {reporteData.etapas_agrupadas && reporteData.etapas_agrupadas.length > 0 ? (
                        reporteData.etapas_agrupadas.map(stage => (
                          <th 
                            key={stage.etapa} 
                            colSpan={stage.documentos.length} 
                            style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #374151', fontSize: '0.75rem', lineHeight: 1.2 }}
                          >
                            {stage.titulo}
                            {stage.fecha && (
                              <>
                                <br/>
                                <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>{stage.fecha}</span>
                              </>
                            )}
                          </th>
                        ))
                      ) : (
                        <>
                          <th colSpan={2} style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #374151', fontSize: '0.75rem', lineHeight: 1.2 }}>
                            Expediente Inicial<br/><span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{fechas.inicial || '29 de noviembre 2025'}</span>
                          </th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #374151', fontSize: '0.75rem', lineHeight: 1.2, minWidth: '95px' }}>
                            Bim 1<br/><span style={{ fontSize: '0.68rem', fontWeight: 500 }}>{fechas.bim_1 || 'nov 2025 al 6 enero 2026'}</span>
                          </th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #374151', fontSize: '0.75rem', lineHeight: 1.2, minWidth: '95px' }}>
                            Bim 2<br/><span style={{ fontSize: '0.68rem', fontWeight: 500 }}>{fechas.bim_2 || '28 de julio al 27 de sept'}</span>
                          </th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #374151', fontSize: '0.75rem', lineHeight: 1.2, minWidth: '95px' }}>
                            Bim 3<br/><span style={{ fontSize: '0.68rem', fontWeight: 500 }}>{fechas.bim_3 || '29 de sept al 28 de nov'}</span>
                          </th>
                          <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #374151', fontSize: '0.75rem', lineHeight: 1.2, minWidth: '90px' }}>
                            Reporte<br/>Final
                          </th>
                        </>
                      )}
                    </tr>

                    {/* Fila 6 de Excel: Cabeceras de Columnas en Negro */}
                    <tr style={{ backgroundColor: '#000000', color: 'white' }}>
                      <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #334155', width: '45px' }}>No.</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800, border: '1px solid #334155', minWidth: '220px' }}>NOMBRE</th>
                      <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 800, border: '1px solid #334155', minWidth: '110px' }}>No. de Control</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800, border: '1px solid #334155', minWidth: '260px' }}>NOMBRE DEL PROYECTO</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800, border: '1px solid #334155', minWidth: '200px' }}>Nombre del Supervisor del Proyecto en la dependencia</th>
                      
                      {/* Documentos */}
                      {reporteData.documentos_catalogo && reporteData.documentos_catalogo.length > 0 ? (
                        reporteData.documentos_catalogo.map(doc => (
                          <th 
                            key={doc.id_documento} 
                            style={{ backgroundColor: '#ffffff', color: '#000000', padding: '0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #cbd5e1', fontSize: '0.72rem', lineHeight: 1.2, minWidth: '110px' }}
                          >
                            {doc.code || doc.clave_formato}<br/>{doc.short_title || doc.nombre}
                          </th>
                        ))
                      ) : (
                        <>
                          <th style={{ backgroundColor: '#ffffff', color: '#000000', padding: '0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #cbd5e1', fontSize: '0.72rem', lineHeight: 1.2 }}>
                            D-RPS-01<br/>Plan deTrabajo
                          </th>
                          <th style={{ backgroundColor: '#ffffff', color: '#000000', padding: '0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #cbd5e1', fontSize: '0.72rem', lineHeight: 1.2 }}>
                            F-RPS-08<br/>Bases de Concertación Individual
                          </th>
                          <th style={{ backgroundColor: '#ffffff', color: '#000000', padding: '0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #cbd5e1', fontSize: '0.72rem', lineHeight: 1.2 }}>
                            F-RPS-04<br/>Reporte Bimestral 1
                          </th>
                          <th style={{ backgroundColor: '#ffffff', color: '#000000', padding: '0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #cbd5e1', fontSize: '0.72rem', lineHeight: 1.2 }}>
                            F-RPS-04<br/>Reporte Bimestral 2
                          </th>
                          <th style={{ backgroundColor: '#ffffff', color: '#000000', padding: '0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #cbd5e1', fontSize: '0.72rem', lineHeight: 1.2 }}>
                            F-RPS-04<br/>Reporte Bimestral 3
                          </th>
                          <th style={{ backgroundColor: '#ffffff', color: '#000000', padding: '0.5rem', textAlign: 'center', fontWeight: 800, border: '1px solid #cbd5e1', fontSize: '0.72rem', lineHeight: 1.2 }}>
                            D-RPS-02<br/>Reporte Final
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlumnos.map((row, idx) => {
                      const docs = row.documentos || {};
                      return (
                        <tr key={row.no_control || idx} style={{ borderBottom: '1px dashed #cbd5e1' }}>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#334155', border: '1px dashed #cbd5e1' }}>
                            {row.no || idx + 1}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#0f172a', border: '1px dashed #cbd5e1' }}>
                            <div>{row.nombre}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.carrera}</div>
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 800, color: '#059669', border: '1px dashed #cbd5e1' }}>
                            {row.no_control}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#334155', fontSize: '0.76rem', border: '1px dashed #cbd5e1' }}>
                            {row.nombre_proyecto}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#475569', fontSize: '0.76rem', border: '1px dashed #cbd5e1' }}>
                            {row.supervisor || '-'}
                          </td>

                          {/* Columnas de Documentos dinámicas con resaltado amarillo si es NO (Pendiente) */}
                          {reporteData.documentos_catalogo && reporteData.documentos_catalogo.length > 0 ? (
                            reporteData.documentos_catalogo.map(doc => {
                              const docObj = docs[String(doc.id_documento)] || docs[doc.clave_formato] || {};
                              const isPendiente = docObj.es_pendiente;
                              return (
                                <td 
                                  key={doc.id_documento} 
                                  style={{ 
                                    padding: '0.65rem 0.5rem', 
                                    textAlign: 'center', 
                                    fontWeight: isPendiente ? 800 : 600, 
                                    backgroundColor: isPendiente ? '#ffff00' : '#ffffff', 
                                    color: isPendiente ? '#000000' : '#059669',
                                    border: '1px dashed #cbd5e1',
                                    fontSize: isPendiente ? '0.82rem' : '0.75rem'
                                  }}
                                >
                                  {isPendiente ? 'NO' : ''}
                                </td>
                              );
                            })
                          ) : (
                            ['DRPS01', 'FRPS08', 'FRPS04_1', 'FRPS04_2', 'FRPS04_3', 'DRPS02'].map(clave => {
                              const docObj = docs[clave] || { es_pendiente: true, texto: 'NO' };
                              const isPendiente = docObj.es_pendiente;

                              return (
                                <td 
                                  key={clave} 
                                  style={{ 
                                    padding: '0.65rem 0.5rem', 
                                    textAlign: 'center', 
                                    fontWeight: isPendiente ? 800 : 600, 
                                    backgroundColor: isPendiente ? '#ffff00' : '#ffffff', 
                                    color: isPendiente ? '#000000' : '#059669',
                                    border: '1px dashed #cbd5e1',
                                    fontSize: isPendiente ? '0.82rem' : '0.75rem'
                                  }}
                                >
                                  {isPendiente ? 'NO' : ''}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
