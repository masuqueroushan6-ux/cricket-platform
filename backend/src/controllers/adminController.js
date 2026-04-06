const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');

// Get all tournament admins
const getAdmins = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.last_login_at, u.created_at,
       COALESCE(json_agg(
         json_build_object('id', t.id, 'name', t.name, 'status', t.status)
       ) FILTER (WHERE t.id IS NOT NULL), '[]') AS tournaments
       FROM users u
       LEFT JOIN admin_tournament_mappings atm ON u.id = atm.user_id AND atm.is_active = true
       LEFT JOIN tournaments t ON atm.tournament_id = t.id AND t.is_active = true
       WHERE u.role = 'tournament_admin'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get admins' });
  }
};

// Create a tournament admin
const createAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, phone, tournament_id } = req.body;
  const lowerEmail = email.toLowerCase().trim();

  try {
    // Check existing
    const existing = await query('SELECT id FROM users WHERE email = $1', [lowerEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Generate temp password
    const tempPassword = `Cricket@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const result = await query(
      `INSERT INTO users (name, email, phone, password_hash, role, is_active, is_email_verified)
       VALUES ($1, $2, $3, $4, 'tournament_admin', true, true) RETURNING id, name, email`,
      [name, lowerEmail, phone, passwordHash]
    );

    const newUser = result.rows[0];

    // Assign to tournament if provided
    if (tournament_id) {
      await query(
        `INSERT INTO admin_tournament_mappings (user_id, tournament_id, assigned_by)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [newUser.id, tournament_id, req.user.id]
      );
    }

    // Send welcome email with credentials
    try {
      await emailService.sendWelcomeEmail(lowerEmail, name, tempPassword);
    } catch (emailErr) {
      console.error('Welcome email failed:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Tournament admin created. Login credentials sent to email.',
      data: newUser,
      tempPassword, // Also return it in response for manual sharing if email fails
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create admin' });
  }
};

// Toggle admin active status
const toggleAdminStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE users SET is_active = NOT is_active
       WHERE id = $1 AND role = 'tournament_admin' RETURNING id, name, is_active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update admin status' });
  }
};

// Delete admin
const deleteAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    // Soft delete - deactivate and remove mappings
    await query('UPDATE users SET is_active = false WHERE id = $1 AND role = $2', [id, 'tournament_admin']);
    await query('UPDATE admin_tournament_mappings SET is_active = false WHERE user_id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Admin deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete admin' });
  }
};

// Get system stats (super admin dashboard)
const getSystemStats = async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM tournaments WHERE is_active = true) AS total_tournaments,
        (SELECT COUNT(*) FROM tournaments WHERE status = 'ongoing' AND is_active = true) AS active_tournaments,
        (SELECT COUNT(*) FROM users WHERE role = 'tournament_admin' AND is_active = true) AS total_admins,
        (SELECT COUNT(*) FROM teams WHERE is_active = true) AS total_teams,
        (SELECT COUNT(*) FROM players WHERE is_active = true) AS total_players,
        (SELECT COUNT(*) FROM matches) AS total_matches,
        (SELECT COUNT(*) FROM matches WHERE status = 'live') AS live_matches,
        (SELECT COUNT(*) FROM matches WHERE status = 'completed') AS completed_matches
    `);
    return res.status(200).json({ success: true, data: stats.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
};

// Get audit logs
const getAuditLogs = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const result = await query(
      `SELECT al.*, u.name AS user_name, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    const countResult = await query('SELECT COUNT(*) FROM audit_logs');
    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get audit logs' });
  }
};

module.exports = {
  getAdmins, createAdmin, toggleAdminStatus, deleteAdmin,
  getSystemStats, getAuditLogs,
};
