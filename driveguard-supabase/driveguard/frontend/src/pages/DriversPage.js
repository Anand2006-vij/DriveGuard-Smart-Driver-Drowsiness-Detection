import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { getDrivers, deleteDriver, getDriverAlerts } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import DriverModal from '../components/Drivers/DriverModal';
import Topbar      from '../components/Dashboard/Topbar';
import toast from 'react-hot-toast';

// Helper: handle both camelCase (old) and snake_case (Supabase)
const fn   = d => d.first_name  || d.firstName  || '';
const ln   = d => d.last_name   || d.lastName   || '';
const vid  = d => d.vehicle_number || d.vehicleNumber || '—';
const vtyp = d => d.vehicle_type   || d.vehicleType   || '';
const did  = d => d.device_id      || d.deviceId;
const eid  = d => d.employee_id    || d.employeeId;
const st   = d => d.shift_timing   || d.shiftTiming   || '';
const cs   = d => d.current_status || d.currentStatus || 'offline';
const ls   = d => d.last_seen      || d.lastSeen;

export default function DriversPage() {
  const [drivers,    setDrivers]    = useState([]);
  const [pagination, setPagination] = useState({ total:0, page:1, pages:1 });
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal,  setShowModal]  = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [viewDriver, setViewDriver] = useState(null);
  const { liveData } = useSocket();

  const fetchDrivers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getDrivers({ page, limit:15, search, status: statusFilter });
      setDrivers(res.data.drivers);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load drivers'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchDrivers(1), 300);
    return () => clearTimeout(t);
  }, [fetchDrivers]);

  // Overlay live status from socket
  const enriched = drivers.map(d => {
    const live = liveData[d.id] || liveData[d._id];
    if (!live) return d;
    return {
      ...d,
      current_status: live.isAccident || live.is_accident ? 'accident' : live.isDrowsy || live.is_drowsy ? 'drowsy' : 'active',
      last_seen: live.timestamp || new Date().toISOString(),
    };
  });

  const handleDelete = async (driver) => {
    if (!window.confirm(`Delete driver ${fn(driver)} ${ln(driver)}?`)) return;
    try {
      await deleteDriver(driver.id || driver._id);
      toast.success('Driver deleted');
      fetchDrivers(pagination.page);
    } catch { toast.error('Failed to delete driver'); }
  };

  return (
    <div>
      <Topbar title="Driver Management" subtitle={`${pagination.total} drivers registered`} onRefresh={() => fetchDrivers(1)} loading={loading} />

      {viewDriver && <DriverDetailModal driver={viewDriver} onClose={() => setViewDriver(null)} />}
      {(showModal || editDriver) && (
        <DriverModal
          driver={editDriver}
          onClose={() => { setShowModal(false); setEditDriver(null); }}
          onSaved={() => { setShowModal(false); setEditDriver(null); fetchDrivers(pagination.page); }}
        />
      )}

      <div className="page-content">
        <div className="filter-bar">
          <div className="search-input-wrapper" style={{ maxWidth:320 }}>
            <Search size={15} />
            <input className="form-input search-input" placeholder="Search by name, email, vehicle..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width:150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="drowsy">Drowsy</option>
            <option value="accident">Accident</option>
            <option value="offline">Offline</option>
          </select>
          <div style={{ flex:1 }} />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add Driver</button>
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Driver</th><th>Employee ID</th><th>Vehicle</th><th>Device</th>
                  <th>Status</th><th>Last Seen</th><th>Shift</th>
                  <th style={{ textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && drivers.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>Loading...</td></tr>
                  : enriched.length === 0
                  ? <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No drivers found</td></tr>
                  : enriched.map(driver => {
                    const status = cs(driver);
                    return (
                      <tr key={driver.id || driver._id}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div className="driver-avatar">{fn(driver)[0]}{ln(driver)[0]}</div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:13 }}>{fn(driver)} {ln(driver)}</div>
                              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{driver.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ fontFamily:'var(--mono)', fontSize:12 }}>{eid(driver) || '—'}</span></td>
                        <td>
                          <div style={{ fontSize:13 }}>{vid(driver)}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'capitalize' }}>{vtyp(driver)}</div>
                        </td>
                        <td>
                          {did(driver)
                            ? <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--cyan)' }}>{did(driver)}</span>
                            : <span style={{ color:'var(--text-muted)', fontSize:12 }}>Unassigned</span>}
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div className={`status-dot ${status}`} />
                            <span className={`badge badge-${status}`} style={{ textTransform:'capitalize' }}>{status}</span>
                          </div>
                        </td>
                        <td style={{ fontSize:12, color:'var(--text-secondary)' }}>
                          {ls(driver) ? format(new Date(ls(driver)), 'MMM d, HH:mm') : '—'}
                        </td>
                        <td style={{ textTransform:'capitalize', fontSize:12 }}>{st(driver)}</td>
                        <td>
                          <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setViewDriver(driver)} title="View"><Eye size={13} /></button>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setEditDriver(driver)} title="Edit"><Edit2 size={13} /></button>
                            <button className="btn btn-icon btn-sm" style={{ background:'rgba(239,68,68,0.1)', color:'var(--danger)' }} onClick={() => handleDelete(driver)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                Showing {((pagination.page-1)*15)+1}–{Math.min(pagination.page*15, pagination.total)} of {pagination.total}
              </span>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-secondary btn-sm" disabled={pagination.page<=1}  onClick={() => fetchDrivers(pagination.page-1)}><ChevronLeft size={14} /></button>
                <span style={{ padding:'6px 12px', fontSize:13 }}>{pagination.page}/{pagination.pages}</span>
                <button className="btn btn-secondary btn-sm" disabled={pagination.page>=pagination.pages} onClick={() => fetchDrivers(pagination.page+1)}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DriverDetailModal({ driver, onClose }) {
  const [alerts, setAlerts] = useState([]);
  const { liveData } = useSocket();
  const live = liveData[driver.id] || liveData[driver._id];

  useEffect(() => {
    getDriverAlerts(driver.id || driver._id).then(r => setAlerts(r.data.alerts)).catch(() => {});
  }, [driver]);

  const ec  = live ? (live.eyeClosurePercent ?? live.eye_closure_percent ?? 0) : null;
  const spd = live ? (live.speed ?? 0) : null;
  const bat = live ? (live.batteryLevel ?? live.battery_level ?? 0) : null;
  const drowsy   = live && (live.isDrowsy   || live.is_drowsy);
  const accident = live && (live.isAccident || live.is_accident);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight:'85vh' }}>
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div className="driver-avatar driver-avatar-lg">{fn(driver)[0]}{ln(driver)[0]}</div>
            <div>
              <div className="modal-title">{fn(driver)} {ln(driver)}</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:3 }}>
                {(driver.employee_id || driver.employeeId) && `${driver.employee_id || driver.employeeId} · `}{driver.department}
              </div>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ paddingBottom:28 }}>
          {live && (
            <div style={{ padding:'12px 16px', borderRadius:8, marginBottom:20, background: accident ? 'rgba(239,68,68,0.1)' : drowsy ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border:`1px solid ${accident ? 'rgba(239,68,68,0.3)' : drowsy ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <span className="live-badge">LIVE</span>
                <span className={`badge badge-${accident ? 'accident' : drowsy ? 'drowsy' : 'active'}`}>{accident ? 'ACCIDENT' : drowsy ? 'DROWSY' : 'NORMAL'}</span>
              </div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <span className="sensor-value" style={{ fontSize:11 }}>Eye: {ec?.toFixed(0)}%</span>
                <span className="sensor-value" style={{ fontSize:11 }}>Speed: {spd?.toFixed(0)} km/h</span>
                <span className="sensor-value" style={{ fontSize:11 }}>Battery: {bat?.toFixed(0)}%</span>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div>
              <div className="section-title" style={{ fontSize:13 }}>Personal Info</div>
              {[['Email',driver.email],['Phone',driver.phone],['Blood Group',driver.blood_group||driver.bloodGroup],['Gender',driver.gender]].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                  <span style={{ color:'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight:500 }}>{v || '—'}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="section-title" style={{ fontSize:13 }}>License & Vehicle</div>
              {[['License',driver.license_number||driver.licenseNumber],['Type',driver.license_type||driver.licenseType],['Vehicle',driver.vehicle_number||driver.vehicleNumber],['Device',driver.device_id||driver.deviceId]].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                  <span style={{ color:'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight:500, fontFamily:'var(--mono)', fontSize:12 }}>{v || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:12, marginTop:20, flexWrap:'wrap' }}>
            {[['Alerts',driver.total_alerts||driver.totalAlerts,'var(--warning)'],['Drowsiness',driver.total_drowsiness_events||driver.totalDrowsinessEvents,'var(--accent)'],['Accidents',driver.total_accidents||driver.totalAccidents,'var(--danger)'],['Drive Hrs',driver.total_driving_hours||driver.totalDrivingHours,'var(--success)']].map(([label,val,color]) => (
              <div key={label} style={{ flex:1, minWidth:90, padding:12, background:'var(--bg-primary)', borderRadius:8, border:'1px solid var(--border)', textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:700, color }}>{val || 0}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>

          {(driver.emergency_name || driver.emergencyContact?.name) && (
            <div style={{ marginTop:20, padding:'12px 16px', background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:6, color:'var(--danger)' }}>Emergency Contact</div>
              <div style={{ fontSize:13 }}>
                {driver.emergency_name || driver.emergencyContact?.name} ({driver.emergency_relation || driver.emergencyContact?.relation}) — {driver.emergency_phone || driver.emergencyContact?.phone}
              </div>
            </div>
          )}

          {alerts.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div className="section-title" style={{ fontSize:13 }}>Recent Alerts</div>
              {alerts.slice(0,4).map(a => (
                <div key={a.id||a._id} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                  <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                  <span style={{ flex:1, color:'var(--text-secondary)' }}>{a.message}</span>
                  <span style={{ color:'var(--text-muted)' }}>{format(new Date(a.created_at||a.createdAt),'MMM d HH:mm')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
