import { useEffect, useRef, useState } from 'react';
import { History, MoreVertical, Pencil, Plus } from 'lucide-react';

type AssessmentOverflowMenuProps = { name: string; canWrite: boolean; canEdit: boolean; onAdd: () => void; onEdit: () => void; onHistory: () => void };

export default function AssessmentOverflowMenu({ name, canWrite, canEdit, onAdd, onEdit, onHistory }: AssessmentOverflowMenuProps) {
	const [open, setOpen] = useState(false);
	const root = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (!open) return;
		root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
		const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
		document.addEventListener('pointerdown', dismiss);
		return () => document.removeEventListener('pointerdown', dismiss);
	}, [open]);
	return <div ref={root} className="relative" onKeyDown={event => {
		if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
		if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
			event.preventDefault();
			const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') || [])];
			const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
			const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
			buttons[next]?.focus();
		}
	}}><button ref={trigger} type="button" aria-label={`${name} more actions`} aria-haspopup="menu" aria-expanded={open} title={`${name} more actions`} onClick={() => setOpen(!open)} className="flex size-10 items-center justify-center rounded-lg text-[#64716b] hover:bg-[#edf2ed] focus-visible:outline-2 focus-visible:outline-[#287b7c]"><MoreVertical aria-hidden="true" className="size-5" /></button>{open && <div role="menu" aria-label={`${name} secondary actions`} className="absolute top-11 right-0 z-20 w-56 max-w-[75vw] rounded-lg border border-[#d7e1d8] bg-white p-1 shadow-lg">{[{ label: 'Add ad-hoc assessment', icon: Plus, disabled: !canWrite, action: onAdd }, { label: 'Edit last entry', icon: Pencil, disabled: !canEdit, action: onEdit }, { label: 'View history', icon: History, disabled: false, action: onHistory }].map(item => <button key={item.label} type="button" role="menuitem" disabled={item.disabled} onClick={() => { setOpen(false); item.action(); }} className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-left text-xs text-[#52635c] hover:bg-[#eff5f0] focus:bg-[#eff5f0] focus:outline-none disabled:opacity-50"><item.icon aria-hidden="true" className="size-4 shrink-0" />{item.label}</button>)}</div>}</div>;
}