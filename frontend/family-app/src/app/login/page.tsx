'use client';

import { PORTAL } from '../../libs/portal';
import { startSession } from '../../libs/session';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, Heart, HeartHandshake, Lock, Mail, Users } from 'lucide-react';
import { apiClient } from '../../services/api';
import { HelpLinks, Logo } from '../../components/layout/Layout';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email address is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const FALLBACK_ERROR = 'Unable to sign in. Please check your details and try again.';

/**
 * FastAPI returns `detail` as a string (401/403/409...) or as an array of
 * { msg } objects (422). Rendering an array in JSX would crash React.
 */
function extractErrorMessage(err: unknown): string {
  if (typeof err !== 'object' || err === null) return FALLBACK_ERROR;

  const response = (err as { response?: { data?: { detail?: unknown } } }).response;
  if (!response) return 'Unable to reach the server. Check your connection and try again.';

  const detail = response.data?.detail;
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((d) => (d && typeof d.msg === 'string' ? d.msg.replace(/^Value error, /, '') : null))
      .filter((m): m is string => Boolean(m));
    if (messages.length > 0) return messages.join(' ');
  }

  return FALLBACK_ERROR;
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');
    try {
      const { data } = await apiClient.post('/auth/login', {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        portal: PORTAL, // the backend rejects accounts whose role doesn't match
      });

      if (!data?.access_token || !data?.refresh_token || data.user?.role !== PORTAL) {
        setServerError('This account cannot sign in to the family portal.');
        return;
      }

      startSession(data.access_token, data.refresh_token, data.user.role);
      router.replace('/dashboard');
    } catch (err) {
      setServerError(extractErrorMessage(err));
    }
  };

  const inputClass =
    'w-full rounded-xl border border-coral-soft bg-white/70 py-3 pl-11 pr-3 text-sm text-ink placeholder:text-slate-400 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20';

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-cream to-cream-deep">
      <header className="border-b border-coral-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <HelpLinks />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-4xl bg-cream shadow-[0_24px_60px_-24px_rgba(244,123,79,0.35)] md:grid-cols-2">
          {/* Story panel */}
          <section className="flex flex-col justify-between gap-10 bg-linear-to-br from-cream-deep/60 to-cream p-10 md:p-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal">
                <Heart className="h-3.5 w-3.5" /> Trusted Family Portal
              </span>
              <h1 className="mt-5 font-serif text-5xl font-semibold leading-tight text-ink">
                Care that feels like <em className="text-teal">home.</em>
              </h1>
              <p className="mt-6 max-w-md text-slate-600">
                Access your family&apos;s care plans, health updates, and connect with clinicians in a secure,
                supportive environment.
              </p>
            </div>

            <div className="flex aspect-[4/3] items-center justify-center gap-6 rounded-2xl bg-linear-to-br from-coral-soft via-cream-deep to-teal-soft">
              <Users className="h-16 w-16 text-coral" strokeWidth={1.5} />
              <HeartHandshake className="h-16 w-16 text-teal" strokeWidth={1.5} />
            </div>
          </section>

          {/* Form panel */}
          <section className="p-10 md:p-16">
            <h2 className="font-serif text-3xl font-semibold text-ink">Family Login</h2>
            <p className="mt-2 text-slate-600">Welcome back — here for your loved one&apos;s care</p>

            {serverError && (
              <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-6">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="family@example.com"
                    {...register('email')}
                    className={inputClass}
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-ink">
                    Password
                  </label>
                  <a href="#" className="text-sm font-medium text-teal hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    {...register('password')}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>}
              </div>

              {/* Sessions currently last 7 days either way (see libs/session.ts). */}
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input type="checkbox" {...register('remember')} className="h-4 w-4 accent-teal" />
                Stay securely logged in on this device
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-coral to-teal py-3.5 font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in…' : 'Log In'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="my-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-coral-soft" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                New to the community?
              </span>
              <div className="h-px flex-1 bg-coral-soft" />
            </div>

            <p className="text-center text-slate-600">
              Don&apos;t have access yet? Please contact your care coordinator or{' '}
              <a href="#" className="font-semibold text-teal hover:underline">
                Request an Invitation
              </a>
              .
            </p>

            <div className="mt-6 flex justify-center gap-4 text-xs text-slate-400">
              <a href="#" className="hover:text-slate-600">Privacy Policy</a>•
              <a href="#" className="hover:text-slate-600">Security Standards</a>•
              <a href="#" className="hover:text-slate-600">Accessibility</a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
