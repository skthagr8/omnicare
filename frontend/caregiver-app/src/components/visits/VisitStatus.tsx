import clsx from 'clsx';

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  missed: 'bg-gray-100 text-gray-800',
};

export default function VisitStatus({ status }: { status: string }) {
  return (
    <span className={clsx(
      'px-2 py-1 rounded-full text-xs font-medium',
      statusColors[status] || 'bg-gray-100 text-gray-800'
    )}>
      {status.replace('_', ' ')}
    </span>
  );
}