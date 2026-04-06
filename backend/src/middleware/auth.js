const { verifyAccessToken } = require('../utils/jwt');
const { query } = require('../config/database');

// Verify JWT and attach user to request
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Fetch fresh user data
    const result = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    return res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

// Require super admin role
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required',
    });
  }
  next();
};

// Require any admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || !['super_admin', 'tournament_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
};

// Verify tournament admin has access to specific tournament
const requireTournamentAccess = async (req, res, next) => {
  const tournamentId = req.params.tournamentId || req.body.tournament_id || req.query.tournament_id;

  if (!tournamentId) {
    return res.status(400).json({ success: false, message: 'Tournament ID required' });
  }

  // Super admin has access to all
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Tournament admin must be assigned
  if (req.user.role === 'tournament_admin') {
    const result = await query(
      `SELECT id FROM admin_tournament_mappings
       WHERE user_id = $1 AND tournament_id = $2 AND is_active = true`,
      [req.user.id, tournamentId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this tournament',
      });
    }
    return next();
  }

  return res.status(403).json({ success: false, message: 'Access denied' });
};

module.exports = {
  authenticate,
  requireSuperAdmin,
  requireAdmin,
  requireTournamentAccess,
};
