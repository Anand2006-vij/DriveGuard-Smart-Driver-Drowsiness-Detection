import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth }  from './context/AuthContext';
import { SocketProvider }         from './context/SocketContext';
import Sidebar                    from './components/Dashboard/Sidebar';
import './index.css';

const LoginPage      = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage  = React.lazy(() => import('./pages/DashboardPage'));
const DriversPage    = React.lazy(() => import('./pages/DriversPage'));
const AlertsPage     = React.lazy(() => import('./pages/AlertsPage'));
const LiveMonitorPage= React.lazy(() => import('./pages/LiveMonitorPage'));
const MapPage        = React.lazy(() => import('./pages/MapPage'));
const AdminPage      = React.lazy(() => import('./pages/AdminPage'));
const SettingsPage   = React.lazy(() => import('./pages/SettingsPage'));

function Spinner() {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <div style={{ width:24, height:24, border:'2px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)', gap:16 }}>
      <div style={{ width:48, height:48, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius:14, animation:'pulse 1s infinite' }} />
      <div style={{ fontSize:14, color:'var(--text-secondary)' }}>Loading DriveGuard...</div>
    </div>
  );
}

function ProtectedLayout({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!admin)  return <Navigate to="/login" replace />;
  return (
    <SocketProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <React.Suspense fallback={<Spinner />}>{children}</React.Suspense>
        </div>
      </div>
    </SocketProvider>
  );
}

function AppRoutes() {
  const { admin } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={admin ? <Navigate to="/" replace /> : <React.Suspense fallback={<FullScreenLoader />}><LoginPage /></React.Suspense>} />
      <Route path="/"        element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/drivers" element={<ProtectedLayout><DriversPage /></ProtectedLayout>} />
      <Route path="/alerts"  element={<ProtectedLayout><AlertsPage /></ProtectedLayout>} />
      <Route path="/live"    element={<ProtectedLayout><LiveMonitorPage /></ProtectedLayout>} />
      <Route path="/map"     element={<ProtectedLayout><MapPage /></ProtectedLayout>} />
      <Route path="/admin"   element={<ProtectedLayout><AdminPage /></ProtectedLayout>} />
      <Route path="/settings"element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border-light)', borderRadius:10, fontSize:13, fontFamily:'var(--font)' },
            success: { iconTheme: { primary:'#10b981', secondary:'white' } },
            error:   { iconTheme: { primary:'#ef4444', secondary:'white' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
