'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI, superAdminAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Tournament } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { Plus, Edit2, Trash2, Trophy, X, Loader2 } from 'lucide-react';

const FORMATS = ['T20', 'ODI', 'Test', 'T10', 'Custom'];
const STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'];

function TournamentModal({
  tournament,
  onClose,
  onSaved,
}: {
  tournament?: Tournament;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: tournament?.name || '',
    description: tournament?.description || '',
    location: tournament?.location || '',
    start_date: tournament?.start_date?.split('T')[0] || '',
    end_date: tournament?.end_date?.split('T')[0] || '',
    format: tournament?.format || 'T20',
    max_overs: tournament?.max_overs || 20,
    prize_pool: tournament?.prize_pool || '',
    rules: tournament?.rules || '',
    status: tournament?.status || 'upcoming',
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      if (tournament) {
        await adminAPI.updateTournament(tournament.id, form);
        toast.success('Tournament updated');
      } else {
        await superAdminAPI.createTournament(form);
        toast.success('Tournament created');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-ink-800 border border-ink-600 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <h2 className="font-display font-bold text-white">
            {tournament ? 'Edit Tournament' : 'Create Tournament'}
          </h2>
          <button onClick={onClose} className="text-ink-200 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Tournament Name *</label>
            <input className="input" placeholder="e.g. Gully Premier League 2025" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input h-20 resize-none" placeholder="Tournament description..." value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="City / Ground" value={form.location} onChange={(e) => set('location', e.target.value)} />
            </div>
            <div>
              <label className="label">Prize Pool</label>
              <input className="input" placeholder="₹10,000" value={form.prize_pool} onChange={(e) => set('prize_pool', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Format</label>
              <select className="input" value={form.format} onChange={(e) => set('format', e.target.value)}>
                {FORMATS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Overs</label>
              <input type="number" className="input" min={1} max={50} value={form.max_overs} onChange={(e) => set('max_overs', Number(e.target.value))} />
            </div>
          </div>
          {tournament && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {tournament ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TournamentsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tournament | undefined>();

  const load = async () => {
    try {
      const res = await adminAPI.getTournaments();
      setTournaments(res.data.data || []);
    } catch {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tournament? This cannot be undone.')) return;
    try {
      await superAdminAPI.deleteTournament(id);
      toast.success('Tournament deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      ongoing: 'badge-live',
      upcoming: 'badge-upcoming',
      completed: 'badge-completed',
    };
    return map[s] || 'badge-upcoming';
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Tournaments</h1>
          <p className="text-ink-200 text-sm mt-1">{tournaments.length} tournament(s)</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => { setEditing(undefined); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> New Tournament
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card p-16 text-center">
          <Trophy size={48} className="text-ink-500 mx-auto mb-4" />
          <h3 className="font-display font-bold text-white text-lg mb-2">No Tournaments Yet</h3>
          <p className="text-ink-200 text-sm mb-5">Create your first tournament to get started.</p>
          {isSuperAdmin && (
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={14} /> Create Tournament
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tournaments.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold-400/20 to-ink-600 flex items-center justify-center text-xl">
                    🏆
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white leading-tight">{t.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(statusBadge(t.status))}>
                        {t.status === 'ongoing' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                        {t.status}
                      </span>
                      <span className="text-xs text-ink-200">{t.format} • {t.max_overs} ov</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditing(t); setShowModal(true); }}
                    className="p-2 rounded-lg hover:bg-ink-700 text-ink-100 hover:text-white transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-ink-100 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {t.location && <p className="text-xs text-ink-200 mb-3">📍 {t.location}</p>}

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center bg-ink-700/50 rounded-lg p-2">
                  <p className="font-display font-bold text-white text-lg">{t.team_count || 0}</p>
                  <p className="text-xs text-ink-200">Teams</p>
                </div>
                <div className="text-center bg-ink-700/50 rounded-lg p-2">
                  <p className="font-display font-bold text-white text-lg">{t.match_count || 0}</p>
                  <p className="text-xs text-ink-200">Matches</p>
                </div>
                <div className="text-center bg-ink-700/50 rounded-lg p-2">
                  <p className="font-display font-bold text-white text-lg">{t.admin_count || 0}</p>
                  <p className="text-xs text-ink-200">Admins</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-ink-200 pt-2 border-t border-ink-700">
                <span>Created {formatDate(t.created_at)}</span>
                {t.prize_pool && <span className="text-gold-400 font-medium">🏆 {t.prize_pool}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TournamentModal
          tournament={editing}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
          onSaved={load}
        />
      )}
    </div>
  );
}
