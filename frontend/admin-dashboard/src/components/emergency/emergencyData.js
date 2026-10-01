export const PROTOCOL_STAGES = [
  { id: 'alert', label: 'Alert Triggered', detail: 'Emergency SOS signal received from Room 402 wearable.', time: '14:22:05' },
  { id: 'acknowledged', label: 'Acknowledged', detail: 'Protocol takeover initiated by fallback admin.', time: '14:23:12' },
  { id: 'family', label: 'Family Notified', detail: 'Automated notification queue pending primary contact reply.', time: null },
  { id: 'ems', label: 'EMS Dispatched', detail: 'Emergency medical services request on standby.', time: null },
  { id: 'arrival', label: 'Estimated Arrival', detail: 'Awaiting responder GPS signal.', time: null },
];

export const DELIVERY_STATES = {
  pending: { label: 'Message Pending', dot: 'bg-amber-400 animate-pulse', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  delivered: { label: 'Confirmed Delivered', dot: 'bg-emerald-500', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  failed: { label: 'Failed (Retry x2)', dot: 'bg-rose-500', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
};
