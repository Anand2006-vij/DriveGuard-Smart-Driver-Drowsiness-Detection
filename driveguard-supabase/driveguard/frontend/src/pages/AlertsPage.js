import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Trash2, Bell } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { getAlerts, getAlertCounts, acknowledgeAlert, resolveAlert, deleteAlert } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import Topbar from '../components/Dashboard/Topbar';
import toast from 'react-hot-toast';

const SEV_ORDER = { critical:0, high:1, medium:2, low:3 };

const driverName = (a) => {
  if (a.drivers) return `${a.drivers.first_name} ${a.drivers.last_name}`;
  if (a.driverId) return `${a.driverId.firstName||''} ${a.driverId.lastName||''}`.trim();
  return 'Unknown';
};
const driverVehicle = (a) => {
  if (a.drivers) return a.drivers.vehicle_number || 'N/A';
  return a.driverId?.vehicleNumber || 'N/A';
};
const alertId   = a => a.id || a._id;
const alertDate = a => a.created_at || a.createdAt;
const ackDate   = a => a.acknowledged_at || a.acknowledgedAt;

export default function AlertsPage() {
  const [alerts,   setAlerts]   = useState([]);
  const [counts,   setCounts]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [statusF,  setStatusF]  = useState('active');
  const [typeF,    setTypeF]    = useState('all');
  const [sevF,     setSevF]     = useState('all');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const { newAlerts } = useSocket();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [ar, cr] = await Promise.all([
        getAlerts({ status: statusF, type: typeF, severity: sevF, page, limit: 20 }),
        getAlertCounts(),
      ]);
      setAlerts(ar.data.alerts);
      setTotal(ar.data.total);
      setCounts(cr.data.counts);
    } catch { toast.error('Failed to load alerts'); }
    finally { setLoading(false); }
  }, [statusF, typeF, sevF, page]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  // re-fetch when socket pushes new active alerts
  useEffect(() => { if (newAlerts.length && statusF === 'active') fetchAlerts(); }, [newAlerts]);

  const acknowledge = async (id) => {
    try { await acknowledgeAlert(id); toast.success('Acknowledged'); fetchAlerts(); }
    catch { toast.error('Failed'); }
  };
  const resolve = async (id) => {
    try { await resolveAlert(id, { notes:'Resolved by admin' }); toast.success('Resolved'); fetchAlerts(); }
    catch { toast.error('Failed'); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this alert?')) return;
    try { await deleteAlert(id); toast.success('Deleted'); fetchAlerts(); }
    catch { toast.error('Failed'); }
  };

  const sorted = [...alerts].sort((a,b) => (SEV_ORDER[a.severity]??4) - (SEV_ORDER[b.severity]??4));

  const borderColor = (sev) => ({ critical:'var(--danger)', high:'#f87171', medium:'var(--warning)', low:'var(--accent)' }[sev] || 'var(--border)');

  return (
    <div>
      <Topbar title="Alerts Center" subtitle="Monitor and manage safety alerts" onRefresh={fetchAlerts} loading={loading} />
      <div className="page-content">

        {/* Summary */}
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))' }}>
          {[['Active',counts.active,'red'],['Critical',counts.critical,'red'],['High',counts.high,'yellow'],['Acknowledged',counts.acknowledged,'purple'],['Resolved',counts.resolved,'green'],['Total',counts.total,'blue']].map(([label,val,color]) => (
            <div key={label} className={`stat-card ${color}`}>
              <div className="stat-value" style={{ fontSize:28 }}>{val||0}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <select className="form-select" style={{ width:140 }} value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
            <option value="all">All Status</option><option value="active">Active</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option>
          </select>
          <select className="form-select" style={{ width:140 }} value={typeF} onChange={e => { setTypeF(e.target.value); setPage(1); }}>
            <option value="all">All Types</option><option value="drowsiness">Drowsiness</option><option value="accident">Accident</option><option value="speeding">Speeding</option>
          </select>
          <select className="form-select" style={{ width:140 }} value={sevF} onChange={e => { setSevF(e.target.value); setPage(1); }}>
            <option value="all">All Severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>

        {/* List */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {loading && alerts.length === 0
            ? <div className="card" style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>Loading...</div>
            : sorted.length === 0
            ? <div className="card"><div className="empty-state"><Bell size={40} /><h3>No alerts found</h3><p>Alerts appear here when drowsiness or accidents are detected.</p></div></div>
            : sorted.map(alert => (
              <div key={alertId(alert)} className="card card-sm" style={{ display:'flex', alignItems:'flex-start', gap:16, borderLeft:`3px solid ${borderColor(alert.severity)}`, opacity: alert.status==='resolved' ? 0.65 : 1 }}>
                <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, background: alert.type==='accident' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <AlertTriangle size={18} color={alert.type==='accident' ? 'var(--danger)' : 'var(--warning)'} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:700, fontSize:14, textTransform:'capitalize' }}>{(alert.type||'').replace('_',' ')}</span>
                    <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                    <span className={`badge badge-${alert.status}`}>{alert.status}</span>
                    {alert.severity==='critical' && alert.status==='active' && <span className="live-badge" style={{ fontSize:10 }}>CRITICAL</span>}
                  </div>
                  <div style={{ fontSize:13, marginBottom:6 }}>{alert.message}</div>
                  <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, color:'var(--text-secondary)' }}><strong>Driver:</strong> {driverName(alert)} ({driverVehicle(alert)})</span>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>{alertDate(alert) ? formatDistanceToNow(new Date(alertDate(alert)), { addSuffix:true }) : ''}</span>
                  </div>
                  {ackDate(alert) && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Acknowledged at {format(new Date(ackDate(alert)),'MMM d, HH:mm')}</div>}
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
                  {alert.status==='active' && (
                    <button className="btn btn-sm" style={{ background:'rgba(139,92,246,0.15)', color:'var(--purple)' }} onClick={() => acknowledge(alertId(alert))}>
                      <CheckCircle size={13} /> Ack
                    </button>
                  )}
                  {alert.status!=='resolved' && (
                    <button className="btn btn-sm btn-success" onClick={() => resolve(alertId(alert))}>
                      <XCircle size={13} /> Resolve
                    </button>
                  )}
                  <button className="btn btn-sm" style={{ background:'rgba(239,68,68,0.1)', color:'var(--danger)' }} onClick={() => remove(alertId(alert))}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          }
        </div>

        {total > 20 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:20 }}>
            <button className="btn btn-secondary btn-sm" disabled={page<=1} onClick={() => setPage(p => p-1)}>Previous</button>
            <span style={{ padding:'6px 12px', fontSize:13, color:'var(--text-secondary)' }}>Page {page}</span>
            <button className="btn btn-secondary btn-sm" disabled={page*20>=total} onClick={() => setPage(p => p+1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
