export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export const VISIT_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  MISSED: 'missed',
} as const;

export const ASSESSMENT_TYPES = {
  TUG: 'tug',
  CMAI: 'cmai',
  BRADEN: 'braden',
  DELIRIUM: 'delirium',
} as const;

export const EMERGENCY_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;