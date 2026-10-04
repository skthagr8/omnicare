export function summaryTime(value: string | null | undefined) {
	const date = value ? new Date(value) : null;
	return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date) : 'Not recorded';
}

export function summaryDate(value: string | null | undefined) {
	const date = value ? new Date(value) : null;
	return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(date) : 'Date unavailable';
}

export function summaryDuration(minutes: number | null) {
	if (minutes === null) return 'Not recorded';
	if (minutes < 60) return `${minutes} min`;
	return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
}