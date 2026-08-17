import React from 'react';
import { AttendanceApp } from '../apps/AttendanceApp';
import { AttendanceRecord, Employee, Company, Contract, LeaveRequest, Payslip } from '../types';

export interface AttendanceProps {
  attendance: AttendanceRecord[];
  employees: Employee[];
  contracts: Contract[];
  leaves: LeaveRequest[];
  payslips: Payslip[];
  activeCompany: Company;
  onSaveAttendance: (rec: AttendanceRecord) => void;
  onSaveAttendanceBatch: (records: AttendanceRecord[]) => void;
  onPostAttendanceToPayroll: (month: string, deductionsMap: Record<string, number>) => void;
}

export const Attendance: React.FC<AttendanceProps> = (props) => {
  return <AttendanceApp {...props} />;
};

export default Attendance;
