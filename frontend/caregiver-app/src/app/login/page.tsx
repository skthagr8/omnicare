'use client';

import { PORTAL } from '../../libs/portal';
import { startSession } from '../../libs/session';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, HeartPulse, LoaderCircle, LockKeyhole, Mail, Stethoscope } from 'lucide-react';
import { apiClient } from '../../services/api';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const FALLBACK_ERROR = 'Unable to sign in. Please check your credentials and try again.';

/**
 * Extracts error details gracefully from FastAPI's 422, 401, 403 responses.
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
        portal: PORTAL, // Enforces caregiver role
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
    'min-h-14 w-full rounded-xl border border-coral-soft bg-white/70 py-3.5 pl-12 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-teal focus:ring-2 focus:ring-teal/20';

  return (
    <main className="flex min-h-svh flex-col bg-linear-to-b from-cream to-cream-deep text-ink">
      {/* Top bar, as in family-app */}
      <header className="border-b border-coral-soft">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-coral text-white shadow-sm">
              <HeartPulse aria-hidden="true" className="size-5" strokeWidth={2.25} />
            </span>
            <span className="text-lg font-semibold tracking-tight">OmniCare Caregiver</span>
          </span>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md rounded-4xl bg-cream p-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0_24px_60px_-24px_rgba(244,123,79,0.35)] sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal">
            <Stethoscope aria-hidden="true" className="size-3.5" /> Caregiver Portal
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight">
            Welcome <em className="text-teal">back.</em>
          </h1>
          <p className="mt-2 text-slate-600">Sign in to see today&apos;s visits and care plans.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting} className="mt-8 space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.com"
                  {...register('email')}
                  aria-describedby={serverError || errors.email ? 'login-error' : undefined}
                  className={`${inputClass} pr-4`}
                />
              </div>
              {errors.email && <p className="mt-1.5 text-sm text-rose-700">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register('password')}
                  aria-describedby={serverError || errors.password ? 'login-error' : undefined}
                  className={`${inputClass} pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-coral-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
                >
                  {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-sm text-rose-700">{errors.password.message}</p>}
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <p
                id="login-error"
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
              >
                {serverError}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              aria-label={isSubmitting ? 'Logging in...' : 'Log In'}
              className="group flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-coral to-teal px-6 text-base font-semibold text-white shadow-md transition hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
            >
              {isSubmitting ? (
                <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : null}
              <span role="status">{isSubmitting ? 'Logging in...' : 'Log In'}</span>
              {!isSubmitting && (
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Authorized caregivers only. Access is monitored.
          </p>
        </div>
      </div>
    </main>
  );
}
