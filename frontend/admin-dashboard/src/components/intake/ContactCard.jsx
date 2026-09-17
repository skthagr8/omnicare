'use client';

import { Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';

export default function ContactCard({ contact, primary, onRemove }) {
  return (
    <article className={`relative rounded-xl border bg-white p-5 shadow-[0_3px_14px_-8px_rgba(15,23,42,0.16)] ${primary ? 'border-t-4 border-t-[#0F6B72] border-x-slate-200 border-b-slate-200' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E7F3F4] text-sm font-semibold text-[#0F6B72]">{contact.initials}</span><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="text-sm font-bold text-[#2B2E33]">{contact.name}</h2>{primary && <span className="rounded-full bg-[#E7F3F4] px-2 py-0.5 text-[9px] font-semibold text-[#0F6B72]">Primary</span>}</div><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><ShieldCheck className="h-3 w-3 text-slate-400" />{contact.relationship}</p></div></div>
      <div className="mt-5 grid grid-cols-2 gap-4"><div className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Mobile</p><p className="mt-0.5 text-xs text-slate-600">{contact.phone}</p></div></div><div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Residence</p><p className="mt-0.5 text-xs leading-relaxed text-slate-600">{contact.address}</p></div></div></div>
      <div className="mt-4 flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Email Address</p><p className="mt-0.5 text-xs text-slate-600">{contact.email}</p></div></div>
      {!primary && <button type="button" onClick={() => onRemove(contact.id)} className="absolute right-4 top-4 text-[10px] font-medium text-slate-400 hover:text-rose-600">Remove</button>}
    </article>
  );
}
