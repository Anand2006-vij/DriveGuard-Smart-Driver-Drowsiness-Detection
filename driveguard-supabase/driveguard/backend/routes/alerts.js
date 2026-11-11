const express  = require('express');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 30, status, type, severity, driverId } = req.query;
    const offset = (page - 1) * limit;
    let query = supabase.from('alerts').select('*, drivers(first_name,last_name,vehicle_number)', { count: 'exact' });
    if (status   && status   !== 'all') query = query.eq('status', status);
    if (type     && type     !== 'all') query = query.eq('type', type);
    if (severity && severity !== 'all') query = query.eq('severity', severity);
    if (driverId) query = query.eq('driver_id', driverId);
    const { data: alerts, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, alerts, total: count, page: parseInt(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/alerts/counts
router.get('/counts', async (req, res) => {
  try {
    const { data, error } = await supabase.from('alerts').select('status,severity');
    if (error) return res.status(400).json({ error: error.message });
    const result = { active: 0, acknowledged: 0, resolved: 0, critical: 0, high: 0, medium: 0, low: 0, total: data.length };
    data.forEach(a => {
      if (result[a.status]   !== undefined) result[a.status]++;
      if (result[a.severity] !== undefined) result[a.severity]++;
    });
    res.json({ success: true, counts: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/alerts/:id/acknowledge
router.put('/:id/acknowledge', async (req, res) => {
  try {
    const { data: alert, error } = await supabase.from('alerts')
      .update({ status: 'acknowledged', acknowledged_by: req.admin.id, acknowledged_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, drivers(first_name,last_name,vehicle_number)')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    req.app.get('io').emit('alert:updated', alert);
    res.json({ success: true, alert });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', async (req, res) => {
  try {
    const { data: alert, error } = await supabase.from('alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: req.body.notes || '' })
      .eq('id', req.params.id)
      .select('*, drivers(first_name,last_name,vehicle_number)')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    req.app.get('io').emit('alert:updated', alert);
    res.json({ success: true, alert });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/alerts/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('alerts').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: 'Alert deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
