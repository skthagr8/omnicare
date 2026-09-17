export const PINS = [
  { id: 'p1', name: 'Marcus J.', status: 'available', time: '14:05', top: '32%', left: '39%' },
  { id: 'p2', name: 'Elena W.', status: 'in-service', time: '14:18', top: '25%', left: '76%' },
  { id: 'p3', name: 'Sarah L.', status: 'en-route', time: '14:20', top: '55%', left: '56%' },
  { id: 'p4', name: 'David K.', status: 'emergency', time: '14:22', top: '48%', left: '68%' },
  { id: 'p5', name: 'Renee P.', status: 'available', time: '14:15', top: '73%', left: '31%' },
];

export const STATUS_STYLES = {
  available: { dot: 'bg-emerald-500', ring: 'ring-emerald-500/30', label: 'AVAILABLE', text: 'text-emerald-600' },
  'en-route': { dot: 'bg-amber-500', ring: 'ring-amber-500/30', label: 'EN-ROUTE', text: 'text-amber-600' },
  'in-service': { dot: 'bg-sky-500', ring: 'ring-sky-500/30', label: 'IN-SERVICE', text: 'text-sky-600' },
  emergency: { dot: 'bg-rose-600', ring: 'ring-rose-600/30', label: 'EMERGENCY', text: 'text-rose-600' },
};

export const PRIORITY_QUEUE = [
  { id: 'C1', name: 'Robert Miller', age: 78, condition: 'Post-Op Recovery', acuity: 'critical', assignedTo: 'David K.', nextWindow: '15:00' },
  { id: 'C2', name: 'Alice Thompson', age: 82, condition: 'Mobility Support', acuity: 'moderate', assignedTo: 'Sarah L.', nextWindow: '16:30' },
  { id: 'C3', name: 'Henry Ford', age: 74, condition: 'Routine Wellness', acuity: 'routine', assignedTo: 'Marcus J.', nextWindow: '17:15' },
  { id: 'C4', name: 'Margaret Chen', age: 89, condition: 'Critical Monitoring', acuity: 'critical', assignedTo: 'Unassigned', nextWindow: '—' },
];

export const ACUITY_STYLES = {
  critical: 'border-rose-500',
  moderate: 'border-amber-500',
  routine: 'border-emerald-500',
};

export const ACUITY_TEXT = {
  critical: 'text-rose-600',
  moderate: 'text-amber-600',
  routine: 'text-emerald-600',
};
