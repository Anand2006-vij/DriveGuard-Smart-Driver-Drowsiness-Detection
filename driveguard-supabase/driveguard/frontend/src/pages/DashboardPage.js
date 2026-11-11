import React, { useState, useEffect, useCallback } from 'react';
import { Users, AlertTriangle, Activity, Wifi, Zap, Clock, TrendingUp, Car } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboardSummary, getAlertChart } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import Topbar from '../components/Dashboard/Topbar';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [summary,   setSummary]   = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const { liveData, newAlerts, isConnected } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, chartRes] = await Promise.all([getDashboardSummary(), getAlertChart()]);
      setSummary(sumRes.data);
      // group by date
      const byDate = {};
      (chartRes.data.data || []).forEach(d => {
        const dt = d.date || d._id?.date;
        if (!dt) return;
        if (!byDate[dt]) byDate[dt] = { date: dt, drowsiness: 0, accident: 0 };
        const type = d.type || d._id?.type;
        if (type) byDate[dt][type] = (byDate[dt][type] || 0) + d.count;
      });
      setChartData(Object.values(byDate).slice(-7));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, [fetchData]);

  const drivers = summary?.drivers || {};
  const alerts  = summary?.alerts  || {};

  // Merge socket alerts into recent list
  const recentAlerts = [
    ...(summary?.recentAlerts || []),
    ...newAlerts.filter(a => a.status === 'active'),
  ].slice(0, 6);

  const pieData = [
    { name:'Active',   value: drivers.active   || 0, color:'#10b981' },
    { name:'Drowsy',   value: drivers.drowsy   || 0, color:'#f59e0b' },
    { name:'Accident', value: drivers.accident || 0, color:'#ef4444' },
    { name:'Offline',  value: drivers.offline  || 0, color:'#475569' },
  ].filter(d => d.value > 0);

  const driverName = (a) => {
    if (a.drivers) return `${a.drivers.first_name} ${a.drivers.last_name}`;
    return `${a.driverId?.firstName || ''} ${a.driverId?.lastName || ''}`.trim() || 'Unknown';
  };

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Real-time fleet safety overview" onRefresh={fetchData} loading={loading} />
      <div className="page-content">

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon blue"><Users size={20} /></div>
            <div className="stat-value">{drivers.total || 0}</div>
            <div className="stat-label">Total Drivers</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon green"><Activity size={20} /></div>
            <div className="stat-value">{drivers.active || 0}</div>
            <div className="stat-label">Active Now</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-icon yellow"><Clock size={20} /></div>
            <div className="stat-value">{drivers.drowsy || 0}</div>
            <div className="stat-label">Drowsy Drivers</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon red"><AlertTriangle size={20} /></div>
            <div className="stat-value">{drivers.accident || 0}</div>
            <div className="stat-label">Accidents</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon purple"><Zap size={20} /></div>
            <div className="stat-value">{alerts.total || 0}</div>
            <div className="stat-label">Active Alerts</div>
          </div>
          <div className="stat-card cyan">
            <div className="stat-icon cyan"><Wifi size={20} /></div>
            <div className="stat-value" style={{ fontSize:20, paddingTop:6 }}>
              <span style={{ color: isConnected ? 'var(--success)' : 'var(--danger)', fontSize:12 }}>●</span>{' '}
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </div>
            <div className="stat-label">System Status</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid-2" style={{ marginBottom:24 }}>
          <div className="card">
            <div className="section-title"><TrendingUp size={16} color="var(--accent)" /> Alert Trends (7 Days)</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill:'var(--text-muted)', fontSize:11 }} tickFormatter={v => { try { return format(new Date(v),'MMM d'); } catch { return v; } }} />
                <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} />
                <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                <Area type="monotone" dataKey="drowsiness" stroke="#f59e0b" fill="url(#g1)" name="Drowsiness" strokeWidth={2} />
                <Area type="monotone" dataKey="accident"   stroke="#ef4444" fill="url(#g2)" name="Accident"   strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="section-title"><Car size={16} color="var(--accent)" /> Driver Status Distribution</div>
            <div style={{ display:'flex', alignItems:'center', gap:24 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:d.color }} />
                    <span style={{ fontSize:13, color:'var(--text-secondary)', flex:1 }}>{d.name}</span>
                    <span style={{ fontSize:14, fontWeight:700 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts + Live Feed */}
        <div className="grid-2">
          <div className="card">
            <div className="section-title"><AlertTriangle size={16} color="var(--danger)" /> Active Alerts</div>
            {recentAlerts.length === 0
              ? <div className="empty-state" style={{ padding:30 }}><AlertTriangle size={28} /><p>No active alerts</p></div>
              : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {recentAlerts.map((alert, i) => (
                    <div key={alert.id || i} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:12, borderRadius:8, background:'var(--bg-primary)', border:`1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', marginTop:4, flexShrink:0, background: alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)', animation: alert.severity === 'critical' ? 'pulse 0.8s infinite' : undefined }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:600 }}>{driverName(alert)}</span>
                          <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                        </div>
                        <div style={{ fontSize:12, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{alert.message}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
                          {(alert.created_at || alert.createdAt) ? format(new Date(alert.created_at || alert.createdAt), 'MMM d, HH:mm') : 'Just now'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>

          <div className="card">
            <div className="section-title">
              <Activity size={16} color="var(--success)" /> Live Sensor Feed
              <span className="live-badge" style={{ marginLeft:'auto', fontSize:10 }}>LIVE</span>
            </div>
            {Object.keys(liveData).length === 0
              ? <div className="empty-state" style={{ padding:30 }}><Activity size={28} /><p>Waiting for sensor data...</p></div>
              : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {Object.values(liveData).slice(0, 5).map((r, i) => {
                    const did = r.driverId || r.driver_id;
                    const ec  = r.eyeClosurePercent ?? r.eye_closure_percent ?? 0;
                    const spd = r.speed ?? 0;
                    const bat = r.batteryLevel ?? r.battery_level ?? 0;
                    const drowsy   = r.isDrowsy   ?? r.is_drowsy   ?? false;
                    const accident = r.isAccident ?? r.is_accident ?? false;
                    return (
                      <div key={did || i} style={{ padding:12, borderRadius:8, background:'var(--bg-primary)', border:`1px solid ${drowsy || accident ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                          <span style={{ fontSize:12, fontWeight:600 }}>Device: {r.deviceId || r.device_id}</span>
                          <span className={`badge badge-${accident ? 'accident' : drowsy ? 'drowsy' : 'active'}`}>
                            {accident ? 'ACCIDENT' : drowsy ? 'DROWSY' : 'NORMAL'}
                          </span>
                        </div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          <span className={`sensor-value ${ec > 60 ? 'danger' : ec > 40 ? 'warning' : ''}`}>Eye: {ec.toFixed(0)}%</span>
                          <span className="sensor-value">Spd: {spd.toFixed(0)} km/h</span>
                          <span className="sensor-value">Batt: {bat.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
