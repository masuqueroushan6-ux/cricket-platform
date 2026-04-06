'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicAPI } from '@/lib/api';
import { Tournament, Match, Team } from '@/types';
import { cn, formatOvers, getMatchStatusColor, getMatchStatusLabel, formatDate } from '@/lib/utils';
import { ChevronLeft, Trophy } from 'lucide-react';

interface Props { params: { id: string } }

export default function TournamentPage({ params }: Props) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'points' | 'teams'>('matches');

  useEffect(() => {
    const load = async () => {
      try {
        const [tRes, mRes, teamRes] = await Promise.all([
          publicAPI.getTournament(params.id),
          publicAPI.getMatches(params.id),
          publicAPI.getTeams(params.id),
        ]);
        setTournament(tRes.data.data);
        setMatches(mRes.data.data || []);
        setTeams(teamRes.data.data || []);
      } catch { }
      finally { setLoading(false); }
    };
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <p className="text-white">Tournament not found. <Link href="/" className="text-pitch-400">Go Home</Link></p>
      </div>
    );
  }

  const liveMatches = matches.filter((m) => m.status === 'live' || m.status === 'innings_break');
  const upcomingMatches = matches.filter((m) => m.status === 'scheduled');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  const MatchCard = ({ m }: { m: Match }) => {
    const isLive = m.status === 'live' || m.status === 'innings_break';
    return (
      <Link href={`/match/${m.id}`}>
        <div className={cn('card-hover p-4', isLive && 'border-red-500/30')}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              <span className={cn('text-xs font-semibold', getMatchStatusColor(m.status))}>
                {getMatchStatusLabel(m.status)}
              </span>
            </div>
            <span className="text-xs text-ink-200">
              {m.match_number ? `Match ${m.match_number}` : m.match_type}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{m.team_a_short || m.team_a_name}</p>
              {m.status !== 'scheduled' && (
                <p className="font-display font-bold text-lg text-white tabular-nums">
                  {m.innings1_batting_team_id === m.team_a_id ? m.innings1_runs : m.innings2_runs}
                  <span className="text-ink-300 font-normal text-sm">
                    /{m.innings1_batting_team_id === m.team_a_id ? m.innings1_wickets : m.innings2_wickets}
                  </span>
                </p>
              )}
            </div>
            <span className="text-ink-300 font-bold text-xs">vs</span>
            <div className="text-right">
              <p className="font-semibold text-white">{m.team_b_short || m.team_b_name}</p>
              {m.status !== 'scheduled' && (
                <p className="font-display font-bold text-lg text-white tabular-nums">
                  {m.innings1_batting_team_id === m.team_b_id ? m.innings1_runs : m.innings2_runs}
                  <span className="text-ink-300 font-normal text-sm">
                    /{m.innings1_batting_team_id === m.team_b_id ? m.innings1_wickets : m.innings2_wickets}
                  </span>
                </p>
              )}
            </div>
          </div>
          {m.result_description && (
            <p className="text-xs text-pitch-400 font-medium mt-2">{m.result_description}</p>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-ink-900">
      <header className="sticky top-0 z-30 bg-ink-800/90 backdrop-blur-sm border-b border-ink-700 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-ink-200 hover:text-white"><ChevronLeft size={20} /></Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-200">{tournament.format} · {tournament.max_overs} overs</p>
            <p className="font-display font-bold text-white truncate">{tournament.name}</p>
          </div>
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border capitalize', {
            'text-pitch-400 bg-pitch-500/10 border-pitch-500/30': tournament.status === 'ongoing',
            'text-blue-400 bg-blue-500/10 border-blue-500/30': tournament.status === 'upcoming',
            'text-ink-100 bg-ink-700 border-ink-600': tournament.status === 'completed',
          })}>
            {tournament.status}
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Hero */}
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400/20 to-ink-600 flex items-center justify-center text-2xl shrink-0">
              🏆
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-xl text-white leading-tight">{tournament.name}</h1>
              {tournament.location && <p className="text-sm text-ink-200 mt-0.5">📍 {tournament.location}</p>}
              {tournament.description && <p className="text-sm text-ink-100 mt-2">{tournament.description}</p>}
              {tournament.prize_pool && (
                <p className="text-sm text-gold-400 font-semibold mt-1">🏆 Prize: {tournament.prize_pool}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Teams', value: teams.length },
              { label: 'Matches', value: matches.length },
              { label: 'Live', value: liveMatches.length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-ink-700/50 rounded-xl p-3 text-center">
                <p className="font-display font-bold text-xl text-white">{value}</p>
                <p className="text-xs text-ink-200">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live matches banner */}
        {liveMatches.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-red-400">Live Matches</h2>
            </div>
            {liveMatches.map((m) => <MatchCard key={m.id} m={m} />)}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-ink-800 border border-ink-700 rounded-xl p-1">
          {(['matches', 'points', 'teams'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                activeTab === tab ? 'bg-ink-600 text-white' : 'text-ink-200 hover:text-white')}>
              {tab === 'points' ? 'Points Table' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Matches */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            {upcomingMatches.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-ink-200 uppercase tracking-wide mb-2">Upcoming</h3>
                <div className="space-y-2">{upcomingMatches.map((m) => <MatchCard key={m.id} m={m} />)}</div>
              </div>
            )}
            {completedMatches.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-ink-200 uppercase tracking-wide mb-2">Completed</h3>
                <div className="space-y-2">{completedMatches.map((m) => <MatchCard key={m.id} m={m} />)}</div>
              </div>
            )}
            {matches.length === 0 && (
              <div className="card p-10 text-center text-ink-200 text-sm">No matches scheduled yet.</div>
            )}
          </div>
        )}

        {/* Points Table */}
        {activeTab === 'points' && (
          <div className="card overflow-hidden">
            {tournament.points_table && tournament.points_table.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th className="text-center">P</th>
                    <th className="text-center">W</th>
                    <th className="text-center">L</th>
                    <th className="text-center">Pts</th>
                    <th className="text-right">NRR</th>
                  </tr>
                </thead>
                <tbody>
                  {tournament.points_table.map((row) => (
                    <tr key={row.team_id} className={row.position <= 4 ? 'border-l-2 border-pitch-500' : ''}>
                      <td className="text-center font-bold text-ink-100">{row.position}</td>
                      <td className="font-semibold text-white">{row.team_name}</td>
                      <td className="text-center">{row.total_matches}</td>
                      <td className="text-center text-pitch-400 font-semibold">{row.wins}</td>
                      <td className="text-center text-red-400">{row.losses}</td>
                      <td className="text-center font-display font-bold text-white text-base">{row.points}</td>
                      <td className="text-right font-mono text-xs">
                        <span className={row.net_run_rate >= 0 ? 'text-pitch-400' : 'text-red-400'}>
                          {row.net_run_rate >= 0 ? '+' : ''}{Number(row.net_run_rate).toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center text-ink-200 text-sm">Points table will update after matches are played.</div>
            )}
          </div>
        )}

        {/* Teams */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teams.map((t) => (
              <Link key={t.id} href={`/team/${t.id}`}>
                <div className="card-hover p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pitch-600/30 to-ink-600 flex items-center justify-center font-display font-bold text-pitch-400">
                      {(t.short_name || t.name).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{t.name}</p>
                      <p className="text-xs text-ink-200">{t.player_count || 0} players · {t.wins}W {t.losses}L</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-white text-lg">{t.points}</p>
                      <p className="text-xs text-ink-200">pts</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {teams.length === 0 && (
              <div className="col-span-2 card p-10 text-center text-ink-200 text-sm">No teams yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
