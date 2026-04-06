'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { superAdminAPI, adminAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { User, Tournament } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { Plus, X, Loader2, Shield, ToggleLeft, ToggleRight, Trash2, UserCog } from 'lucide-react';

interface AdminWithTournaments extends User {
  tournaments: { id: string; name: string; status: string }[];
}

function CreateAdminModal({ tournaments, onClose, onSaved }: {
  tournaments: Tournament[]; onClose: () => void; onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', tournament_id: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await superAdminAPI.createAdmin(form);
      toast.success(`Admin created! Temp password: ${res.data.tempPassword}`);
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create admin');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-ink-800 border border-ink-600 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <h2 className="font-display font-bold text-white">Create Tournament Admin</h2>
          <button onClick={onClose}><X size={18} className="text-ink-200 hover:text-white" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" placeholder="John Doe" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Email Address *</label>
            <input type="email" className="input" placeholder="admin@email.com" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input type="tel" className="input" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Assign to Tournament (optional)</label>
            <select className="input" value={form.tournament_id} onChange={(e) => set('tournament_id', e.target.value)}>
              <option value="">— Select tournament —</option>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400">
            ⚠️ A temporary password will be generated and emailed to the admin. They must change it after first login.
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 size={13} className="animate-spin" />} Create Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminCard({ admin, onToggle, onDelete }: {
  admin: AdminWithTournaments;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn('card p-5', !admin.is_active && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border',
            admin.is_active ? 'bg-pitch-500/10 text-pitch-400 border-pitch-500/20' : 'bg-ink-700 text-ink-200 border-ink-600'
          )}>
            {admin.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{admin.name}</p>
              <Shield size={12} className={admin.is_active ? 'text-pitch-400' : 'text-ink-400'} />
            </div>
            <p className="text-xs text-ink-200">{admin.email}</p>
            {admin.phone && <p className="text-xs text-ink-300">{admin.phone}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onToggle}
            className={cn('p-2 rounded-lg transition-colors', admin.is_active
              ? 'hover:bg-yellow-500/10 text-pitch-400 hover:text-yellow-400'
              : 'hover:bg-pitch-500/10 text-ink-300 hover:text-pitch-400')}>
            {admin.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-500/10 text-ink-300 hover:text-red-400 transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Tournaments */}
      <div className="mt-4">
        {admin.tournaments && admin.tournaments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {admin.tournaments.map((t) => (
              <span key={t.id} className="text-xs bg-ink-700 border border-ink-600 text-ink-100 px-2 py-0.5 rounded-full">
                🏆 {t.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-300 italic">No tournaments assigned</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-ink-300 pt-2 border-t border-ink-700">
        <span>Created {formatDate(admin.created_at)}</span>
        {admin.last_login_at && (
          <span>Last login: {formatDate(admin.last_login_at)}</span>
        )}
        <span className={cn('font-medium', admin.is_active ? 'text-pitch-400' : 'text-red-400')}>
          {admin.is_active ? '● Active' : '○ Inactive'}
        </span>
      </div>
    </div>
  );
}

export default function AdminsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [admins, setAdmins] = useState<AdminWithTournaments[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      router.push('/admin/dashboard');
      return;
    }
    load();
  }, [user]);

  const load = async () => {
    try {
      const [adminsRes, tournRes] = await Promise.all([
        superAdminAPI.getAdmins(),
        adminAPI.getTournaments(),
      ]);
      setAdmins(adminsRes.data.data || []);
      setTournaments(tournRes.data.data || []);
    } catch { toast.error('Failed to load admins'); }
    finally { setLoading(false); }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await superAdminAPI.toggleAdmin(id);
      const updated = res.data.data;
      setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, is_active: updated.is_active } : a));
      toast.success(updated.is_active ? 'Admin activated' : 'Admin deactivated');
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this admin? They will lose access to all tournaments.')) return;
    try {
      await superAdminAPI.deleteAdmin(id);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      toast.success('Admin deleted');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <UserCog size={22} className="text-pitch-400" /> Manage Admins
          </h1>
          <p className="text-ink-200 text-sm mt-1">{admins.length} tournament admin(s)</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Create Admin
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : admins.length === 0 ? (
        <div className="card p-16 text-center">
          <UserCog size={44} className="text-ink-500 mx-auto mb-3" />
          <h3 className="font-display font-bold text-white text-lg mb-2">No Tournament Admins</h3>
          <p className="text-ink-200 text-sm mb-5">Create admins and assign them to tournaments.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={14} /> Create Admin
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {admins.map((a) => (
            <AdminCard
              key={a.id}
              admin={a}
              onToggle={() => handleToggle(a.id)}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateAdminModal
          tournaments={tournaments}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
