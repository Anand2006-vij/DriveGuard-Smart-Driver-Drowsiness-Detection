const express  = require('express');
const supabase = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/admin/users
router.get('/users', authorize('superadmin'), async (req, res) => {
  try {
    const { data: admins, error } = await supabase
      .from('admins')
      .select('id,first_name,last_name,email,role,is_active,permissions,phone,last_login,created_at')
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, admins });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/users/:id
router.put('/users/:id', authorize('superadmin'), async (req, res) => {
  try {
    const { role, isActive, phone } = req.body;
    const updates = {};
    if (role !== undefined)     updates.role      = role;
    if (isActive !== undefined) updates.is_active = isActive;
    if (phone)                  updates.phone     = phone;
    const { data: admin, error } = await supabase.from('admins').update(updates).eq('id', req.params.id)
      .select('id,first_name,last_name,email,role,is_active,permissions,phone').single();
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, admin });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authorize('superadmin'), async (req, res) => {
  try {
    if (req.params.id === req.admin.id)
      return res.status(400).json({ error: 'Cannot delete your own account' });
    const { error } = await supabase.from('admins').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: 'Admin deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
