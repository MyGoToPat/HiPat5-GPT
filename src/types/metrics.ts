// Data types based on the PRD specifications
export interface FrequencyData {
  date: string;
  workout_type: 'Resistance' | 'Cardio' | 'Hybrid' | 'Recovery' | 'Rest';
  duration_min: number;
  volume_lbs: number;
  scheduled: boolean;
  missed_reason?: string;
}

export interface RestData {
  date: string;
  sleep_duration_min: number;
  bed_time: string;
  wake_time: string;
  rem_min: number;
  deep_min: number;
  light_min: number;
  wakenings: number;
  sex_flag: boolean;
  supplement_stack: string[];
}

export interface EnergyData {
  date: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  fiber_g: number;
  salt_g: number;
  water_l: number;
  first_meal_time: string;
  last_meal_time: string;
  tdee: number;
  bmr: number;
}

export interface EffortData {
  session_id: string;
  exercise: string;
  sets: number;
  reps: number;
  weight_lbs: number;
  rpe: number;
  rest_sec: number;
  muscle_group: string;
}

export interface MetricAlert {
  id: string;
  type: 'consistency_nudge' | 'fatigue_flag' | 'sleep_debt' | 'circadian_drift' | 'protein_insufficient' | 'overreaching' | 'pr_achieved';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
  dismissed: boolean;
}

export interface CrossMetricInsight {
  id: string;
  title: string;
  description: string;
  correlation: number;
  trend: 'positive' | 'negative' | 'neutral';
  actionable: boolean;
}