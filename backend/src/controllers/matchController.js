const { query, getClient } = require('../config/database');
const { validationResult } = require('express-validator');

// ─── MATCHES ──────────────────────────────────────────────────────────────────
const getMatches = async (req, res) => {
  const { tournamentId } = req.params;
  const { status } = req.query;
  try {
    let sql = `
      SELECT m.*,
        ta.name AS team_a_name, ta.short_name AS team_a_short,
        tb.name AS team_b_name, tb.short_name AS team_b_short,
        tw.name AS toss_winner_name, w.name AS winner_name
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      LEFT JOIN teams tw ON m.toss_winner_id = tw.id
      LEFT JOIN teams w ON m.winner_id = w.id
      WHERE m.tournament_id = $1`;
    const params = [tournamentId];

    if (status) {
      sql += ` AND m.status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY
      CASE m.status WHEN 'live' THEN 1 WHEN 'toss' THEN 2 WHEN 'scheduled' THEN 3 ELSE 4 END,
      m.scheduled_at ASC NULLS LAST, m.created_at DESC`;

    const result = await query(sql, params);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get matches' });
  }
};

const getMatchById = async (req, res) => {
  const { id } = req.params;
  try {
    const matchResult = await query(
      `SELECT m.*,
        ta.name AS team_a_name, ta.short_name AS team_a_short,
        tb.name AS team_b_name, tb.short_name AS team_b_short,
        tw.name AS toss_winner_name, w.name AS winner_name,
        striker.name AS striker_name, ns.name AS non_striker_name,
        bowler.name AS current_bowler_name
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      LEFT JOIN teams tw ON m.toss_winner_id = tw.id
      LEFT JOIN teams w ON m.winner_id = w.id
      LEFT JOIN players striker ON m.striker_id = striker.id
      LEFT JOIN players ns ON m.non_striker_id = ns.id
      LEFT JOIN players bowler ON m.current_bowler_id = bowler.id
      WHERE m.id = $1`,
      [id]
    );

    if (matchResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const match = matchResult.rows[0];

    // Get ball by ball for current innings
    const ballsResult = await query(
      `SELECT b.*, bat.name AS batsman_name, bow.name AS bowler_name, dis.name AS dismissed_name
       FROM ball_by_ball b
       LEFT JOIN players bat ON b.batsman_id = bat.id
       LEFT JOIN players bow ON b.bowler_id = bow.id
       LEFT JOIN players dis ON b.dismissed_player_id = dis.id
       WHERE b.match_id = $1
       ORDER BY b.innings, b.over_number, b.ball_number`,
      [id]
    );

    // Get batting scorecards
    const battingResult = await query(
      `SELECT mp.*, p.name AS player_name, p.batting_style
       FROM match_performances mp
       JOIN players p ON mp.player_id = p.id
       WHERE mp.match_id = $1 AND mp.batting_position IS NOT NULL
       ORDER BY mp.innings, mp.batting_position`,
      [id]
    );

    // Get bowling scorecards
    const bowlingResult = await query(
      `SELECT mp.*, p.name AS player_name
       FROM match_performances mp
       JOIN players p ON mp.player_id = p.id
       WHERE mp.match_id = $1 AND mp.bowling_overs > 0
       ORDER BY mp.innings, mp.bowling_overs DESC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        match,
        balls: ballsResult.rows,
        batting: battingResult.rows,
        bowling: bowlingResult.rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get match' });
  }
};

const createMatch = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { tournament_id, team_a_id, team_b_id, total_overs, venue, scheduled_at, match_type, match_number } = req.body;

  if (team_a_id === team_b_id) {
    return res.status(400).json({ success: false, message: 'Team A and Team B cannot be the same' });
  }

  try {
    const result = await query(
      `INSERT INTO matches (tournament_id, team_a_id, team_b_id, total_overs, venue, scheduled_at, match_type, match_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tournament_id, team_a_id, team_b_id, total_overs || 20, venue, scheduled_at, match_type || 'league', match_number, req.user.id]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create match' });
  }
};

// ─── TOSS ─────────────────────────────────────────────────────────────────────
const recordToss = async (req, res) => {
  const { id } = req.params;
  const { toss_winner_id, toss_decision } = req.body;

  if (!['bat', 'bowl'].includes(toss_decision)) {
    return res.status(400).json({ success: false, message: 'Toss decision must be bat or bowl' });
  }

  try {
    const matchResult = await query('SELECT * FROM matches WHERE id = $1', [id]);
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
    const match = matchResult.rows[0];
    if (!['scheduled', 'toss'].includes(match.status)) {
      return res.status(400).json({ success: false, message: 'Match cannot accept toss at this stage' });
    }

    // Determine batting team for innings 1
    let innings1BattingTeamId;
    if (toss_decision === 'bat') {
      innings1BattingTeamId = toss_winner_id;
    } else {
      innings1BattingTeamId = toss_winner_id === match.team_a_id ? match.team_b_id : match.team_a_id;
    }

    await query(
      `UPDATE matches SET
       toss_winner_id = $1, toss_decision = $2,
       innings1_batting_team_id = $3, current_batting_team_id = $3,
       status = 'live', current_innings = 1
       WHERE id = $4`,
      [toss_winner_id, toss_decision, innings1BattingTeamId, id]
    );

    const updated = await query('SELECT * FROM matches WHERE id = $1', [id]);
    req.io?.to(`match:${id}`).emit('match:update', updated.rows[0]);

    return res.status(200).json({ success: true, data: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to record toss' });
  }
};

// ─── ADD BALL (Core live scoring) ─────────────────────────────────────────────
const addBall = async (req, res) => {
  const { id } = req.params;
  const {
    runs_off_bat = 0,
    extras = 0,
    extra_type = null,
    is_wicket = false,
    wicket_type = null,
    dismissed_player_id = null,
    fielder_id = null,
    batsman_id,
    bowler_id,
    commentary = '',
  } = req.body;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const matchResult = await client.query('SELECT * FROM matches WHERE id = $1 FOR UPDATE', [id]);
    if (matchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const match = matchResult.rows[0];
    if (match.status !== 'live') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Match is not live' });
    }

    const innings = match.current_innings;
    let over = match.current_over;
    let ball = match.current_ball;
    const battingTeamId = match.current_batting_team_id;
    const bowlingTeamId = battingTeamId === match.team_a_id ? match.team_b_id : match.team_a_id;

    // Determine if this is a valid (non-wide, non-no-ball) delivery
    const isLegalDelivery = !['wide', 'no_ball'].includes(extra_type);

    // Ball number for legal deliveries
    let ballInOver = ball;
    if (isLegalDelivery) {
      ballInOver = ball + 1;
    }

    const totalRuns = runs_off_bat + extras;

    // Running totals
    const currentInningsRuns = innings === 1 ? match.innings1_runs : match.innings2_runs;
    const currentInningsWickets = innings === 1 ? match.innings1_wickets : match.innings2_wickets;
    const newRuns = currentInningsRuns + totalRuns;
    const newWickets = currentInningsWickets + (is_wicket ? 1 : 0);
    const newTotalRuns = newRuns;
    const newTotalWickets = newWickets;

    // Record ball
    await client.query(
      `INSERT INTO ball_by_ball
       (match_id, tournament_id, innings, over_number, ball_number,
        batting_team_id, bowling_team_id, batsman_id, bowler_id,
        runs_off_bat, extras, extra_type, is_wicket, wicket_type,
        dismissed_player_id, fielder_id, commentary, total_runs, total_wickets)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        id, match.tournament_id, innings, over, isLegalDelivery ? ballInOver : ball,
        battingTeamId, bowlingTeamId, batsman_id, bowler_id,
        runs_off_bat, extras, extra_type, is_wicket, wicket_type,
        dismissed_player_id, fielder_id, commentary, newTotalRuns, newTotalWickets,
      ]
    );

    // Update match innings totals
    let nextOver = over;
    let nextBall = isLegalDelivery ? ballInOver : ball;
    let newStatus = 'live';
    let inningsOver = false;

    if (isLegalDelivery && ballInOver >= 6) {
      nextOver = over + 1;
      nextBall = 0;
    }

    // Check innings complete
    const maxOvers = match.total_overs;
    const oversCompleted = isLegalDelivery ? (over + (ballInOver >= 6 ? 1 : 0)) : over;
    const currentOversDecimal = `${over}.${ballInOver}`;

    if (newWickets >= 10 || oversCompleted >= maxOvers) {
      inningsOver = true;
    }

    const inningsRunsField = innings === 1 ? 'innings1_runs' : 'innings2_runs';
    const inningsWicketsField = innings === 1 ? 'innings1_wickets' : 'innings2_wickets';
    const inningsOversField = innings === 1 ? 'innings1_overs' : 'innings2_overs';

    if (inningsOver && innings === 1) {
      // Start innings 2
      const innings2BattingTeam = battingTeamId === match.team_a_id ? match.team_b_id : match.team_a_id;
      await client.query(
        `UPDATE matches SET
         ${inningsRunsField} = $1, ${inningsWicketsField} = $2, ${inningsOversField} = $3,
         current_innings = 2, current_over = 0, current_ball = 0,
         innings2_batting_team_id = $4, current_batting_team_id = $4,
         status = 'innings_break', striker_id = NULL, non_striker_id = NULL, current_bowler_id = NULL
         WHERE id = $5`,
        [newRuns, newWickets, parseFloat(currentOversDecimal), innings2BattingTeam, id]
      );
    } else if (inningsOver && innings === 2) {
      // Match complete — determine winner
      const team1Runs = innings === 1 ? newRuns : match.innings1_runs;
      const team2Runs = innings === 2 ? newRuns : match.innings2_runs;
      const battingTeam2 = match.innings2_batting_team_id;

      let result, winnerId, winMargin, winType;
      if (team1Runs > team2Runs) {
        result = match.innings1_batting_team_id === match.team_a_id ? 'team_a_won' : 'team_b_won';
        winnerId = match.innings1_batting_team_id;
        winMargin = team1Runs - team2Runs;
        winType = 'runs';
      } else if (team2Runs > team1Runs) {
        result = battingTeam2 === match.team_a_id ? 'team_a_won' : 'team_b_won';
        winnerId = battingTeam2;
        winMargin = 10 - newWickets;
        winType = 'wickets';
      } else {
        result = 'tie';
      }

      await client.query(
        `UPDATE matches SET
         ${inningsRunsField} = $1, ${inningsWicketsField} = $2, ${inningsOversField} = $3,
         status = 'completed', result = $4, winner_id = $5, win_margin = $6, win_type = $7,
         striker_id = NULL, non_striker_id = NULL, current_bowler_id = NULL
         WHERE id = $8`,
        [newRuns, newWickets, parseFloat(currentOversDecimal), result, winnerId, winMargin, winType, id]
      );

      // Update team standings
      if (winnerId) {
        const losingTeam = winnerId === match.team_a_id ? match.team_b_id : match.team_a_id;
        await client.query(
          `UPDATE teams SET total_matches = total_matches + 1, wins = wins + 1, points = points + 2
           WHERE id = $1`,
          [winnerId]
        );
        await client.query(
          `UPDATE teams SET total_matches = total_matches + 1, losses = losses + 1
           WHERE id = $1`,
          [losingTeam]
        );
      } else {
        // Tie
        await client.query(
          `UPDATE teams SET total_matches = total_matches + 1, draws = draws + 1, points = points + 1
           WHERE id IN ($1, $2)`,
          [match.team_a_id, match.team_b_id]
        );
      }
    } else {
      // Continue innings
      await client.query(
        `UPDATE matches SET
         ${inningsRunsField} = $1, ${inningsWicketsField} = $2, ${inningsOversField} = $3,
         current_over = $4, current_ball = $5,
         striker_id = COALESCE($6, striker_id),
         current_bowler_id = COALESCE($7, current_bowler_id)
         WHERE id = $8`,
        [
          newRuns, newWickets, parseFloat(`${over}.${isLegalDelivery ? ballInOver : ball}`),
          nextOver, nextBall, batsman_id, bowler_id, id,
        ]
      );
    }

    await client.query('COMMIT');

    // Fetch updated match and emit via socket
    const updatedMatch = await query('SELECT * FROM matches WHERE id = $1', [id]);
    req.io?.to(`match:${id}`).emit('match:ball', {
      ball: { runs_off_bat, extras, extra_type, is_wicket, wicket_type, commentary },
      match: updatedMatch.rows[0],
    });

    return res.status(200).json({
      success: true,
      message: 'Ball recorded',
      data: updatedMatch.rows[0],
      inningsOver,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Add ball error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record ball' });
  } finally {
    client.release();
  }
};

// Start innings 2 (after innings break confirmation)
const startInnings2 = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `UPDATE matches SET status = 'live' WHERE id = $1 AND status = 'innings_break' RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Match not in innings break' });
    }
    req.io?.to(`match:${id}`).emit('match:update', result.rows[0]);
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to start innings 2' });
  }
};

// Update current batsmen/bowler
const setPlayers = async (req, res) => {
  const { id } = req.params;
  const { striker_id, non_striker_id, bowler_id } = req.body;
  try {
    const result = await query(
      `UPDATE matches SET
       striker_id = COALESCE($1, striker_id),
       non_striker_id = COALESCE($2, non_striker_id),
       current_bowler_id = COALESCE($3, current_bowler_id)
       WHERE id = $4 RETURNING *`,
      [striker_id, non_striker_id, bowler_id, id]
    );
    req.io?.to(`match:${id}`).emit('match:update', result.rows[0]);
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to set players' });
  }
};

const getLiveMatches = async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*,
        ta.name AS team_a_name, ta.short_name AS team_a_short,
        tb.name AS team_b_name, tb.short_name AS team_b_short,
        t.name AS tournament_name
       FROM matches m
       JOIN teams ta ON m.team_a_id = ta.id
       JOIN teams tb ON m.team_b_id = tb.id
       JOIN tournaments t ON m.tournament_id = t.id
       WHERE m.status IN ('live', 'innings_break')
       ORDER BY m.updated_at DESC`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to get live matches' });
  }
};

module.exports = {
  getMatches, getMatchById, createMatch,
  recordToss, addBall, startInnings2, setPlayers,
  getLiveMatches,
};
