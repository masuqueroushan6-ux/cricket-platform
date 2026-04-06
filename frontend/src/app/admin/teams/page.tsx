'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Tournament, Team, Player } from '@/types';
import { cn } from '@/lib/utils';
import { Plus, ChevronDown, ChevronRight, User, Edit2, Trash2, X, Loader2 } from 'lucide-react';

const BATTING_STYLES = ['Right Hand', 'Left Hand'];
const BOWLING_STYLES = ['None', 'Right Arm Fast', 'Right Arm Medium', 'Right Arm Off Spin', 'Right Arm Leg Spin', 'Left Arm Fast', 'Left Arm Medium', 'Left Arm Orthodox', 'Left Arm Wrist Spin'];
const PLAYER_ROLES = ['Batsman', 'Bowler', 'All Rounder', 'Wicket Keeper'];

function TeamModal({ tournaments, onClose, onSaved }: { tournaments: Tournament[]; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tournament_id: tournaments[0]?.id || '', name: '', short_name: '', home_ground: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createTeam(form);
      toast.success('Team created');
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-ink-800 border border-ink-600 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <h2 className="font-display font-bold text-white">Add Team</h2>
          <button onClick={onClose}><X size={18} className="text-ink-200 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Tournament</label>
            <select className="input" value={form.tournament_id} onChange={(e) => set('tournament_id', e.target.value)} required>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Team Name *</label>
              <input className="input" placeholder="Mumbai Warriors" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="label">Short Name</label>
              <input className="input" placeholder="MW" maxLength={5} value={form.short_name} onChange={(e) => set('short_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Home Ground</label>
              <input className="input" placeholder="Azad Maidan" value={form.home_ground} onChange={(e) => set('home_ground', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 size={13} className="animate-spin" />} Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlayerModal({ team, onClose, onSaved }: { team: Team; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    team_id: team.id, tournament_id: team.tournament_id,
    name: '', jersey_number: '', batting_style: 'Right Hand',
    bowling_style: 'None', role: 'Batsman',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminAPI.createPlayer({ ...form, jersey_number: form.jersey_number ? Number(form.jersey_number) : undefined });
      toast.success('Player added');
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-ink-800 border border-ink-600 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <h2 className="font-display font-bold text-white">Add Player — {team.name}</h2>
          <button onClick={onClose}><X size={18} className="text-ink-200 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Player Name *</label>
              <input className="input" placeholder="Rohit Sharma" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="label">Jersey #</label>
              <input type="number" className="input" placeholder="7" min={1} max={99} value={form.jersey_number} onChange={(e) => set('jersey_number', e.target.value)} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => set('role', e.target.value)}>
                {PLAYER_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Batting Style</label>
            <select className="input" value={form.batting_style} onChange={(e) => set('batting_style', e.target.value)}>
              {BATTING_STYLES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bowling Style</label>
            <select className="input" value={form.bowling_style} onChange={(e) => set('bowling_style', e.target.value)}>
              {BOWLING_STYLES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 size={13} className="animate-spin" />} Add Player
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamRow({ team, onAddPlayer, onDelete, onRefresh }: { team: Team; onAddPlayer: (t: Team) => void; onDelete: (id: string) => void; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [players, setPlayers] = useState<Player[]>(team.players || []);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const toggleExpand = async () => {
    if (!expanded && players.length === 0) {
      setLoadingPlayers(true);
      try {
        const res = await adminAPI.getPlayers(team.id);
        setPlayers(res.data.data || []);
      } catch { }
      finally { setLoadingPlayers(false); }
    }
    setExpanded((v) => !v);
  };

  const deletePlayer = async (pid: string) => {
    if (!confirm('Remove player?')) return;
    try {
      await adminAPI.deletePlayer(pid);
      setPlayers((prev) => prev.filter((p) => p.id !== pid));
      toast.success('Player removed');
    } catch { toast.error('Failed'); }
  };

  const roleColor: Record<string, string> = {
    Batsman: 'text-blue-400', Bowler: 'text-red-400',
    'All Rounder': 'text-pitch-400', 'Wicket Keeper': 'text-yellow-400',
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-ink-700/30 transition-colors" onClick={toggleExpand}>
        <button className="text-ink-200">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pitch-600/30 to-ink-600 flex items-center justify-center font-display font-bold text-pitch-400">
          {(team.short_name || team.name).charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">{team.name}</p>
          <p className="text-xs text-ink-200">
            {team.short_name && <span className="mr-2 font-mono text-ink-100">{team.short_name}</span>}
            {team.player_count || 0} players
            {team.home_ground && ` · ${team.home_ground}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onAddPlayer(team); }}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
          >
            <Plus size={12} /> Player
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(team.id); }}
            className="p-2 rounded-lg hover:bg-red-500/10 text-ink-200 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-ink-700">
          {loadingPlayers ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-6">
              <User size={24} className="text-ink-500 mx-auto mb-2" />
              <p className="text-ink-200 text-sm">No players yet</p>
              <button onClick={() => onAddPlayer(team)} className="btn-primary mt-2 text-xs">
                Add Player
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-700/30">
                  <th className="px-4 py-2 text-left text-xs text-ink-200 font-medium">#</th>
                  <th className="px-4 py-2 text-left text-xs text-ink-200 font-medium">Name</th>
                  <th className="px-4 py-2 text-left text-xs text-ink-200 font-medium hidden sm:table-cell">Role</th>
                  <th className="px-4 py-2 text-left text-xs text-ink-200 font-medium hidden md:table-cell">Style</th>
                  <th className="px-4 py-2 text-right text-xs text-ink-200 font-medium">Runs</th>
                  <th className="px-4 py-2 text-right text-xs text-ink-200 font-medium">Wkts</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-t border-ink-700/50 hover:bg-ink-700/20">
                    <td className="px-4 py-2.5 text-ink-200 font-mono text-xs">{p.jersey_number || '–'}</td>
                    <td className="px-4 py-2.5 font-medium text-white">{p.name}</td>
                    <td className={cn('px-4 py-2.5 text-xs font-medium hidden sm:table-cell', roleColor[p.role] || 'text-ink-100')}>{p.role}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-200 hidden md:table-cell">{p.batting_style}</td>
                    <td className="px-4 py-2.5 text-right font-display font-semibold text-white">{p.batting_runs}</td>
                    <td className="px-4 py-2.5 text-right font-display font-semibold text-white">{p.bowling_wickets}</td>
                    <td className="px-2 py-2.5 text-right">
                      <button onClick={() => deletePlayer(p.id)} className="p-1.5 rounded hover:bg-red-500/10 text-ink-300 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamsPage() {
  const { user } = useAuthStore();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [playerTeam, setPlayerTeam] = useState<Team | null>(null);

  useEffect(() => {
    adminAPI.getTournaments().then((r) => {
      const t = r.data.data || [];
      setTournaments(t);
      if (t.length > 0) setSelectedTournament(t[0].id);
    });
  }, []);

  const loadTeams = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    try {
      const res = await adminAPI.getTeams(selectedTournament);
      setTeams(res.data.data || []);
    } catch { toast.error('Failed to load teams'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTeams(); }, [selectedTournament]);

  const deleteTeam = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    try {
      await adminAPI.deleteTeam(id);
      toast.success('Team deleted');
      loadTeams();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Teams & Players</h1>
          <p className="text-ink-200 text-sm mt-1">{teams.length} teams</p>
        </div>
        <button onClick={() => setShowTeamModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Add Team
        </button>
      </div>

      {/* Tournament filter */}
      {tournaments.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {tournaments.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTournament(t.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                selectedTournament === t.id
                  ? 'bg-pitch-500/20 text-pitch-400 border-pitch-500/30'
                  : 'bg-ink-700 text-ink-100 border-ink-600 hover:border-ink-400'
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="text-5xl mb-3">👥</div>
          <h3 className="font-display font-bold text-white text-lg mb-2">No Teams Yet</h3>
          <p className="text-ink-200 text-sm mb-4">Add teams to this tournament to get started.</p>
          <button onClick={() => setShowTeamModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={14} /> Add Team
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((t) => (
            <TeamRow
              key={t.id}
              team={t}
              onAddPlayer={(team) => setPlayerTeam(team)}
              onDelete={deleteTeam}
              onRefresh={loadTeams}
            />
          ))}
        </div>
      )}

      {showTeamModal && (
        <TeamModal
          tournaments={tournaments}
          onClose={() => setShowTeamModal(false)}
          onSaved={loadTeams}
        />
      )}
      {playerTeam && (
        <PlayerModal
          team={playerTeam}
          onClose={() => setPlayerTeam(null)}
          onSaved={loadTeams}
        />
      )}
    </div>
  );
}
