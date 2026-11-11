import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { getMapDrivers } from '../utils/api';
import { useSocket }     from '../context/SocketContext';
import Topbar            from '../components/Dashboard/Topbar';

const makeIcon = (color) => L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 8px ${color}"></div>`,
  className: '',
  iconSize: [14,14],
  iconAnchor: [7,7],
});

const STATUS_COLORS = { active:'#10b981', drowsy:'#f59e0b', accident:'#ef4444', offline:'#475569' };

const fn = d => d.first_name || d.firstName || '';
const ln = d => d.last_name  || d.lastName  || '';
const vn = d => d.vehicle_number || d.vehicleNumber || '';
const did = d => d.device_id || d.deviceId || '';
const cs  = d => d.current_status || d.currentStatus || 'offline';
const ls  = d => d.last_seen || d.lastSeen;
const lat = d => d.last_latitude  || (d.lastLocation?.latitude)  || 0;
const lng = d => d.last_longitude || (d.lastLocation?.longitude) || 0;

export default function MapPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { liveData } = useSocket();

  const fetch = async () => {
    setLoading(true);
    try { const r = await getMapDrivers(); setDrivers(r.data.drivers); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  // Merge live GPS
  const mapped = drivers.map(d => {
    const live = liveData[d.id || d._id];
    if (live && (live.latitude || live.lat)) {
      return {
        ...d,
        last_latitude:  live.latitude  || live.lat  || lat(d),
        last_longitude: live.longitude || live.lng  || lng(d),
        current_status: live.isAccident || live.is_accident ? 'accident' : live.isDrowsy || live.is_drowsy ? 'drowsy' : 'active',
      };
    }
    return d;
  }).filter(d => lat(d) !== 0 && lng(d) !== 0);

  const center = mapped.length > 0 ? [lat(mapped[0]), lng(mapped[0])] : [17.385, 78.4867];

  return (
    <div>
      <Topbar title="Live Map" subtitle={`${mapped.length} drivers tracked`} onRefresh={fetch} loading={loading} />
      <div className="page-content" style={{ padding:0 }}>
        <div style={{ height:'calc(100vh - 64px)', position:'relative' }}>
          <MapContainer center={center} zoom={6} style={{ height:'100%', width:'100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            {mapped.map(driver => {
              const dLat  = lat(driver);
              const dLng  = lng(driver);
              const status = cs(driver);
              const color  = STATUS_COLORS[status] || '#475569';
              return (
                <React.Fragment key={driver.id || driver._id}>
                  {(status === 'drowsy' || status === 'accident') && (
                    <CircleMarker center={[dLat, dLng]} radius={20} pathOptions={{ color, fillColor:color, fillOpacity:0.1, weight:2 }} />
                  )}
                  <Marker position={[dLat, dLng]} icon={makeIcon(color)}>
                    <Popup>
                      <div style={{ minWidth:180, fontSize:13 }}>
                        <div style={{ fontWeight:700, marginBottom:6 }}>{fn(driver)} {ln(driver)}</div>
                        <span style={{ background:`${color}30`, color, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, textTransform:'capitalize' }}>{status}</span>
                        <div style={{ marginTop:8 }}>
                          {[['Vehicle',vn(driver)],['Device',did(driver)],['Lat',dLat.toFixed(6)],['Lng',dLng.toFixed(6)],['Last Seen', ls(driver) ? format(new Date(ls(driver)),'HH:mm:ss') : 'N/A']].map(([k,v]) => v && (
                            <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                              <span style={{ color:'#666' }}>{k}:</span><span style={{ fontWeight:500 }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>

          {/* Legend */}
          <div style={{ position:'absolute', bottom:30, left:20, zIndex:1000, background:'rgba(13,17,36,0.92)', backdropFilter:'blur(8px)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>Legend</div>
            {Object.entries(STATUS_COLORS).map(([s, c]) => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:c, boxShadow:`0 0 6px ${c}` }} />
                <span style={{ fontSize:12, textTransform:'capitalize', color:'var(--text-primary)' }}>{s}</span>
              </div>
            ))}
          </div>

          {/* Counts */}
          <div style={{ position:'absolute', top:20, right:20, zIndex:1000, background:'rgba(13,17,36,0.92)', backdropFilter:'blur(8px)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px' }}>
            {Object.entries(STATUS_COLORS).map(([s, c]) => {
              const count = mapped.filter(d => cs(d) === s).length;
              return count > 0 ? (
                <div key={s} style={{ display:'flex', justifyContent:'space-between', gap:16, marginBottom:4 }}>
                  <span style={{ fontSize:12, color:'var(--text-secondary)', textTransform:'capitalize' }}>{s}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:c }}>{count}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
