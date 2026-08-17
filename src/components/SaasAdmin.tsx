import React from 'react';
import { CompaniesSubscriptionApp } from '../apps/CompaniesSubscriptionApp';
import { CompanySubscription } from '../types';

export interface SaasAdminProps {
  subscriptions: CompanySubscription[];
  onUpdateSubscription: (sub: CompanySubscription) => void;
  onDeleteSubscription?: (id: string) => void;
  currentUserEmail: string;
  onImpersonateCompany?: (companyName: string) => void;
}

export const SaasAdmin: React.FC<SaasAdminProps> = (props) => {
  return <CompaniesSubscriptionApp {...props} />;
};

export default SaasAdmin;
