'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { publicAPI } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { Match, Ball } from '@/types';
import { cn, formatOvers, calcRunRate, calcRequiredRunRate, ballLabel, ballClass, formatDateTime } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

interface MatchPageProps { params: { id: string } }

interface MatchData {
  match: Match;
  balls: Ball[];
  batting: unknown[];
  bowling: unknown[];
}

interface BatPerf {
  player_name: string;
  batting_runs: number;
  batting_balls: number;
  batting_fours: number;
  batting_sixes: number;
  batting_not_out: boolean;
  batting_dismissal: string;
  batting_position: number;
  innings: number;
}

interface BowlPerf {
  player_name: string;
  bowling_overs: number;
  bowling_runs: number;
  bowling_wickets: number;
  bowling_maidens: number;
  innings: number;
}

export default function MatchPage({ params }: MatchPageProps) {
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'balls'>('scorecard');
  const { joinMatch, leaveMatch, onMatchUpdate, onBall } = useSocket();

  const loadMatch = useCallback(async () => {
    try {
      const res = await publicAPI.getMatch(params.id);
      setData(res.data.data);
    } catch { }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => {
    loadMatch();
    joinMatch(params.id);

    const offUpdate = onMatchUpdate((updated) => {
      setData((prev) => prev ? { ...prev, match: updated as Match } : null);
    });
    const offBall = onBall((ballData) => {
      const bd = ballData as { ball: Ball; match: Match };
      setData((prev) => {
        if (!prev) return null;
        return { ...prev, match: bd.match, balls: [...prev.balls, bd.ball] };
      });
    });

    return () => {
      leaveMatch(params.id);
      offUpdate();
      offBall();
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-3">Match not found</p>
          <Link href="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  const { match, balls, batting, bowling } = data;
  const isLive = match.status === 'live' || match.status === 'innings_break';

  const innings1Runs = match.innings1_runs;
  const innings2Runs = match.innings2_runs;
  const target = match.current_innings === 2 ? match.innings1_runs + 1 : null;
  const remainingOvers = target ? match.total_overs - match.innings2_overs : null;
  const rrr = target && remainingOvers ? calcRequiredRunRate(target, innings2Runs, remainingOvers) : null;

  const batPerf = batting as BatPerf[];
  const bowlPerf = bowling as BowlPerf[];

  const innings1Batting = batPerf.filter((b) => b.innings === 1).sort((a, b) => a.batting_position - b.batting_position);
  const innings2Batting = batPerf.filter((b) => b.innings === 2).sort((a, b) => a.batting_position - b.batting_position);
  const innings1Bowling = bowlPerf.filter((b) => b.innings === 1);
  const innings2Bowling = bowlPerf.filter((b) => b.innings === 2);

  // Group balls by over
  const ballsByOver = balls.reduce((acc, b) => {
    const key = `${b.innings}-${b.over_number}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {} as Record<string, Ball[]>);

  return (
    <div className="min-h-screen bg-ink-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-ink-800/90 backdrop-blur-sm border-b border-ink-700 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-ink-200 hover:text-white">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-200 truncate">{match.tournament_name || 'Cricket Platform'}</p>
            <p className="font-display font-bold text-white text-sm truncate">
              {match.team_a_name} vs {match.team_b_name}
            </p>
          </div>
          {isLive && (
            <span className="badge-live shrink-0">
              <span className="live-dot" /> LIVE
            </span>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Main Scoreboard */}
        <div className={cn('card p-5', isLive && 'border-red-500/20 bg-gradient-to-br from-red-500/3 to-transparent')}>
          {/* Match info */}
          {match.venue && <p className="text-xs text-ink-200 mb-3">📍 {match.venue}</p>}
          {match.scheduled_at && match.status === 'scheduled' && (
            <p className="text-xs text-ink-200 mb-3">🕐 {formatDateTime(match.scheduled_at)}</p>
          )}

          {/* Toss */}
          {match.toss_winner_name && (
            <p className="text-xs text-ink-100 mb-3">
              🪙 {match.toss_winner_name} won the toss and elected to <strong className="text-white">{match.toss_decision}</strong> first
            </p>
          )}

          {/* Team scores */}
          <div className="space-y-3">
            {/* Innings 1 */}
            <div className={cn('flex items-center justify-between p-4 rounded-xl',
              match.current_innings === 1 && isLive ? 'bg-ink-600/60' : 'bg-ink-700/30'
            )}>
              <div>
                <div className="flex items-center gap-2">
                  {match.current_innings === 1 && isLive && (
                    <span className="w-2 h-2 rounded-full bg-pitch-400 animate-pulse" />
                  )}
                  <span className="font-semibold text-white">
                    {match.innings1_batting_team_id === match.team_a_id ? match.team_a_name : match.team_b_name || '—'}
                  </span>
                </div>
                <p className="text-xs text-ink-200 mt-0.5">
                  {formatOvers(match.innings1_overs)} / {match.total_overs} ov
                  {match.innings1_extras > 0 && ` · Extras: ${match.innings1_extras}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-3xl text-white tabular-nums">
                  {match.innings1_runs}
                  <span className="text-xl text-ink-300">/{match.innings1_wickets}</span>
                </p>
                <p className="text-xs text-ink-200">
                  CRR: {calcRunRate(match.innings1_runs, match.innings1_overs)}
                </p>
              </div>
            </div>

            {/* Innings 2 */}
            {match.innings2_batting_team_id && (
              <div className={cn('flex items-center justify-between p-4 rounded-xl',
                match.current_innings === 2 && isLive ? 'bg-ink-600/60' : 'bg-ink-700/30'
              )}>
                <div>
                  <div className="flex items-center gap-2">
                    {match.current_innings === 2 && isLive && (
                      <span className="w-2 h-2 rounded-full bg-pitch-400 animate-pulse" />
                    )}
                    <span className="font-semibold text-white">
                      {match.innings2_batting_team_id === match.team_a_id ? match.team_a_name : match.team_b_name}
                    </span>
                  </div>
                  <p className="text-xs text-ink-200 mt-0.5">
                    {formatOvers(match.innings2_overs)} / {match.total_overs} ov
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-3xl text-white tabular-nums">
                    {match.innings2_runs}
                    <span className="text-xl text-ink-300">/{match.innings2_wickets}</span>
                  </p>
                  {target && (
                    <p className="text-xs text-red-400">Need {target - innings2Runs} · RRR: {rrr}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Target / Result */}
          {target && match.status !== 'completed' && (
            <div className="mt-3 bg-pitch-500/5 border border-pitch-500/20 rounded-lg px-4 py-2.5 text-sm">
              <span className="text-ink-200">Target: </span>
              <span className="font-display font-bold text-pitch-400">{target}</span>
              <span className="text-ink-200 ml-3">Need </span>
              <span className="font-bold text-white">{target - innings2Runs}</span>
              <span className="text-ink-200"> in </span>
              <span className="font-bold text-white">{formatOvers(remainingOvers || 0)}</span>
              <span className="text-ink-200"> overs</span>
            </div>
          )}

          {match.status === 'completed' && match.result_description && (
            <div className="mt-3 bg-pitch-500/10 border border-pitch-500/30 rounded-lg px-4 py-3 text-center">
              <p className="text-pitch-400 font-semibold">🏆 {match.result_description}</p>
            </div>
          )}

          {/* Live: current batsmen */}
          {isLive && match.striker_name && (
            <div className="mt-4 pt-4 border-t border-ink-700 grid grid-cols-2 gap-3">
              <div className="bg-ink-700/50 rounded-lg p-3">
                <p className="text-xs text-ink-200 mb-0.5">🏏 Striker</p>
                <p className="font-semibold text-white text-sm">{match.striker_name}</p>
              </div>
              {match.non_striker_name && (
                <div className="bg-ink-700/50 rounded-lg p-3">
                  <p className="text-xs text-ink-200 mb-0.5">Non-striker</p>
                  <p className="font-semibold text-white text-sm">{match.non_striker_name}</p>
                </div>
              )}
              {match.current_bowler_name && (
                <div className="bg-ink-700/50 rounded-lg p-3">
                  <p className="text-xs text-ink-200 mb-0.5">⚾ Bowler</p>
                  <p className="font-semibold text-white text-sm">{match.current_bowler_name}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-ink-800 border border-ink-700 rounded-xl p-1">
          {(['scorecard', 'balls'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                activeTab === tab ? 'bg-ink-600 text-white' : 'text-ink-200 hover:text-white')}>
              {tab === 'balls' ? 'Ball by Ball' : 'Scorecard'}
            </button>
          ))}
        </div>

        {/* Scorecard Tab */}
        {activeTab === 'scorecard' && (
          <div className="space-y-4">
            {/* Innings 1 batting */}
            {innings1Batting.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 bg-ink-700/50 border-b border-ink-700">
                  <h3 className="font-semibold text-white text-sm">
                    {match.innings1_batting_team_id === match.team_a_id ? match.team_a_name : match.team_b_name} — Batting
                  </h3>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Batsman</th>
                      <th className="text-right">R</th>
                      <th className="text-right">B</th>
                      <th className="text-right">4s</th>
                      <th className="text-right">6s</th>
                      <th className="text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {innings1Batting.map((b, i) => (
                      <tr key={i}>
                        <td>
                          <p className="font-medium text-white">{b.player_name}</p>
                          {b.batting_dismissal && <p className="text-xs text-ink-200">{b.batting_dismissal}</p>}
                        </td>
                        <td className="text-right font-display font-bold text-white">{b.batting_runs}{b.batting_not_out ? '*' : ''}</td>
                        <td className="text-right">{b.batting_balls}</td>
                        <td className="text-right">{b.batting_fours}</td>
                        <td className="text-right">{b.batting_sixes}</td>
                        <td className="text-right">
                          {b.batting_balls ? ((b.batting_runs / b.batting_balls) * 100).toFixed(1) : '0.0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Bowling */}
                {innings1Bowling.length > 0 && (
                  <>
                    <div className="px-4 py-3 bg-ink-700/30 border-t border-b border-ink-700">
                      <h4 className="text-xs font-semibold text-ink-100 uppercase tracking-wide">Bowling</h4>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Bowler</th>
                          <th className="text-right">O</th>
                          <th className="text-right">M</th>
                          <th className="text-right">R</th>
                          <th className="text-right">W</th>
                          <th className="text-right">Eco</th>
                        </tr>
                      </thead>
                      <tbody>
                        {innings1Bowling.map((b, i) => (
                          <tr key={i}>
                            <td className="font-medium text-white">{b.player_name}</td>
                            <td className="text-right">{b.bowling_overs}</td>
                            <td className="text-right">{b.bowling_maidens}</td>
                            <td className="text-right">{b.bowling_runs}</td>
                            <td className="text-right font-display font-bold text-pitch-400">{b.bowling_wickets}</td>
                            <td className="text-right">{b.bowling_overs ? (b.bowling_runs / b.bowling_overs).toFixed(2) : '0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}

            {/* Innings 2 batting */}
            {innings2Batting.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 bg-ink-700/50 border-b border-ink-700">
                  <h3 className="font-semibold text-white text-sm">
                    {match.innings2_batting_team_id === match.team_a_id ? match.team_a_name : match.team_b_name} — Batting
                  </h3>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Batsman</th>
                      <th className="text-right">R</th>
                      <th className="text-right">B</th>
                      <th className="text-right">4s</th>
                      <th className="text-right">6s</th>
                      <th className="text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {innings2Batting.map((b, i) => (
                      <tr key={i}>
                        <td>
                          <p className="font-medium text-white">{b.player_name}{b.batting_not_out ? '*' : ''}</p>
                          {b.batting_dismissal && <p className="text-xs text-ink-200">{b.batting_dismissal}</p>}
                        </td>
                        <td className="text-right font-display font-bold text-white">{b.batting_runs}</td>
                        <td className="text-right">{b.batting_balls}</td>
                        <td className="text-right">{b.batting_fours}</td>
                        <td className="text-right">{b.batting_sixes}</td>
                        <td className="text-right">
                          {b.batting_balls ? ((b.batting_runs / b.batting_balls) * 100).toFixed(1) : '0.0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {innings1Batting.length === 0 && innings2Batting.length === 0 && (
              <div className="card p-10 text-center text-ink-200 text-sm">
                Scorecard will appear once the match starts.
              </div>
            )}
          </div>
        )}

        {/* Ball by Ball Tab */}
        {activeTab === 'balls' && (
          <div className="space-y-3">
            {Object.keys(ballsByOver).length === 0 ? (
              <div className="card p-10 text-center text-ink-200 text-sm">
                Ball by ball data will appear once scoring begins.
              </div>
            ) : (
              Object.entries(ballsByOver).reverse().map(([key, overBalls]) => {
                const [innings, overNum] = key.split('-');
                return (
                  <div key={key} className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-ink-100 uppercase">
                        Inn {innings} · Over {parseInt(overNum) + 1}
                      </span>
                      <div className="flex gap-1 ml-auto">
                        {overBalls.map((b, i) => (
                          <div key={i} className={cn('ball-dot w-7 h-7 text-xs', ballClass(b.runs_off_bat, b.extras, b.extra_type, b.is_wicket))}>
                            {ballLabel(b.runs_off_bat, b.extras, b.extra_type, b.is_wicket)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {overBalls.map((b) => (
                        <div key={b.id} className="flex items-start gap-2 text-xs">
                          <span className={cn('ball-dot w-6 h-6 text-xs shrink-0', ballClass(b.runs_off_bat, b.extras, b.extra_type, b.is_wicket))}>
                            {ballLabel(b.runs_off_bat, b.extras, b.extra_type, b.is_wicket)}
                          </span>
                          <div className="flex-1">
                            <span className="text-ink-200">{overNum}.{b.ball_number} </span>
                            {b.batsman_name && <span className="text-white font-medium">{b.batsman_name} </span>}
                            {b.bowler_name && <span className="text-ink-200">b. {b.bowler_name} </span>}
                            {b.is_wicket && b.dismissed_name && (
                              <span className="text-red-400 font-medium">OUT: {b.dismissed_name} ({b.wicket_type})</span>
                            )}
                            {b.commentary && <span className="text-ink-300 italic"> — {b.commentary}</span>}
                          </div>
                          <span className="text-ink-100 font-display font-semibold shrink-0">{b.total_runs}/{b.total_wickets}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
