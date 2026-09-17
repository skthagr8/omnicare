'use client';

import { MapPin } from 'lucide-react';

export default function AddressDetails({ values, onChange }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_3px_14px_-8px_rgba(15,23,42,0.16)]">
      <h2 className="text-sm font-bold text-[#2B2E33]">Primary Address</h2>
      <div className="mt-6 space-y-4">
        <label className="block"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Street Address</span><span className="relative mt-2 block"><MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="street" value={values.street} onChange={onChange} className="w-full rounded-lg border border-slate-300 bg-slate-50/60 py-2 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:bg-white focus:ring-2 focus:ring-[#0F6B72]/15" /></span></label>
        <div className="grid grid-cols-2 gap-3"><label className="block"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">City</span><input name="city" value={values.city} onChange={onChange} className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:bg-white focus:ring-2 focus:ring-[#0F6B72]/15" /></label><label className="block"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Postal Code</span><input name="postalCode" value={values.postalCode} onChange={onChange} inputMode="numeric" className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:bg-white focus:ring-2 focus:ring-[#0F6B72]/15" /></label></div>
        <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Location Preview</p><div className="relative mt-2 h-44 overflow-hidden rounded-lg border border-slate-200 bg-[#d9ded9]" aria-label="Map preview for the entered address"><div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(28deg, transparent 44%, #f7f5ee 45%, #f7f5ee 49%, transparent 50%), linear-gradient(112deg, transparent 37%, #f7f5ee 38%, #f7f5ee 42%, transparent 43%), linear-gradient(4deg, transparent 69%, #c1cfc5 70%, #c1cfc5 72%, transparent 73%), linear-gradient(70deg, transparent 25%, #c1cfc5 26%, #c1cfc5 28%, transparent 29%)', backgroundSize: '130px 110px, 170px 140px, 190px 150px, 150px 120px' }} /><div className="absolute left-[54%] top-[45%] flex -translate-x-1/2 -translate-y-full flex-col items-center"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F6B72] text-white shadow-[0_3px_10px_rgba(15,107,114,0.4)]"><MapPin className="h-4 w-4" fill="currentColor" /></span><span className="h-2 w-2 -translate-y-1 rounded-full bg-[#0F6B72]" /></div><div className="absolute bottom-2 left-2 rounded bg-white/85 px-2 py-1 text-[10px] text-slate-500 backdrop-blur-sm">Address confirmation area</div></div></div>
      </div>
    </section>
  );
}
