'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Eye, EyeOff, Loader2, ShieldCheck, Smartphone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'credentials' | 'verify_otp' | 'verify_totp' | 'setup_totp';

interface SetupTOTPData {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, setPendingOTP, setPendingTOTP, setPendingTOTPSetup } = useAuthStore();

  const [step, setStep] = useState<Step>('credentials');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP (6 boxes)
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [pendingUserId, setPendingUserId] = useState('');

  // TOTP
  const [totpCode, setTotpCode] = useState('');
  const [pendingToken, setPendingTokenLocal] = useState('');
  const [setupData, setSetupData] = useState<SetupTOTPData | null>(null);
  const [setupToken, setSetupToken] = useState('');

  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  // ─── Step 1: Login with email + password ─────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { data } = await authAPI.login(email, password);
      if (data.step === 'verify_otp') {
        setPendingUserId(data.userId);
        setPendingOTP(data.userId);
        setStep('verify_otp');
        toast.success(`OTP sent to ${email}`);
      } else if (data.step === 'verify_totp') {
        setPendingTokenLocal(data.pendingToken);
        setPendingTOTP(data.pendingToken);
        setStep('verify_totp');
      } else if (data.step === 'setup_totp') {
        setSetupToken(data.setupToken);
        setPendingTOTPSetup(data.setupToken);
        // Fetch QR
        const qrRes = await authAPI.setupTOTP(data.setupToken);
        setSetupData(qrRes.data);
        setStep('setup_totp');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP box input handler ────────────────────────────────────────────────────
  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    if (value && !/\d/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ─── Step 2a: Verify Email OTP ────────────────────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return toast.error('Enter all 6 digits');
    setLoading(true);
    try {
      const { data } = await authAPI.verifyOTP(pendingUserId, code);
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Welcome back!');
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid OTP';
      toast.error(msg);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    try {
      await authAPI.resendOTP(pendingUserId);
      setResendCooldown(120);
      setOtp(['', '', '', '', '', '']);
      toast.success('New OTP sent!');
    } catch {
      toast.error('Failed to resend OTP');
    }
  };

  // ─── Step 2b: Verify TOTP ─────────────────────────────────────────────────────
  const handleVerifyTOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) return toast.error('Enter 6-digit code from authenticator');
    setLoading(true);
    try {
      const token = pendingToken || setupToken;
      const { data } = await authAPI.verifyTOTP(totpCode, token);
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Welcome, Super Admin!');
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid code';
      toast.error(msg);
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 flex items-center justify-center px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pitch-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="text-3xl">🏏</span>
            <span className="font-display font-bold text-2xl text-white">Cricket Platform</span>
          </Link>
          <p className="text-ink-200 text-sm">Tournament Management System</p>
        </div>

        <div className="card p-7 shadow-2xl">
          {/* ── Credentials Step ─────────────────────────────────────────── */}
          {step === 'credentials' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-white">Admin Login</h2>
                <p className="text-ink-200 text-sm mt-1">Sign in to manage your tournaments</p>
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-200 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="text-xs text-ink-200 text-center pt-2 space-y-1">
                <p className="flex items-center justify-center gap-1.5">
                  <Smartphone size={12} className="text-pitch-400" />
                  Super Admin: Email + Password → Google Authenticator
                </p>
                <p className="flex items-center justify-center gap-1.5">
                  <Mail size={12} className="text-blue-400" />
                  Tournament Admin: Email + Password → Email OTP
                </p>
              </div>
            </form>
          )}

          {/* ── Email OTP Step ─────────────────────────────────────────────── */}
          {step === 'verify_otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fade-in">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail size={26} className="text-blue-400" />
                </div>
                <h2 className="font-display font-bold text-xl text-white">Check Your Email</h2>
                <p className="text-ink-200 text-sm mt-2">
                  Enter the 6-digit OTP sent to<br />
                  <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              {/* OTP boxes */}
              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className={cn(
                      'w-11 h-12 text-center text-lg font-bold font-mono rounded-lg border bg-ink-700 text-white transition-all',
                      digit ? 'border-pitch-500 ring-1 ring-pitch-500/30' : 'border-ink-500 focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/30',
                      'outline-none'
                    )}
                    value={digit}
                    onChange={(e) => handleOTPChange(i, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length !== 6}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-center text-sm">
                {resendCooldown > 0 ? (
                  <p className="text-ink-200">Resend in {resendCooldown}s</p>
                ) : (
                  <button type="button" onClick={handleResendOTP} className="text-pitch-400 hover:text-pitch-300">
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="w-full text-xs text-ink-200 hover:text-white text-center"
              >
                ← Back to login
              </button>
            </form>
          )}

          {/* ── Setup TOTP Step ────────────────────────────────────────────── */}
          {step === 'setup_totp' && setupData && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-pitch-500/10 border border-pitch-500/20 flex items-center justify-center mx-auto mb-4">
                  <Smartphone size={26} className="text-pitch-400" />
                </div>
                <h2 className="font-display font-bold text-xl text-white">Setup Authenticator</h2>
                <p className="text-ink-200 text-sm mt-2">
                  Super Admin requires Google Authenticator.<br />Scan the QR code below.
                </p>
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setupData.qrCode} alt="TOTP QR Code" className="w-44 h-44" />
                </div>
              </div>

              <div className="bg-ink-700 rounded-lg p-3 text-center">
                <p className="text-xs text-ink-200 mb-1">Manual key (if QR doesn&apos;t work)</p>
                <p className="font-mono text-xs text-pitch-400 break-all">{setupData.secret}</p>
              </div>

              <form onSubmit={handleVerifyTOTP} className="space-y-4">
                <div>
                  <label className="label">6-digit code from authenticator</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="input text-center text-2xl font-mono tracking-[0.5em]"
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Verify & Complete Setup
                </button>
              </form>
            </div>
          )}

          {/* ── Verify TOTP Step ───────────────────────────────────────────── */}
          {step === 'verify_totp' && (
            <form onSubmit={handleVerifyTOTP} className="space-y-6 animate-fade-in">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-pitch-500/10 border border-pitch-500/20 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={26} className="text-pitch-400" />
                </div>
                <h2 className="font-display font-bold text-xl text-white">Authenticator Code</h2>
                <p className="text-ink-200 text-sm mt-2">
                  Enter the 6-digit code from<br />your Google Authenticator app
                </p>
              </div>

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="input text-center text-3xl font-mono tracking-[0.5em] py-4"
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('credentials'); setTotpCode(''); }}
                className="w-full text-xs text-ink-200 hover:text-white text-center"
              >
                ← Back to login
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-ink-300 mt-6">
          <Link href="/" className="hover:text-white">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
