import React, { useState, useEffect } from 'react';
import { Activity, Eye, Zap, Navigation, Battery, Thermometer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { getDrivers } from '../utils/api';
import { useSocket } from '../context/SocketContext';
import Topbar from '../components/Dashboard/Topbar';

const fn = d => d.first_name  || d.firstName  || '';
const ln = d => d.last_name   || d.lastName   || '';

export default function LiveMonitorPage() {
  const [drivers,    setDrivers]    = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [history,    setHistory]    = useState({});
  const { liveData, isConnected } = useSocket();

  useEffect(() => {
    getDrivers({ limit:50 }).then(r => {
      setDrivers(r.data.drivers);
      if (r.data.drivers.length) setSelectedId(r.data.drivers[0].id || r.data.drivers[0]._id);
    }).catch(console.error);
  }, []);

  // Build rolling history
  useEffect(() => {
    Object.entries(liveData).forEach(([driverId, reading]) => {
      setHistory(prev => ({
        ...prev,
        [driverId]: [...(prev[driverId] || []).slice(-60), { ...reading, time: format(new Date(), 'HH:mm:ss') }],
      }));
    });
  }, [liveData]);

  const selectedDriver = drivers.find(d => (d.id || d._id) === selectedId);
  const live           = liveData[selectedId];
  const driverHistory  = history[selectedId] || [];

  const ec   = live ? (live.eyeClosurePercent  ?? live.eye_closure_percent  ?? 0) : 0;
  const ds   = live ? (live.drowsinessScore    ?? live.drowsiness_score    ?? 0) : 0;
  const spd  = live ? (live.speed              ?? 0) : 0;
  const bat  = live ? (live.batteryLevel       ?? live.battery_level       ?? 0) : 0;
  const blk  = live ? (live.blinkRate          ?? live.blink_rate          ?? 0) : 0;
  const tilt = live ? (live.tiltAngle          ?? live.tilt_angle          ?? 0) : 0;
  const ax   = live ? (live.accelerationX      ?? live.acceleration_x      ?? 0) : 0;
  const ay   = live ? (live.accelerationY      ?? live.acceleration_y      ?? 0) : 0;
  const az   = live ? (live.accelerationZ      ?? live.acceleration_z      ?? 0) : 0;
  const lat  = live ? (live.latitude  ?? 0) : 0;
  const lng  = live ? (live.longitude ?? 0) : 0;
  const drowsy   = live && (live.isDrowsy   || live.is_drowsy);
  const accident = live && (live.isAccident || live.is_accident);

  const statusColor = (r) => {
    if (!r) return 'var(--text-muted)';
    if (r.isAccident || r.is_accident) return 'var(--danger)';
    if (r.isDrowsy   || r.is_drowsy)   return 'var(--warning)';
    return 'var(--success)';
  };

  const GAUGES = [
    { icon:Eye,         label:'Eye Closure',  value:`${ec.toFixed(0)}%`,          color: ec>60 ? 'var(--danger)' : 'var(--success)',  pct:ec },
    { icon:Zap,         label:'Drowsiness',   value:`${ds.toFixed(0)}%`,          color: ds>60 ? 'var(--danger)' : 'var(--accent)',   pct:ds },
    { icon:Navigation,  label:'Speed',        value:`${spd.toFixed(0)} km/h`,     color:'var(--cyan)',                                 pct:Math.min(spd/120*100,100) },
    { icon:Battery,     label:'Battery',      value:`${bat.toFixed(0)}%`,         color: bat<20  ? 'var(--danger)' : 'var(--success)', pct:bat },
    { icon:Activity,    label:'Blink Rate',   value:`${blk.toFixed(0)}/min`,      color:'var(--purple)',                               pct:blk/30*100 },
    { icon:Thermometer, label:'Tilt',         value:`${tilt.toFixed(1)}°`,        color: tilt>30 ? 'var(--danger)' : 'var(--accent)',  pct:Math.min(Math.abs(tilt)/45*100,100) },
  ];

  return (
    <div>
      <Topbar title="Live Monitor" subtitle="Real-time sensor feed from all devices" />
      <div className="page-content">
        <div style={{ display:'flex', gap:20, height:'calc(100vh - 140px)', minHeight:500 }}>

          {/* Driver list */}
          <div style={{ width:260, flexShrink:0 }}>
            <div className="card" style={{ height:'100%', padding:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
              <div style={{ padding:16, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                <Activity size={15} color="var(--accent)" />
                <span style={{ fontWeight:600, fontSize:14 }}>Drivers</span>
                {isConnected ? <span className="live-badge" style={{ marginLeft:'auto', fontSize:10 }}>LIVE</span> : <span style={{ marginLeft:'auto', fontSize:10, color:'var(--danger)' }}>OFFLINE</span>}
              </div>
              <div style={{ overflowY:'auto', flex:1 }}>
                {drivers.length === 0
                  ? <div style={{ padding:20, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>No drivers</div>
                  : drivers.map(driver => {
                    const id = driver.id || driver._id;
                    const dLive = liveData[id];
                    return (
                      <div key={id} onClick={() => setSelectedId(id)} style={{ padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: selectedId===id ? 'var(--bg-card-hover)' : 'transparent', borderLeft: selectedId===id ? '2px solid var(--accent)' : '2px solid transparent', transition:'all 0.15s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                          <div className="driver-avatar" style={{ width:30, height:30, fontSize:11 }}>{fn(driver)[0]}{ln(driver)[0]}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fn(driver)} {ln(driver)}</div>
                            <div style={{ fontSize:10, color:'var(--text-muted)' }}>{driver.device_id || driver.deviceId || 'No device'}</div>
                          </div>
                          <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:statusColor(dLive) }} />
                        </div>
                        {dLive && (
                          <div style={{ display:'flex', gap:6 }}>
                            <span className="sensor-value" style={{ fontSize:10, padding:'2px 6px' }}>Eye {(dLive.eyeClosurePercent??dLive.eye_closure_percent??0).toFixed(0)}%</span>
                            <span className="sensor-value" style={{ fontSize:10, padding:'2px 6px' }}>{(dLive.speed??0).toFixed(0)} km/h</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Main panel */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16, minWidth:0 }}>
            {!selectedDriver
              ? <div className="card" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><div className="empty-state"><Activity size={40} /><h3>Select a driver</h3></div></div>
              : <>
                  {/* Header */}
                  <div className="card card-sm">
                    <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                      <div className="driver-avatar" style={{ width:48, height:48, fontSize:16 }}>{fn(selectedDriver)[0]}{ln(selectedDriver)[0]}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:16 }}>{fn(selectedDriver)} {ln(selectedDriver)}</div>
                        <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{selectedDriver.vehicle_number||selectedDriver.vehicleNumber} · {selectedDriver.device_id||selectedDriver.deviceId}</div>
                      </div>
                      {live
                        ? <span className={`badge badge-${accident ? 'accident' : drowsy ? 'drowsy' : 'active'}`} style={{ fontSize:13, padding:'6px 16px' }}>
                            {accident ? '🚨 ACCIDENT' : drowsy ? '⚠️ DROWSY' : '✅ NORMAL'}
                          </span>
                        : <span style={{ fontSize:12, color:'var(--text-muted)' }}>No live data</span>
                      }
                    </div>
                  </div>

                  {/* Gauges */}
                  {live && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12 }}>
                      {GAUGES.map(g => (
                        <div key={g.label} className="card card-sm" style={{ textAlign:'center', padding:14 }}>
                          <g.icon size={18} color={g.color} style={{ margin:'0 auto 6px' }} />
                          <div style={{ fontSize:18, fontWeight:700, color:g.color, fontFamily:'var(--mono)' }}>{g.value}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>{g.label}</div>
                          <div className="progress-bar"><div className="progress-fill" style={{ width:`${g.pct||0}%`, background:g.color }} /></div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chart */}
                  <div className="card" style={{ flex:1 }}>
                    <div className="section-title"><Activity size={15} color="var(--accent)" /> Eye Closure & Drowsiness (Live)</div>
                    {driverHistory.length < 2
                      ? <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontSize:13 }}>Waiting for data... ({driverHistory.length} readings)</div>
                      : <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={driverHistory}>
                            <XAxis dataKey="time" tick={{ fill:'var(--text-muted)', fontSize:10 }} interval="preserveEnd" />
                            <YAxis domain={[0,100]} tick={{ fill:'var(--text-muted)', fontSize:10 }} />
                            <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                            <ReferenceLine y={60} stroke="var(--warning)" strokeDasharray="4 4" label={{ value:'Alert', fill:'var(--warning)', fontSize:10 }} />
                            <Line type="monotone" dataKey="eyeClosurePercent"  stroke="var(--accent)"  dot={false} name="Eye Closure %" strokeWidth={2} />
                            <Line type="monotone" dataKey="eye_closure_percent" stroke="var(--accent)"  dot={false} name="Eye Closure %"  strokeWidth={2} />
                            <Line type="monotone" dataKey="drowsinessScore"    stroke="var(--warning)" dot={false} name="Drowsiness Score" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                    }
                  </div>

                  {/* Accelerometer */}
                  {live && (
                    <div className="card card-sm">
                      <div className="section-title" style={{ marginBottom:10, fontSize:13 }}>Accelerometer (MPU6050)</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                        {[['X',ax],['Y',ay],['Z',az]].map(([axis,val]) => (
                          <div key={axis} style={{ textAlign:'center', padding:10, background:'var(--bg-primary)', borderRadius:8, border:`1px solid ${Math.abs(val)>2 ? 'rgba(239,68,68,0.4)' : 'var(--border)'}` }}>
                            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Accel {axis}</div>
                            <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700, color: Math.abs(val)>2 ? 'var(--danger)' : 'var(--cyan)' }}>{val.toFixed(2)}</div>
                            <div style={{ fontSize:10, color:'var(--text-muted)' }}>m/s²</div>
                          </div>
                        ))}
                      </div>
                      {lat !== 0 && (
                        <div style={{ marginTop:12, fontSize:12, color:'var(--text-secondary)', fontFamily:'var(--mono)' }}>
                          📍 GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
                        </div>
                      )}
                    </div>
                  )}
                </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
