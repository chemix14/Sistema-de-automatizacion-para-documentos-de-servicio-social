import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { 
  Calendar, 
  Save, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  Layers, 
  Award, 
  ArrowRight, 
  Wand2, 
  Info, 
  CalendarDays, 
  Check, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import RaccoonIcon from '../../components/RaccoonIcon';

const PRESET_PERIODOS = [
  'ENERO - JUNIO 2026',
  'FEBRERO - JULIO 2026',
  'AGOSTO - DICIEMBRE 2026',
  'SEPTIEMBRE 2026 - ENERO 2027',
  'VERANO 2026'
];

export default function ConfiguracionCalendario() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTabPhase, setActiveTabPhase] = useState('ALL'); // 'ALL' or phase id
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/admin/configuracion')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
    setSaveSuccess(false);
  };

  // Helper: Format date to friendly Spanish string (e.g. "Jueves, 19 de Marzo 2026")
  const formatDateReadable = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
      const formatted = new Intl.DateTimeFormat('es-MX', options).format(date);
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch (e) {
      return dateStr;
    }
  };

  // Helper: Calculate difference in days between two YYYY-MM-DD dates
  const calcDaysBetween = (startStr, endStr) => {
    if (!startStr || !endStr) return null;
    try {
      const p1 = startStr.split('-').map(Number);
      const p2 = endStr.split('-').map(Number);
      const d1 = new Date(p1[0], p1[1] - 1, p1[2]);
      const d2 = new Date(p2[0], p2[1] - 1, p2[2]);
      const diffTime = d2.getTime() - d1.getTime();
      return Math.round(diffTime / (1000 * 3600 * 24));
    } catch (e) {
      return null;
    }
  };

  // Helper: Add days to a YYYY-MM-DD date and return formatted YYYY-MM-DD
  const addDaysToDate = (dateStr, days) => {
    if (!dateStr) return '';
    const p = dateStr.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper: Get status and validation of a phase
  const getPhaseStatus = (startStr, endStr) => {
    if (!startStr && !endStr) return { status: 'empty', label: 'Sin fechas', color: '#94a3b8' };
    if (!startStr || !endStr) return { status: 'incomplete', label: 'Incompleto', color: '#f59e0b' };
    if (startStr > endStr) return { status: 'invalid', label: 'Fecha fin anterior a inicio', color: '#ef4444' };
    const days = calcDaysBetween(startStr, endStr);
    return { status: 'valid', label: `${days} días de duración`, color: '#10b981', days };
  };

  // Total Cycle Duration (calculated from B1 start to FN end, or Apertura to FN end)
  const totalCycleStats = useMemo(() => {
    const start = config.inicio_bimestre_1 || config.apertura_expediente;
    const end = config.cierre_expediente_final || config.fin_bimestre_3;
    if (!start || !end) return { days: 0, months: 0 };
    const days = calcDaysBetween(start, end);
    if (days && days > 0) {
      const months = (days / 30).toFixed(1);
      return { days, months };
    }
    return { days: 0, months: 0 };
  }, [config]);

  // Suggest standard 60-day Bimestres
  const handleAutoSuggestDates = () => {
    const baseDate = config.inicio_bimestre_1 || config.apertura_expediente || '2026-02-01';
    
    Swal.fire({
      title: 'Generar Fechas Automáticas',
      html: `
        <div style="text-align: left; font-size: 0.9rem; color: #334155;">
          <p>Indica la fecha de inicio para el <b>Primer Bimestre (B1)</b>. El asistente calculará automáticamente 3 bimestres consecutivos de 60 días cada uno, sus fechas límite de entrega con margen de 5 días, y los periodos de inscripción y liberación.</p>
          <div style="margin-top: 1rem;">
            <label style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.35rem;">Fecha de Inicio del Bimestre 1:</label>
            <input type="date" id="swal_base_date" value="${baseDate}" class="swal2-input" style="width: 100%; margin: 0; font-size: 0.95rem;" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Generar Cronograma',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const val = document.getElementById('swal_base_date').value;
        if (!val) {
          Swal.showValidationMessage('Por favor selecciona una fecha válida');
        }
        return val;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const b1Start = result.value;
        const b1End = addDaysToDate(b1Start, 59);
        const b1Lim = addDaysToDate(b1End, 5);

        const b2Start = addDaysToDate(b1End, 1);
        const b2End = addDaysToDate(b2Start, 59);
        const b2Lim = addDaysToDate(b2End, 5);

        const b3Start = addDaysToDate(b2End, 1);
        const b3End = addDaysToDate(b3Start, 59);
        const b3Lim = addDaysToDate(b3End, 5);

        const apStart = addDaysToDate(b1Start, -15);
        const apEnd = addDaysToDate(b1Start, 15);

        const libStart = addDaysToDate(b3End, 1);
        const libEnd = addDaysToDate(libStart, 30);

        setConfig(prev => ({
          ...prev,
          apertura_expediente: apStart,
          cierre_expediente: apEnd,
          inicio_bimestre_1: b1Start,
          fin_bimestre_1: b1End,
          limite_entrega_bim_1: b1Lim,
          inicio_bimestre_2: b2Start,
          fin_bimestre_2: b2End,
          limite_entrega_bim_2: b2Lim,
          inicio_bimestre_3: b3Start,
          fin_bimestre_3: b3End,
          limite_entrega_bim_3: b3Lim,
          apertura_expediente_final: libStart,
          cierre_expediente_final: libEnd
        }));

        Swal.fire('¡Fechas Calculadas!', 'Se han generado las fechas estándar de los 3 bimestres y fases complementarias. Revisa los campos y haz clic en "Guardar Calendario Oficial" para confirmar.', 'success');
      }
    });
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!config.nombre_oficial || !config.nombre_oficial.trim()) {
      Swal.fire('Atención', 'Debes ingresar el nombre oficial del periodo escolar.', 'warning');
      return;
    }

    // Validations
    for (let i = 1; i <= 3; i++) {
      const start = config[`inicio_bimestre_${i}`];
      const end = config[`fin_bimestre_${i}`];
      const endEnt = config[`limite_entrega_bim_${i}`];

      if (start && end && start > end) {
        Swal.fire('Incoherencia en Fechas', `La fecha de inicio del Bimestre ${i} no puede ser posterior a la de fin.`, 'error');
        return;
      }
      if (end && endEnt && endEnt < end) {
        Swal.fire('Aviso sobre Fecha Límite', `La fecha límite de entrega del Bimestre ${i} (${endEnt}) no debería ser anterior a la conclusión del propio bimestre (${end}).`, 'warning');
      }
    }

    if (config.apertura_expediente && config.cierre_expediente && config.apertura_expediente > config.cierre_expediente) {
      Swal.fire('Incoherencia en Fechas', 'La fecha de apertura de expedientes inicial no puede ser posterior al cierre.', 'error');
      return;
    }

    if (config.apertura_expediente_final && config.cierre_expediente_final && config.apertura_expediente_final > config.cierre_expediente_final) {
      Swal.fire('Incoherencia en Fechas', 'La fecha de apertura de expedientes finales no puede ser posterior al cierre.', 'error');
      return;
    }

    Swal.fire({ 
      title: 'Guardando calendario...', 
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading() 
    });

    fetch('http://127.0.0.1:5000/api/admin/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    .then(res => res.json())
    .then(data => {
      if (!data.error) {
        Swal.fire({
          icon: 'success',
          title: '¡Calendario Actualizado!',
          text: 'Las fechas oficiales han sido guardadas y aplicadas a todos los módulos y expedientes estudiantiles.',
          timer: 2000,
          timerProgressBar: true
        });
        setSaveSuccess(true);
      } else {
        Swal.fire('Error', data.error, 'error');
      }
    })
    .catch(() => Swal.fire('Error', 'No se pudo conectar con el servidor', 'error'));
  };

  // Phases Meta Definition for Timeline & Stepper
  const phases = [
    {
      id: 'fase_inicial',
      stepNum: '1',
      code: 'F1',
      title: 'Inscripción y Apertura de Expedientes',
      subtitle: 'Registro institucional de solicitud, carta compromiso y bases de concertación.',
      color: '#10b981',
      lightBg: '#ecfdf5',
      borderAccent: '#a7f3d0',
      icon: FileText,
      startKey: 'apertura_expediente',
      endKey: 'cierre_expediente',
      startLabel: 'Apertura de Solicitudes',
      endLabel: 'Cierre de Registro',
      isBimestre: false
    },
    {
      id: 'bimestre_1',
      stepNum: '2',
      code: 'B1',
      title: 'Primer Bimestre (B1)',
      subtitle: 'Inicio formal de actividades y entrega del Reporte Bimestral 1 con Autoevaluación.',
      color: '#059669',
      lightBg: '#ecfdf5',
      borderAccent: '#a7f3d0',
      icon: Layers,
      startKey: 'inicio_bimestre_1',
      endKey: 'fin_bimestre_1',
      deadlineKey: 'limite_entrega_bim_1',
      startLabel: 'Inicio del Bimestre 1',
      endLabel: 'Fin del Bimestre 1',
      isBimestre: true,
      bimNum: 1
    },
    {
      id: 'bimestre_2',
      stepNum: '3',
      code: 'B2',
      title: 'Segundo Bimestre (B2)',
      subtitle: 'Seguimiento intermedio de horas acumuladas y entrega del Reporte Bimestral 2.',
      color: '#0d9488',
      lightBg: '#f0fdfa',
      borderAccent: '#99f6e4',
      icon: Layers,
      startKey: 'inicio_bimestre_2',
      endKey: 'fin_bimestre_2',
      deadlineKey: 'limite_entrega_bim_2',
      startLabel: 'Inicio del Bimestre 2',
      endLabel: 'Fin del Bimestre 2',
      isBimestre: true,
      bimNum: 2
    },
    {
      id: 'bimestre_3',
      stepNum: '4',
      code: 'B3',
      title: 'Tercer Bimestre (B3)',
      subtitle: 'Cierre de actividades del proyecto, acumulación de 480 horas y Reporte Bimestral 3.',
      color: '#d97706',
      lightBg: '#fffbeb',
      borderAccent: '#fde68a',
      icon: Layers,
      startKey: 'inicio_bimestre_3',
      endKey: 'fin_bimestre_3',
      deadlineKey: 'limite_entrega_bim_3',
      startLabel: 'Inicio del Bimestre 3',
      endLabel: 'Fin del Bimestre 3',
      isBimestre: true,
      bimNum: 3
    },
    {
      id: 'fase_final',
      stepNum: '5',
      code: 'FN',
      title: 'Liberación y Finiquito (Fase Final)',
      subtitle: 'Recepción del reporte final, carta de terminación y emisión de constancia oficial.',
      color: '#047857',
      lightBg: '#ecfdf5',
      borderAccent: '#a7f3d0',
      icon: Award,
      startKey: 'apertura_expediente_final',
      endKey: 'cierre_expediente_final',
      startLabel: 'Apertura de Liberaciones',
      endLabel: 'Cierre Definitivo de Actas',
      isBimestre: false
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
        <p style={{ fontWeight: 600 }}>Cargando calendario oficial...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* 1. Header Hero Banner */}
      <div style={{ 
        background: 'linear-gradient(135deg, #022c22 0%, #064e3b 55%, #065f46 100%)', 
        borderRadius: '24px', 
        padding: '2.5rem', 
        color: 'white', 
        marginBottom: '2rem', 
        boxShadow: '0 15px 30px -10px rgba(2, 44, 34, 0.35)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{ position: 'absolute', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.25)', filter: 'blur(80px)', top: '-50px', right: '-50px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(52, 211, 153, 0.18)', filter: 'blur(80px)', bottom: '-50px', left: '20%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '750px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.8rem', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '1rem', border: '1px solid rgba(110, 231, 183, 0.25)' }}>
              <RaccoonIcon size={16} color="#34d399" /> Cronograma Institucional de Servicio Social • Mapaches
            </div>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '0 0 0.6rem 0', letterSpacing: '-0.5px', color: '#ffffff' }}>
              Calendario Oficial de Periodos
            </h1>
            <p style={{ color: '#d1fae5', fontSize: '0.98rem', lineHeight: 1.6, margin: 0 }}>
              Establece las fechas de inicio, conclusión y límites de entrega para las 5 fases del ciclo escolar. El sistema audita automáticamente si las entregas de los prestadores se realizan en tiempo o extemporáneas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={() => setIsWizardOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Calcular fechas de bimestres estándar automáticamente"
            >
              <Wand2 size={16} color="#6ee7b7" /> Asistente de Fechas
            </button>

            <button 
              type="button" 
              onClick={handleSave}
              className="btn btn-primary"
              style={{ 
                padding: '0.8rem 1.6rem', 
                fontSize: '0.92rem', 
                fontWeight: 800,
                boxShadow: '0 10px 20px -5px rgba(5, 150, 105, 0.5)'
              }}
            >
              <Save size={18} /> Guardar Calendario Oficial
            </button>
          </div>
        </div>

        {/* Quick KPI strip */}
        <div style={{ 
          marginTop: '2rem', 
          paddingTop: '1.5rem', 
          borderTop: '1px solid rgba(255, 255, 255, 0.12)', 
          display: 'flex', 
          gap: '2rem', 
          flexWrap: 'wrap',
          alignItems: 'center' 
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>Periodo Vigente</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.15rem' }}>
              {config.nombre_oficial || 'Sin Asignar'}
            </div>
          </div>

          <div style={{ width: '1px', height: '35px', backgroundColor: 'rgba(255,255,255,0.15)' }} />

          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>Amplitud del Ciclo</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6ee7b7', marginTop: '0.15rem' }}>
              {totalCycleStats.days > 0 ? `${totalCycleStats.days} días (~${totalCycleStats.months} meses)` : 'Sin fechas completas'}
            </div>
          </div>

          <div style={{ width: '1px', height: '35px', backgroundColor: 'rgba(255,255,255,0.15)' }} />

          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>Estado de Configuración</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: config.nombre_oficial ? '#10b981' : '#f59e0b' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: config.nombre_oficial ? '#a7f3d0' : '#fde68a' }}>
                {config.nombre_oficial ? 'Configuración en línea' : 'Requiere Nombre de Periodo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Period Name & Quick Presets Card */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '20px', 
        padding: '1.75rem 2rem', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
        marginBottom: '2rem' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Calendar size={18} color="#059669" /> Nombre Oficial del Periodo Escolar *
            </label>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Este título institucional se estampa automáticamente en todas las cartas, constancias de servicio social y reportes en PDF y Word.
            </p>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginRight: '0.25rem' }}>Sugerencias:</span>
            {PRESET_PERIODOS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, nombre_oficial: p }))}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.7rem',
                  borderRadius: '20px',
                  border: config.nombre_oficial === p ? '1px solid #059669' : '1px solid #e2e8f0',
                  backgroundColor: config.nombre_oficial === p ? '#ecfdf5' : '#f8fafc',
                  color: config.nombre_oficial === p ? '#059669' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.color = '#059669'; }}
                onMouseLeave={e => {
                  if (config.nombre_oficial !== p) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <input 
          type="text" 
          value={config.nombre_oficial} 
          onChange={e => setConfig(prev => ({ ...prev, nombre_oficial: e.target.value.toUpperCase() }))}
          className="form-input"
          style={{ fontSize: '1.15rem', fontWeight: 800, padding: '0.85rem 1.15rem', letterSpacing: '0.5px' }}
          placeholder="Ej. ENERO - JUNIO 2026"
        />
      </div>

      {/* 3. Sequential Stepper / Milestone Roadmap */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '20px', 
        padding: '1.75rem 2rem', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
        marginBottom: '2rem',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Ruta Crítica del Periodo Escolar (5 Fases Secuenciales)
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Haz clic en cualquier fase para enfocar y auditar su ventana de fechas y margen de entrega.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setActiveTabPhase('ALL')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: activeTabPhase === 'ALL' ? '#ecfdf5' : 'transparent',
              color: activeTabPhase === 'ALL' ? '#059669' : '#64748b',
              border: activeTabPhase === 'ALL' ? '1px solid #059669' : '1px solid #e2e8f0',
              cursor: 'pointer'
            }}
          >
            Ver Todas las Fases
          </button>
        </div>

        {/* Stepper Track */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', minWidth: '700px', padding: '1rem 0' }}>
          {phases.map((ph, idx) => {
            const startVal = config[ph.startKey];
            const endVal = config[ph.endKey];
            const isSelected = activeTabPhase === ph.id;
            const phStatus = getPhaseStatus(startVal, endVal);

            return (
              <React.Fragment key={ph.id}>
                {/* Step Node */}
                <div 
                  onClick={() => setActiveTabPhase(ph.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 2,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    backgroundColor: isSelected ? ph.color : (phStatus.status === 'valid' ? ph.color : '#f1f5f9'),
                    color: (isSelected || phStatus.status === 'valid') ? 'white' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    boxShadow: isSelected ? `0 8px 16px -2px ${ph.color}80` : (phStatus.status === 'valid' ? `0 4px 10px ${ph.color}40` : 'none'),
                    border: isSelected ? `3px solid white` : 'none',
                    outline: isSelected ? `2px solid ${ph.color}` : 'none',
                    transition: 'all 0.2s'
                  }}>
                    {phStatus.status === 'valid' ? <Check size={20} strokeWidth={2.5} /> : ph.stepNum}
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '0.65rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isSelected ? ph.color : '#1e293b' }}>
                      {ph.code} • {ph.isBimestre ? `Bimestre ${ph.bimNum}` : (idx === 0 ? 'Apertura' : 'Liberación')}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>
                      {startVal && endVal ? `${formatDateReadable(startVal).split(',')[1] || startVal} - ${formatDateReadable(endVal).split(',')[1] || endVal}` : 'Sin definir'}
                    </div>
                  </div>
                </div>

                {/* Connecting Line between steps */}
                {idx < phases.length - 1 && (
                  <div style={{
                    height: '4px',
                    flex: 0.8,
                    backgroundColor: (config[ph.endKey] && config[phases[idx+1].startKey]) ? '#10b981' : '#e2e8f0',
                    margin: '-1.8rem -0.5rem 0 -0.5rem',
                    position: 'relative',
                    zIndex: 1,
                    borderRadius: '2px',
                    transition: 'background-color 0.3s'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 4. Sequential Phase Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {phases
          .filter(ph => activeTabPhase === 'ALL' || activeTabPhase === ph.id)
          .map((ph, idx) => {
            const startVal = config[ph.startKey] || '';
            const endVal = config[ph.endKey] || '';
            const deadlineVal = ph.deadlineKey ? (config[ph.deadlineKey] || '') : null;
            const phStatus = getPhaseStatus(startVal, endVal);
            const Icon = ph.icon;

            // Difference between end date and submission deadline
            const marginDays = ph.deadlineKey && endVal && deadlineVal ? calcDaysBetween(endVal, deadlineVal) : null;

            return (
              <div 
                key={ph.id}
                id={`card_${ph.id}`}
                style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '22px', 
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                  transition: 'all 0.2s'
                }}
              >
                {/* Phase Card Header Strip */}
                <div style={{ 
                  padding: '1.25rem 2rem', 
                  backgroundColor: ph.lightBg, 
                  borderBottom: `1px solid ${ph.borderAccent}`,
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '12px', 
                      backgroundColor: ph.color, 
                      color: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 800,
                      boxShadow: `0 4px 10px ${ph.color}40`
                    }}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: ph.color, backgroundColor: 'white', padding: '0.15rem 0.5rem', borderRadius: '6px', border: `1px solid ${ph.borderAccent}` }}>
                          FASE {ph.stepNum} DE 5
                        </span>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                          {ph.title}
                        </h2>
                      </div>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#475569' }}>
                        {ph.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Status & Duration Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {phStatus.status === 'valid' ? (
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        color: '#065f46', 
                        backgroundColor: '#d1fae5', 
                        padding: '0.35rem 0.75rem', 
                        borderRadius: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        border: '1px solid #a7f3d0'
                      }}>
                        <CheckCircle2 size={15} color="#10b981" /> {phStatus.label}
                      </span>
                    ) : phStatus.status === 'invalid' ? (
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        color: '#991b1b', 
                        backgroundColor: '#fee2e2', 
                        padding: '0.35rem 0.75rem', 
                        borderRadius: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        border: '1px solid #fecaca'
                      }}>
                        <AlertCircle size={15} color="#ef4444" /> {phStatus.label}
                      </span>
                    ) : (
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        color: '#92400e', 
                        backgroundColor: '#fef3c7', 
                        padding: '0.35rem 0.75rem', 
                        borderRadius: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        border: '1px solid #fde68a'
                      }}>
                        <Clock size={15} color="#f59e0b" /> {phStatus.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Phase Card Body */}
                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: ph.isBimestre ? '1fr 1fr' : '1fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
                    
                    {/* Left Column: Periodo Operativo (Fechas de la Fase) */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
                          Periodo Operativo de la Fase
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>• Rango de Realización</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Start Date */}
                        <div style={{ 
                          backgroundColor: '#f8fafc', 
                          padding: '1rem', 
                          borderRadius: '14px', 
                          border: '1px solid #e2e8f0',
                          transition: 'border-color 0.15s'
                        }}>
                          <label className="form-label" style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={14} color="#059669" /> {ph.startLabel}
                          </label>
                          <input 
                            type="date"
                            name={ph.startKey}
                            value={startVal}
                            onChange={handleChange}
                            className="form-input"
                            style={{ fontSize: '0.92rem', fontWeight: 700, backgroundColor: 'white' }}
                          />
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 500 }}>
                            {startVal ? formatDateReadable(startVal) : 'Sin fecha asignada'}
                          </div>
                        </div>

                        {/* End Date */}
                        <div style={{ 
                          backgroundColor: '#f8fafc', 
                          padding: '1rem', 
                          borderRadius: '14px', 
                          border: phStatus.status === 'invalid' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                          transition: 'border-color 0.15s'
                        }}>
                          <label className="form-label" style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={14} color="#059669" /> {ph.endLabel}
                          </label>
                          <input 
                            type="date"
                            name={ph.endKey}
                            value={endVal}
                            onChange={handleChange}
                            className="form-input"
                            style={{ 
                              fontSize: '0.92rem', 
                              fontWeight: 700, 
                              backgroundColor: 'white',
                              borderColor: phStatus.status === 'invalid' ? '#ef4444' : undefined
                            }}
                          />
                          <div style={{ fontSize: '0.74rem', color: phStatus.status === 'invalid' ? '#dc2626' : '#64748b', marginTop: '0.35rem', fontWeight: 500 }}>
                            {endVal ? formatDateReadable(endVal) : 'Sin fecha asignada'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Ventana de Entrega de Reportes (Solo Bimestres) o Guía de Validación */}
                    {ph.isBimestre ? (
                      <div style={{ 
                        backgroundColor: '#fffbeb', 
                        padding: '1.25rem 1.5rem', 
                        borderRadius: '16px', 
                        border: '1px solid #fde68a',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Clock size={15} color="#d97706" /> Fecha Límite Oficial de Entrega
                            </span>
                            {marginDays !== null && (
                              <span style={{ 
                                fontSize: '0.72rem', 
                                fontWeight: 700, 
                                backgroundColor: marginDays >= 0 ? '#fef3c7' : '#fee2e2', 
                                color: marginDays >= 0 ? '#92400e' : '#b91c1c', 
                                padding: '0.15rem 0.55rem', 
                                borderRadius: '12px',
                                border: '1px solid rgba(0,0,0,0.06)'
                              }}>
                                {marginDays >= 0 ? `+${marginDays} días de margen tras fin` : `⚠️ ${Math.abs(marginDays)} días antes de fin`}
                              </span>
                            )}
                          </div>
                          
                          <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#78350f', lineHeight: 1.45 }}>
                            Límite institucional para subir el <b>Reporte Bimestral {ph.bimNum}</b> y la <b>Autoevaluación</b>. Entregas recibidas después de este día se catalogarán como <b>Extemporáneas con Retardo</b>.
                          </p>

                          <div style={{ maxWidth: '300px' }}>
                            <input 
                              type="date"
                              name={ph.deadlineKey}
                              value={deadlineVal || ''}
                              onChange={handleChange}
                              className="form-input"
                              style={{ 
                                fontSize: '0.95rem', 
                                fontWeight: 800, 
                                backgroundColor: 'white',
                                borderColor: '#f59e0b'
                              }}
                            />
                            <div style={{ fontSize: '0.74rem', color: '#92400e', marginTop: '0.35rem', fontWeight: 600 }}>
                              {deadlineVal ? `Cierre de recepción: ${formatDateReadable(deadlineVal)}` : 'Sin fecha límite asignada'}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(217, 119, 6, 0.15)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#92400e' }}>
                          <Info size={13} style={{ flexShrink: 0 }} />
                          <span>Esta fecha se utiliza en la <b>Matriz de Validación</b> para el semáforo automático de puntualidad.</span>
                        </div>
                      </div>
                    ) : (
                      /* Non-bimestre helper info */
                      <div style={{ 
                        backgroundColor: '#f8fafc', 
                        padding: '1.25rem 1.5rem', 
                        borderRadius: '16px', 
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                          <Info size={16} color="#059669" />
                          <span>Impacto en los Expedientes de los Alumnos</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                          {idx === 0 
                            ? 'Durante esta ventana los estudiantes pueden ingresar al sistema, llenar su Solicitud de Servicio Social (FRPS01) y registrar su Carta Compromiso. Fuera de este rango el registro permanece bloqueado.'
                            : 'Fase de cierre de ciclo. Se audita que el alumno cuente con los 3 bimestres aprobados para recibir el Reporte Final (DRPS02) y tramitar la Carta de Liberación oficial.'}
                        </p>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* 5. Mini-Gantt Visual Timeline Summary (Resumen Panorámico) */}
      <div style={{ 
        marginTop: '2.5rem', 
        backgroundColor: 'white', 
        borderRadius: '20px', 
        padding: '2rem', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Resumen Cronológico Panorámico (Vista Previa de Fases)
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Mapa continuo de la distribución temporal de las 5 etapas del ciclo oficial.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#10b981' }} /> F1 Inscripciones
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#059669' }} /> B1
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#0d9488' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#0d9488' }} /> B2
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#d97706' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#d97706' }} /> B3
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#047857' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#047857' }} /> FN Liberación
            </span>
          </div>
        </div>

        {/* Timeline Graphic Track */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {phases.map(ph => {
            const startVal = config[ph.startKey];
            const endVal = config[ph.endKey];
            const deadlineVal = ph.deadlineKey ? config[ph.deadlineKey] : null;
            const days = calcDaysBetween(startVal, endVal);

            return (
              <div key={ph.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '130px', fontSize: '0.78rem', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>
                  {ph.code} • {ph.title.split('(')[0].trim()}
                </div>
                
                <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '28px', borderRadius: '8px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', padding: '0 0.75rem' }}>
                  {startVal && endVal ? (
                    <div style={{
                      position: 'absolute',
                      left: '0',
                      top: '0',
                      bottom: '0',
                      width: '100%',
                      backgroundColor: ph.lightBg,
                      borderLeft: `4px solid ${ph.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 0.85rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: ph.color
                    }}>
                      <span>{formatDateReadable(startVal)}</span>
                      <span>{days ? `${days} días` : ''}</span>
                      <span>{formatDateReadable(endVal)}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Fechas pendientes de asignación
                    </span>
                  )}
                </div>

                {deadlineVal && (
                  <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700, backgroundColor: '#fffbeb', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid #fde68a', whiteSpace: 'nowrap' }}>
                    Límite: {formatDateReadable(deadlineVal).split(',')[1] || deadlineVal}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer save action */}
        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.82rem', color: saveSuccess ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
            {saveSuccess ? (
              <>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Todos los cambios guardados correctamente en la base de datos institucional.</span>
              </>
            ) : (
              <>
                <Info size={16} color="#059669" />
                <span>Recuerda hacer clic en "Guardar Calendario Oficial" para confirmar las fechas modificadas.</span>
              </>
            )}
          </div>

          <button 
            type="button" 
            onClick={handleSave} 
            className="btn btn-primary"
            style={{ padding: '0.85rem 2rem', fontSize: '0.95rem', fontWeight: 800 }}
          >
            <Save size={18} /> Guardar Calendario Oficial
          </button>
        </div>

      </div>

    </div>
  );
}
