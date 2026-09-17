'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { apiClient } from '../../services/api';

const loginSchema = z.object({
  email: z.string().min(1, 'Clinical email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Security password is required'),
  remember: z.boolean().optional(),
});

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const { data } = await apiClient.post('/auth/login', {
        email: values.email,
        password: values.password,
      });

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      router.push('/');
    } catch (err) {
      setServerError(
        err.response?.data?.detail || 'Unable to sign in. Please check your credentials and try again.'
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-linear-to-b from-[#EAF0F4] to-[#F7FAFB]">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Wordmark */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F6B72] text-white shadow-sm">
            <Activity className="h-6 w-6" strokeWidth={2.25} />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-[#2B2E33]">
            OmniCare Operations
          </h1>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#2B2E33]/50">
            Enterprise Clinical Management
          </p>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-slate-200/60 bg-white p-8 shadow-[0_8px_30px_-12px_rgba(43,46,51,0.18)]">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-[#2B2E33]">Sign In</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your credentials to access the clinical dashboard
            </p>
          </div>

          {serverError && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Clinical Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@omnicare.com"
                  {...register('email')}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-[#2B2E33] placeholder:text-slate-400 outline-none transition-colors duration-150 focus:border-[#0F6B72] focus:ring-2 focus:ring-[#0F6B72]/20"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  Security Password
                </label>
                <a href="#" className="text-xs font-medium text-[#0F6B72] hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-[#2B2E33] placeholder:text-slate-400 outline-none transition-colors duration-150 focus:border-[#0F6B72] focus:ring-2 focus:ring-[#0F6B72]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                {...register('remember')}
                className="h-4 w-4 rounded border-slate-300 text-[#0F6B72] focus:ring-[#0F6B72]/30"
              />
              Remember this device for 30 days
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F6B72] py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#0d5b61] hover:shadow-[0_0_0_4px_rgba(15,107,114,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Log In to Platform'}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Enterprise Auth
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-[#2B2E33] transition-colors hover:bg-slate-50"
          >
            <ShieldCheck className="h-4 w-4 text-[#0F6B72]" />
            Login with HealthID (SSO)
          </button>

          <p className="mt-6 text-center text-xs text-slate-400">
            Authorized clinical staff only. Access is monitored.
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-slate-400">
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-600">Privacy Protocol</a>
            <a href="#" className="hover:text-slate-600">Terms of Service</a>
            <a href="#" className="hover:text-slate-600">Security Compliance</a>
          </div>
          <a href="#" className="hover:text-slate-600">Help Desk</a>
        </div>
      </div>
    </div>
  );
}
