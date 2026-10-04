import { Flag } from 'lucide-react';
import type { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { acuityCode, acuityStrips, caregiverStyle, diagnosisStyle, initials, patientAge } from './dashboardStyles';

export default function PatientsRoster({ dashboard: state }: { dashboard: ReturnType<typeof useAdminDashboard> }) {
	return <section aria-label="Patients roster" className="flex min-h-0 min-w-0 flex-col bg-white">
		<div className="flex min-h-19 flex-wrap items-center justify-between gap-2 border-b border-[#edf0f3] px-5 py-4 sm:px-6"><div><h2 className="text-base font-bold">Patients</h2><p className="mt-1 text-xs text-[#7c8c98]">{state.filteredPatients.length} shown{state.dashboard?.patients ? ` of ${state.patients.length}` : ''}</p></div><span className="text-xs text-[#7c8c98]">Assignments for today</span></div>
		<div className="min-h-0 overflow-auto lg:flex-1">
			{state.loading && !state.dashboard ? <p role="status" className="px-6 py-12 text-sm text-[#637480]">Loading patients...</p> : state.dashboard?.patients == null ? <p role="status" className="px-6 py-12 text-sm leading-6 text-[#637480]">Patient roster unavailable. Refresh when connected.</p> : <>
				<table className="w-full min-w-[700px] border-collapse text-left"><caption className="sr-only">Patient roster; select a patient to view their appointments today.</caption><thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#e9edf1]"><tr className="text-[10px] font-semibold uppercase text-[#788995]"><th scope="col" className="w-1.5 p-0"><span className="sr-only">Acuity</span></th><th scope="col" className="px-4 py-3">Patient Name</th><th scope="col" className="px-3 py-3">Diagnosis Category</th><th scope="col" className="px-3 py-3">Age</th><th scope="col" className="px-3 py-3">Assigned Caregiver</th><th scope="col" className="px-3 py-3">Caregiver Status</th></tr></thead><tbody>
					{state.filteredPatients.map(patient => {
						const selected = state.selectedPatient?.id === patient.id;
						const session = state.representative.get(patient.id);
						const caregiver = state.caregivers.get(session?.caregiver_id || '');
						const status = caregiverStyle(caregiver?.status || 'unknown');
						const diagnosis = diagnosisStyle(patient.diagnosis_category);
						const acuity = acuityCode(patient.acuity_tier);
						return <tr key={patient.id} onClick={() => state.selectPatient(patient.id)} className={`cursor-pointer transition-colors ${selected ? 'bg-[#e9f5f4] [&>td]:border-[#d1e7e4]' : 'even:bg-slate-50/60 hover:bg-[#f1f7f7]'}`}>
							<td className="relative w-1.5 p-0"><span title={`${acuity} acuity`} aria-label={`${acuity} acuity`} className={`absolute inset-0 ${acuityStrips[acuity] || 'bg-slate-300'}`} /></td>
							<td className="border-b border-[#edf0f3] px-4 py-5"><button type="button" aria-pressed={selected} aria-controls="dashboard-appointments" onClick={event => { event.stopPropagation(); state.selectPatient(patient.id); }} className="min-h-10 text-left text-sm leading-5 font-bold text-[#29343d] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#287b7c]">{patient.full_name}</button>{state.flaggedIds.has(patient.id) && <span title="Unresolved AI risk flag" className="ml-2 inline-flex align-middle text-amber-700"><Flag aria-label="Unresolved AI risk flag" className="size-3.5" /></span>}</td>
							<td className="border-b border-[#edf0f3] px-3 py-5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] leading-4 font-medium ${diagnosis.className}`}>{diagnosis.label}</span></td>
							<td className="border-b border-[#edf0f3] px-3 py-5 text-xs text-[#637480]">{patientAge(patient.date_of_birth, state.now)}</td>
							<td className="border-b border-[#edf0f3] px-3 py-5"><div className="flex items-center gap-2"><span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e4eced] text-[10px] font-semibold text-[#54727b]">{initials(caregiver?.full_name || '') || '?'}</span><span className="text-xs leading-5 text-[#52616d]">{caregiver?.full_name || (session ? 'Caregiver unavailable' : state.dashboard?.sessions === null ? 'Assignment unavailable' : 'No visit today')}</span></div></td>
							<td className="border-b border-[#edf0f3] px-3 py-5"><span className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] text-[#637480]"><span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${status.dot}`} />{session ? status.label : '-'}</span></td>
						</tr>;
					})}
				</tbody></table>
				{!state.filteredPatients.length && <p role="status" className="px-6 py-12 text-center text-sm text-[#637480]">No patients match the current filters.</p>}
			</>}
		</div>
		{state.dashboard?.caregivers === null && <p role="status" className="border-t border-[#edf0f3] px-5 py-3 text-xs text-[#7c8c98]">Caregiver details are unavailable. Appointments remain visible.</p>}
	</section>;
}