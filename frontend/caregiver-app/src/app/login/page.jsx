'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, HeartPulse, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push('/');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to log in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="caregiver-login flex min-h-svh items-center justify-center bg-linear-to-br from-[#def3ee] via-[#f1f7ed] to-[#fff8ec] px-6 py-12 text-[#203f3b] sm:px-8 sm:py-16">
      <div className="w-full max-w-100 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <header className="mb-12 text-center sm:mb-14">
          <div className="mb-8 flex items-center justify-center gap-3" aria-label="OmniCare">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#16776e] text-white shadow-[0_4px_12px_rgba(22,119,110,0.15)]" aria-hidden="true">
              <HeartPulse className="size-7" strokeWidth={1.75} />
            </span>
            <span className="text-[32px] leading-none font-bold tracking-normal">OmniCare</span>
          </div>
          <h1 className="text-2xl leading-8 font-semibold tracking-normal">Welcome back</h1>
        </header>

        <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-7">
          <div>
            <label htmlFor="email" className="mb-2.5 block text-base font-semibold">Email address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-[#57716b]" aria-hidden="true" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-describedby={error ? 'login-error' : undefined}
                className="min-h-16 w-full rounded-[20px] border border-[#a9c6bd] bg-white/85 py-4 pr-5 pl-14 text-base leading-6 text-[#203f3b] shadow-[0_2px_4px_rgba(32,63,59,0.03)] outline-none placeholder:text-[#657a73] focus:border-[#16776e] focus:ring-4 focus:ring-[#16776e]/15"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-2.5 block text-base font-semibold">Password</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-[#57716b]" aria-hidden="true" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={error ? 'login-error' : undefined}
                className="min-h-16 w-full rounded-[20px] border border-[#a9c6bd] bg-white/85 py-4 pr-16 pl-14 text-base leading-6 text-[#203f3b] shadow-[0_2px_4px_rgba(32,63,59,0.03)] outline-none placeholder:text-[#657a73] focus:border-[#16776e] focus:ring-4 focus:ring-[#16776e]/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute top-1/2 right-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-2xl text-[#57716b] hover:bg-[#e5f2ec] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16776e] active:bg-[#d8eae3]"
              >
                {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error && (
            <p id="login-error" role="alert" className="rounded-2xl border border-[#e7b9ac] bg-[#fff1eb] px-4 py-3 text-sm leading-6 text-[#913b25]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-label={loading ? 'Logging in...' : 'Log In'}
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[20px] bg-[#16776e] px-6 py-4 text-lg leading-6 font-bold text-white shadow-[0_5px_0_#105a53,0_8px_18px_rgba(22,119,110,0.18)] transition-[transform,box-shadow,background-color] duration-150 hover:bg-[#126a62] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[#16776e] active:translate-y-0.75 active:shadow-[0_2px_0_#105a53,0_3px_8px_rgba(22,119,110,0.12)] disabled:cursor-wait disabled:opacity-70 disabled:active:translate-y-0 motion-reduce:transition-none"
          >
            {loading ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            <span role="status">{loading ? 'Logging in...' : 'Log In'}</span>
            {!loading && <ArrowRight className="size-5" aria-hidden="true" />}
          </button>
        </form>
      </div>
    </main>
  );
}