import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef    = useRef(null);
  const [isConnected, setIsConnected]   = useState(false);
  const [liveData,    setLiveData]      = useState({});   // { driverId: latestReading }
  const [newAlerts,   setNewAlerts]     = useState([]);
  const [onlineDevices, setOnlineDevices] = useState(new Set());

  useEffect(() => {
    const URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    socketRef.current = io(URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    const s = socketRef.current;

    s.on('connect',    () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));

    s.on('sensor:update', (data) => {
      // Supabase uses snake_case, normalise key
      const driverId = data.driverId || data.driver_id;
      if (driverId) setLiveData(prev => ({ ...prev, [driverId]: { ...data, driverId } }));
    });

    s.on('alert:new', (alert) => {
      setNewAlerts(prev => [alert, ...prev].slice(0, 50));
    });

    s.on('alert:updated', (alert) => {
      setNewAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
    });

    s.on('device:online',  ({ deviceId }) => setOnlineDevices(prev => new Set([...prev, deviceId])));
    s.on('device:offline', ({ deviceId }) => setOnlineDevices(prev => { const s2 = new Set(prev); s2.delete(deviceId); return s2; }));

    return () => s.disconnect();
  }, []);

  const clearAlerts = () => setNewAlerts([]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, liveData, newAlerts, onlineDevices, clearAlerts }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
