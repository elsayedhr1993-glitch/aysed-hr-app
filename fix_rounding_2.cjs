const fs = require('fs');
let content = fs.readFileSync('src/components/LeaveSettlementCalculator.tsx', 'utf8');

content = content.replace(
  /إجـمالي المـبلغ المـستحق لـلإجازة \(\{\(\)\.toFixed\(2\)\} يوم × أجر اليوم \{dailyWage\.toFixed\(3\)\} د\.ك = \{settlementAmount\.toFixed\(3\)\} د\.ك\)/g,
  'إجـمالي المـبلغ المـستحق لـلإجازة ({(settlementData?.aysed_paid_days || 0).toFixed(2)} يوم × أجر اليوم {dailyWage.toFixed(3)} د.ك = {settlementAmount.toFixed(3)} د.ك)'
);

fs.writeFileSync('src/components/LeaveSettlementCalculator.tsx', content);
