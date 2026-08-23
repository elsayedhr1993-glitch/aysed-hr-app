const fs = require('fs');
let content = fs.readFileSync('src/components/OfficialLeaveModal.tsx', 'utf8');

const calcResultReplacement = `  const calcResult = useMemo(() => {
    if (!selectedEmp || !formData.startDate || !formData.endDate) return null;
    
    // Create an extended employee object with grossSalary for the engine
    const contractGross = selectedContract ? (selectedContract as any).grossSalary : 0;
    const grossSalary = contractGross > 0 ? contractGross : Number((selectedEmp as any).basicSalary || (selectedEmp as any).grossSalary || (selectedEmp as any).salary || 0);
    
    // Get opening balance
    const empFifo = computeFifoLeaveAllocations(selectedEmp, allocations, allLeaves);
    const carriedForward = empFifo.allocations.filter(a => a.allocationType === 'regular').reduce((sum, a) => sum + (a.numberOfDays || 0), 0);
    
    // Get previous approved leaves count (from empFifo.totalConsumed or similar)
    const previousApprovedLeaves = empFifo.totalConsumed || 0;

    const publicHolidaysStr = holidaysList.map(h => {
       if (h.date) return h.date;
       if (h.startDate) return h.startDate; // Simplification, could be expanded
       return '';
    }).filter(Boolean);

    const metrics = calculateAysedLeaveMetrics(
      formData.startDate,
      formData.endDate,
      carriedForward,
      grossSalary,
      selectedEmp.joinDate || '2026-01-01',
      previousApprovedLeaves,
      publicHolidaysStr
    );

    // Map metrics to the expected output for the component
    return {
      totalNetDays: metrics.paidDays + metrics.unpaidDays, // or calculate working days
      totalAvailable: metrics.totalBalance,
      paidDays: metrics.paidDays,
      unpaidDays: metrics.unpaidDays,
      balanceAfter: metrics.endingBalance,
      dailyWage: metrics.dailyWage,
      paidLeavePay: metrics.totalLeavePay,
      netPayable: metrics.totalLeavePay
    };
  }, [selectedEmp, formData.startDate, formData.endDate, holidaysList, allocations, allLeaves, selectedContract]);`;

content = content.replace(
  /  const calcResult = useMemo\(\(\) => \{[\s\S]*?\}, \[selectedEmp, formData\.startDate, formData\.endDate, holidaysList, totalAvailable, selectedContract\]\);/,
  calcResultReplacement
);

fs.writeFileSync('src/components/OfficialLeaveModal.tsx', content);
