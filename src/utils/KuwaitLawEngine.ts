import { Employee, Contract, LeaveRequest, AttendanceRecord } from '../types';

export interface PrivateSectorEmployeeStatement {
  employeeId: string;
  civilId: string;
  name: string;
  jobTitle: string;
  department: string;
  
  // بنود الراتب
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  grossSalary: number;
  dailyWage: number;   // الراتب الإجمالي ÷ 26 يوم
  hourlyWage: number;  // الأجر اليومي ÷ 8 ساعات

  // سجل الحضور والخصومات
  absentDays: number;
  absenceDeduction: number;
  overtimeHours: number;
  overtimePay: number; // 1.25x

  // صافي الراتب النهائي لنظام WPS (بدون أي خصم تأمينات)
  netSalaryWPS: number;

  // الإجازات ونهاية الخدمة
  leaveBalance: number;
  leaveEncashmentValue: number; // بدل الإجازات نقداً (الرصيد × أجر اليوم)
  serviceYears: number;
  indemnityAmount: number;      // مكافأة نهاية الخدمة التراكمية
}

export class KuwaitLawEngine {

  /**
   * حساب مستحقات موظف القطاع الخاص (قانون العمل الكويتي رقم 6 لسنة 2010)
   */
  public static calculateEmployeeFinancials(
    employee: Employee,
    contract: Contract | undefined,
    leaves: LeaveRequest[] = [],
    attendance: AttendanceRecord[] = []
  ): PrivateSectorEmployeeStatement {
    const basic = Number(contract?.basicSalary) || 0;
    const housing = Number(contract?.housingAllowance) || 0;
    const transport = Number(contract?.transportAllowance) || 0;
    const other = Number((contract as any)?.otherAllowance || (contract as any)?.otherAllowances) || 0;
    const gross = basic + housing + transport + other;

    // احتساب أجر اليوم على أساس 26 يوماً (المادة 55)
    const dailyWage = gross > 0 ? +(gross / 26).toFixed(3) : 0;
    const hourlyWage = dailyWage > 0 ? +(dailyWage / 8).toFixed(3) : 0;

    // احتساب الغياب
    const empAttendance = attendance.filter(a => a.employeeId === employee.id);
    const absentDays = empAttendance.filter(a => (a.status as string) === 'غائب' || a.status === 'ABSENT').length;
    const absenceDeduction = +(absentDays * dailyWage).toFixed(3);

    // الساعات الإضافية
    const overtimeHours = Number((employee as any).overtimeHours) || 0;
    const overtimePay = +(overtimeHours * hourlyWage * 1.25).toFixed(3);

    // صافي الراتب المحول لنظام حماية الأجور (WPS) - بدون أي تأمينات
    const netSalaryWPS = +(gross - absenceDeduction + overtimePay).toFixed(3);

    // رصيد الإجازات
    const leaveBalance = Number((employee as any).leaveBalance ?? (employee as any).remaining_leaves ?? 30);
    const leaveEncashmentValue = +(leaveBalance * dailyWage).toFixed(3);

    // حساب مكافأة نهاية الخدمة (المادة 51)
    const joinDate = new Date(contract?.startDate || employee.joinDate || '2025-01-01');
    const today = new Date();
    const serviceYears = Math.max(0, +((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2));

    let indemnityAmount = 0;
    if (serviceYears <= 5) {
      // 15 يوماً عن كل سنة من السنوات الخمس الأولى
      indemnityAmount = +(serviceYears * (15 / 26) * gross).toFixed(3);
    } else {
      // 15 يوماً عن أول 5 سنوات + أجر شهر كامل عن كل سنة تالية
      const firstFiveYears = 5 * (15 / 26) * gross;
      const remainingYears = (serviceYears - 5) * gross;
      const totalCalculated = firstFiveYears + remainingYears;
      const maxCap = gross * 18; // سقف أقصى: 18 شهراً
      indemnityAmount = +(Math.min(totalCalculated, maxCap)).toFixed(3);
    }

    return {
      employeeId: employee.id,
      civilId: employee.civilId,
      name: employee.fullNameAr || (employee as any).nameAr || (employee as any).name || '',
      jobTitle: employee.jobTitle,
      department: employee.department || 'الإدارة العامة',
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowance: other,
      grossSalary: gross,
      dailyWage,
      hourlyWage,
      absentDays,
      absenceDeduction,
      overtimeHours,
      overtimePay,
      netSalaryWPS,
      leaveBalance,
      leaveEncashmentValue,
      serviceYears,
      indemnityAmount
    };
  }

  /**
   * توليد ملف حماية الأجور (WPS SIF) المعتمد للقطاع الأهلي
   */
  public static generateKuwaitWpsPayload(
    companyRegNo: string,
    companyCivilId: string,
    bankCode: string,
    statements: PrivateSectorEmployeeStatement[]
  ): string {
    const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const header = `HDR,${companyCivilId},${companyRegNo},${bankCode},${fileDate},${statements.length}`;
    
    const records = statements.map(st => {
      return `REC,${st.civilId},${st.employeeId},${st.grossSalary.toFixed(3)},${st.absenceDeduction.toFixed(3)},${st.netSalaryWPS.toFixed(3)},KWD`;
    });

    return [header, ...records].join('\n');
  }
}
