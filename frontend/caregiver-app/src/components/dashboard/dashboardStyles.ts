export function normalizeCode(value: string) { return value.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_'); }

export const diagnoses: Record<string, { label: string; className: string }> = {
	dementia: { label: 'Dementia', className: 'bg-violet-50 text-violet-700' },
	parkinsons: { label: "Parkinson's", className: 'bg-emerald-50 text-emerald-700' },
	parkinson: { label: "Parkinson's", className: 'bg-emerald-50 text-emerald-700' },
	post_stroke: { label: 'Post-Stroke', className: 'bg-sky-50 text-sky-700' },
	general_geriatric: { label: 'General Geriatric', className: 'bg-stone-100 text-stone-600' },
};

export function diagnosisStyle(value: string) {
	return diagnoses[normalizeCode(value)] || { label: value.replaceAll('_', ' '), className: 'bg-stone-100 text-stone-600' };
}

export function acuityCode(value: string) {
	const code = normalizeCode(value);
	return ({ red: 'high', amber: 'medium', yellow: 'medium', green: 'low' } as Record<string, string>)[code] || code;
}

export const acuityStrips: Record<string, string> = { high: 'bg-rose-500', medium: 'bg-amber-400', low: 'bg-emerald-500' };

export function caregiverStyle(value: string) {
	return ({ available: { label: 'Available', dot: 'bg-emerald-500' }, en_route: { label: 'En-route', dot: 'bg-amber-500' }, in_service: { label: 'In-service', dot: 'bg-sky-500' }, emergency: { label: 'Emergency', dot: 'bg-rose-500' }, off_shift: { label: 'Off shift', dot: 'bg-slate-400' } } as Record<string, { label: string; dot: string }>)[normalizeCode(value)] || { label: 'Unknown', dot: 'bg-slate-300' };
}

export function appointmentStyle(value: string) {
	return ({ scheduled: { label: 'Scheduled', chip: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' }, in_progress: { label: 'In-Service', chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' }, in_service: { label: 'In-Service', chip: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' }, completed: { label: 'Completed', chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' }, missed: { label: 'Missed', chip: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' }, cancelled: { label: 'Cancelled', chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' } } as Record<string, { label: string; chip: string; dot: string }>)[normalizeCode(value)] || { label: 'Unknown', chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-300' };
}

export function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }

export function patientAge(birth: string, now: Date | null) {
	if (!now || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return '-';
	const date = new Date(`${birth}T00:00:00`);
	if (!Number.isFinite(date.getTime()) || date > now) return '-';
	const birthdayPassed = now.getMonth() > date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
	return String(now.getFullYear() - date.getFullYear() - (birthdayPassed ? 0 : 1));
}

export function appointmentTime(value: string) {
	return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}