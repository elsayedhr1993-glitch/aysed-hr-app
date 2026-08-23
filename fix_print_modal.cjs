const fs = require('fs');
let file = 'src/components/reports/OfficialReportPrintModal.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/import \{ useReactToPrint \} from 'react-to-print';\n/, "import { exportElementToPdf } from '../../utils/printUtils';\n");

c = c.replace(/const handlePrint = useReactToPrint\(\{[\s\S]*?\}\);/m, `const handlePrint = async () => {
    if (!printAreaRef.current) return;
    try {
      await exportElementToPdf(printAreaRef.current, reportTitle);
    } catch (e) {
      console.error(e);
    }
  };`);

fs.writeFileSync(file, c);
console.log('Fixed react-to-print');
