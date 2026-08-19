// services/salaryRulesService.ts

export interface SalaryRuleResult {
  code: string;
  name: string;
  category: 'BASIC' | 'ALLOWANCE' | 'DEDUCTION' | 'NET';
  sequence: number;
  amount: number;
}

export interface ContractWageDetails {
  basicWage: number;
  allowances?: number;
  unpaidDays: number;
}

/**
 * قاعدة استقطاع إجازة بدون راتب (معيار قانون العمل الكويتي: الراتب / 26 * أيام الغياب)
 */
export function calculateUnpaidLeaveDeductionRule(contract: ContractWageDetails): SalaryRuleResult | null {
  // الشرط البرمجي: التحقق من وجود أيام غياب بدون راتب
  if (contract.unpaidDays <= 0 || contract.basicWage <= 0) {
    return null;
  }

  // المعادلة: (الراتب / 26) * عدد الأيام
  const dailyRate = contract.basicWage / 26;
  const deductionAmount = Number((contract.unpaidDays * dailyRate).toFixed(3));

  return {
    code: 'LEAVE_DED',
    name: 'استقطاع إجازة بدون راتب',
    category: 'DEDUCTION',
    sequence: 100,
    amount: -deductionAmount, // تظهر بالقيمة السالبة للاستقطاع من الراتب الصافي
  };
}

/**
 * دالة حساب صافي الراتب بعد تطبيق قواعد الاستقطاع
 */
export function computeFinalPayslipSalary(contract: ContractWageDetails): {
  basic: number;
  deductions: number;
  netSalary: number;
  rules: SalaryRuleResult[];
} {
  const rules: SalaryRuleResult[] = [];
  let totalDeductions = 0;

  const unpaidDeduction = calculateUnpaidLeaveDeductionRule(contract);
  if (unpaidDeduction) {
    rules.push(unpaidDeduction);
    totalDeductions += Math.abs(unpaidDeduction.amount);
  }

  const netSalary = Number((contract.basicWage + (contract.allowances || 0) - totalDeductions).toFixed(3));

  return {
    basic: contract.basicWage,
    deductions: totalDeductions,
    netSalary: Math.max(0, netSalary),
    rules,
  };
}
