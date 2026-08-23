import React, { useState } from 'react';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  paidDays: number;
  unpaidDays: number;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED';
}

export const useLeaveWorkflow = () => {
  // دالة حساب المدة وتجزئة الرصيد (Overdraft Split)
  const calculateLeaveDays = (totalDays: number, availableBalance: number) => {
    let paidDays = 0;
    let unpaidDays = 0;

    if (totalDays <= availableBalance) {
      paidDays = totalDays;
      unpaidDays = 0;
    } else {
      paidDays = availableBalance;
      unpaidDays = totalDays - availableBalance;
    }

    return { totalDays, paidDays, unpaidDays };
  };

  // دوال الانتقال بين حالات الاعتماد
  const submitRequest = (request: LeaveRequest): LeaveRequest => ({
    ...request,
    status: 'PENDING_MANAGER',
  });

  const approveByManager = (request: LeaveRequest): LeaveRequest => ({
    ...request,
    status: 'PENDING_HR',
  });

  const approveByHR = (request: LeaveRequest): LeaveRequest => ({
    ...request,
    status: 'APPROVED',
  });

  const rejectRequest = (request: LeaveRequest): LeaveRequest => ({
    ...request,
    status: 'REJECTED',
  });

  return {
    calculateLeaveDays,
    submitRequest,
    approveByManager,
    approveByHR,
    rejectRequest,
  };
};
