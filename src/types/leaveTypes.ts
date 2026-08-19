// types/leaveTypes.ts

export type CalculationType = 'calendar' | 'working';

export interface HrLeaveType {
  id?: string;
  name: string;
  is_kuwait_annual: boolean;
  is_unpaid: boolean;
  calculation_type: CalculationType;
  requires_allocation: boolean;
  employee_requests: boolean;
  leave_validation_type: 'officer' | 'manager' | 'both';
  color: number;
}

// التأسيس الافتراضي لأنواع الإجازات حسب قانون العمل الكويتي
export const DEFAULT_AYSED_LEAVE_TYPES: HrLeaveType[] = [
  {
    name: 'إجازة سنوية (Annual Leave)',
    requires_allocation: true,
    employee_requests: true,
    leave_validation_type: 'both', // موافقة المدير + HR
    is_kuwait_annual: true,
    is_unpaid: false,
    calculation_type: 'working', // على أساس 26 يوم عمل
    color: 2, // البنفسجي
  },
  {
    name: 'إجازة مرضية (Sick Leave - المادة 69)',
    requires_allocation: false,
    employee_requests: true,
    leave_validation_type: 'both',
    is_kuwait_annual: false,
    is_unpaid: false,
    calculation_type: 'calendar',
    color: 1, // الأحمر
  },
  {
    name: 'إجازة حج (Hajj Leave - 21 يوماً)',
    requires_allocation: true,
    employee_requests: true,
    leave_validation_type: 'both',
    is_kuwait_annual: false,
    is_unpaid: false,
    calculation_type: 'calendar',
    color: 4,
  },
];
