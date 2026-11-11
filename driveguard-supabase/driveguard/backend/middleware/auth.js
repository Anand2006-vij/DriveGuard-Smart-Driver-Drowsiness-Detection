const jwt      = require('jsonwebtoken');
const supabase = require('../config/supabase');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ error: 'Not authorized. No token.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, first_name, last_name, email, role, is_active, permissions, phone')
      .eq('id', decoded.id)
      .single();

    if (error || !admin || !admin.is_active)
      return res.status(401).json({ error: 'Not authorized.' });

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token failed.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.admin.role))
    return res.status(403).json({ error: `Role '${req.admin.role}' is not authorized.` });
  next();
};

module.exports = { protect, authorize };
