import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { FileSpreadsheet, Mail, AlertTriangle } from 'lucide-react';

export default function ReportesNotificaciones() {
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingMail, setLoadingMail] = useState(false);

  const handleDownloadExcel = () => {
    setLoadingExcel(true);
    fetch('http://127.0.0.1:5000/api/admin/reportes/exportar')
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'reporte_servicio_social.xlsx');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        setLoadingExcel(false);
      })
      .catch(() => {
        setLoadingExcel(false);
        Swal.fire('Error', 'No se pudo generar el reporte', 'error');
      });
  };

  const handleNotify = () => {
    Swal.fire({
      title: '¿Enviar Notificaciones?',
      text: 'Se enviarán correos recordatorios a todos los alumnos con estado "EN REVISIÓN" o "SIN PROYECTO" mediante Microsoft Graph API.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, enviar correos'
    }).then((result) => {
      if (result.isConfirmed) {
        setLoadingMail(true);
        fetch('http://127.0.0.1:5000/api/admin/notificar-adeudos', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            setLoadingMail(false);
            if (!data.error) {
              Swal.fire('Enviado', `Correos encolados: ${data.total_enviados}`, 'success');
            } else {
              Swal.fire('Error', data.error, 'error');
            }
          })
          .catch(() => {
            setLoadingMail(false);
            Swal.fire('Error', 'Error de conexión', 'error');
          });
      }
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#0f172a', marginBottom: '1.5rem' }}>Reportes y Notificaciones Masivas</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Tarjeta Exportar Excel */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderTop: '4px solid #10b981' }}>
          <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <FileSpreadsheet size={48} color="#10b981" />
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Bitácora Oficial</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>Exporta la base de datos de todos los proyectos y el estatus actual de los documentos en formato Excel (.xlsx) listo para auditoría.</p>
          <button 
            onClick={handleDownloadExcel} 
            disabled={loadingExcel}
            style={{ padding: '0.75rem 2rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: loadingExcel ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loadingExcel ? 'Generando...' : 'Descargar Excel'}
          </button>
        </div>

        {/* Tarjeta Notificar Adeudos */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderTop: '4px solid #059669' }}>
          <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Mail size={48} color="#059669" />
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Notificaciones Institucionales</h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>Usa la API de Microsoft Graph para enviar recordatorios a los estudiantes sobre documentos faltantes o en revisión.</p>
          <button 
            onClick={handleNotify} 
            disabled={loadingMail}
            style={{ padding: '0.75rem 2rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: loadingMail ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loadingMail ? 'Encolando...' : 'Enviar Correos'}
          </button>
        </div>

      </div>

      <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#fffbeb', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'flex-start', border: '1px solid #fde68a' }}>
        <AlertTriangle color="#d97706" style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#92400e' }}>Aviso del Sistema de Correos</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#b45309' }}>La integración con Microsoft Graph utiliza el token de la sesión actual del administrador. Asegúrate de que la cuenta activa tiene permisos "Mail.Send" en el Azure App Registration.</p>
        </div>
      </div>
    </div>
  );
}
