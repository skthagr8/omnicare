export default function CaregiverStatusBadge({ status, styles }) {
  const style = styles[status] ?? styles.invited;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}
