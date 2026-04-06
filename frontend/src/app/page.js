'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicAPI } from '@/lib/api';
import { Match, Tournament } from '@/types';
import {
  cn, formatOvers, getMatchStatusColor, getMatchStatusLabel, formatDate
} from '@/lib/utils';

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-red-400 text-xs font-bold tracking-wider">LIVE</span>
    </span>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === 'live' || match.status === 'innings_break';
  const battingTeamId = match.current_batting_team_id;

  const score1 = {
    name: match.innings1_batting_team_id === match.team_a_id ? match.team_a_short || match.team_a_name : match.team_b_short || match.team_b_name,
    runs: match.innings1_runs,
    wickets: match.innings1_wickets,
    overs: match.innings1_overs,
    isBatting: battingTeamId === match.innings1_batting_team_id && match.current_innings === 1,
  };

  const score2 = match.innings2_batting_team_id ? {
    name: match.innings2_batting_team_id === match.team_a_id ? match.team_a_short || match.team_a_name : match.team_b_short || match.team_b_name,
    runs: match.innings2_runs,
    wickets: match.innings2_wickets,
    overs: match.innings2_overs,
    isBatting: match.current_innings === 2,
  } : null;

  return (
    <Link href={`/match/${match.id}`} className="block">
      <div className={cn(
        'card-hover p-4 group cursor-pointer',
        isLive && 'border-red-500/30 bg-gradient-to-br from-red-500/5 to-ink-800'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-ink-100 font-medium truncate">
            {match.tournament_name || 'Tournament'} {match.match_number ? `• Match ${match.match_number}` : ''}
          </span>
          {isLive ? (
            <LiveDot />
          ) : (
            <span className={cn('text-xs font-semibold', getMatchStatusColor(match.status))}>
              {getMatchStatusLabel(match.status)}
            </span>
          )}
        </div>

        {/* Scores */}
        <div className="space-y-2">
          {match.status === 'scheduled' ? (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-ink-600 flex items-center justify-center text-xs font-bold text-pitch-400">
                  {(match.team_a_short || match.team_a_name).charAt(0)}
                </div>
                <span className="font-semibold text-white">{match.team_a_name}</span>
              </div>
              <span className="text-ink-200 text-sm font-bold">vs</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{match.team_b_name}</span>
                <div className="w-8 h-8 rounded-full bg-ink-600 flex items-center justify-center text-xs font-bold text-pitch-400">
                  {(match.team_b_short || match.team_b_name).charAt(0)}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Innings 1 */}
              <div className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2',
                score1.isBatting ? 'bg-ink-600/60' : 'bg-transparent'
              )}>
                <div className="flex items-center gap-2">
                  {score1.isBatting && <span className="w-1.5 h-1.5 rounded-full bg-pitch-400" />}
                  <span className={cn(
                    'text-sm font-semibold',
                    score1.isBatting ? 'text-white' : 'text-ink-100'
                  )}>{score1.name}</span>
                </div>
                <span className={cn(
                  'font-display font-bold tabular-nums',
                  score1.isBatting ? 'text-white text-lg' : 'text-ink-100 text-base'
                )}>
                  {score1.runs}/{score1.wickets}
                  <span className="text-xs font-normal text-ink-200 ml-1">
                    ({formatOvers(score1.overs)})
                  </span>
                </span>
              </div>

              {/* Innings 2 */}
              {score2 && (
                <div className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2',
                  score2.isBatting ? 'bg-ink-600/60' : 'bg-transparent'
                )}>
                  <div className="flex items-center gap-2">
                    {score2.isBatting && <span className="w-1.5 h-1.5 rounded-full bg-pitch-400" />}
                    <span className={cn(
                      'text-sm font-semibold',
                      score2.isBatting ? 'text-white' : 'text-ink-100'
                    )}>{score2.name}</span>
                  </div>
                  <span className={cn(
                    'font-display font-bold tabular-nums',
                    score2.isBatting ? 'text-white text-lg' : 'text-ink-100 text-base'
                  )}>
                    {score2.runs}/{score2.wickets}
                    <span className="text-xs font-normal text-ink-200 ml-1">
                      ({formatOvers(score2.overs)})
                    </span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-ink-700 flex items-center justify-between">
          {match.result_description ? (
            <p className="text-xs text-pitch-400 font-medium truncate">{match.result_description}</p>
          ) : match.venue ? (
            <p className="text-xs text-ink-200 truncate">📍 {match.venue}</p>
          ) : match.scheduled_at ? (
            <p className="text-xs text-ink-200">{formatDate(match.scheduled_at)}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-pitch-500 group-hover:text-pitch-400 transition-colors ml-2 shrink-0">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function TournamentCard({ t }: { t: Tournament }) {
  const statusColors: Record<string, string> = {
    ongoing: 'text-pitch-400 bg-pitch-500/10 border-pitch-500/30',
    upcoming: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    completed: 'text-ink-100 bg-ink-700 border-ink-600',
  };

  return (
    <Link href={`/tournament/${t.id}`} className="block">
      <div className="card-hover p-5 group">
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pitch-600/30 to-ink-600 flex items-center justify-center text-xl">
            🏆
          </div>
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full border capitalize',
            statusColors[t.status] || statusColors.upcoming
          )}>
            {t.status}
          </span>
        </div>
        <h3 className="font-display font-bold text-white text-base mb-1 group-hover:text-pitch-400 transition-colors">
          {t.name}
        </h3>
        {t.location && (
          <p className="text-xs text-ink-200 mb-3">📍 {t.location}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-ink-100">
          <span>🏏 {t.team_count || 0} teams</span>
          <span>⚔️ {t.match_count || 0} matches</span>
          <span className="ml-auto text-pitch-500 group-hover:text-pitch-400">View →</span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [liveRes, tournRes] = await Promise.all([
          publicAPI.getLiveMatches(),
          publicAPI.getTournaments(),
        ]);
        setLiveMatches(liveRes.data.data || []);
        setTournaments(tournRes.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Refresh live matches every 30s
    const interval = setInterval(() => {
      publicAPI.getLiveMatches().then((r) => setLiveMatches(r.data.data || []));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-ink-900">
      {/* Header */}
      <header className="border-b border-ink-700 bg-ink-800/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🏏</span>
            <div>
              <span className="font-display font-bold text-white text-lg leading-none">Cricket</span>
              <span className="font-display font-bold text-pitch-400 text-lg leading-none">Platform</span>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/auth/login" className="btn-secondary">
              Admin Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 py-16 px-4">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-20 text-9xl">🏏</div>
          <div className="absolute bottom-5 right-20 text-8xl">🏆</div>
        </div>
        <div className="relative max-w-6xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Local Cricket,{' '}
            <span className="gradient-text">World-Class Management</span>
          </h1>
          <p className="text-ink-100 text-lg max-w-xl mx-auto">
            Live scores, ball-by-ball updates, player stats & leaderboards for your gully cricket tournaments.
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-ink-200 text-sm">Loading matches...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Live Matches */}
            {liveMatches.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="section-title">Live Now</h2>
                  <LiveDot />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveMatches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </section>
            )}

            {/* Tournaments */}
            <section>
              <h2 className="section-title mb-4">Tournaments</h2>
              {tournaments.length === 0 ? (
                <div className="card p-12 text-center">
                  <div className="text-5xl mb-3">🏏</div>
                  <p className="text-ink-200">No tournaments yet. Create one from the admin panel.</p>
                  <Link href="/auth/login" className="btn-primary mt-4 inline-block">
                    Admin Login
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tournaments.map((t) => (
                    <TournamentCard key={t.id} t={t} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-700 mt-16 py-8 text-center text-ink-200 text-sm">
        <p>🏏 Cricket Platform — Built for local tournaments</p>
      </footer>
    </div>
  );
}
