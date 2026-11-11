const express  = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/drivers
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase.from('drivers').select('*', { count: 'exact' });

    if (status && status !== 'all') query = query.eq('current_status', status);
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,vehicle_number.ilike.%${search}%,employee_id.ilike.%${search}%,license_number.ilike.%${search}%`
      );
    }

    const { data: drivers, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) return res.status(400).json({ error: error.message });
    res.json({
      success: true, drivers,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / limit), limit: parseInt(limit) },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/drivers/stats
router.get('/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('current_status');
    if (error) return res.status(400).json({ error: error.message });

    const result = { total: data.length, active: 0, drowsy: 0, accident: 0, offline: 0, inactive: 0 };
    data.forEach(d => { if (result[d.current_status] !== undefined) result[d.current_status]++; });
    res.json({ success: true, stats: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/drivers/:id
router.get('/:id', async (req, res) => {
  try {
    const { data: driver, error } = await supabase.from('drivers').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Driver not found' });
    res.json({ success: true, driver });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/drivers/:id/sensors
router.get('/:id/sensors', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const { data: readings, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('driver_id', req.params.id)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, readings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/drivers/:id/alerts
router.get('/:id/alerts', async (req, res) => {
  try {
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('driver_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, alerts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/drivers
router.post('/', [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').isEmail(),
  body('phone').notEmpty(),
  body('licenseNumber').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const b = req.body;
    const { data: driver, error } = await supabase.from('drivers').insert([{
      first_name: b.firstName, last_name: b.lastName, email: b.email,
      phone: b.phone, date_of_birth: b.dateOfBirth || null, gender: b.gender || null,
      street: b.address?.street, city: b.address?.city, state: b.address?.state,
      zip_code: b.address?.zipCode, country: b.address?.country || 'India',
      license_number: b.licenseNumber, license_expiry: b.licenseExpiry || null,
      license_type: b.licenseType || 'LMV', employee_id: b.employeeId || null,
      department: b.department, shift_timing: b.shiftTiming || 'morning',
      vehicle_number: b.vehicleNumber, vehicle_type: b.vehicleType || 'car',
      vehicle_model: b.vehicleModel, device_id: b.deviceId || null,
      device_status: b.deviceId ? 'assigned' : 'unassigned',
      blood_group: b.bloodGroup, notes: b.notes,
      emergency_name: b.emergencyContact?.name, emergency_phone: b.emergencyContact?.phone,
      emergency_relation: b.emergencyContact?.relation,
    }]).select().single();
    if (error) return res.status(400).json({ error: error.message });
    req.app.get('io').emit('driver:new', driver);
    res.status(201).json({ success: true, driver });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/drivers/:id
router.put('/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = {};
    if (b.firstName)      updates.first_name  = b.firstName;
    if (b.lastName)       updates.last_name   = b.lastName;
    if (b.email)          updates.email       = b.email;
    if (b.phone)          updates.phone       = b.phone;
    if (b.dateOfBirth)    updates.date_of_birth = b.dateOfBirth;
    if (b.gender)         updates.gender      = b.gender;
    if (b.address) {
      if (b.address.street)  updates.street   = b.address.street;
      if (b.address.city)    updates.city     = b.address.city;
      if (b.address.state)   updates.state    = b.address.state;
      if (b.address.zipCode) updates.zip_code = b.address.zipCode;
      if (b.address.country) updates.country  = b.address.country;
    }
    if (b.licenseNumber)  updates.license_number  = b.licenseNumber;
    if (b.licenseExpiry)  updates.license_expiry  = b.licenseExpiry;
    if (b.licenseType)    updates.license_type    = b.licenseType;
    if (b.employeeId)     updates.employee_id     = b.employeeId;
    if (b.department)     updates.department      = b.department;
    if (b.shiftTiming)    updates.shift_timing    = b.shiftTiming;
    if (b.vehicleNumber)  updates.vehicle_number  = b.vehicleNumber;
    if (b.vehicleType)    updates.vehicle_type    = b.vehicleType;
    if (b.vehicleModel)   updates.vehicle_model   = b.vehicleModel;
    if (b.deviceId !== undefined) { updates.device_id = b.deviceId || null; updates.device_status = b.deviceId ? 'assigned' : 'unassigned'; }
    if (b.bloodGroup)     updates.blood_group     = b.bloodGroup;
    if (b.notes)          updates.notes           = b.notes;
    if (b.emergencyContact) {
      if (b.emergencyContact.name)     updates.emergency_name     = b.emergencyContact.name;
      if (b.emergencyContact.phone)    updates.emergency_phone    = b.emergencyContact.phone;
      if (b.emergencyContact.relation) updates.emergency_relation = b.emergencyContact.relation;
    }
    const { data: driver, error } = await supabase.from('drivers').update(updates).eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    req.app.get('io').emit('driver:updated', driver);
    res.json({ success: true, driver });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/drivers/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('drivers').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: 'Driver deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
