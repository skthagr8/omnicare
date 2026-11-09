'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, Check, Circle, Eye, EyeOff, HeartPulse, LoaderCircle, Phone, UserRound, X } from 'lucide-react';

const inputClass = 'min-h-16 w-full rounded-2xl border border-[#f0d9c8] bg-white/90 px-4 py-4 text-base leading-6 text-[#115e56] outline-none placeholder:text-[#475569] focus:border-teal focus:ring-4 focus:ring-teal/15';
const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];

function PasswordField({ id, label, value, onChange, describedBy, invalid }) {
	const [visible, setVisible] = useState(false);

	return (
		<div>
			<label htmlFor={id} className="mb-2.5 block text-base font-semibold">{label}</label>
			<div className="relative">
				<input id={id} name={id} type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={value} onChange={onChange} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={`${inputClass} pr-16`} />
				<button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} title={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setVisible(!visible)} className="absolute top-1/2 right-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-2xl text-[#334155] hover:bg-teal-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
					{visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
				</button>
			</div>
		</div>
	);
}

export default function CompleteProfilePage() {
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [phone, setPhone] = useState('');
	const [preferredName, setPreferredName] = useState('');
	const [acknowledged, setAcknowledged] = useState(false);
	const [photo, setPhoto] = useState(null);
	const [preview, setPreview] = useState('');
	const [photoError, setPhotoError] = useState('');
	const [submitError, setSubmitError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [activated, setActivated] = useState(false);
	const photoInput = useRef(null);
	const submissionLock = useRef(false);

	const requirements = [
		{ label: '8 to 128 characters', met: password.length >= 8 && password.length <= 128 },
		{ label: 'An uppercase letter', met: /[A-Z]/.test(password) },
		{ label: 'A lowercase letter', met: /[a-z]/.test(password) },
		{ label: 'A number', met: /[0-9]/.test(password) },
	];
	const score = requirements.filter(requirement => requirement.met).length;
	const strength = !password ? 'Not entered' : ['Weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
	const passwordValid = score === requirements.length;
	const passwordsMatch = confirmation.length > 0 && password === confirmation;
	const phoneDigits = phone.replace(/\D/g, '');
	const phoneValid = /^\+?[0-9 ()-]+$/.test(phone.trim()) && phoneDigits.length >= 7 && phoneDigits.length <= 15 && phone.length <= 20;
	const canActivate = passwordValid && passwordsMatch && phoneValid && acknowledged;

	useEffect(() => {
		if (!photo) {
			setPreview('');
			return;
		}
		const url = URL.createObjectURL(photo);
		setPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [photo]);

	function selectPhoto(event) {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		setPhotoError('');
		if (!photoTypes.includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0) {
			setPhotoError('Choose a JPG, PNG, or WebP photo up to 5 MB.');
			return;
		}
		setPhoto(file);
	}

	async function handleActivate(event) {
		event.preventDefault();
		if (!canActivate || submissionLock.current || activated) return;
		setSubmitError('');
		const tokens = new URLSearchParams(window.location.search).getAll('token');
		if (tokens.length !== 1 || !tokens[0].trim()) {
			setSubmitError('Please open your administrator\'s invitation link to activate your account.');
			return;
		}

		submissionLock.current = true;
		setSubmitting(true);
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 20000);

		try {
			const body = new FormData();
			body.append('token', tokens[0]);
			body.append('password', password);
			body.append('phone', phone.trim());
			body.append('preferred_name', preferredName.trim());
			body.append('privacy_acknowledged', 'true');
			if (photo) body.append('photo', photo);

			const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
			const response = await fetch(`${apiUrl}/api/auth/invitations/activate`, {
				method: 'POST', body, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal,
			});
			if ([400, 401, 409, 410].includes(response.status)) {
				setSubmitError('Your account could not be activated. Your invite may have expired or already been used. Please contact your administrator.');
				return;
			}
			if (!response.ok) throw new Error('Activation unavailable');
			const result = await response.json();
			if (result.status !== 'activated') throw new Error('Activation not confirmed');
			setActivated(true);
			setPassword('');
			setConfirmation('');
			setPhoto(null);
			window.location.replace('/login');
		} catch {
			setSubmitError('We could not confirm activation. Please try signing in, or contact your administrator if you need help.');
		} finally {
			clearTimeout(timeout);
			submissionLock.current = false;
			setSubmitting(false);
		}
	}

	return (
		<main className="caregiver-login min-h-svh bg-linear-to-br from-teal-soft via-teal-soft to-[#fffbeb] px-5 py-10 text-[#115e56] sm:px-8 sm:py-14">
			<div className="mx-auto w-full max-w-lg pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
				<header className="mb-10 text-center">
					<div aria-label="OmniCare" className="mb-7 flex items-center justify-center gap-3">
						<span aria-hidden="true" className="flex size-11 items-center justify-center rounded-2xl bg-teal text-white shadow-sm"><HeartPulse className="size-6" strokeWidth={1.75} /></span>
						<span className="text-[30px] leading-none font-semibold">OmniCare</span>
					</div>
					<h1 className="text-[28px] leading-9 font-semibold">Make yourself at home</h1>
				</header>

				<form onSubmit={handleActivate} aria-busy={submitting}>
					<fieldset disabled={submitting || activated} className="min-w-0 space-y-10 disabled:opacity-75">
						<section aria-labelledby="password-heading">
							<h2 id="password-heading" className="mb-5 text-xl font-semibold">Password</h2>
							<PasswordField id="new-password" label="New password" value={password} onChange={event => setPassword(event.target.value)} describedBy="password-requirements password-strength" />
							<div className="mt-4 mb-6">
								<div className="flex items-center justify-between gap-3 text-sm">
									<span className="font-semibold">Password strength</span>
									<span id="password-strength" role="status" className="text-[#334155]">{strength}</span>
								</div>
								<div aria-hidden="true" className="mt-2.5 grid grid-cols-4 gap-1.5">
									{requirements.map((requirement, index) => <span key={requirement.label} className={`h-1.5 rounded-full ${password && index < score ? 'bg-teal' : 'bg-[#b6e6df]'}`} />)}
								</div>
								<ul id="password-requirements" className="mt-4 grid gap-2 text-sm leading-5 sm:grid-cols-2">
									{requirements.map(requirement => (
										<li key={requirement.label} className={`flex items-center gap-2 ${requirement.met ? 'text-[#1b8a7f]' : 'text-[#334155]'}`}>
											{requirement.met ? <Check aria-hidden="true" className="size-4 shrink-0" /> : <Circle aria-hidden="true" className="size-3.5 shrink-0" />}
											<span className="sr-only">{requirement.met ? 'Met: ' : 'Not met: '}</span>{requirement.label}
										</li>
									))}
								</ul>
							</div>
							<PasswordField id="confirm-password" label="Confirm password" value={confirmation} onChange={event => setConfirmation(event.target.value)} describedBy={confirmation ? 'password-match' : undefined} invalid={confirmation.length > 0 && !passwordsMatch} />
							{confirmation && <p id="password-match" role="status" className={`mt-2 text-sm ${passwordsMatch ? 'text-[#1b8a7f]' : 'text-[#be123c]'}`}>{passwordsMatch ? 'Passwords match' : 'Passwords do not match yet'}</p>}
						</section>

						<section aria-labelledby="contact-heading" className="border-t border-coral-soft pt-8">
							<h2 id="contact-heading" className="mb-5 text-xl font-semibold">Contact</h2>
							<label htmlFor="phone" className="mb-2.5 block text-base font-semibold">Phone number</label>
							<div className="relative">
								<Phone aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#334155]" />
								<input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} placeholder="+1 (555) 123-4567" value={phone} onChange={event => setPhone(event.target.value)} aria-describedby={phone && !phoneValid ? 'phone-error' : undefined} aria-invalid={phone.length > 0 && !phoneValid || undefined} className={`${inputClass} pl-12`} />
							</div>
							{phone && !phoneValid && <p id="phone-error" className="mt-2 text-sm text-[#be123c]">Enter a phone number with 7 to 15 digits, including your country code.</p>}
						</section>

						<section aria-labelledby="profile-heading" className="border-t border-coral-soft pt-8">
							<h2 id="profile-heading" className="mb-5 text-xl font-semibold">Profile</h2>
							<label htmlFor="preferred-name" className="mb-2.5 block text-base font-semibold">Preferred name <span className="text-sm font-normal text-[#334155]">(optional)</span></label>
							<input id="preferred-name" name="preferred_name" type="text" autoComplete="nickname" maxLength={100} value={preferredName} onChange={event => setPreferredName(event.target.value)} aria-describedby="preferred-name-note" className={inputClass} />
							<p id="preferred-name-note" className="mt-2 text-sm leading-5 text-[#334155]">If different from your legal name.</p>

							<div className="mt-7">
								<p className="mb-4 text-base font-semibold">Profile photo <span className="text-sm font-normal text-[#334155]">(optional)</span></p>
								<div className="flex items-center gap-4">
									<div className="relative size-24 shrink-0">
										<div className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-coral-soft bg-teal-soft">
											{preview ? <img src={preview} alt="Your profile photo preview" className="size-full object-cover" onError={() => { setPhoto(null); setPhotoError('This photo could not be opened. Please choose another image.'); }} /> : <UserRound aria-hidden="true" className="size-10 text-[#475569]" strokeWidth={1.5} />}
										</div>
										{photo && <button type="button" onClick={() => { setPhoto(null); setPhotoError(''); }} aria-label="Remove profile photo" title="Remove profile photo" className="absolute -top-2 -right-2 flex size-11 items-center justify-center rounded-full border border-coral-soft bg-cream text-[#334155] shadow-sm focus-visible:outline-2 focus-visible:outline-teal"><X aria-hidden="true" className="size-4" /></button>}
									</div>
									<div className="min-w-0">
										<input ref={photoInput} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} aria-label="Profile photo" className="sr-only" tabIndex={-1} />
										<button type="button" onClick={() => photoInput.current?.click()} className="flex min-h-12 items-center gap-2 rounded-lg border border-coral-soft bg-white/80 px-3 py-2 text-sm font-semibold text-[#1b8a7f] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"><Camera aria-hidden="true" className="size-4 shrink-0" />{photo ? 'Change photo' : 'Add photo'}</button>
										<p className="mt-2 text-xs leading-5 text-[#334155]">JPG, PNG, or WebP. Up to 5 MB.</p>
									</div>
								</div>
								<p className="mt-4 text-sm leading-6 text-[#334155]">This photo will be visible to the families you support</p>
								{photoError && <p role="alert" className="mt-2 text-sm leading-6 text-[#be123c]">{photoError}</p>}
							</div>
						</section>

						<div className="border-t border-coral-soft pt-7">
							<label className="flex min-h-12 cursor-pointer items-start gap-3 py-2 text-sm leading-6">
								<input name="privacy_acknowledged" type="checkbox" required checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-0.5 size-6 shrink-0 cursor-pointer accent-teal focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal" />
								<span>I acknowledge my responsibility to protect client privacy and access care information only for the families I support.</span>
							</label>
						</div>
					</fieldset>

					{submitError && <p role="alert" className="mt-5 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm leading-6 text-[#be123c] shadow-sm">{submitError}</p>}
					<button type="submit" disabled={!canActivate || submitting || activated} className="mt-7 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-teal px-4 py-4 text-base font-semibold text-white shadow-[0_4px_0_#1b8a7f,0_7px_16px_rgba(34,166,153,0.14)] transition-[translate,box-shadow,background-color] duration-150 enabled:hover:bg-[#1b8a7f] focus-visible:outline-2 focus-visible:outline-offset-6 focus-visible:outline-teal enabled:active:translate-y-0.5 enabled:active:shadow-[0_2px_0_#1b8a7f] disabled:cursor-not-allowed disabled:bg-[#334155] disabled:shadow-none motion-reduce:transition-none">
						{submitting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : null}
						{submitting ? 'Activating...' : activated ? 'Account Activated' : 'Activate My Account'}
						{!submitting && !activated && <ArrowRight aria-hidden="true" className="size-5 shrink-0" />}
					</button>
				</form>
			</div>
		</main>
	);
}
