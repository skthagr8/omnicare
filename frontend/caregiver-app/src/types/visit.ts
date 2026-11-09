export type VisitStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'missed';

// These categories follow the thresholds in your Python script.
export type CognitiveDeclineLevel =
  | 'significant_decline'
  | 'moderate_decline'
  | 'mild_decline'
  | 'stable'
  | 'improvement'
  | 'unknown';

// Result returned by the cognitive-decline prediction service.
export interface CognitiveDeclineRisk {
  // Raw continuous LSTM prediction, NOT a probability.
  score: number;

  // Interpretation of the raw score.
  level: CognitiveDeclineLevel;
}

export interface Visit {
  id: string;
  client_id: string;
  caregiver_id: string;

  scheduled_start: string;
  scheduled_end: string;

  visit_date?: string;

  status: VisitStatus;

  check_in_at?: string | null;
  check_out_at?: string | null;
  check_in_geofence_verified?: boolean | null;
}

// A Visit enriched with the client's latest cognitive prediction.
// This is a frontend queue type, not the raw backend session response.
export type QueueVisit = Visit & {
  cognitive_decline_risk?: CognitiveDeclineRisk | null;
};


export interface CheckInData {
  visit_id: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp: string;
}