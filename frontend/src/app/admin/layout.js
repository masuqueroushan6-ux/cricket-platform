'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Trophy, Users, Swords, ChevronRight,
  LogOut, Shield, Menu, X, Activity, UserCog, FileText
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/tournaments', icon: Trophy, label: 'Tournaments' },
  { href: '/admin/teams', icon: Users, label: 'Teams & Players' },
  { href: '/admin/matches', icon: Swords, label: 'Matches' },
  { href: '/admin/scoring', icon: Activity, label: 'Live Scoring' },
];

const superAdminItems = [
  { href: '/admin/admins', icon: UserCog, label: 'Manage Admins' },
  { href: '/admin/audit', icon: FileText, label: 'Audit Logs' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [hydrated, isAuthenticated, router]);

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    logout();
    router.push('/auth/login');
  };

  if (!hydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pitch-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = user.role === 'super_admin';

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-ink-700">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🏏</span>
          <div className="leading-none">
            <div className="font-display font-bold text-white text-sm">Cricket</div>
            <div className="font-display font-bold text-pitch-400 text-sm">Platform</div>
          </div>
        </Link>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-ink-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pitch-600/40 to-ink-600 flex items-center justify-center text-sm font-bold text-pitch-400 border border-pitch-500/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <div className="flex items-center gap-1">
              <Shield size={10} className={isSuperAdmin ? 'text-gold-400' : 'text-pitch-400'} />
              <p className="text-xs text-ink-100 truncate">
                {isSuperAdmin ? 'Super Admin' : 'Tournament Admin'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              pathname === href || pathname.startsWith(href + '/')
                ? 'nav-item-active'
                : 'nav-item'
            )}
          >
            <Icon size={16} />
            <span>{label}</span>
            {(pathname === href || pathname.startsWith(href + '/')) && (
              <ChevronRight size={12} className="ml-auto" />
            )}
          </Link>
        ))}

        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-1 px-1">
              <p className="text-xs text-ink-300 font-semibold uppercase tracking-wider">Super Admin</p>
            </div>
            {superAdminItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  pathname === href ? 'nav-item-active' : 'nav-item'
                )}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-ink-700">
        <button
          onClick={handleLogout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-ink-900 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-ink-800 border-r border-ink-700 fixed h-full z-30">
        <NavContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-60 flex flex-col bg-ink-800 border-r border-ink-700 z-50 transition-transform duration-200 md:hidden',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-end p-4 md:hidden">
          <button onClick={() => setSidebarOpen(false)} className="text-ink-200 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <NavContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className="md:hidden sticky top-0 z-20 bg-ink-800/90 backdrop-blur-sm border-b border-ink-700 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-ink-200 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-base">🏏</span>
            <span className="font-display font-bold text-white text-sm">Cricket Platform</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-ink-600 flex items-center justify-center text-xs font-bold text-pitch-400">
            {user.name.charAt(0)}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
