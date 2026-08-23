import { Employee } from '../types';

/**
 * calculateNetWorkingDays
 * Excludes Fridays and public holidays from the date range.
 * Assumes a standard Kuwait work week where Friday is off.
 */
export function calculateNetWorkingDays(startDate: string, endDate: string, holidaysList: any[] = []): number {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) return 0;
  
  let netDays = 0;
  let current = new Date(start);
  
  while (current <= end) {
    // 5 = Friday
    const isFriday = current.getDay() === 5;
    
    // Check if it's a public holiday
    const dateString = current.toISOString().split('T')[0];
    const isHoliday = holidaysList.some(h => {
      if (h.date) return h.date === dateString;
      if (h.startDate && h.endDate) {
        return dateString >= h.startDate && dateString <= h.endDate;
      }
      return false;
    });

    if (!isFriday && !isHoliday) {
      netDays++;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return netDays;
}

export function computeLeaveRequest(
  employee: Employee, 
  startDate: string, 
  endDate: string, 
  holidaysList: any[] = [],
  totalAvailable: number = 0,
  ticketAllowance: number = 0
) {
  const totalNetDays = calculateNetWorkingDays(startDate, endDate, holidaysList);
  
  const paidDays = Number((Math.min(totalNetDays, Math.max(0, totalAvailable))).toFixed(2));
  const unpaidDays = Number((Math.max(0, totalNetDays - totalAvailable)).toFixed(2));
  const balanceAfter = Number((Math.max(0, totalAvailable - totalNetDays)).toFixed(2));
  
  // Kuwait Law: daily wage = gross / 26
  // Fallback to basic + allowances if grossSalary is missing or 0
  const grossSalary = Number((employee as any).grossSalary || (employee as any).totalSalary || (employee as any).salary || (employee as any).basicSalary || 0);
  const dailyWage = grossSalary > 0 ? (grossSalary / 26) : 0;
  
  const paidLeavePay = Math.round(paidDays * dailyWage * 1000) / 1000;
  const netPayable = paidLeavePay + (ticketAllowance || 0);

  return {
    totalNetDays,
    totalAvailable,
    paidDays,
    unpaidDays,
    balanceAfter,
    dailyWage,
    paidLeavePay,
    netPayable
  };
}

export interface LeaveMetricsResult {
  accruedBalance: number;
  totalBalance: number;
  paidDays: number;
  unpaidDays: number;
  dailyWage: number;
  totalLeavePay: number;
  endingBalance: number;
}

export const calculateAysedLeaveMetrics = (
  dateFrom: string,
  dateTo: string,
  netAvailable: number = 0,
  monthlyWage: number = 0,
  joiningDate: string = '2026-01-01',
  previousApprovedLeaves: number = 0,
  publicHolidays: string[] = [],
  leaveType: string = 'ANNUAL'
): LeaveMetricsResult => {
  const totalAvailable = Math.max(0, Number(netAvailable) || 0);

  // 1. Count requested days (excluding Fridays and public holidays)
  let requestedDays = 0;
  const current = new Date(dateFrom);
  const end = new Date(dateTo);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 5 = Friday
    const dateStr = current.toISOString().split('T')[0];
    if (dayOfWeek !== 5 && !publicHolidays.includes(dateStr)) {
      requestedDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  // 2. Split paid vs unpaid based on leaveType
  let paidDays = 0;
  let unpaidDays = 0;
  let endingBalance = totalAvailable;

  const isFullyPaidSpecialType = ['COMPENSATORY', 'SICK', 'MATERNITY', 'HAJJ', 'COMPASSIONATE', 'HOURLY_PERMISSION'].includes(leaveType);

  if (isFullyPaidSpecialType) {
    paidDays = requestedDays;
    unpaidDays = 0;
    endingBalance = totalAvailable; // Does not deduct from annual leave balance
  } else if (leaveType === 'UNPAID') {
    paidDays = 0;
    unpaidDays = requestedDays;
    endingBalance = totalAvailable;
  } else {
    // ANNUAL leave
    paidDays = Math.min(totalAvailable, requestedDays);
    unpaidDays = Math.max(0, requestedDays - totalAvailable);
    endingBalance = Math.max(0, totalAvailable - paidDays);
  }

  // 3. Article 70 Financial Calculation (Daily Wage = Wage / 26)
  const wage = Number(monthlyWage) || 0;
  const dailyWage = wage > 0 ? wage / 26 : 0;
  const leavePay = paidDays * dailyWage;

  return {
    accruedBalance: Number(totalAvailable.toFixed(2)),
    totalBalance: Number(totalAvailable.toFixed(2)),
    paidDays: Number(paidDays.toFixed(2)),
    unpaidDays: Number(unpaidDays.toFixed(2)),
    dailyWage: Number(dailyWage.toFixed(3)),
    totalLeavePay: Number(leavePay.toFixed(3)),
    endingBalance: Number(endingBalance.toFixed(2))
  };
};
