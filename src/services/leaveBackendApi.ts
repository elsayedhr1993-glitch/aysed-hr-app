import { Employee, Contract, LeaveRequest, HrLeaveAllocation } from '../types';
import { 
  ServerLeaveBalanceResult, 
  ServerSettlementCalculationParams, 
  ServerSettlementCalculationResult,
  calculateServerFifoBalance,
  calculateServerSettlement,
  calculateServerWorkingDays
} from '../../server/leaveCalculatorServer';

export type { ServerLeaveBalanceResult, ServerSettlementCalculationParams, ServerSettlementCalculationResult };

/**
 * استدعاء الخادم لجلب رصيد الإجازات الموحد لموظف (Server-Side SSOT)
 */
export async function fetchServerLeaveBalance(
  employee: Employee,
  allocations: HrLeaveAllocation[] = [],
  leaves: LeaveRequest[] = [],
  contract?: Contract | null,
  asOfDate?: string
): Promise<ServerLeaveBalanceResult> {
  try {
    const response = await fetch('/api/leave/calculate-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee,
        allocations,
        leaves,
        contract,
        asOfDate
      })
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[Leave API Client] Falling back to shared deterministic engine:', err);
  }

  // Fallback to shared server logic (identically implemented) in case of network disconnect
  return calculateServerFifoBalance(employee, allocations, leaves, contract, asOfDate);
}

/**
 * استدعاء الخادم لجلب أرصدة كافة الموظفين دفعة واحدة لجدول التقارير والمراجعات
 */
export async function fetchServerBatchBalances(
  employees: Employee[],
  allocations: HrLeaveAllocation[] = [],
  leaves: LeaveRequest[] = [],
  contracts: Contract[] = [],
  asOfDate?: string
): Promise<Record<string, ServerLeaveBalanceResult>> {
  try {
    const response = await fetch('/api/leave/batch-balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employees,
        allocations,
        leaves,
        contracts,
        asOfDate
      })
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[Batch Leave API Client] Falling back to shared deterministic engine:', err);
  }

  // Fallback calculation using exact server engine logic
  const contractMap = new Map<string, any>();
  contracts.forEach((c) => {
    if (c && c.employeeId) contractMap.set(c.employeeId, c);
  });

  const results: Record<string, ServerLeaveBalanceResult> = {};
  for (const emp of employees) {
    if (!emp || !emp.id) continue;
    const empContract = contractMap.get(emp.id) || null;
    results[emp.id] = calculateServerFifoBalance(emp, allocations, leaves, empContract, asOfDate);
  }
  return results;
}

/**
 * استدعاء الخادم لحساب تصفية الإجازة وسند الصرف المالي
 */
export async function fetchServerSettlement(
  params: ServerSettlementCalculationParams
): Promise<ServerSettlementCalculationResult> {
  try {
    const response = await fetch('/api/leave/calculate-settlement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[Settlement API Client] Falling back to shared deterministic engine:', err);
  }

  return calculateServerSettlement(params);
}

/**
 * استدعاء الخادم لحساب أيام العمل واستبعاد الراحة الأسبوعية
 */
export async function fetchServerWorkingDays(
  startDate: string,
  endDate: string
): Promise<{ calendarDays: number; fridaysCount: number; workingDays: number }> {
  try {
    const response = await fetch('/api/leave/working-days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate })
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[Working Days API Client] Falling back to shared deterministic engine:', err);
  }

  return calculateServerWorkingDays(startDate, endDate);
}
