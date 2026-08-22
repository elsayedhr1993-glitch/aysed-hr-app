import React from 'react';
import { LeavesApp } from '../apps/LeavesApp';
import { LeaveRequest, Employee, Company, ViewMode, Contract, AttendanceRecord } from '../types';

export interface LeaveManagementProps {
  leaves: LeaveRequest[];
  employees: Employee[];
  contracts?: Contract[];
  attendance?: AttendanceRecord[];
  activeCompany: Company;
  viewMode: ViewMode;
  searchTerm: string;
  filterTab: string;
  onSaveLeave: (leave: LeaveRequest) => void;
  onUpdateLeaveStatus: (leaveId: string, status: 'APPROVED' | 'REJECTED', note?: string) => void;
  onDeleteLeave?: (leaveId: string, force?: boolean) => Promise<boolean> | boolean | void;
  onSaveEmployee?: (emp: Employee) => void;
  initialEmployeeId?: string;
  onOpenNotificationModal?: (emp: Employee, trigger?: any, data?: any) => void;
  onNavigateToApp?: (app: any) => void;
}

export const LeaveManagement: React.FC<LeaveManagementProps> = (props) => {
  return <LeavesApp {...props} />;
};

export default LeaveManagement;
