'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import { Tournament, Team, Match } from '@/types';
import { cn, formatOvers, getMatchStatusLabel, getMatchStatusColor, formatDateTime } from '@/lib/utils';
import { Plus, X, Loader2, Swords, Activity } from 'lucide-react';

const MATCH_TYPES = ['league', 'quarter_final', 'semi_final', 'final', 'practice'];

function CreateMatchModal({ tournaments, onClose, onSaved }: {
  tournaments: Tournament[]; onClose: () => void; onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState({
    tournament_id: tournaments[0]?.id || '',
    team_a_id: '', team_b_id: '',
    total_overs: 20, venue: '',
    scheduled_at: '', match_type: 'league', match_number: '',
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.tournament_id) {
      adminAPI.getTeams(form.tournament_id).then((r) => setTeams(r.data.data || []));
    }
  }, [form.tournament_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.team_a_id || !form.team_b_id) return toast.error('Select both teams');
    if (form.team_a_id === form.team_b_id) return toast.error('Teams must be different');
    setLoading(true);
    try {
      await adminAPI.createMatch({
        ...form,
        match_number: form.match_number ? Number(form.match_number) : undefined,
        scheduled_at: form.scheduled_at || undefined,
      });
      toast.success('Match scheduled');
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-ink-800 border border-ink-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <h2 className="font-display font-bold text-white">Schedule Match</h2>
          <button onClick={onClose}><X size={18} className="text-ink-200 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Tournament</label>
            <select className="input" value={form.tournament_id} onChange={(e) => { set('tournament_id', e.target.value); set('team_a_id', ''); set('team_b_id', ''); }}>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Team A</label>
              <select className="input" value={form.team_a_id} onChange={(e) => set('team_a_id', e.target.value)} required>
                <option value="">Select Team A</option>
                {teams.filter((t) => t.id !== form.team_b_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Team B</label>
              <select className="input" value={form.team_b_id} onChange={(e) => set('team_b_id', e.target.value)} required>
                <option value="">Select Team B</option>
                {teams.filter((t) => t.id !== form.team_a_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Overs</label>
              <input type="number" className="input" min={1} max={50} value={form.total_overs} onChange={(e) => set('total_overs', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Match Type</label>
              <select className="input" value={form.match_type} onChange={(e) => set('match_type', e.target.value)}>
                {MATCH_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Venue</label>
              <input className="input" placeholder="Ground name" value={form.venue} onChange={(e) => set('venue', e.target.value)} />
            </div>
            <div>
              <label className="label">Match No.</label>
              <input type="number" className="input" placeholder="1" value={form.match_number} onChange={(e) => set('match_number', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Scheduled Date & Time</label>
            <input type="datetime-local" className="input" value={form.scheduled_at} onChange={(e) => set('scheduled_at', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 size={13} className="animate-spin" />} Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MatchRow({ match }: { match: Match }) {
  const isLive = match.status === 'live' || match.status === 'innings_break';

  return (
    <div className={cn('card p-4', isLive && 'border-red-500/30')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Status + meta */}
          <div className="flex items-center gap-2 mb-2">
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            <span className={cn('text-xs font-bold', getMatchStatusColor(match.status))}>
              {getMatchStatusLabel(match.status)}
            </span>
            {match.match_number && <span className="text-xs text-ink-200">· Match {match.match_number}</span>}
            {match.match_type !== 'league' && (
              <span className="text-xs text-gold-400 capitalize">· {match.match_type.replace('_', ' ')}</span>
            )}
          </div>

          {/* Teams */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="font-display font-bold text-white">{match.team_a_short || match.team_a_name}</p>
              {match.status !== 'scheduled' && (
                <p className="font-display font-bold text-lg text-white tabular-nums">
                  {match.innings1_batting_team_id === match.team_a_id ? match.innings1_runs : match.innings2_runs}
                  <span className="text-ink-200 font-normal text-sm">
                    /{match.innings1_batting_team_id === match.team_a_id ? match.innings1_wickets : match.innings2_wickets}
                  </span>
                </p>
              )}
            </div>
            <div className="text-ink-400 font-bold text-sm px-2">vs</div>
            <div className="text-center">
              <p className="font-display font-bold text-white">{match.team_b_short || match.team_b_name}</p>
              {match.status !== 'scheduled' && (
                <p className="font-display font-bold text-lg text-white tabular-nums">
                  {match.innings1_batting_team_id === match.team_b_id ? match.innings1_runs : match.innings2_runs}
                  <span className="text-ink-200 font-normal text-sm">
                    /{match.innings1_batting_team_id === match.team_b_id ? match.innings1_wickets : match.innings2_wickets}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 mt-2 text-xs text-ink-200">
            {match.venue && <span>📍 {match.venue}</span>}
            {match.scheduled_at && <span>🕐 {formatDateTime(match.scheduled_at)}</span>}
            {match.total_overs && <span>⚾ {match.total_overs} overs</span>}
          </div>

          {match.result_description && (
            <p className="text-xs text-pitch-400 font-medium mt-1">{match.result_description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {(match.status === 'scheduled' || match.status === 'toss') && (
            <Link href={`/admin/scoring?match=${match.id}`} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Activity size={12} /> Score
            </Link>
          )}
          {isLive && (
            <Link href={`/admin/scoring?match=${match.id}`} className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </Link>
          )}
          <Link href={`/match/${match.id}`} className="btn-secondary text-xs py-1.5 px-3 text-center">
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    adminAPI.getTournaments().then((r) => {
      const t = r.data.data || [];
      setTournaments(t);
      if (t.length > 0) setSelectedTournament(t[0].id);
    });
  }, []);

  const loadMatches = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    try {
      const res = await adminAPI.getMatches(selectedTournament);
      setMatches(res.data.data || []);
    } catch { toast.error('Failed to load matches'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadMatches(); }, [selectedTournament]);

  const filtered = filter === 'all' ? matches : matches.filter((m) => {
    if (filter === 'live') return m.status === 'live' || m.status === 'innings_break';
    return m.status === filter;
  });

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'live', label: '🔴 Live' },
    { key: 'scheduled', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Matches</h1>
          <p className="text-ink-200 text-sm mt-1">{matches.length} total</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Schedule Match
        </button>
      </div>

      {/* Tournament tabs */}
      {tournaments.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {tournaments.map((t) => (
            <button key={t.id} onClick={() => setSelectedTournament(t.id)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                selectedTournament === t.id
                  ? 'bg-pitch-500/20 text-pitch-400 border-pitch-500/30'
                  : 'bg-ink-700 text-ink-100 border-ink-600 hover:border-ink-400')}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-1 bg-ink-800 border border-ink-700 rounded-xl p-1 w-fit">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn('px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
              filter === key ? 'bg-ink-600 text-white' : 'text-ink-200 hover:text-white')}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Swords size={40} className="text-ink-500 mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">No matches found</p>
          <p className="text-ink-200 text-sm mb-4">Schedule your first match to get started.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={14} /> Schedule Match
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => <MatchRow key={m.id} match={m} />)}
        </div>
      )}

      {showModal && (
        <CreateMatchModal tournaments={tournaments} onClose={() => setShowModal(false)} onSaved={loadMatches} />
      )}
    </div>
  );
}
