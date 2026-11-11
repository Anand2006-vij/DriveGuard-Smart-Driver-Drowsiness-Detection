const express  = require('express');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/sensors/data  ← ESP32 posts here (no auth required)
router.post('/data', async (req, res) => {
  try {
    const d = req.body;
    if (!d.driverId || !d.deviceId)
      return res.status(400).json({ error: 'driverId and deviceId required' });

    // Insert reading
    const { data: reading, error: rErr } = await supabase.from('sensor_readings').insert([{
      driver_id:           d.driverId,
      device_id:           d.deviceId,
      eye_closure_percent: d.eyeClosurePercent  || 0,
      blink_rate:          d.blinkRate          || 0,
      yawn_detected:       d.yawnDetected        || false,
      face_detected:       d.faceDetected !== undefined ? d.faceDetected : true,
      acceleration_x:      d.accelerationX      || 0,
      acceleration_y:      d.accelerationY      || 0,
      acceleration_z:      d.accelerationZ      || 0,
      gyro_x:              d.gyroX              || 0,
      gyro_y:              d.gyroY              || 0,
      gyro_z:              d.gyroZ              || 0,
      tilt_angle:          d.tiltAngle          || 0,
      latitude:            d.latitude            || 0,
      longitude:           d.longitude           || 0,
      speed:               d.speed               || 0,
      altitude:            d.altitude            || 0,
      drowsiness_level:    d.drowsinessLevel     || 'normal',
      is_drowsy:           d.isDrowsy            || false,
      is_accident:         d.isAccident          || false,
      drowsiness_score:    d.drowsinessScore     || 0,
      battery_level:       d.batteryLevel        || 100,
      signal_strength:     d.signalStrength      || 0,
      temperature:         d.temperature         || 0,
      timestamp:           new Date().toISOString(),
    }]).select().single();

    if (rErr) return res.status(400).json({ error: rErr.message });

    // Update driver status & location
    await supabase.from('drivers').update({
      last_latitude:  d.latitude  || 0,
      last_longitude: d.longitude || 0,
      last_seen:      new Date().toISOString(),
      current_status: d.isAccident ? 'accident' : d.isDrowsy ? 'drowsy' : 'active',
    }).eq('id', d.driverId);

    // Auto-create alert
    if (d.isDrowsy || d.isAccident) {
      const { data: alert } = await supabase.from('alerts').insert([{
        driver_id:         d.driverId,
        device_id:         d.deviceId,
        sensor_reading_id: reading.id,
        type:              d.isAccident ? 'accident' : 'drowsiness',
        severity:          d.isAccident ? 'critical' : d.drowsinessLevel === 'high' ? 'high' : 'medium',
        message:           d.isAccident ? 'Accident detected!' : `Drowsiness detected - Level: ${d.drowsinessLevel}`,
        latitude:          d.latitude  || 0,
        longitude:         d.longitude || 0,
      }]).select('*, drivers(first_name,last_name,vehicle_number)').single();

      const io = req.app.get('io');
      if (io && alert) io.emit('alert:new', alert);
    }

    // Broadcast live update
    const io = req.app.get('io');
    if (io) io.emit('sensor:update', { ...d, id: reading.id, timestamp: reading.timestamp });

    res.json({ success: true, readingId: reading.id });
  } catch (err) {
    console.error('Sensor POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensors/live
router.get('/live', protect, async (req, res) => {
  try {
    // Latest reading per driver using Supabase RPC or subquery
    const { data: drivers } = await supabase.from('drivers').select('id').eq('current_status', 'active');
    const readings = [];
    for (const driver of (drivers || [])) {
      const { data } = await supabase
        .from('sensor_readings')
        .select('*, drivers(first_name,last_name,vehicle_number,device_id)')
        .eq('driver_id', driver.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();
      if (data) readings.push(data);
    }
    res.json({ success: true, readings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sensors/history
router.get('/history', protect, async (req, res) => {
  try {
    const { driverId, page = 1, limit = 100, from, to } = req.query;
    const offset = (page - 1) * limit;
    let query = supabase.from('sensor_readings').select('*, drivers(first_name,last_name,vehicle_number)', { count: 'exact' });
    if (driverId) query = query.eq('driver_id', driverId);
    if (from) query = query.gte('timestamp', from);
    if (to)   query = query.lte('timestamp', to);
    const { data: readings, count, error } = await query.order('timestamp', { ascending: false }).range(offset, offset + parseInt(limit) - 1);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, readings, total: count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sensors/chart/:driverId
router.get('/chart/:driverId', protect, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours || 6);
    const from  = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data: readings, error } = await supabase
      .from('sensor_readings')
      .select('eye_closure_percent,drowsiness_score,speed,timestamp,is_drowsy')
      .eq('driver_id', req.params.driverId)
      .gte('timestamp', from)
      .order('timestamp', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, readings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
