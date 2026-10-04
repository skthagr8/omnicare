'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, HeartPulse, Link2Off, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';

const expiredMessage = 'This invite link has expired \u2014 please contact your administrator for a new one.';

export default function CaregiverInvitationPage() {
	const [invite, setInvite] = useState(null);
	const [status, setStatus] = useState('loading');

	useEffect(() => {
		const controller = new AbortController();
		let disposed = false;
		let expirationTimer;
		const timeout = setTimeout(() => controller.abort(), 15000);

		async function validateInvitation() {
			const tokens = new URLSearchParams(window.location.search).getAll('token');
			if (tokens.length !== 1 || !tokens[0].trim()) {
				setStatus('expired');
				return;
			}

			try {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
				const response = await fetch(`${apiUrl}/api/auth/invitations/validate`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ token: tokens[0] }),
					cache: 'no-store',
					credentials: 'omit',
					referrerPolicy: 'no-referrer',
					signal: controller.signal,
				});

				if ([400, 401, 404, 409, 410].includes(response.status)) {
					setStatus('expired');
					return;
				}
				if (!response.ok) throw new Error('Invitation verification unavailable');

				const data = await response.json();
				if (['expired', 'used', 'invalid'].includes(data.status)) {
					setStatus('expired');
					return;
				}

				const expiresAt = Date.parse(data.expires_at);
				const destination = new URL(data.continue_url, window.location.origin);
				if (
					data.status !== 'valid' ||
					typeof data.organization_name !== 'string' || !data.organization_name.trim() ||
					typeof data.email !== 'string' || !data.email.trim() ||
					typeof data.continue_url !== 'string' || !data.continue_url.startsWith('/') ||
					destination.origin !== window.location.origin ||
					destination.pathname === window.location.pathname ||
					!Number.isFinite(expiresAt)
				) throw new Error('Invalid invitation response');

				if (expiresAt <= Date.now()) {
					setStatus('expired');
					return;
				}
				if (controller.signal.aborted) return;

				setInvite({ organization: data.organization_name, email: data.email, destination: destination.href, expiresAt });
				setStatus('valid');
				expirationTimer = setTimeout(() => setStatus('expired'), Math.min(expiresAt - Date.now(), 2147483647));
			} catch {
				if (!disposed) setStatus('unavailable');
			} finally {
				clearTimeout(timeout);
			}
		}

		validateInvitation();
		return () => {
			disposed = true;
			controller.abort();
			clearTimeout(timeout);
			clearTimeout(expirationTimer);
		};
	}, []);

	function handleContinue() {
		if (status !== 'valid' || !invite) return;
		if (invite.expiresAt <= Date.now()) {
			setStatus('expired');
			return;
		}
		window.location.assign(invite.destination);
	}

	return (
		<main className="caregiver-login flex min-h-svh items-center justify-center bg-linear-to-br from-[#def3ee] via-[#f1f7ed] to-[#fff8ec] px-5 py-10 text-[#203f3b] sm:px-8 sm:py-16">
			<div className="w-full max-w-md pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
				<div aria-label="OmniCare" className="mb-8 flex items-center justify-center gap-3">
					<span aria-hidden="true" className="flex size-11 items-center justify-center rounded-2xl bg-[#16776e] text-white shadow-sm">
						<HeartPulse className="size-6" strokeWidth={1.75} />
					</span>
					<span className="text-[30px] leading-none font-bold">OmniCare</span>
				</div>

				<section aria-labelledby="invitation-heading" aria-busy={status === 'loading'} className="rounded-lg border border-[#d1e2d9] bg-[#fffefa] px-6 py-8 shadow-[0_12px_40px_rgba(32,63,59,0.07)] sm:px-8 sm:py-10">
					<div aria-live="polite" aria-atomic="true">
						{status === 'loading' ? (
							<div className="py-8 text-center">
								<LoaderCircle aria-hidden="true" className="mx-auto mb-5 size-8 animate-spin text-[#16776e] motion-reduce:animate-none" />
								<h1 id="invitation-heading" className="text-xl font-semibold">Checking your invitation</h1>
							</div>
						) : status === 'valid' && invite ? (
							<>
								<ShieldCheck aria-hidden="true" className="mx-auto mb-6 size-10 text-[#16776e]" strokeWidth={1.5} />
								<h1 id="invitation-heading" className="text-center text-2xl leading-9 font-semibold wrap-anywhere">
									You&apos;ve been invited to join <span className="text-[#16776e]">{invite.organization}</span> on OmniCare
								</h1>
								<div className="mt-8">
									<label htmlFor="invited-email" className="mb-2.5 block text-sm font-semibold">Your email address</label>
									<div className="relative">
										<Mail aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#57716b]" />
										<input id="invited-email" type="email" value={invite.email} readOnly autoComplete="off" className="min-h-16 w-full rounded-2xl border border-[#bdd2c7] bg-[#f1f6ef] py-4 pr-4 pl-12 text-base text-[#203f3b] outline-none focus-visible:ring-2 focus-visible:ring-[#16776e]" />
									</div>
								</div>
								<button type="button" onClick={handleContinue} className="mt-8 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#16776e] px-5 py-4 text-lg font-bold text-white shadow-[0_4px_0_#105a53,0_7px_16px_rgba(22,119,110,0.14)] transition-[translate,box-shadow,background-color] duration-150 hover:bg-[#126a62] focus-visible:outline-2 focus-visible:outline-offset-6 focus-visible:outline-[#16776e] active:translate-y-0.5 active:shadow-[0_2px_0_#105a53] motion-reduce:transition-none">
									Continue <ArrowRight aria-hidden="true" className="size-5" />
								</button>
							</>
						) : (
							<div className="py-3 text-center">
								<Link2Off aria-hidden="true" className="mx-auto mb-6 size-10 text-[#6b8275]" strokeWidth={1.5} />
								<h1 id="invitation-heading" className="text-2xl leading-8 font-semibold">{status === 'expired' ? 'Invitation expired' : 'Unable to check your invitation'}</h1>
								<p className="mt-4 text-base leading-7 text-[#57716b]">{status === 'expired' ? expiredMessage : 'We could not verify this invite link. Please try again later or contact your administrator.'}</p>
							</div>
						)}
					</div>
				</section>
			</div>
		</main>
	);
}
