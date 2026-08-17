import { Employee, LeaveBalance } from './supabase';
import { get_aysed_official_balance } from '../utils/kuwaitLaw';

export type LeaveType = 'annual' | 'sick' | 'casual' | 'hajj' | 'maternity' | 'unpaid';

export function countLeaveDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    // Exclude Friday (Day 5 in JS Date: 0=Sun, 5=Fri, 6=Sat)
    if (current.getDay() !== 5) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return Math.max(1, count);
}

export function calcAnnualAccrual(asOfDate: Date = new Date(), hireDate: string | null = null): number {
  return get_aysed_official_balance(hireDate, asOfDate);
}

export function getAnnualRemaining(balance: LeaveBalance | null, accrual: number): number {
  const used = balance?.annual_used ?? 0;
  return Math.max(0, accrual - used);
}

export function getSickRemaining(balance: LeaveBalance | null): number {
  const used = (balance?.sick_used ?? 0) + (balance?.sick_half_used ?? 0) + (balance?.sick_unpaid_used ?? 0);
  return Math.max(0, 15 - used); // 15 days full pay per Kuwait Law
}

export function getCasualRemaining(balance: LeaveBalance | null): number {
  const used = balance?.casual_used ?? 0;
  return Math.max(0, 5 - used); // 5 days casual leave per year
}

export function getHajjRemaining(balance: LeaveBalance | null): number {
  if (balance?.hajj_taken) return 0;
  const used = balance?.hajj_used ?? 0;
  return Math.max(0, 14 - used); // 14 days once during service
}

export function getMaternityRemaining(balance: LeaveBalance | null): number {
  const used = balance?.maternity_used ?? 0;
  return Math.max(0, 70 - used); // 70 days maternity leave
}

export function checkLeaveBalance(
  type: LeaveType,
  requestedDays: number,
  emp: Employee | null,
  balance: LeaveBalance | null,
  accrual: number
): { ok: boolean; remaining: number; messageAr: string; messageEn: string } {
  if (type === 'unpaid') {
    return { ok: true, remaining: 999, messageAr: 'إجازة بدون أجر مقبولة', messageEn: 'Unpaid leave accepted' };
  }

  let remaining = 0;
  let typeNameAr = '';

  switch (type) {
    case 'annual':
      remaining = getAnnualRemaining(balance, accrual);
      typeNameAr = 'السنوية';
      break;
    case 'sick':
      remaining = getSickRemaining(balance);
      typeNameAr = 'المرضية';
      break;
    case 'casual':
      remaining = getCasualRemaining(balance);
      typeNameAr = 'الطارئة/العارضة';
      break;
    case 'hajj':
      remaining = getHajjRemaining(balance);
      typeNameAr = 'الحج';
      break;
    case 'maternity':
      remaining = getMaternityRemaining(balance);
      typeNameAr = 'الوضع';
      break;
  }

  if (requestedDays <= remaining) {
    return {
      ok: true,
      remaining,
      messageAr: `الرصيد كافٍ (${remaining.toFixed(1)} يوم متاح)`,
      messageEn: `Sufficient balance (${remaining.toFixed(1)} days available)`,
    };
  }

  return {
    ok: false,
    remaining,
    messageAr: `الرصيد المتبقي (${remaining.toFixed(1)} يوم) غير كافٍ لطلب (${requestedDays} يوم) من الإجازة ${typeNameAr}`,
    messageEn: `Remaining balance (${remaining.toFixed(1)} days) is insufficient for ${requestedDays} days of ${type} leave`,
  };
}
