'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { adminAPI, publicAPI } from '@/lib/api';
import { Match, Player, BallInput, Ball } from '@/types';
import { cn, formatOvers, calcRunRate, calcRequiredRunRate, ballLabel, ballClass } from '@/lib/utils';
import { ChevronLeft, Loader2, RotateCcw } from 'lucide-react';

const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket', 'retired_out'];
const EXTRA_TYPES = ['wide', 'no_ball', 'bye', 'leg_bye'];

function BallButton({ label, value, selected, onClick, variant = 'default' }: {
  label: string; value: number | string; selected?: boolean; onClick: () => void;
  variant?: 'default' | 'four' | 'six' | 'wicket' | 'extra';
}) {
  const base = 'w-14 h-14 rounded-xl font-display font-bold text-lg border-2 transition-all active:scale-95 cursor-pointer select-none';
  const variants = {
    default: selected ? 'bg-ink-500 border-pitch-500 text-white shadow-lg shadow-pitch-500/20' : 'bg-ink-700 border-ink-600 text-white hover:border-ink-400',
    four: selected ? 'bg-blue-500/30 border-blue-400 text-blue-300' : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:border-blue-400',
    six: selected ? 'bg-pitch-500/30 border-pitch-400 text-pitch-300' : 'bg-pitch-500/10 border-pitch-500/30 text-pitch-400 hover:border-pitch-400',
    wicket: selected ? 'bg-red-500/30 border-red-400 text-red-300' : 'bg-red-500/10 border-red-500/30 text-red-400 hover:border-red-400',
    extra: selected ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300' : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400 hover:border-yellow-400',
  };
  return (
    <button type="button" onClick={onClick} className={cn(base, variants[variant])}>
      {label}
    </button>
  );
}

export default function ScoringPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const matchId = searchParams.get('match');

  const [match, setMatch] = useState<Match | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [players, setPlayers] = useState<{ batting: Player[]; bowling: Player[] }>({ batting: [], bowling: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Toss state
  const [tossWinnerId, setTossWinnerId] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');

  // Ball input
  const [ball, setBall] = useState<BallInput>({
    runs_off_bat: 0, extras: 0, extra_type: null,
    is_wicket: false, wicket_type: null,
    dismissed_player_id: null, fielder_id: null,
    batsman_id: '', bowler_id: '', commentary: '',
  });

  const setB = (k: keyof BallInput, v: unknown) => setBall((b) => ({ ...b, [k]: v }));

  const loadMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await publicAPI.getMatch(matchId);
      const data = res.data.data;
      setMatch(data.match);
      setBalls(data.balls || []);

      // Pre-fill current batsmen/bowler
      if (data.match.striker_id) setB('batsman_id', data.match.striker_id);
      if (data.match.current_bowler_id) setB('bowler_id', data.match.current_bowler_id);

      // Load players for both teams
      const battingTeamId = data.match.current_batting_team_id;
      const bowlingTeamId = battingTeamId === data.match.team_a_id ? data.match.team_b_id : data.match.team_a_id;

      if (battingTeamId && bowlingTeamId) {
        const [batRes, bowlRes] = await Promise.all([
          publicAPI.getPlayers(battingTeamId),
          publicAPI.getPlayers(bowlingTeamId),
        ]);
        setPlayers({ batting: batRes.data.data || [], bowling: bowlRes.data.data || [] });
      } else if (data.match.team_a_id) {
        const [aRes, bRes] = await Promise.all([
          publicAPI.getPlayers(data.match.team_a_id),
          publicAPI.getPlayers(data.match.team_b_id),
        ]);
        setPlayers({ batting: aRes.data.data || [], bowling: bRes.data.data || [] });
      }
    } catch { toast.error('Failed to load match'); }
    finally { setLoading(false); }
  }, [matchId]);

  useEffect(() => { loadMatch(); }, [loadMatch]);

  // Toss submission
  const handleToss = async () => {
    if (!tossWinnerId) return toast.error('Select toss winner');
    try {
      const res = await adminAPI.recordToss(matchId!, { toss_winner_id: tossWinnerId, toss_decision: tossDecision });
      setMatch(res.data.data);
      toast.success('Toss recorded — Match is LIVE!');
    } catch { toast.error('Failed to record toss'); }
  };

  // Ball submission
  const handleAddBall = async () => {
    if (!ball.batsman_id) return toast.error('Select batsman');
    if (!ball.bowler_id) return toast.error('Select bowler');
    if (ball.is_wicket && !ball.wicket_type) return toast.error('Select wicket type');

    setSubmitting(true);
    try {
      const res = await adminAPI.addBall(matchId!, ball);
      setMatch(res.data.data);
      toast.success(
        ball.is_wicket ? '🎯 WICKET!' :
        ball.runs_off_bat === 6 ? '💥 SIX!' :
        ball.runs_off_bat === 4 ? '🏏 FOUR!' : 'Ball recorded'
      );

      // Reset non-persistent fields
      setBall((b) => ({
        ...b,
        runs_off_bat: 0, extras: 0, extra_type: null,
        is_wicket: false, wicket_type: null,
        dismissed_player_id: null, fielder_id: null, commentary: '',
      }));

      await loadMatch();

      if (res.data.inningsOver && match?.current_innings === 1) {
        toast.success('Innings 1 complete! Start Innings 2 when ready.');
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to record ball');
    } finally { setSubmitting(false); }
  };

  const handleStartInnings2 = async () => {
    try {
      const res = await adminAPI.startInnings2(matchId!);
      setMatch(res.data.data);
      toast.success('Innings 2 started!');
      await loadMatch();
    } catch { toast.error('Failed to start innings 2'); }
  };

  if (!matchId) {
    return (
      <div className="text-center py-20">
        <p className="text-ink-200">No match selected. <Link href="/admin/matches" className="text-pitch-400">Go to Matches</Link></p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) return <div className="text-center py-20 text-ink-200">Match not found.</div>;

  const currentInningsRuns = match.current_innings === 1 ? match.innings1_runs : match.innings2_runs;
  const currentInningsWickets = match.current_innings === 1 ? match.innings1_wickets : match.innings2_wickets;
  const currentOvers = match.current_innings === 1 ? match.innings1_overs : match.innings2_overs;
  const runRate = calcRunRate(currentInningsRuns, currentOvers);
  const target = match.current_innings === 2 ? match.innings1_runs + 1 : null;
  const remainingOvers = target ? match.total_overs - currentOvers : null;
  const rrr = target && remainingOvers ? calcRequiredRunRate(target, currentInningsRuns, remainingOvers) : null;

  // Last 6 balls of current over
  const currentOverBalls = balls.filter((b) => b.innings === match.current_innings && b.over_number === match.current_over);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/matches" className="btn-ghost p-2">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="font-display font-bold text-xl text-white">
            {match.team_a_name} vs {match.team_b_name}
          </h1>
          <p className="text-xs text-ink-200">{match.total_overs} overs · {match.venue || 'No venue'}</p>
        </div>
        <div className="ml-auto">
          {match.status === 'live' && (
            <span className="badge-live"><span className="live-dot" /> LIVE</span>
          )}
          {match.status === 'completed' && (
            <span className="badge-completed">Completed</span>
          )}
        </div>
      </div>

      {/* ── TOSS PANEL ────────────────────────────────────────────── */}
      {match.status === 'scheduled' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-display font-bold text-white text-lg">🪙 Record Toss</h2>
          <div>
            <label className="label">Toss Won By</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ id: match.team_a_id, name: match.team_a_name }, { id: match.team_b_id, name: match.team_b_name }].map((t) => (
                <button key={t.id} type="button" onClick={() => setTossWinnerId(t.id)}
                  className={cn('py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all',
                    tossWinnerId === t.id ? 'border-pitch-500 bg-pitch-500/10 text-pitch-400' : 'border-ink-600 bg-ink-700 text-white hover:border-ink-400')}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Elected To</label>
            <div className="grid grid-cols-2 gap-3">
              {(['bat', 'bowl'] as const).map((d) => (
                <button key={d} type="button" onClick={() => setTossDecision(d)}
                  className={cn('py-3 px-4 rounded-xl border-2 font-semibold text-sm capitalize transition-all',
                    tossDecision === d ? 'border-pitch-500 bg-pitch-500/10 text-pitch-400' : 'border-ink-600 bg-ink-700 text-white hover:border-ink-400')}>
                  {d === 'bat' ? '🏏 Bat First' : '⚾ Bowl First'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleToss} disabled={!tossWinnerId} className="btn-primary w-full py-3 text-base">
            Start Match →
          </button>
        </div>
      )}

      {/* ── INNINGS BREAK ──────────────────────────────────────────── */}
      {match.status === 'innings_break' && (
        <div className="card p-6 text-center space-y-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="text-4xl">🔄</div>
          <h2 className="font-display font-bold text-white text-xl">Innings Break</h2>
          <div className="bg-ink-700/50 rounded-xl p-4">
            <p className="text-ink-200 text-sm mb-1">1st Innings Score</p>
            <p className="font-display font-bold text-3xl text-white">
              {match.innings1_runs}/{match.innings1_wickets}
              <span className="text-lg text-ink-200 font-normal ml-2">({formatOvers(match.innings1_overs)} ov)</span>
            </p>
            <p className="text-pitch-400 font-semibold mt-2">
              Target: {match.innings1_runs + 1} runs
            </p>
          </div>
          <button onClick={handleStartInnings2} className="btn-primary w-full py-3 text-base">
            Start Innings 2 →
          </button>
        </div>
      )}

      {/* ── MATCH COMPLETED ────────────────────────────────────────── */}
      {match.status === 'completed' && (
        <div className="card p-6 text-center border-pitch-500/30 bg-pitch-500/5">
          <div className="text-4xl mb-3">🏆</div>
          <h2 className="font-display font-bold text-white text-xl mb-1">Match Completed</h2>
          {match.result_description && (
            <p className="text-pitch-400 font-semibold">{match.result_description}</p>
          )}
          <Link href="/admin/matches" className="btn-primary mt-4 inline-block">Back to Matches</Link>
        </div>
      )}

      {/* ── LIVE SCORING ───────────────────────────────────────────── */}
      {match.status === 'live' && (
        <>
          {/* Scoreboard */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-ink-200 font-medium">Innings {match.current_innings}</span>
              <button onClick={loadMatch} className="text-ink-300 hover:text-white">
                <RotateCcw size={14} />
              </button>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display font-bold text-5xl text-white tabular-nums score-animate">
                  {currentInningsRuns}
                  <span className="text-3xl text-ink-300">/{currentInningsWickets}</span>
                </p>
                <p className="text-ink-200 text-sm mt-1">
                  {formatOvers(currentOvers)} / {match.total_overs} ov
                  <span className="ml-3 text-ink-100">CRR: <strong className="text-white">{runRate}</strong></span>
                </p>
              </div>
              {target && (
                <div className="text-right">
                  <p className="text-ink-200 text-xs">Target</p>
                  <p className="font-display font-bold text-2xl text-pitch-400">{target}</p>
                  <p className="text-xs text-ink-200">Need {target - currentInningsRuns} in {formatOvers(remainingOvers || 0)} ov</p>
                  <p className="text-xs text-red-400">RRR: <strong>{rrr}</strong></p>
                </div>
              )}
            </div>

            {/* Current over balls */}
            <div className="mt-4 pt-4 border-t border-ink-700">
              <p className="text-xs text-ink-200 mb-2">Over {match.current_over + 1} — This over</p>
              <div className="flex gap-1.5 flex-wrap">
                {currentOverBalls.length === 0 ? (
                  <span className="text-xs text-ink-400 italic">No balls yet</span>
                ) : (
                  currentOverBalls.map((b, i) => (
                    <div key={i} className={cn('ball-dot', ballClass(b.runs_off_bat, b.extras, b.extra_type, b.is_wicket))}>
                      {ballLabel(b.runs_off_bat, b.extras, b.extra_type, b.is_wicket)}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Batsmen/Bowler quick-select */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <label className="label">🏏 Striker</label>
              <select className="input" value={ball.batsman_id} onChange={(e) => setB('batsman_id', e.target.value)}>
                <option value="">Select batsman</option>
                {players.batting.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.jersey_number ? `#${p.jersey_number}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="card p-4">
              <label className="label">⚾ Bowler</label>
              <select className="input" value={ball.bowler_id} onChange={(e) => setB('bowler_id', e.target.value)}>
                <option value="">Select bowler</option>
                {players.bowling.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.jersey_number ? `#${p.jersey_number}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scoring pad */}
          <div className="card p-5 space-y-5">
            <h3 className="font-display font-semibold text-white">Score This Ball</h3>

            {/* Runs */}
            <div>
              <p className="label mb-2">Runs Off Bat</p>
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                  <BallButton key={r} label={String(r)} value={r}
                    selected={ball.runs_off_bat === r && !ball.is_wicket && !ball.extra_type}
                    variant={r === 4 ? 'four' : r === 6 ? 'six' : 'default'}
                    onClick={() => { setB('runs_off_bat', r); setB('is_wicket', false); setB('extra_type', null); setB('extras', 0); }}
                  />
                ))}
              </div>
            </div>

            {/* Wicket toggle */}
            <div className="flex items-center gap-4">
              <button type="button"
                onClick={() => { setB('is_wicket', !ball.is_wicket); if (!ball.is_wicket) { setB('extra_type', null); setB('extras', 0); } }}
                className={cn('px-5 py-2.5 rounded-xl border-2 font-bold text-sm transition-all',
                  ball.is_wicket
                    ? 'border-red-400 bg-red-500/20 text-red-300'
                    : 'border-ink-600 bg-ink-700 text-white hover:border-red-500/50')}>
                {ball.is_wicket ? '🎯 WICKET ✓' : '🎯 Wicket'}
              </button>

              {ball.is_wicket && (
                <select className="input flex-1" value={ball.wicket_type || ''} onChange={(e) => setB('wicket_type', e.target.value)}>
                  <option value="">Select wicket type</option>
                  {WICKET_TYPES.map((w) => <option key={w} value={w} className="capitalize">{w}</option>)}
                </select>
              )}
            </div>

            {ball.is_wicket && (
              <div>
                <label className="label">Dismissed Player</label>
                <select className="input" value={ball.dismissed_player_id || ''} onChange={(e) => setB('dismissed_player_id', e.target.value)}>
                  <option value="">Select dismissed player</option>
                  {players.batting.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {/* Extras */}
            <div>
              <p className="label mb-2">Extras</p>
              <div className="flex gap-2 flex-wrap">
                {EXTRA_TYPES.map((ext) => (
                  <button key={ext} type="button"
                    onClick={() => {
                      const same = ball.extra_type === ext;
                      setB('extra_type', same ? null : ext);
                      setB('extras', same ? 0 : 1);
                      setB('is_wicket', false);
                      setB('runs_off_bat', 0);
                    }}
                    className={cn('px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all capitalize',
                      ball.extra_type === ext
                        ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300'
                        : 'border-ink-600 bg-ink-700 text-ink-100 hover:border-yellow-500/40')}>
                    {ext === 'no_ball' ? 'No Ball' : ext === 'leg_bye' ? 'Leg Bye' : ext.charAt(0).toUpperCase() + ext.slice(1)}
                  </button>
                ))}
                {ball.extra_type && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-200">Extra runs:</span>
                    <input type="number" className="input w-16 text-center" min={1} max={6}
                      value={ball.extras} onChange={(e) => setB('extras', Number(e.target.value))} />
                  </div>
                )}
              </div>
            </div>

            {/* Commentary */}
            <div>
              <label className="label">Commentary (optional)</label>
              <input className="input" placeholder="e.g. Driven through covers for a boundary"
                value={ball.commentary} onChange={(e) => setB('commentary', e.target.value)} />
            </div>

            {/* Preview & Submit */}
            <div className="bg-ink-700/50 rounded-xl p-3 text-sm text-ink-100">
              <span className="font-medium text-white">Ball preview: </span>
              {ball.is_wicket ? '🎯 WICKET' : ''}
              {ball.extra_type ? ` ${ball.extra_type.toUpperCase()} +${ball.extras}` : ''}
              {!ball.is_wicket && !ball.extra_type ? ` ${ball.runs_off_bat} runs` : ''}
            </div>

            <button
              onClick={handleAddBall}
              disabled={submitting || !ball.batsman_id || !ball.bowler_id}
              className={cn(
                'w-full py-4 rounded-xl font-display font-bold text-lg transition-all flex items-center justify-center gap-2',
                submitting || !ball.batsman_id || !ball.bowler_id
                  ? 'bg-ink-700 text-ink-300 border border-ink-600 cursor-not-allowed'
                  : ball.is_wicket
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                  : ball.runs_off_bat === 6
                  ? 'bg-pitch-600 hover:bg-pitch-500 text-white shadow-lg shadow-pitch-500/20'
                  : 'bg-pitch-700 hover:bg-pitch-600 text-white'
              )}
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
              {submitting ? 'Recording...' : '✓ Record Ball'}
            </button>
          </div>

          {/* Last 10 balls history */}
          {balls.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-white text-sm mb-3">Recent Balls</h3>
              <div className="space-y-1">
                {[...balls].reverse().slice(0, 10).map((b) => (
                  <div key={b.id} className="flex items-center gap-3 text-xs text-ink-100 py-1.5 border-b border-ink-700/50 last:border-0">
                    <span className={cn('ball-dot w-7 h-7 text-xs shrink-0', ballClass(b.runs_off_bat, b.extras, b.extra_type, b.is_wicket))}>
                      {ballLabel(b.runs_off_bat, b.extras, b.extra_type, b.is_wicket)}
                    </span>
                    <span className="text-ink-300">Ov {b.over_number}.{b.ball_number}</span>
                    {b.batsman_name && <span className="text-white">{b.batsman_name}</span>}
                    {b.commentary && <span className="text-ink-200 truncate">{b.commentary}</span>}
                    <span className="ml-auto font-display font-bold text-white">{b.total_runs}/{b.total_wickets}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
