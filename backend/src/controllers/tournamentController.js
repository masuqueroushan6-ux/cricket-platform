const { query } = require('../config/database');
const { validationResult } = require('express-validator');

// Get all tournaments (super admin: all; tournament admin: their own)
const getTournaments = async (req, res) => {
  try {
    let result;
    if (req.user.role === 'super_admin') {
      result = await query(
        `SELECT t.*, u.name AS created_by_name,
         COUNT(DISTINCT tm.id) FILTER (WHERE tm.is_active) AS admin_count,
         COUNT(DISTINCT teams.id) AS team_count,
         COUNT(DISTINCT m.id) AS match_count
         FROM tournaments t
         LEFT JOIN users u ON t.created_by = u.id
         LEFT JOIN admin_tournament_mappings tm ON t.id = tm.tournament_id
         LEFT JOIN teams ON t.id = teams.tournament_id
         LEFT JOIN matches m ON t.id = m.tournament_id
         WHERE t.is_active = true
         GROUP BY t.id, u.name
         ORDER BY t.created_at DESC`
      );
    } else {
      result = await query(
        `SELECT t.*, u.name AS created_by_name,
         COUNT(DISTINCT teams.id) AS team_count,
         COUNT(DISTINCT m.id) AS match_count
         FROM tournaments t
         JOIN admin_tournament_mappings atm ON t.id = atm.tournament_id
         LEFT JOIN users u ON t.created_by = u.id
         LEFT JOIN teams ON t.id = teams.tournament_id
         LEFT JOIN matches m ON t.id = m.tournament_id
         WHERE atm.user_id = $1 AND atm.is_active = true AND t.is_active = true
         GROUP BY t.id, u.name
         ORDER BY t.created_at DESC`,
        [req.user.id]
      );
    }

    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to get tournaments' });
  }
};

const getTournamentById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT t.*, u.name AS created_by_name FROM tournaments t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1 AND t.is_active = true`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Points table
    const pointsResult = await query(
      `SELECT * FROM points_table WHERE tournament_id = $1 ORDER BY position`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...result.rows[0], points_table: pointsResult.rows },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get tournament' });
  }
};

const createTournament = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, description, location, start_date, end_date, format, max_overs, prize_pool, rules } = req.body;

  try {
    const result = await query(
      `INSERT INTO tournaments (name, description, location, start_date, end_date, format, max_overs, prize_pool, rules, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, description, location, start_date, end_date, format || 'T20', max_overs || 20, prize_pool, rules, req.user.id]
    );

    return res.status(201).json({ success: true, message: 'Tournament created', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create tournament' });
  }
};

const updateTournament = async (req, res) => {
  const { id } = req.params;
  const { name, description, location, start_date, end_date, format, max_overs, status, prize_pool, rules } = req.body;

  try {
    const result = await query(
      `UPDATE tournaments SET
       name = COALESCE($1, name), description = COALESCE($2, description),
       location = COALESCE($3, location), start_date = COALESCE($4, start_date),
       end_date = COALESCE($5, end_date), format = COALESCE($6, format),
       max_overs = COALESCE($7, max_overs), status = COALESCE($8, status),
       prize_pool = COALESCE($9, prize_pool), rules = COALESCE($10, rules)
       WHERE id = $11 AND is_active = true RETURNING *`,
      [name, description, location, start_date, end_date, format, max_overs, status, prize_pool, rules, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update tournament' });
  }
};

const deleteTournament = async (req, res) => {
  const { id } = req.params;
  try {
    // Soft delete
    await query('UPDATE tournaments SET is_active = false WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Tournament deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete tournament' });
  }
};

// Assign tournament admin
const assignAdmin = async (req, res) => {
  const { tournamentId } = req.params;
  const { userId } = req.body;

  try {
    // Check user exists and is tournament_admin
    const userResult = await query(
      'SELECT id, name, email FROM users WHERE id = $1 AND role = $2 AND is_active = true',
      [userId, 'tournament_admin']
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tournament admin not found' });
    }

    await query(
      `INSERT INTO admin_tournament_mappings (user_id, tournament_id, assigned_by)
       VALUES ($1, $2, $3) ON CONFLICT (user_id, tournament_id) DO UPDATE SET is_active = true`,
      [userId, tournamentId, req.user.id]
    );

    return res.status(200).json({ success: true, message: 'Admin assigned to tournament' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to assign admin' });
  }
};

// Get public tournaments (no auth needed)
const getPublicTournaments = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, description, location, start_date, end_date, format, status, prize_pool
       FROM tournaments WHERE is_active = true AND status != 'cancelled'
       ORDER BY CASE status WHEN 'ongoing' THEN 1 WHEN 'upcoming' THEN 2 ELSE 3 END, created_at DESC
       LIMIT 20`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get tournaments' });
  }
};

module.exports = {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  assignAdmin,
  getPublicTournaments,
};
