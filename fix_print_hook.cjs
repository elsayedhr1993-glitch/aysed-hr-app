const fs = require('fs');
let file = 'src/components/reports/OfficialReportPrintModal.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/const printAreaRef = useRef<HTMLDivElement>\(null\);\n  if \(\!isOpen\) return null;/m, `const printAreaRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printAreaRef,
    documentTitle: reportTitle,
  });

  if (!isOpen) return null;`);

c = c.replace(/  const handlePrint = useReactToPrint\(\{[\s\S]*?\}\);\n/m, '');

fs.writeFileSync(file, c);
console.log('Fixed react-to-print hook rules');
