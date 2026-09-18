import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/auth/Login';
import LoginCallback from './pages/auth/LoginCallback';

import AdminLayout from './layouts/AdminLayout';
import DashboardHome from './pages/admin/DashboardHome';
import GestionFormularios from './pages/admin/GestionFormularios';
import FormBuilderWrapper from './pages/admin/FormBuilderWrapper';

import StudentLayout from './layouts/StudentLayout';
import Workspace from './pages/student/Workspace';
import FormsDashboard from './pages/student/FormsDashboard';
import FormRenderer from './pages/student/FormRenderer';
import FormEntregaArchivo from './pages/student/FormEntregaArchivo';
import ExpedienteEstudiante from './pages/student/ExpedienteEstudiante';

import AlumnosImport from './pages/admin/AlumnosImport';
import ProyectosAuditoria from './pages/admin/ProyectosAuditoria';
import ValidacionPipeline from './pages/admin/ValidacionPipeline';
import ReportesOficiales from './pages/admin/ReportesOficiales';
import AvisosNotificaciones from './pages/admin/AvisosNotificaciones';
import ConfiguracionCalendario from './pages/admin/ConfiguracionCalendario';
import PersonalAdmin from './pages/admin/PersonalAdmin';
import CatalogosAdmin from './pages/admin/CatalogosAdmin';
import BuzonRecepcionAdmin from './pages/admin/BuzonRecepcionAdmin';
import MantenimientoAlmacenamiento from './pages/admin/MantenimientoAlmacenamiento';

// Smart Role-Based Private Route
const PrivateRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('auth_token');
  const role = localStorage.getItem('user_role');

  if (!token) return <Navigate to="/login" replace />;
  
  if (allowedRole && role !== allowedRole) {
    // Si es ADMIN tratando de entrar a vista de alumno, dirigirlo a su panel admin
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    // Si es ALUMNO tratando de entrar a panel admin, dirigirlo a su panel alumno
    if (role === 'ALUMNO') return <Navigate to="/student" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Root and Unknown Route Redirector
const RootRedirect = () => {
  const token = localStorage.getItem('auth_token');
  const role = localStorage.getItem('user_role');

  if (!token) return <Navigate to="/login" replace />;
  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (role === 'ALUMNO') return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login/success" element={<LoginCallback />} />
        <Route path="/login/error" element={<LoginCallback />} />

        <Route path="/admin" element={
          <PrivateRoute allowedRole="ADMIN">
            <AdminLayout />
          </PrivateRoute>
        }>
          <Route index element={<DashboardHome />} />
          <Route path="buzon-recepcion" element={<BuzonRecepcionAdmin />} />
          <Route path="alumnos" element={<AlumnosImport />} />
          <Route path="proyectos" element={<ProyectosAuditoria />} />
          <Route path="validacion" element={<ValidacionPipeline />} />
          <Route path="reportes" element={<ReportesOficiales />} />
          <Route path="mantenimiento" element={<MantenimientoAlmacenamiento />} />
          <Route path="avisos" element={<AvisosNotificaciones />} />
          <Route path="configuracion" element={<ConfiguracionCalendario />} />
          <Route path="catalogos" element={<CatalogosAdmin />} />
          <Route path="personal" element={<PersonalAdmin />} />
          <Route path="formularios" element={<GestionFormularios />} />
          <Route path="formularios/nuevo" element={<FormBuilderWrapper />} />
          <Route path="formularios/editar/:id" element={<FormBuilderWrapper />} />
        </Route>

        <Route path="/student" element={
          <PrivateRoute allowedRole="ALUMNO">
            <StudentLayout />
          </PrivateRoute>
        }>
          <Route index element={<Workspace />} />
          <Route path="expediente" element={<ExpedienteEstudiante />} />
          <Route path="formatos" element={<FormsDashboard />} />
          <Route path="formatos/llenar/:id" element={<FormRenderer />} />
          <Route path="formatos/entrega-archivo/:idDocumento" element={<FormEntregaArchivo />} />
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
