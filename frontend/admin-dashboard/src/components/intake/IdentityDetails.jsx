'use client';

import { CalendarDays, ChevronDown } from 'lucide-react';

export default function IdentityDetails({ values, onChange }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_14px_-8px_rgba(15,23,42,0.16)]">
      <h2 className="text-sm font-bold text-[#2B2E33]">Identity Details</h2>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <label className="block"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">First Name</span><input name="firstName" value={values.firstName} onChange={onChange} className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:bg-white focus:ring-2 focus:ring-[#0F6B72]/15" /></label>
        <label className="block"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last Name</span><input name="lastName" value={values.lastName} onChange={onChange} className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:bg-white focus:ring-2 focus:ring-[#0F6B72]/15" /></label>
        <label className="col-span-2 block"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Date of Birth</span><span className="relative mt-2 block"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="dateOfBirth" type="date" value={values.dateOfBirth} onChange={onChange} className="w-full rounded-lg border border-slate-300 bg-slate-50/60 py-2 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:bg-white focus:ring-2 focus:ring-[#0F6B72]/15" /></span></label>
        <label className="relative col-span-2 block"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Assigned Gender</span><select name="gender" value={values.gender} onChange={onChange} className="mt-2 w-full appearance-none rounded-lg border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:bg-white focus:ring-2 focus:ring-[#0F6B72]/15"><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select><ChevronDown className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 text-slate-400" /></label>
      </div>
    </section>
  );
}
