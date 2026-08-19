// services/leaveAccrualService.ts
import { supabase } from '../lib/supabase';

export interface AccrualPlan {
  name: string;
  monthly_accrual_rate: number; // 2.5 يوم شهرياً
  annual_total_days: number;   // 30 يوماً سنوياً
  accrual_frequency: 'monthly_end';
  country_standard: 'Kuwait_Labor_Law';
}

// دالة لحقن خطة الاستحقاق في قاعدة البيانات تلقائياً
export async function seedKuwaitAccrualPlan() {
  const defaultPlan: AccrualPlan = {
    name: 'خطة استحقاق Aysed الكويت (2.5 يوم شهرياً)',
    monthly_accrual_rate: 2.5,
    annual_total_days: 30,
    accrual_frequency: 'monthly_end',
    country_standard: 'Kuwait_Labor_Law',
  };

  try {
    const { data, error } = await supabase
      .from('leave_accrual_plans')
      .upsert([defaultPlan], { onConflict: 'name' });

    if (error) {
      console.warn('Note on seeding accrual plan:', error.message);
      return null;
    }

    return data;
  } catch (e) {
    console.warn('Supabase not connected or table missing, using local state model.');
    return null;
  }
}

// دالة حساب الرصيد المستحق تلقائياً حتى تاريخ اليوم
export function calculateAccruedBalance(hireDate: string): number {
  const start = new Date(hireDate);
  const now = new Date();
  const monthsWorked = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  
  if (monthsWorked <= 0) return 0;
  return Number((monthsWorked * 2.5).toFixed(2));
}
