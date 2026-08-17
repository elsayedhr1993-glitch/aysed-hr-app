const fs = require('fs');
const content = fs.readFileSync('src/apps/DocumentsApp.tsx', 'utf8');
console.log("--- autoFolders ---");
console.log(content.substring(content.indexOf('const autoFolders = useMemo'), content.indexOf('const allFolders = useMemo')));
console.log("--- OCR Modal ---");
console.log(content.substring(content.indexOf('{/* OCR Scan Modal */}'), content.indexOf('{showRenameFolderModal')));
console.log("--- Upload Modal ---");
console.log(content.substring(content.indexOf('{/* Quick Upload Modal */}'), content.indexOf('</div>\n  );\n};')));
