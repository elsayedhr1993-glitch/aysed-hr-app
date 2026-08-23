const fs = require('fs');
let content = fs.readFileSync('src/apps/LeavesApp.tsx', 'utf8');

const handleSaveLeaveReplacement = `  const handleSaveLeaveRequest = (req: Partial<LeaveRequest>) => {
    const isNew = !req.id;
    const newLeave: LeaveRequest = {
      id: isNew ? 'REQ-' + Date.now().toString() : req.id!,
      employeeId: req.employeeId!,
      companyId: activeCompany?.id || '',
      leaveType: req.leaveType || 'ANNUAL',
      startDate: req.startDate!,
      endDate: req.endDate!,
      totalDays: req.totalDays || 0,
      paidDays: req.paidDays,
      unpaidDays: req.unpaidDays,
      excessDays: req.excessDays || 0,
      totalAvailableBalance: req.totalAvailableBalance,
      dailyWage: req.dailyWage,
      leaveAmount: req.leaveAmount,
      reason: req.reason || '',
      status: req.status || 'DRAFT',
      createdAt: (req as any).createdAt || new Date().toISOString(),
      isHistorical: false
    };
    onSaveLeave(newLeave);
    setEditingLeave(null);
  };`;

content = content.replace(
  /  const handleSaveLeaveRequest = \(req: Partial<LeaveRequest>\) => \{[\s\S]*?setEditingLeave\(null\);\n  \};/,
  handleSaveLeaveReplacement
);

fs.writeFileSync('src/apps/LeavesApp.tsx', content);
