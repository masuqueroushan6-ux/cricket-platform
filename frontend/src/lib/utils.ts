import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatOvers(overs: number): string {
  const fullOvers = Math.floor(overs);
  const balls = Math.round((overs - fullOvers) * 10);
  return `${fullOvers}.${balls}`;
}

export function calcRunRate(runs: number, overs: number): string {
  if (overs <= 0) return '0.00';
  return (runs / overs).toFixed(2);
}

export function calcRequiredRunRate(target: number, currentRuns: number, remainingOvers: number): string {
  const needed = target - currentRuns;
  if (remainingOvers <= 0 || needed <= 0) return '0.00';
  return (needed / remainingOvers).toFixed(2);
}

export function getMatchStatusColor(status: string): string {
  switch (status) {
    case 'live': return 'text-red-400';
    case 'innings_break': return 'text-yellow-400';
    case 'completed': return 'text-pitch-400';
    case 'scheduled': return 'text-ink-100';
    case 'toss': return 'text-blue-400';
    default: return 'text-ink-200';
  }
}

export function getMatchStatusLabel(status: string): string {
  switch (status) {
    case 'live': return 'LIVE';
    case 'innings_break': return 'INNINGS BREAK';
    case 'completed': return 'COMPLETED';
    case 'scheduled': return 'UPCOMING';
    case 'toss': return 'TOSS';
    case 'abandoned': return 'ABANDONED';
    default: return status.toUpperCase();
  }
}

export function ballLabel(runsOffBat: number, extras: number, extraType: string | null | undefined, isWicket: boolean): string {
  if (isWicket) return 'W';
  if (extraType === 'wide') return `Wd${extras > 1 ? `+${extras - 1}` : ''}`;
  if (extraType === 'no_ball') return `Nb${runsOffBat > 0 ? `+${runsOffBat}` : ''}`;
  if (extraType === 'bye') return `B${extras}`;
  if (extraType === 'leg_bye') return `Lb${extras}`;
  return String(runsOffBat);
}

export function ballClass(runsOffBat: number, extras: number, extraType: string | null | undefined, isWicket: boolean): string {
  if (isWicket) return 'bg-red-500/20 text-red-400 border-red-500/40';
  if (extraType === 'wide' || extraType === 'no_ball') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  if (runsOffBat === 6) return 'bg-pitch-500/20 text-pitch-400 border-pitch-500/40';
  if (runsOffBat === 4) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  if (runsOffBat === 0) return 'bg-ink-600 text-ink-100 border-ink-500';
  return 'bg-ink-500 text-white border-ink-400';
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function getStrikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 100).toFixed(1);
}

export function getBowlingEconomy(runs: number, overs: number): string {
  if (overs === 0) return '0.00';
  return (runs / overs).toFixed(2);
}
