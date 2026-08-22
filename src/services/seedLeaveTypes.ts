// src/services/seedLeaveTypes.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../lib/supabase';

export const DEFAULT_LEAVE_TYPES = [
  { name: 'إجازة سنوية (Annual Leave)', code: 'ANNUAL', requires_allocation: true, is_unpaid: false },
  { name: 'إجازة مرضية (Sick Leave)', code: 'SICK', requires_allocation: false, is_unpaid: false },
  { name: 'إجازة بدون راتب (Unpaid)', code: 'UNPAID', requires_allocation: false, is_unpaid: true }
];

export async function ensureDefaultLeaveTypes(supabase: SupabaseClient) {
  if (!isSupabaseConfigured) {
    return;
  }
  try {
    const { count, error: countError } = await supabase
      .from('leave_types')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      // Supabase table might not exist yet or offline
      return;
    }

    // إذا كان الجدول فارغاً، يتم زرع الأنواع تلقائياً
    if (count === 0) {
      await supabase
        .from('leave_types')
        .insert(DEFAULT_LEAVE_TYPES);
    }
  } catch (err: any) {
    // Suppress network fetch errors gracefully if Supabase is not connected
    if (err?.message && err.message.includes('Failed to fetch')) {
      return;
    }
  }
}

