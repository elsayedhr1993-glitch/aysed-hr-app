const fs = require('fs');
let file = 'src/components/reports/OfficialReportPrintModal.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/import \{ exportElementToPdf \} from '\.\.\/\.\.\/utils\/printUtils';/, "import { printDocument, exportElementToPdf } from '../../utils/printUtils';");

c = c.replace(/const handlePrint = async \(\) => \{[\s\S]*?^\s*\};/m, `const handlePrint = async () => {
    await printDocument('official-report-print-area', reportTitle);
  };`);

c = c.replace(/ref=\{printAreaRef\}/, 'id="official-report-print-area"\n            ref={printAreaRef}');

fs.writeFileSync(file, c);
console.log('Fixed handlePrint with printDocument');
