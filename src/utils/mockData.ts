import { Employee, Contract } from '../types';

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'emp-101',
    companyId: 'comp-1',
    employeeCode: 'EMP-101',
    fullNameAr: 'السيد أحمد مصطفى',
    fullNameEn: 'Elsayed Ahmed Mostafa',
    civilId: '293010101234',
    civilIdExpiry: '2028-12-31',
    passportNo: 'A12345678',
    passportExpiry: '2029-01-01',
    nationality: 'Egypt',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'MALE',
    dob: '1993-01-01',
    department: 'الموارد البشرية والإدارة',
    departmentId: 'dept-1',
    jobTitle: 'مدير الموارد البشرية HR Director',
    jobTitleId: 'jt-1',
    email: 'elsayedhr1993@gmail.com',
    phone: '+965 12345678',
    joinDate: '2023-05-01',
    status: 'ACTIVE',
    bankName: 'بنك الكويت الوطني',
    iban: 'KW12NBKW000000000000123456',
    tags: ['إدارة', 'موارد بشرية'],
  },
];

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'cnt-101',
    employeeId: 'emp-101',
    companyId: 'comp-1',
    basicSalary: 600,
    housingAllowance: 0,
    transportAllowance: 0,
    otherAllowance: 0,
    contractType: 'INDEFINITE',
    startDate: '2023-05-01',
    noticePeriodDays: 90,
    status: 'RUNNING'
  },
];
