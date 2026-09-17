import { STATUS_STYLES } from './disputeData';

export default function StatusPill({ status }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}>{status}</span>;
}
