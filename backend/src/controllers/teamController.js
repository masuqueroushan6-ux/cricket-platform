const { query } = require('../config/database');
const { validationResult } = require('express-validator');

// ─── TEAMS ────────────────────────────────────────────────────────────────────
const getTeams = async (req, res) => {
  const { tournamentId } = req.params;
  try {
    const result = await query(
      `SELECT t.*, p.name AS captain_name,
       COUNT(pl.id) AS player_count
       FROM teams t
       LEFT JOIN players p ON t.captain_id = p.id
       LEFT JOIN players pl ON t.id = pl.team_id AND pl.is_active = true
       WHERE t.tournament_id = $1 AND t.is_active = true
       GROUP BY t.id, p.name
       ORDER BY t.points DESC, t.net_run_rate DESC`,
      [tournamentId]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get teams' });
  }
};

const getTeamById = async (req, res) => {
  const { id } = req.params;
  try {
    const teamResult = await query(
      `SELECT t.*, p.name AS captain_name FROM teams t
       LEFT JOIN players p ON t.captain_id = p.id
       WHERE t.id = $1`,
      [id]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const playersResult = await query(
      `SELECT * FROM players WHERE team_id = $1 AND is_active = true ORDER BY batting_runs DESC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...teamResult.rows[0], players: playersResult.rows },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get team' });
  }
};

const createTeam = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { tournament_id, name, short_name, home_ground } = req.body;
  try {
    const result = await query(
      `INSERT INTO teams (tournament_id, name, short_name, home_ground, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tournament_id, name, short_name, home_ground, req.user.id]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Team name already exists in this tournament' });
    }
    return res.status(500).json({ success: false, message: 'Failed to create team' });
  }
};

const updateTeam = async (req, res) => {
  const { id } = req.params;
  const { name, short_name, home_ground, captain_id } = req.body;
  try {
    const result = await query(
      `UPDATE teams SET
       name = COALESCE($1, name), short_name = COALESCE($2, short_name),
       home_ground = COALESCE($3, home_ground), captain_id = COALESCE($4, captain_id)
       WHERE id = $5 RETURNING *`,
      [name, short_name, home_ground, captain_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update team' });
  }
};

const deleteTeam = async (req, res) => {
  const { id } = req.params;
  try {
    await query('UPDATE teams SET is_active = false WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Team deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete team' });
  }
};

// ─── PLAYERS ──────────────────────────────────────────────────────────────────
const getPlayers = async (req, res) => {
  const { teamId } = req.params;
  try {
    const result = await query(
      `SELECT * FROM players WHERE team_id = $1 AND is_active = true ORDER BY name`,
      [teamId]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get players' });
  }
};

const createPlayer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { team_id, tournament_id, name, jersey_number, batting_style, bowling_style, role } = req.body;
  try {
    const result = await query(
      `INSERT INTO players (team_id, tournament_id, name, jersey_number, batting_style, bowling_style, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [team_id, tournament_id, name, jersey_number, batting_style || 'Right Hand', bowling_style || 'None', role || 'Batsman']
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create player' });
  }
};

const updatePlayer = async (req, res) => {
  const { id } = req.params;
  const { name, jersey_number, batting_style, bowling_style, role } = req.body;
  try {
    const result = await query(
      `UPDATE players SET
       name = COALESCE($1, name), jersey_number = COALESCE($2, jersey_number),
       batting_style = COALESCE($3, batting_style), bowling_style = COALESCE($4, bowling_style),
       role = COALESCE($5, role)
       WHERE id = $6 RETURNING *`,
      [name, jersey_number, batting_style, bowling_style, role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update player' });
  }
};

const deletePlayer = async (req, res) => {
  const { id } = req.params;
  try {
    await query('UPDATE players SET is_active = false WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Player deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete player' });
  }
};

// Get tournament leaderboards
const getLeaderboard = async (req, res) => {
  const { tournamentId } = req.params;
  const { type = 'batting' } = req.query;
  try {
    let result;
    if (type === 'batting') {
      result = await query(
        `SELECT * FROM top_batsmen WHERE tournament_id = $1 ORDER BY batting_runs DESC LIMIT 20`,
        [tournamentId]
      );
    } else {
      result = await query(
        `SELECT * FROM top_bowlers WHERE tournament_id = $1 ORDER BY bowling_wickets DESC LIMIT 20`,
        [tournamentId]
      );
    }
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get leaderboard' });
  }
};

module.exports = {
  getTeams, getTeamById, createTeam, updateTeam, deleteTeam,
  getPlayers, createPlayer, updatePlayer, deletePlayer,
  getLeaderboard,
};
