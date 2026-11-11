const express  = require('express');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const [driversRes, alertsRes, recentAlertsRes, recentReadingsRes] = await Promise.all([
      supabase.from('drivers').select('current_status'),
      supabase.from('alerts').select('severity').eq('status', 'active'),
      supabase.from('alerts').select('*, drivers(first_name,last_name,vehicle_number)').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
      supabase.from('sensor_readings').select('*, drivers(first_name,last_name,vehicle_number)').order('timestamp', { ascending: false }).limit(5),
    ]);

    const driverCount = { total: 0, active: 0, drowsy: 0, accident: 0, offline: 0, inactive: 0 };
    (driversRes.data || []).forEach(d => { driverCount.total++; if (driverCount[d.current_status] !== undefined) driverCount[d.current_status]++; });

    const alertCount = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    (alertsRes.data || []).forEach(a => { alertCount.total++; if (alertCount[a.severity] !== undefined) alertCount[a.severity]++; });

    res.json({
      success: true,
      drivers: driverCount,
      alerts:  alertCount,
      recentAlerts:   recentAlertsRes.data   || [],
      recentReadings: recentReadingsRes.data  || [],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/chart/alerts
router.get('/chart/alerts', async (req, res) => {
  try {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('alerts')
      .select('type, created_at')
      .gte('created_at', from)
      .order('created_at', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });

    // Group by date + type
    const byDate = {};
    (data || []).forEach(a => {
      const date = a.created_at.split('T')[0];
      if (!byDate[date]) byDate[date] = { date, drowsiness: 0, accident: 0 };
      if (byDate[date][a.type] !== undefined) byDate[date][a.type]++;
    });
    res.json({ success: true, data: Object.values(byDate) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/chart/drowsiness
router.get('/chart/drowsiness', async (req, res) => {
  try {
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('sensor_readings')
      .select('is_drowsy, drowsiness_score, timestamp')
      .gte('timestamp', from)
      .order('timestamp', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/map
router.get('/map', async (req, res) => {
  try {
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('id,first_name,last_name,vehicle_number,current_status,last_latitude,last_longitude,last_seen,device_id')
      .neq('current_status', 'offline');
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, drivers: drivers || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
