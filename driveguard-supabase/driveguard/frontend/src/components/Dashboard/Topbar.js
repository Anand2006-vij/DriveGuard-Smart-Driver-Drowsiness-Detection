import React, { useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth }   from '../../context/AuthContext';
import { format }    from 'date-fns';

export default function Topbar({ title, subtitle, onRefresh, loading }) {
  const { newAlerts } = useSocket();
  const { admin }     = useAuth();
  const [showAlerts, setShowAlerts] = useState(false);
  const active = newAlerts.filter(a => a.status === 'active');

  const getName = (a) => {
    if (a.drivers) return `${a.drivers.first_name} ${a.drivers.last_name}`;
    if (a.driverId) return `${a.driverId.firstName || ''} ${a.driverId.lastName || ''}`.trim();
    return 'Unknown';
  };

  return (
    <div className="topbar">
      <div>
        <div style={{ fontWeight:700, fontSize:16 }}>{title}</div>
        {subtitle && <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{subtitle}</div>}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {onRefresh && (
          <button className="btn btn-icon btn-ghost" onClick={onRefresh} title="Refresh">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        )}

        <div style={{ position:'relative' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => setShowAlerts(!showAlerts)} style={{ position:'relative' }}>
            <Bell size={16} />
            {active.length > 0 && (
              <span style={{ position:'absolute', top:4, right:4, width:8, height:8, borderRadius:'50%', background:'var(--danger)', animation:'pulse 1s infinite' }} />
            )}
          </button>

          {showAlerts && (
            <div style={{ position:'absolute', top:'110%', right:0, width:320, background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:12, boxShadow:'var(--shadow-lg)', zIndex:200, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:600, fontSize:14 }}>Recent Alerts</span>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{active.length} active</span>
              </div>
              <div style={{ maxHeight:320, overflowY:'auto' }}>
                {active.length === 0
                  ? <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No active alerts</div>
                  : active.slice(0, 8).map((alert, i) => (
                    <div key={alert.id || i} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-start' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', marginTop:5, flexShrink:0, background: alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)', animation: alert.severity === 'critical' ? 'pulse 0.8s infinite' : 'none' }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, textTransform:'capitalize' }}>{alert.type}</div>
                        <div style={{ fontSize:11, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{getName(alert)}</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                          {alert.created_at ? format(new Date(alert.created_at), 'HH:mm') : ''}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        <div className="driver-avatar" style={{ width:34, height:34, fontSize:12, cursor:'pointer' }}>
          {(admin?.first_name || admin?.firstName || '?')[0]}
          {(admin?.last_name  || admin?.lastName  || '')[0]}
        </div>
      </div>
    </div>
  );
}
