const fs = require('fs');
let file = 'src/components/reports/OfficialReportPrintModal.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/import React, { useRef } from 'react';/, "import React, { useRef } from 'react';\nimport { useReactToPrint } from 'react-to-print';");

c = c.replace(/const handlePrint = \(\) => {\n    window\.print\(\);\n  };/, `const handlePrint = useReactToPrint({
    contentRef: printAreaRef,
    documentTitle: reportTitle,
  });`);

fs.writeFileSync(file, c);
console.log('Fixed print using react-to-print');
