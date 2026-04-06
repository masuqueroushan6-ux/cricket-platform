'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { superAdminAPI, adminAPI, publicAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { SystemStats, Match, Tournament } from '@/types';
import { cn, formatOvers } from '@/lib/utils';
import { Trophy, Users, Swords, Activity, TrendingUp, Plus } from 'lucide-react';

function StatCard({ label, value, icon, color, href }: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  href?: string;
}) {
  const content = (
    <div className={cn('card p-5 group', href && 'card-hover cursor-pointer')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ink-100 font-medium uppercase tracking-wide mb-2">{label}</p>
          <p className="font-display font-bold text-3xl text-white tabular-nums">{value}</p>
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', color)}>
          {icon}
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function LiveMatchRow({ match }: { match: Match }) {
  return (
    <Link href={`/match/${match.id}`} className="block">
      <div className="flex items-center gap-3 py-3 border-b border-ink-700 last:border-0 hover:bg-ink-700/30 -mx-2 px-2 rounded-lg transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400 font-bold">LIVE</span>
          </div>
          <p className="text-sm font-semibold text-white truncate">
            {match.team_a_name} vs {match.team_b_name}
          </p>
          {match.tournament_name && (
            <p className="text-xs text-ink-200 truncate">{match.tournament_name}</p>
          )}
        </div>
        <div className="text-right text-xs">
          {match.current_innings === 1 ? (
            <p className="font-display font-bold text-white">
              {match.innings1_runs}/{match.innings1_wickets}
              <span className="text-ink-200 font-normal ml-1">({formatOvers(match.innings1_overs)})</span>
            </p>
          ) : (
            <div>
              <p className="font-display font-bold text-white">
                {match.innings2_runs}/{match.innings2_wickets}
              </p>
              <p className="text-ink-200">{formatOvers(match.innings2_overs)} ov</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [liveRes, tournRes] = await Promise.all([
          publicAPI.getLiveMatches(),
          adminAPI.getTournaments(),
        ]);
        setLiveMatches(liveRes.data.data || []);
        setTournaments(tournRes.data.data || []);

        if (isSuperAdmin) {
          const statsRes = await superAdminAPI.getStats();
          setStats(statsRes.data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const adminTournaments = tournaments.filter((t) => t.status !== 'cancelled');

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-ink-200 text-sm mt-1">
            {isSuperAdmin ? 'Super Admin — Full system control' : 'Tournament Admin Dashboard'}
          </p>
        </div>
        {isSuperAdmin && (
          <Link href="/admin/tournaments" className="btn-primary flex items-center gap-2">
            <Plus size={14} />
            New Tournament
          </Link>
        )}
      </div>

      {/* Stats grid — super admin only */}
      {isSuperAdmin && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Tournaments"
            value={stats.total_tournaments}
            icon={<Trophy size={20} />}
            color="bg-gold-400/10 text-gold-400"
            href="/admin/tournaments"
          />
          <StatCard
            label="Admins"
            value={stats.total_admins}
            icon={<Users size={20} />}
            color="bg-blue-500/10 text-blue-400"
            href="/admin/admins"
          />
          <StatCard
            label="Teams"
            value={stats.total_teams}
            icon={<Users size={20} />}
            color="bg-pitch-500/10 text-pitch-400"
            href="/admin/teams"
          />
          <StatCard
            label="Live Matches"
            value={stats.live_matches}
            icon={<Activity size={20} />}
            color="bg-red-500/10 text-red-400"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live matches */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Matches
              </h2>
              <Link href="/admin/matches" className="text-xs text-pitch-400 hover:text-pitch-300">
                All matches →
              </Link>
            </div>
            {liveMatches.length === 0 ? (
              <div className="text-center py-8">
                <Swords size={32} className="text-ink-400 mx-auto mb-2" />
                <p className="text-ink-200 text-sm">No live matches right now</p>
                <Link href="/admin/matches" className="btn-primary mt-3 inline-flex items-center gap-2 text-xs">
                  <Plus size={12} /> Schedule Match
                </Link>
              </div>
            ) : (
              <div>
                {liveMatches.map((m) => (
                  <LiveMatchRow key={m.id} match={m} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My tournaments */}
        <div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-white flex items-center gap-2">
                <Trophy size={16} className="text-gold-400" />
                My Tournaments
              </h2>
              {isSuperAdmin && (
                <Link href="/admin/tournaments" className="text-xs text-pitch-400 hover:text-pitch-300">
                  Manage →
                </Link>
              )}
            </div>

            {adminTournaments.length === 0 ? (
              <div className="text-center py-8">
                <Trophy size={32} className="text-ink-400 mx-auto mb-2" />
                <p className="text-ink-200 text-sm">No tournaments assigned</p>
                {isSuperAdmin && (
                  <Link href="/admin/tournaments" className="btn-primary mt-3 inline-flex items-center gap-2 text-xs">
                    <Plus size={12} /> Create Tournament
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {adminTournaments.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/matches?tournament=${t.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-ink-700/50 hover:bg-ink-700 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-pitch-400 transition-colors">
                        {t.name}
                      </p>
                      <p className="text-xs text-ink-200 mt-0.5 capitalize">{t.status}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-200 shrink-0 ml-2">
                      <TrendingUp size={12} />
                      <span>{t.match_count || 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
