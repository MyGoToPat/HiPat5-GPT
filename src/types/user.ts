export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  dob?: string;
  bio?: string;
  beta_user: boolean;
  role: string;
  created_at: string;
  updated_at: string;
}