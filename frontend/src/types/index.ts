// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'tournament_admin';
  phone?: string;
  is_active: boolean;
  totp_enabled?: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type LoginStep =
  | 'credentials'
  | 'verify_otp'
  | 'verify_totp'
  | 'setup_totp';

// ─── Tournament ───────────────────────────────────────────────────────────────
export interface Tournament {
  id: string;
  name: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  format: 'T20' | 'ODI' | 'Test' | 'T10' | 'Custom';
  max_overs: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  banner_url?: string;
  prize_pool?: string;
  rules?: string;
  created_by: string;
  created_by_name?: string;
  team_count?: number;
  match_count?: number;
  admin_count?: number;
  created_at: string;
  points_table?: PointsRow[];
}

export interface PointsRow {
  team_id: string;
  team_name: string;
  short_name?: string;
  total_matches: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  net_run_rate: number;
  position: number;
}

// ─── Team & Player ────────────────────────────────────────────────────────────
export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  home_ground?: string;
  captain_id?: string;
  captain_name?: string;
  total_matches: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  net_run_rate: number;
  player_count?: number;
  players?: Player[];
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  tournament_id: string;
  name: string;
  jersey_number?: number;
  batting_style: string;
  bowling_style: string;
  role: 'Batsman' | 'Bowler' | 'All Rounder' | 'Wicket Keeper';
  photo_url?: string;
  is_active: boolean;
  // Stats
  batting_runs: number;
  batting_innings: number;
  batting_balls: number;
  batting_fours: number;
  batting_sixes: number;
  batting_highest_score: number;
  batting_fifties: number;
  batting_hundreds: number;
  batting_not_outs: number;
  bowling_overs: number;
  bowling_runs: number;
  bowling_wickets: number;
  bowling_best_figures?: string;
  bowling_maidens: number;
}

// ─── Match ────────────────────────────────────────────────────────────────────
export type MatchStatus =
  | 'scheduled'
  | 'toss'
  | 'live'
  | 'innings_break'
  | 'completed'
  | 'abandoned'
  | 'postponed';

export interface Match {
  id: string;
  tournament_id: string;
  tournament_name?: string;
  team_a_id: string;
  team_b_id: string;
  team_a_name: string;
  team_b_name: string;
  team_a_short?: string;
  team_b_short?: string;
  match_number?: number;
  match_type: string;
  total_overs: number;
  venue?: string;
  scheduled_at?: string;
  status: MatchStatus;
  toss_winner_id?: string;
  toss_winner_name?: string;
  toss_decision?: 'bat' | 'bowl';
  // Innings 1
  innings1_batting_team_id?: string;
  innings1_runs: number;
  innings1_wickets: number;
  innings1_overs: number;
  innings1_extras: number;
  // Innings 2
  innings2_batting_team_id?: string;
  innings2_runs: number;
  innings2_wickets: number;
  innings2_overs: number;
  innings2_extras: number;
  // Current state
  current_innings: 1 | 2;
  current_batting_team_id?: string;
  striker_id?: string;
  striker_name?: string;
  non_striker_id?: string;
  non_striker_name?: string;
  current_bowler_id?: string;
  current_bowler_name?: string;
  current_over: number;
  current_ball: number;
  // Result
  result?: string;
  winner_id?: string;
  winner_name?: string;
  win_margin?: number;
  win_type?: string;
  result_description?: string;
  created_at: string;
  updated_at: string;
}

export interface Ball {
  id: string;
  match_id: string;
  innings: 1 | 2;
  over_number: number;
  ball_number: number;
  batsman_id?: string;
  batsman_name?: string;
  bowler_id?: string;
  bowler_name?: string;
  runs_off_bat: number;
  extras: number;
  extra_type?: string;
  is_wicket: boolean;
  wicket_type?: string;
  dismissed_name?: string;
  commentary?: string;
  total_runs: number;
  total_wickets: number;
  created_at: string;
}

export interface BallInput {
  runs_off_bat: number;
  extras: number;
  extra_type?: string | null;
  is_wicket: boolean;
  wicket_type?: string | null;
  dismissed_player_id?: string | null;
  fielder_id?: string | null;
  batsman_id?: string;
  bowler_id?: string;
  commentary?: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { msg: string; param: string }[];
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface SystemStats {
  total_tournaments: number;
  active_tournaments: number;
  total_admins: number;
  total_teams: number;
  total_players: number;
  total_matches: number;
  live_matches: number;
  completed_matches: number;
}
