const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const supabase       = require('./config/supabase');
const authRoutes     = require('./routes/auth');
const driverRoutes   = require('./routes/drivers');
const sensorRoutes   = require('./routes/sensors');
const alertRoutes    = require('./routes/alerts');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes    = require('./routes/admin');

const app    = express();
const server = http.createServer(app);

// ── Socket.IO ───────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET','POST'], credentials: true },
});
app.set('io', io);

// ── Middleware ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/drivers',   driverRoutes);
app.use('/api/sensors',   sensorRoutes);
app.use('/api/alerts',    alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin',     adminRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const { error } = await supabase.from('admins').select('id').limit(1);
  res.json({ status: 'OK', supabase: error ? 'error' : 'connected', timestamp: new Date().toISOString() });
});

// ── Socket.IO Real-time ─────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('device:register', ({ deviceId, driverId }) => {
    socket.join(`device:${deviceId}`);
    io.emit('device:online', { deviceId, driverId, timestamp: new Date() });
    console.log(`📡 Device ${deviceId} registered`);
  });

  // ESP32 can also push via WebSocket
  socket.on('sensor:data', async (data) => {
    try {
      const { data: reading, error } = await supabase.from('sensor_readings').insert([{
        driver_id: data.driverId, device_id: data.deviceId,
        eye_closure_percent: data.eyeClosurePercent || 0,
        blink_rate:          data.blinkRate          || 0,
        acceleration_x:      data.accelerationX      || 0,
        acceleration_y:      data.accelerationY      || 0,
        acceleration_z:      data.accelerationZ      || 0,
        tilt_angle:          data.tiltAngle          || 0,
        latitude:            data.latitude            || 0,
        longitude:           data.longitude           || 0,
        speed:               data.speed               || 0,
        drowsiness_level:    data.drowsinessLevel     || 'normal',
        drowsiness_score:    data.drowsinessScore     || 0,
        is_drowsy:           data.isDrowsy            || false,
        is_accident:         data.isAccident          || false,
        battery_level:       data.batteryLevel        || 100,
        timestamp:           new Date().toISOString(),
      }]).select().single();

      if (!error) {
        await supabase.from('drivers').update({
          last_latitude:  data.latitude,
          last_longitude: data.longitude,
          last_seen:      new Date().toISOString(),
          current_status: data.isAccident ? 'accident' : data.isDrowsy ? 'drowsy' : 'active',
        }).eq('id', data.driverId);

        io.emit('sensor:update', { ...data, id: reading?.id, timestamp: new Date() });

        if (data.isDrowsy || data.isAccident) {
          const { data: alert } = await supabase.from('alerts').insert([{
            driver_id:   data.driverId, device_id: data.deviceId,
            type:        data.isAccident ? 'accident' : 'drowsiness',
            severity:    data.isAccident ? 'critical' : data.drowsinessLevel === 'high' ? 'high' : 'medium',
            message:     data.isAccident ? 'Accident detected!' : `Drowsiness - Level: ${data.drowsinessLevel}`,
            latitude:    data.latitude, longitude: data.longitude,
          }]).select('*, drivers(first_name,last_name,vehicle_number)').single();
          if (alert) io.emit('alert:new', alert);
        }
      }
    } catch (err) { console.error('Socket sensor error:', err); }
  });

  socket.on('disconnect', () => console.log(`❌ Disconnected: ${socket.id}`));
});

// ── Error Handlers ──────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 DriveGuard Backend: http://localhost:${PORT}`);
  console.log(`📊 Supabase URL: ${process.env.SUPABASE_URL}`);
});

module.exports = { app, io };
