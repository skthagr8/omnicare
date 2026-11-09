'use client';

import { useMemo, useState } from 'react';
import { Check, CheckCircle2, ChevronDown, Mail, MoreHorizontal, Search, UserPlus, X } from 'lucide-react';

// --- Data ---
// Must match the backend diagnosis_category enum.
export const CERTIFICATION_OPTIONS = [
  { id: 'dementia', label: 'Dementia Care' },
  { id: 'parkinsons', label: "Parkinson's Care" },
  { id: 'post_stroke', label: 'Post-Stroke Rehab' },
  { id: 'other', label: 'Other' },
];

export const CAREGIVER_STATUS_STYLES = {
  invited: { label: 'Invited', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  active: { label: 'Active', className: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  expired: { label: 'Invite expired', className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
  inactive: { label: 'Inactive', className: 'bg-cream-deep/50 text-slate-500 ring-1 ring-coral-soft' },
};

export function getCertificationLabels(certificationIds) {
  return certificationIds.map(
    (id) => CERTIFICATION_OPTIONS.find((option) => option.id === id)?.label ?? id,
  );
}

// --- CaregiverStatusBadge ---
export function CaregiverStatusBadge({ status, styles = CAREGIVER_STATUS_STYLES }) {
  const style = styles[status] ?? styles.invited;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}

// --- CaregiverDirectoryTable ---
export function CaregiverDirectoryTable({ caregivers }) {
  return (
    <div className="overflow-hidden rounded-xl border border-coral-soft">
      <table className="min-w-full divide-y divide-coral-soft text-left">
        <thead className="bg-cream text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <tr>
            <th className="px-5 py-3">Caregiver</th>
            <th className="px-5 py-3">Org</th>
            <th className="px-5 py-3">Certifications</th>
            <th className="px-5 py-3">Verification Source</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-coral-soft bg-white text-sm text-slate-700">
          {caregivers.map((caregiver) => (
            <tr key={caregiver.id} className="hover:bg-cream">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/10 text-[10px] font-semibold text-teal">
                    {caregiver.firstName[0]}
                    {caregiver.lastName[0]}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">{caregiver.firstName} {caregiver.lastName}</p>
                    <p className="text-[11px] text-slate-500">{caregiver.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-sm text-slate-600">{caregiver.org}</td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {getCertificationLabels(caregiver.certificationIds).map((label) => (
                    <span key={label} className="rounded-full bg-cream-deep/50 px-2 py-1 text-[10px] font-semibold text-slate-600">
                      {label}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-5 py-4 text-xs text-slate-500">{caregiver.verificationSource}</td>
              <td className="px-5 py-4">
                <CaregiverStatusBadge status={caregiver.status} styles={CAREGIVER_STATUS_STYLES} />
              </td>
              <td className="px-5 py-4 text-right">
                <button className="rounded-lg p-1.5 text-slate-400 hover:bg-cream-deep/50 hover:text-slate-600" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- CertificationMultiSelect ---
export function CertificationMultiSelect({ options, selectedIds, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  const selectedOptions = options.filter((option) => selectedIds.includes(option.id));

  const toggleOption = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeOption = (id) => {
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-lg border border-coral-soft bg-white px-3 py-2.5 text-left text-sm text-slate-700 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
      >
        <span className={selectedOptions.length ? 'text-slate-700' : 'text-slate-400'}>
          {selectedOptions.length ? `${selectedOptions.length} certification${selectedOptions.length > 1 ? 's' : ''} selected` : 'Select certifications'}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 rounded-full bg-teal-soft px-2.5 py-1 text-xs font-medium text-teal"
            >
              {option.label}
              <button
                type="button"
                onClick={() => removeOption(option.id)}
                className="text-teal/70 hover:text-teal"
                aria-label={`Remove ${option.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-coral-soft bg-white shadow-[0_16px_40px_-16px_rgba(15,23,42,0.25)]">
          <div className="relative border-b border-coral-soft p-2">
            <Search className="pointer-events-none absolute left-4.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="text"
              placeholder="Search certifications..."
              className="w-full rounded-lg border border-transparent bg-cream py-2 pl-8 pr-3 text-sm text-slate-700 outline-none focus:border-teal/40"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-400">No matching certifications</li>
            )}
            {filteredOptions.map((option) => {
              const checked = selectedIds.includes(option.id);
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-cream"
                  >
                    <span>{option.label}</span>
                    {checked && <Check className="h-3.5 w-3.5 text-teal" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-coral-soft p-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-cream py-1.5 text-xs font-semibold text-slate-600 hover:bg-cream-deep/50"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- CreateCaregiverForm ---
const initialFormState = {
  email: '',
  firstName: '',
  lastName: '',
  certificationIds: [],
  verificationSource: '',
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function CreateCaregiverForm({ onClose, onCreate, organizationName }) {
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setServerError('');
    setSubmitting(true);
    try {
      // onCreate throws an Error with a user-facing message if the invite fails.
      await onCreate({ ...form, email: form.email.trim() });
    } catch (err) {
      setServerError(err?.message || 'The invitation could not be sent.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl border border-white/70 bg-white p-6 shadow-[0_20px_60px_-18px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-soft text-teal">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">Caregiver Directory</p>
              <h2 className="mt-1 text-lg font-semibold text-ink">New Caregiver Record</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-cream-deep/50 hover:text-slate-600" aria-label="Close">
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
                className="w-full rounded-lg border border-coral-soft bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
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
                className="mt-2 w-full rounded-lg border border-coral-soft bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
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
                className="mt-2 w-full rounded-lg border border-coral-soft bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
              />
              {errors.lastName && <p className="mt-1 text-xs font-medium text-rose-600">{errors.lastName}</p>}
            </label>
          </div>

          <label>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Org Association</span>
            <input
              value={organizationName || 'Your organisation'}
              readOnly
              aria-readonly="true"
              className="mt-2 w-full cursor-default rounded-lg border border-coral-soft bg-cream px-3 py-2.5 text-sm text-slate-600 outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">Caregivers join the organisation of the admin who invites them.</p>
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
                className="mt-2 w-full rounded-lg border border-coral-soft bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
              />
              <p className="mt-1 text-[11px] text-slate-400">Reference the agency's internal hiring record used to verify these certifications.</p>
              {errors.verificationSource && <p className="mt-1 text-xs font-medium text-rose-600">{errors.verificationSource}</p>}
            </label>
          </div>

          {serverError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {serverError}
            </p>
          )}

          <div className="mt-2 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-cream">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1b8a7f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Sending invite…' : <>Create &amp; Send Invite</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- InviteToast ---
export function InviteToast({ message }) {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex justify-end">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.35)]">
        <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-teal-500" />
        {message}
      </div>
    </div>
  );
}
