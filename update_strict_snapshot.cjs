const fs = require('fs');
let content = fs.readFileSync('src/components/LeaveSettlementCalculator.tsx', 'utf8');

const replacement = `    if (leaveRecord) {
      const leavePaidDays = leaveRecord.paidDays ?? leaveRecord.totalDays ?? 0;
      const leaveUnpaidDays = leaveRecord.unpaidDays ?? leaveRecord.excessDays ?? 0;
      const leaveTotalDays = leaveRecord.totalDays ?? 0;
      
      const snapshotAvailable = leaveRecord.totalAvailableBalance ?? leavePaidDays;
       
      const dailyWageCalc = leaveRecord.dailyWage ?? (grossSalary / 26);
      const paidLeavePay = leaveRecord.leaveAmount ?? (Math.round(leavePaidDays * dailyWageCalc * 1000) / 1000);
      const netPayableCalc = paidLeavePay + (ticketAllowanceInput || 0) - (deductionsInput || 0);

      return {
        total_accrued: totalAccrued,
        requested_days: leaveTotalDays,
        available_paid: snapshotAvailable,
        aysed_paid_days: leavePaidDays,
        aysed_unpaid_days: leaveUnpaidDays,
        daily_wage: dailyWageCalc,
        paid_amount: paidLeavePay,
        netPayable: netPayableCalc
      };
    } else {`;

content = content.replace(
  /    if \(leaveRecord\) \{[\s\S]*?    \} else \{/,
  replacement
);

fs.writeFileSync('src/components/LeaveSettlementCalculator.tsx', content);
