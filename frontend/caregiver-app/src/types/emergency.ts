export interface EmergencyEvent {
  id: string;
  client_id: string;
  caregiver_id?: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: {
    latitude: number;
    longitude: number;
  };
  details?: Record<string, any>;
  status: 'active' | 'resolved';
  created_at: string;
  resolved_at?: string;
}