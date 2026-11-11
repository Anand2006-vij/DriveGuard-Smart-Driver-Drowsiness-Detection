const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { protect } = require('../middleware/auth');

const router  = express.Router();
const genToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// POST /api/auth/register
router.post('/register', [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { firstName, lastName, email, password, phone, role } = req.body;

    // Check existing
    const { data: existing } = await supabase.from('admins').select('id').eq('email', email).single();
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    // First admin = superadmin
    const { count } = await supabase.from('admins').select('*', { count: 'exact', head: true });
    const assignedRole = count === 0 ? 'superadmin' : (role || 'admin');

    const hash = await bcrypt.hash(password, 12);
    const { data: admin, error } = await supabase.from('admins').insert([{
      first_name: firstName, last_name: lastName,
      email, password: hash, phone,
      role: assignedRole,
    }]).select('id,first_name,last_name,email,role,is_active,permissions,phone').single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ success: true, token: genToken(admin.id), admin });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !admin || !admin.is_active)
      return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    await supabase.from('admins').update({ last_login: new Date().toISOString() }).eq('id', admin.id);

    const { password: _pw, ...safeAdmin } = admin;
    res.json({ success: true, token: genToken(admin.id), admin: safeAdmin });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ success: true, admin: req.admin }));

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const { data: admin, error } = await supabase
      .from('admins')
      .update({ first_name: firstName, last_name: lastName, phone })
      .eq('id', req.admin.id)
      .select('id,first_name,last_name,email,role,is_active,permissions,phone')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, admin });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { data: admin } = await supabase.from('admins').select('password').eq('id', req.admin.id).single();
    const ok = await bcrypt.compare(currentPassword, admin.password);
    if (!ok) return res.status(400).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await supabase.from('admins').update({ password: hash }).eq('id', req.admin.id);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
