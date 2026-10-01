'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export default function CertificationMultiSelect({ options, selectedIds, onChange }) {
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
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-700 outline-none focus:border-[#0F6B72] focus:ring-2 focus:ring-[#0F6B72]/15"
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
              className="inline-flex items-center gap-1 rounded-full bg-[#EAF6F4] px-2.5 py-1 text-xs font-medium text-[#0F6B72]"
            >
              {option.label}
              <button
                type="button"
                onClick={() => removeOption(option.id)}
                className="text-[#0F6B72]/70 hover:text-[#0F6B72]"
                aria-label={`Remove ${option.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_-16px_rgba(15,23,42,0.25)]">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-4.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="text"
              placeholder="Search certifications..."
              className="w-full rounded-lg border border-transparent bg-slate-50 py-2 pl-8 pr-3 text-sm text-slate-700 outline-none focus:border-[#0F6B72]/40"
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
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span>{option.label}</span>
                    {checked && <Check className="h-3.5 w-3.5 text-[#0F6B72]" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-slate-100 p-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-slate-50 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
