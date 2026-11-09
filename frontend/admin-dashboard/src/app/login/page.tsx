'use client';

import { PORTAL } from '../../libs/portal';
import { startSession } from '../../libs/session';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  CalendarClock,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { apiClient } from '../../services/api';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Clinical email is required')
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Security password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const FALLBACK_ERROR = 'Unable to sign in. Please check your credentials and try again.';

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
      .map((d) =>
        d && typeof d.msg === 'string' ? d.msg.replace(/^Value error, /, '') : null
      )
      .filter((m): m is string => Boolean(m));
    if (messages.length > 0) return messages.join(' ');
  }

  return FALLBACK_ERROR;
}

const HIGHLIGHTS = [
  { icon: Users, label: 'Patients & intake' },
  { icon: CalendarClock, label: 'Caregiver scheduling' },
  { icon: ShieldAlert, label: 'Risk monitoring' },
];

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
    defaultValues: { email: '', password: '' },
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
        setServerError('This account cannot sign in to this portal.');
        return;
      }

      startSession(data.access_token, data.refresh_token, data.user.role);
      router.replace('/dashboard');
    } catch (err) {
      setServerError(extractErrorMessage(err));
    }
  };

  const inputClass =
    'w-full rounded-xl border border-coral-soft bg-white/70 py-3 pl-11 text-sm text-ink placeholder:text-slate-400 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20';

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-cream to-cream-deep text-ink">
      <header className="border-b border-coral-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-white shadow-sm">
              <HeartPulse className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="text-lg font-semibold tracking-tight">OmniCare Operations</span>
          </span>
          <a href="#" className="text-sm text-slate-600 hover:text-ink">Help Desk</a>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-4xl bg-cream shadow-[0_24px_60px_-24px_rgba(244,123,79,0.35)] md:grid-cols-2">
          {/* Story panel */}
          <section className="flex flex-col justify-between gap-10 bg-linear-to-br from-cream-deep/60 to-cream p-10 md:p-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal">
                <ShieldCheck className="h-3.5 w-3.5" /> Enterprise Clinical Management
              </span>
              <h1 className="mt-5 text-5xl font-semibold leading-tight">
                Every visit, every patient, <em className="text-teal">in view.</em>
              </h1>
              <p className="mt-6 max-w-md text-slate-600">
                Coordinate intake, scheduling and caregiver teams, and act early on risk signals, all from one
                secure workspace.
              </p>
            </div>

            <ul className="grid gap-3">
              {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 rounded-2xl border border-coral-soft bg-white/60 px-4 py-3 text-sm shadow-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-soft text-coral">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </section>

          {/* Form panel */}
          <section className="p-10 md:p-16">
            <h2 className="font-serif text-3xl font-semibold">Sign In</h2>
            <p className="mt-2 text-slate-600">Enter your credentials to access the clinical dashboard</p>

            {serverError && (
              <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  Clinical Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@omnicare.com"
                    {...register('email')}
                    className={`${inputClass} pr-3`}
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Security Password
                  </label>
                  <a href="#" className="text-sm font-medium text-teal hover:underline">
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
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
                {errors.password && <p className="mt-1.5 text-xs text-rose-600">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-coral to-teal py-3.5 font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in…' : 'Log In to Platform'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="my-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-coral-soft" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Enterprise Auth</span>
              <div className="h-px flex-1 bg-coral-soft" />
            </div>

            <button
              type="button"
              disabled
              title="SSO is not configured yet"
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-ink/30 bg-white/60 py-3 text-sm font-medium opacity-60"
            >
              <ShieldCheck className="h-4 w-4 text-teal" />
              Login with HealthID (SSO)
            </button>

            <p className="mt-6 text-center text-xs text-slate-400">Authorized clinical staff only. Access is monitored.</p>

            <div className="mt-6 flex justify-center gap-4 text-xs text-slate-400">
              <a href="#" className="hover:text-slate-600">Privacy Protocol</a>•
              <a href="#" className="hover:text-slate-600">Terms of Service</a>•
              <a href="#" className="hover:text-slate-600">Security Compliance</a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
