'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!supabase) return setError('Supabase belum dikonfigurasi.');
    if (!phone.startsWith('+')) return setError('Pakai format internasional, contoh: +6281234567890');

    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (err) return setError(err.message);
    setOtpSent(true);
    setNotice('Kode OTP dikirim via SMS. Cek HP kamu.');
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    if (!supabase) return setError('Supabase belum dikonfigurasi.');

    setLoading(true);
    const { error: err } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    setLoading(false);
    if (err) return setError(err.message);
    router.push('/profile');
    router.refresh();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!supabase) {
      setError('Supabase belum dikonfigurasi. Tambahkan env var dulu.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push('/profile');
        router.refresh();
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name || email.split('@')[0] } }
        });
        if (err) throw err;
        setNotice('Akun dibuat! Cek email kamu untuk verifikasi, lalu login.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (!supabase) {
      setError('Supabase belum dikonfigurasi.');
      return;
    }
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/profile` }
    });
    if (err) setError(err.message);
  }

  const isLogin = mode === 'login';

  return (
    <div className="mx-auto max-w-sm px-5 py-8">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-paper-card shadow-card">
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-accent to-accent-600">
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white transition-opacity duration-300">
            <p className="font-display text-2xl font-extrabold">
              {isLogin ? 'Hello, Welcome' : 'Welcome Back!'}
            </p>
            <p className="mt-1 text-sm text-white/85">
              {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
            </p>
            <button
              type="button"
              onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); setNotice(''); }}
              className="mt-3 rounded-full border border-white/70 px-6 py-1.5 text-sm font-bold text-white transition hover:bg-paper-card/10"
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </div>
          <div className="absolute -bottom-1 left-0 right-0 h-8 rounded-t-[50%] bg-paper-card" />
        </div>

        <div className="overflow-hidden">
          <div
            className="flex w-[200%] transition-transform duration-500 ease-[cubic-bezier(.65,0,.35,1)]"
            style={{ transform: isLogin ? 'translateX(0%)' : 'translateX(-50%)' }}
          >
            <div className="w-1/2 px-7 pb-8 pt-6">
              <p className="mb-5 text-center font-display text-xl font-extrabold text-ink">Login</p>

              {authMethod === 'email' ? (
                <form onSubmit={isLogin ? handleSubmit : undefined}>
                  <Field
                    icon={<UserIcon />}
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                  />
                  <Field
                    icon={<LockIcon />}
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={setPassword}
                    autoComplete="current-password"
                  />
                  <p className="mb-4 text-right text-xs font-semibold text-ink-faint">Lupa Password</p>
                  {isLogin && error && <p className="mb-3 text-xs font-semibold text-red-500">{error}</p>}
                  {isLogin && notice && <p className="mb-3 text-xs font-semibold text-accent">{notice}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-gradient-to-r from-accent to-accent-600 py-3 text-sm font-bold text-white shadow-card transition disabled:opacity-60"
                  >
                    {loading && isLogin ? 'Memproses…' : 'Login'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-line py-3 text-sm font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
                  >
                    <GoogleIcon /> Login with Google
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMethod('phone'); setError(''); setNotice(''); }}
                    className="mt-4 w-full text-center text-xs font-semibold text-ink-faint hover:text-accent"
                  >
                    Login pakai nomor HP →
                  </button>
                </form>
              ) : (
                <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
                  <Field
                    icon={<PhoneIcon />}
                    type="tel"
                    placeholder="+6281234567890"
                    value={phone}
                    onChange={setPhone}
                    autoComplete="tel"
                  />
                  {otpSent && (
                    <Field
                      icon={<LockIcon />}
                      type="text"
                      placeholder="Kode OTP"
                      value={otp}
                      onChange={setOtp}
                      autoComplete="one-time-code"
                    />
                  )}
                  {error && <p className="mb-3 text-xs font-semibold text-red-500">{error}</p>}
                  {notice && <p className="mb-3 text-xs font-semibold text-accent">{notice}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-gradient-to-r from-accent to-accent-600 py-3 text-sm font-bold text-white shadow-card transition disabled:opacity-60"
                  >
                    {loading ? 'Memproses…' : otpSent ? 'Verifikasi Kode' : 'Kirim Kode OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMethod('email'); setOtpSent(false); setError(''); setNotice(''); }}
                    className="mt-4 w-full text-center text-xs font-semibold text-ink-faint hover:text-accent"
                  >
                    ← Login pakai Email
                  </button>
                </form>
              )}
            </div>

            <form onSubmit={!isLogin ? handleSubmit : undefined} className="w-1/2 px-7 pb-8 pt-6">
              <p className="mb-5 text-center font-display text-xl font-extrabold text-ink">Registration</p>
              <Field icon={<UserIcon />} type="text" placeholder="Nama" value={name} onChange={setName} autoComplete="name" />
              <Field
                icon={<UserIcon />}
                type="email"
                placeholder="Email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />
              <Field
                icon={<LockIcon />}
                type="password"
                placeholder="Password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              {!isLogin && error && <p className="mb-3 text-xs font-semibold text-red-500">{error}</p>}
              {!isLogin && notice && <p className="mb-3 text-xs font-semibold text-accent">{notice}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-gradient-to-r from-accent to-accent-600 py-3 text-sm font-bold text-white shadow-card transition disabled:opacity-60"
              >
                {loading && !isLogin ? 'Memproses…' : 'Register'}
              </button>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-line py-3 text-sm font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
              >
                <GoogleIcon /> Daftar dengan Google
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, type, placeholder, value, onChange, autoComplete }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-paper-soft px-4 py-3">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
      />
      <span className="text-ink-faint">{icon}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.47a5.54 5.54 0 01-2.4 3.64v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0012 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 014.9 12c0-.79.14-1.56.37-2.28V6.61H1.27A12 12 0 000 12c0 1.94.46 3.77 1.27 5.39l4-3.11z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 001.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path strokeLinecap="round" d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  );
}