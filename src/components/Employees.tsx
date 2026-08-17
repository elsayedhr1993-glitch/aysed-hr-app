import React from 'react';
import { EmployeesApp } from '../apps/EmployeesApp';
import { 
  Employee, Company, ViewMode, Contract, LeaveRequest, DocumentItem, JobTitle, Department 
} from '../types';

export interface EmployeesProps {
  employees: Employee[];
  contracts: Contract[];
  leaves: LeaveRequest[];
  documents: DocumentItem[];
  jobTitles?: JobTitle[];
  departments?: Department[];
  activeCompany: Company;
  viewMode: ViewMode;
  searchTerm: string;
  filterTab: string;
  onSaveEmployee: (emp: Employee) => void;
  onDeleteEmployee: (empId: string) => void;
  onSoftDeleteEmployee?: (empId: string, reason?: string) => void;
  onRestoreEmployee?: (empId: string) => void;
  onHardDeleteAllEmployees?: () => void;
  onSaveJobTitle?: (jobTitle: JobTitle) => void;
  onDeleteJobTitle?: (id: string) => void;
  onNavigateToApp?: (app: any) => void;
  selectedEmpForForm: Employee | null;
  onCloseForm: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onFilterTabChange?: (tab: string) => void;
  onSelectEmployeeForLeaves?: (empId: string) => void;
  onOpenNotificationModal?: (emp: Employee, trigger?: any) => void;
}

export const Employees: React.FC<EmployeesProps> = (props) => {
  return <EmployeesApp {...props} />;
};

export default Employees;
