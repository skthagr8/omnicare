'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';

const EMPTY_CONTACT = { name: '', relationship: '', phone: '', address: '', email: '' };

export default function AddContactCard({ onAdd }) {
  const [open, setOpen] = React.useState(false);
  const [contact, setContact] = React.useState(EMPTY_CONTACT);

  const update = (event) => setContact((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    if (!contact.name.trim() || !contact.relationship.trim()) return;
    onAdd({ ...contact, initials: contact.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() });
    setContact(EMPTY_CONTACT);
    setOpen(false);
  };

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="flex min-h-56 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/40 p-5 text-center transition-colors hover:border-[#0F6B72] hover:bg-white"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0F6B72]"><Plus className="h-5 w-5" /></span><span className="mt-3 text-sm font-semibold text-slate-600">Add Contact</span><span className="mt-1 text-[11px] text-slate-400">Include secondary or emergency medical contacts</span></button>;

  return <form onSubmit={submit} className="rounded-xl border border-[#0F6B72]/30 bg-white p-5 shadow-[0_3px_14px_-8px_rgba(15,23,42,0.16)]"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-[#2B2E33]">New Contact</h2><button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button></div><div className="mt-4 grid grid-cols-2 gap-3">{[['name', 'Full name'], ['relationship', 'Relationship'], ['phone', 'Mobile'], ['email', 'Email address'], ['address', 'Residence']].map(([name, label]) => <label key={name} className={name === 'address' ? 'col-span-2' : ''}><span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><input name={name} value={contact[name]} onChange={update} required={name === 'name' || name === 'relationship'} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#0F6B72] focus:bg-white" /></label>)}</div><button type="submit" className="mt-4 w-full rounded-lg bg-[#0F6B72] py-2 text-xs font-semibold text-white hover:bg-[#0d5b61]">Add Contact</button></form>;
}
