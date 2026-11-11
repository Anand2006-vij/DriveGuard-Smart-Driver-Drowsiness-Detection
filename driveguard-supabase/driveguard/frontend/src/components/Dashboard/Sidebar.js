import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Bell, Map, Activity,
  Settings, LogOut, ShieldCheck, ChevronRight, Cpu,
} from 'lucide-react';
import { useAuth }   from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const NAV = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/drivers', icon: Users,           label: 'Drivers' },
  { to: '/alerts',  icon: Bell,            label: 'Alerts',      badge: true },
  { to: '/live',    icon: Activity,        label: 'Live Monitor' },
  { to: '/map',     icon: Map,             label: 'Live Map' },
  { to: '/admin',   icon: ShieldCheck,     label: 'Admin',       roles: ['superadmin'] },
  { to: '/settings',icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const { admin, logoutUser } = useAuth();
  const { isConnected, newAlerts } = useSocket();
  const navigate = useNavigate();

  const activeAlerts = newAlerts.filter(a => (a.status || a.status) === 'active').length;

  const handleLogout = () => { logoutUser(); navigate('/login'); };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Cpu size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, letterSpacing:'-0.3px' }}>DriveGuard</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>Safety Platform</div>
          </div>
        </div>
        {/* Connection pill */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:14, padding:'6px 10px', background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(71,85,105,0.2)', borderRadius:6, fontSize:11, fontWeight:500, color: isConnected ? 'var(--success)' : 'var(--text-muted)' }}>
          <div className={`status-dot ${isConnected ? 'active' : 'offline'}`} />
          {isConnected ? 'Live Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'16px 12px', overflowY:'auto' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, padding:'0 8px', marginBottom:8, textTransform:'uppercase' }}>Main Menu</div>
        {NAV.filter(item => !item.roles || item.roles.includes(admin?.role)).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10,
              padding:'10px 12px', borderRadius:8, marginBottom:2,
              textDecoration:'none', fontSize:14, fontWeight:500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-card)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              transition:'all 0.15s',
            })}
          >
            {({ isActive }) => (
              <>
                <item.icon size={16} color={isActive ? 'var(--accent)' : 'currentColor'} />
                <span style={{ flex:1 }}>{item.label}</span>
                {item.badge && activeAlerts > 0 && (
                  <span style={{ background:'var(--danger)', color:'white', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:700 }}>
                    {activeAlerts > 99 ? '99+' : activeAlerts}
                  </span>
                )}
                {isActive && <ChevronRight size={13} color="var(--accent)" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding:'16px 16px 20px', borderTop:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <div className="driver-avatar" style={{ width:38, height:38, fontSize:13 }}>
            {admin?.first_name?.[0] || admin?.firstName?.[0]}{admin?.last_name?.[0] || admin?.lastName?.[0]}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {admin?.first_name || admin?.firstName} {admin?.last_name || admin?.lastName}
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'capitalize' }}>{admin?.role}</div>
          </div>
        </div>
        <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'flex-start', fontSize:13 }} onClick={handleLogout}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  );
}
