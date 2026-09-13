export interface Visit {
  id: string;
  client_id: string;
  client_name: string;
  client_address: string;
  caregiver_id: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  notes?: string;
}

export interface CheckInData {
  visit_id: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp: string;
}