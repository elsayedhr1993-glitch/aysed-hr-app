import fs from 'fs';
let content = fs.readFileSync('src/utils/ocrService.ts', 'utf-8');

// Replace arrayBuffer with Uint8Array
content = content.replace(
  "const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });",
  "const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });"
);

fs.writeFileSync('src/utils/ocrService.ts', content);
