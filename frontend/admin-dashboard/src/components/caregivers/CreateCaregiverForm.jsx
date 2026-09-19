'use client';

import { useState } from 'react';
import { Mail, UserPlus, X } from 'lucide-react';
import CertificationMultiSelect from './CertificationMultiSelect';
import { CERTIFICATION_OPTIONS, ORG_OPTIONS } from './caregiverData';

const initialFormState = {
  email: '',
  firstName: '',
  lastName: '',
  org: ORG_OPTIONS[0],
  certificationIds: [],
  verificationSource: '',
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function CreateCaregiverForm({ onClose, onCreate }) {
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!isValidEmail(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (form.certificationIds.length === 0) nextErrors.certifications = 'Select at least one certification.';
    if (!form.verificationSource.trim()) nextErrors.verificationSource = 'Reference the agency hiring record used to verify these certifications.';
    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onCreate({ ...form, email: form.email.trim() });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl border border-white/70 bg-white p-6 shadow-[0_20px_60px_-18px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF6F4] text-[#0F6B72]">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0F6B72]">Caregiver Directory</p>
              <h2 className="mt-1 text-lg font-bold text-[#2B2E33]">New Caregiver Record</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Email</span>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={form.email}
                onChange={updateField('email')}
                type="email"
                placeholder="caregiver@omnicare.io"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:ring-2 focus:ring-[#0F6B72]/15"
              />
            </div>
            {errors.email && <p className="mt-1 text-xs font-medium text-rose-600">{errors.email}</p>}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">First Name</span>
              <input
                value={form.firstName}
                onChange={updateField('firstName')}
                type="text"
                placeholder="Jordan"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:ring-2 focus:ring-[#0F6B72]/15"
              />
              {errors.firstName && <p className="mt-1 text-xs font-medium text-rose-600">{errors.firstName}</p>}
            </label>
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last Name</span>
              <input
                value={form.lastName}
                onChange={updateField('lastName')}
                type="text"
                placeholder="Reyes"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:ring-2 focus:ring-[#0F6B72]/15"
              />
              {errors.lastName && <p className="mt-1 text-xs font-medium text-rose-600">{errors.lastName}</p>}
            </label>
          </div>

          <label>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Org Association</span>
            <select
              value={form.org}
              onChange={updateField('org')}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:ring-2 focus:ring-[#0F6B72]/15"
            >
              {ORG_OPTIONS.map((org) => (
                <option key={org}>{org}</option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Certifications</span>
            <div className="mt-2">
              <CertificationMultiSelect
                options={CERTIFICATION_OPTIONS}
                selectedIds={form.certificationIds}
                onChange={(ids) => setForm((current) => ({ ...current, certificationIds: ids }))}
              />
            </div>
            {errors.certifications && <p className="mt-1 text-xs font-medium text-rose-600">{errors.certifications}</p>}

            <label className="mt-3 block">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Verification Source</span>
              <input
                value={form.verificationSource}
                onChange={updateField('verificationSource')}
                type="text"
                placeholder="e.g. HR-00318 · agency hiring record reference"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:ring-2 focus:ring-[#0F6B72]/15"
              />
              <p className="mt-1 text-[11px] text-slate-400">Reference the agency's internal hiring record used to verify these certifications.</p>
              {errors.verificationSource && <p className="mt-1 text-xs font-medium text-rose-600">{errors.verificationSource}</p>}
            </label>
          </div>

          <div className="mt-2 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#0F6B72] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0d5b61]">
              Create &amp; Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
