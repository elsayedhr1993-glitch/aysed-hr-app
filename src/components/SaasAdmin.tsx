import React from 'react';
import { SuperAdminDashboard } from '../pages/SuperAdminDashboard';
import { CompanySubscription } from '../types';

export interface SaasAdminProps {
  subscriptions: CompanySubscription[];
  onUpdateSubscription: (sub: CompanySubscription) => void;
  onDeleteSubscription?: (id: string) => void;
  currentUserEmail: string;
  onImpersonateCompany?: (companyName: string) => void;
  onLogout?: () => void;
}

export const SaasAdmin: React.FC<SaasAdminProps> = ({ currentUserEmail, onImpersonateCompany, onLogout }) => {
  return (
    <SuperAdminDashboard 
      currentUserEmail={currentUserEmail}
      onImpersonateCompany={onImpersonateCompany}
      onLogout={onLogout}
    />
  );
};

export default SaasAdmin;
