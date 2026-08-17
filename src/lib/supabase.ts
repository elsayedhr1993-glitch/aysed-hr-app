import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Employee {
  id: string;
  company_id?: string;
  full_name_ar: string;
  full_name_en?: string;
  employee_code?: string | null;
  hire_date?: string | null;
  gender?: 'male' | 'female' | string;
  status?: string;
  [key: string]: any;
}

export interface LeaveRequest {
  id: string;
  company_id: string;
  employee_id: string;
  leave_type: 'annual' | 'sick' | 'casual' | 'hajj' | 'maternity' | 'unpaid';
  start_date: string;
  end_date: string;
  days: number;
  unpaid_days?: number;
  reason?: string | null;
  status: string;
  created_at?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  [key: string]: any;
}

export interface LeaveBalance {
  id: string;
  company_id: string;
  employee_id: string;
  annual_used?: number;
  sick_used?: number;
  sick_half_used?: number;
  sick_unpaid_used?: number;
  casual_used?: number;
  hajj_used?: number;
  hajj_taken?: boolean;
  maternity_used?: number;
  unpaid_used?: number;
  [key: string]: any;
}
