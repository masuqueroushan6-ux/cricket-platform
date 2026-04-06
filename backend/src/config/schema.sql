-- ============================================================
-- CRICKET PLATFORM - COMPLETE DATABASE SCHEMA
-- Run this file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'tournament_admin'
    CHECK (role IN ('super_admin', 'tournament_admin')),
  phone VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,

  -- 2FA for super admin (TOTP - Google Authenticator)
  totp_secret VARCHAR(255),
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  totp_verified BOOLEAN NOT NULL DEFAULT false,

  -- OTP for tournament admin (email based)
  otp_code VARCHAR(10),
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INTEGER NOT NULL DEFAULT 0,

  -- Login security
  login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_login_ip VARCHAR(45),

  -- Password reset
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMPTZ,

  -- Refresh token
  refresh_token TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- TOURNAMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  location VARCHAR(200),
  start_date DATE,
  end_date DATE,
  format VARCHAR(50) DEFAULT 'T20'
    CHECK (format IN ('T20', 'ODI', 'Test', 'T10', 'Custom')),
  max_overs INTEGER DEFAULT 20,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  banner_url VARCHAR(500),
  prize_pool VARCHAR(100),
  rules TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by);

-- ============================================================
-- ADMIN TOURNAMENT MAPPING (Multi-tenant assignment)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_tournament_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, tournament_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_mapping_user ON admin_tournament_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_mapping_tournament ON admin_tournament_mappings(tournament_id);

-- ============================================================
-- TEAMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(10),
  logo_url VARCHAR(500),
  home_ground VARCHAR(200),
  captain_id UUID,
  total_matches INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  net_run_rate DECIMAL(6,3) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, name)
);

CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);

-- ============================================================
-- PLAYERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  jersey_number INTEGER,
  batting_style VARCHAR(20) DEFAULT 'Right Hand'
    CHECK (batting_style IN ('Right Hand', 'Left Hand')),
  bowling_style VARCHAR(50) DEFAULT 'None'
    CHECK (bowling_style IN ('None', 'Right Arm Fast', 'Right Arm Medium', 'Right Arm Off Spin', 'Right Arm Leg Spin', 'Left Arm Fast', 'Left Arm Medium', 'Left Arm Orthodox', 'Left Arm Wrist Spin')),
  role VARCHAR(20) DEFAULT 'Batsman'
    CHECK (role IN ('Batsman', 'Bowler', 'All Rounder', 'Wicket Keeper')),
  photo_url VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Career batting stats
  batting_matches INTEGER NOT NULL DEFAULT 0,
  batting_innings INTEGER NOT NULL DEFAULT 0,
  batting_runs INTEGER NOT NULL DEFAULT 0,
  batting_balls INTEGER NOT NULL DEFAULT 0,
  batting_fours INTEGER NOT NULL DEFAULT 0,
  batting_sixes INTEGER NOT NULL DEFAULT 0,
  batting_highest_score INTEGER NOT NULL DEFAULT 0,
  batting_fifties INTEGER NOT NULL DEFAULT 0,
  batting_hundreds INTEGER NOT NULL DEFAULT 0,
  batting_not_outs INTEGER NOT NULL DEFAULT 0,

  -- Career bowling stats
  bowling_matches INTEGER NOT NULL DEFAULT 0,
  bowling_innings INTEGER NOT NULL DEFAULT 0,
  bowling_overs DECIMAL(6,1) NOT NULL DEFAULT 0,
  bowling_runs INTEGER NOT NULL DEFAULT 0,
  bowling_wickets INTEGER NOT NULL DEFAULT 0,
  bowling_best_figures VARCHAR(10),
  bowling_maidens INTEGER NOT NULL DEFAULT 0,
  bowling_wides INTEGER NOT NULL DEFAULT 0,
  bowling_no_balls INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_tournament ON players(tournament_id);

-- Add foreign key for team captain after players table exists
ALTER TABLE teams ADD CONSTRAINT fk_team_captain
  FOREIGN KEY (captain_id) REFERENCES players(id) ON DELETE SET NULL;

-- ============================================================
-- MATCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_a_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  team_b_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  match_number INTEGER,
  match_type VARCHAR(20) DEFAULT 'league'
    CHECK (match_type IN ('league', 'quarter_final', 'semi_final', 'final', 'practice')),
  total_overs INTEGER NOT NULL DEFAULT 20,
  venue VARCHAR(200),
  scheduled_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'toss', 'live', 'innings_break', 'completed', 'abandoned', 'postponed')),

  -- Toss
  toss_winner_id UUID REFERENCES teams(id),
  toss_decision VARCHAR(10) CHECK (toss_decision IN ('bat', 'bowl')),

  -- Innings 1
  innings1_batting_team_id UUID REFERENCES teams(id),
  innings1_runs INTEGER NOT NULL DEFAULT 0,
  innings1_wickets INTEGER NOT NULL DEFAULT 0,
  innings1_overs DECIMAL(5,1) NOT NULL DEFAULT 0,
  innings1_extras INTEGER NOT NULL DEFAULT 0,

  -- Innings 2
  innings2_batting_team_id UUID REFERENCES teams(id),
  innings2_runs INTEGER NOT NULL DEFAULT 0,
  innings2_wickets INTEGER NOT NULL DEFAULT 0,
  innings2_overs DECIMAL(5,1) NOT NULL DEFAULT 0,
  innings2_extras INTEGER NOT NULL DEFAULT 0,

  -- Current state (for live scoring)
  current_innings INTEGER NOT NULL DEFAULT 1 CHECK (current_innings IN (1, 2)),
  current_batting_team_id UUID REFERENCES teams(id),
  striker_id UUID REFERENCES players(id),
  non_striker_id UUID REFERENCES players(id),
  current_bowler_id UUID REFERENCES players(id),
  current_over INTEGER NOT NULL DEFAULT 0,
  current_ball INTEGER NOT NULL DEFAULT 0,

  -- Result
  result VARCHAR(20) CHECK (result IN ('team_a_won', 'team_b_won', 'draw', 'tie', 'no_result', 'abandoned')),
  winner_id UUID REFERENCES teams(id),
  win_margin INTEGER,
  win_type VARCHAR(20) CHECK (win_type IN ('runs', 'wickets', 'tie', 'dls', 'super_over')),
  result_description TEXT,

  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (team_a_id != team_b_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_teams ON matches(team_a_id, team_b_id);

-- ============================================================
-- BALL BY BALL TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ball_by_ball (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  innings INTEGER NOT NULL CHECK (innings IN (1, 2)),
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  batting_team_id UUID NOT NULL REFERENCES teams(id),
  bowling_team_id UUID NOT NULL REFERENCES teams(id),
  batsman_id UUID REFERENCES players(id),
  bowler_id UUID REFERENCES players(id),

  -- Ball details
  runs_off_bat INTEGER NOT NULL DEFAULT 0,
  extras INTEGER NOT NULL DEFAULT 0,
  extra_type VARCHAR(20) CHECK (extra_type IN ('wide', 'no_ball', 'bye', 'leg_bye', 'penalty', NULL)),
  is_wicket BOOLEAN NOT NULL DEFAULT false,
  wicket_type VARCHAR(30) CHECK (wicket_type IN ('bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired_out', 'obstructing', NULL)),
  dismissed_player_id UUID REFERENCES players(id),
  fielder_id UUID REFERENCES players(id),
  commentary TEXT,

  -- Running total after this ball
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_wickets INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(match_id, innings, over_number, ball_number)
);

CREATE INDEX IF NOT EXISTS idx_balls_match ON ball_by_ball(match_id);
CREATE INDEX IF NOT EXISTS idx_balls_innings ON ball_by_ball(match_id, innings);

-- ============================================================
-- MATCH PLAYER PERFORMANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS match_performances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  innings INTEGER CHECK (innings IN (1, 2)),

  -- Batting
  batting_position INTEGER,
  batting_runs INTEGER DEFAULT 0,
  batting_balls INTEGER DEFAULT 0,
  batting_fours INTEGER DEFAULT 0,
  batting_sixes INTEGER DEFAULT 0,
  batting_not_out BOOLEAN DEFAULT false,
  batting_dismissal VARCHAR(30),

  -- Bowling
  bowling_overs DECIMAL(4,1) DEFAULT 0,
  bowling_maidens INTEGER DEFAULT 0,
  bowling_runs INTEGER DEFAULT 0,
  bowling_wickets INTEGER DEFAULT 0,
  bowling_wides INTEGER DEFAULT 0,
  bowling_no_balls INTEGER DEFAULT 0,

  -- Fielding
  catches INTEGER DEFAULT 0,
  run_outs INTEGER DEFAULT 0,
  stumpings INTEGER DEFAULT 0,

  is_player_of_match BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, player_id, innings)
);

CREATE INDEX IF NOT EXISTS idx_perf_match ON match_performances(match_id);
CREATE INDEX IF NOT EXISTS idx_perf_player ON match_performances(player_id);
CREATE INDEX IF NOT EXISTS idx_perf_tournament ON match_performances(tournament_id);

-- ============================================================
-- AUDIT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- UPDATE TIMESTAMP FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEWS
-- ============================================================

-- Points table view
CREATE OR REPLACE VIEW points_table AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  t.short_name,
  t.tournament_id,
  t.total_matches,
  t.wins,
  t.losses,
  t.draws,
  t.points,
  t.net_run_rate,
  ROW_NUMBER() OVER (PARTITION BY t.tournament_id ORDER BY t.points DESC, t.net_run_rate DESC) AS position
FROM teams t
WHERE t.is_active = true;

-- Top batsmen view
CREATE OR REPLACE VIEW top_batsmen AS
SELECT
  p.id AS player_id,
  p.name AS player_name,
  p.photo_url,
  t.name AS team_name,
  t.tournament_id,
  p.batting_runs,
  p.batting_innings,
  p.batting_balls,
  p.batting_highest_score,
  p.batting_fifties,
  p.batting_hundreds,
  p.batting_not_outs,
  CASE WHEN p.batting_balls > 0 THEN ROUND((p.batting_runs::DECIMAL / p.batting_balls) * 100, 2) ELSE 0 END AS strike_rate,
  CASE WHEN (p.batting_innings - p.batting_not_outs) > 0 THEN ROUND(p.batting_runs::DECIMAL / (p.batting_innings - p.batting_not_outs), 2) ELSE p.batting_runs END AS average
FROM players p
JOIN teams t ON p.team_id = t.id
WHERE p.batting_innings > 0 AND p.is_active = true;

-- Top bowlers view
CREATE OR REPLACE VIEW top_bowlers AS
SELECT
  p.id AS player_id,
  p.name AS player_name,
  p.photo_url,
  t.name AS team_name,
  t.tournament_id,
  p.bowling_overs,
  p.bowling_runs,
  p.bowling_wickets,
  p.bowling_maidens,
  p.bowling_best_figures,
  CASE WHEN p.bowling_overs > 0 THEN ROUND(p.bowling_runs::DECIMAL / p.bowling_overs, 2) ELSE 0 END AS economy,
  CASE WHEN p.bowling_wickets > 0 THEN ROUND((p.bowling_overs * 6)::DECIMAL / p.bowling_wickets, 2) ELSE 0 END AS bowling_average
FROM players p
JOIN teams t ON p.team_id = t.id
WHERE p.bowling_wickets > 0 AND p.is_active = true;

-- ============================================================
-- DONE
-- ============================================================
SELECT 'Cricket Platform database schema created successfully!' AS message;
