import { ClipboardList, History, Pill, Stethoscope } from 'lucide-react';
import type { CareTab } from '@/hooks/usePointOfCare';

const workflowTabs = [
	{ id: 'tasks' as CareTab, label: 'Tasks', icon: ClipboardList },
	{ id: 'assessments' as CareTab, label: 'Assessments', icon: Stethoscope },
	{ id: 'medication' as CareTab, label: 'Medication', icon: Pill },
];

export default function CareTabs({ activeTab, onChange, includeHistory = false }: { activeTab: CareTab; onChange: (tab: CareTab) => void; includeHistory?: boolean }) {
	const tabs = includeHistory ? [...workflowTabs, { id: 'history' as CareTab, label: 'History', icon: History }] : workflowTabs;
	return (
		<div role="tablist" aria-label="Point of care" className={`mx-auto mb-9 grid w-full rounded-full border border-[#dce9e5] bg-[#eff6f4] p-1 ${includeHistory ? 'max-w-xl grid-cols-4' : 'max-w-md grid-cols-3'}`}>
			{tabs.map((tab, index) => <button key={tab.id} id={`care-tab-${tab.id}`} role="tab" type="button" aria-selected={activeTab === tab.id} aria-controls={`care-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => onChange(tab.id)} onKeyDown={event => {
				const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
				if (next !== null) { event.preventDefault(); onChange(tabs[next].id); document.getElementById(`care-tab-${tabs[next].id}`)?.focus(); }
			}} className={`relative flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#287b7c] sm:text-sm ${includeHistory ? 'px-1 text-[10px] sm:px-2' : 'px-2 text-xs'} ${activeTab === tab.id ? 'bg-white text-[#287b7c] shadow-sm' : 'text-[#64716b] hover:bg-white/60'}`}><tab.icon aria-hidden="true" className="hidden size-4 shrink-0 sm:block" /><span>{tab.label}</span>{activeTab === tab.id && <span aria-hidden="true" className="absolute right-5 bottom-1.5 left-5 h-0.5 rounded-full bg-[#63afaf]" />}</button>)}
		</div>
	);
}