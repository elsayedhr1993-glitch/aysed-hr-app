const fs = require('fs');
let file = 'src/components/reports/OfficialReportPrintModal.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/const printAreaRef = useRef<HTMLDivElement>\(null\);\n  \n  const handlePrint = useReactToPrint\(\{[\s\S]*?\}\);\n\n  if \(\!isOpen\) return null;/m, `const printAreaRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printAreaRef,
    documentTitle: reportTitle,
  });

  if (!isOpen) return null;`);

// If the hook is totally missing from previous failed script
if (!c.includes('const handlePrint = useReactToPrint')) {
  c = c.replace(/const printAreaRef = useRef<HTMLDivElement>\(null\);/m, `const printAreaRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printAreaRef,
    documentTitle: reportTitle,
  });`);
}

fs.writeFileSync(file, c);
console.log('Fixed react-to-print hook rules final');
