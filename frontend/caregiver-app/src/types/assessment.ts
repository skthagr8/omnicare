export interface Assessment {
  id: string;
  client_id: string;
  caregiver_id: string;
  assessment_type: 'tug' | 'cmai' | 'braden' | 'delirium';
  score: Record<string, any>;
  completed_at: string;
  notes?: string;
}

export interface TUGScore {
  time_seconds: number;
  gait_stability: number;
  assistance_required: boolean;
}

export interface CMAIScore {
  frequency_score: number;
  disruptiveness_score: number;
}

export interface BradenScore {
  sensory_perception: number;
  moisture: number;
  activity: number;
  mobility: number;
  nutrition: number;
  friction_shear: number;
  total_score: number;
}