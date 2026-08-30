import fs from 'fs';
let content = fs.readFileSync('src/utils/ocrService.ts', 'utf-8');
content = content.replace(
  "throw new Error(errJson.error || 'فشل نظام القراءة الضوئية (OCR) في تحليل المستند. يرجى التأكد من وضوح الملف أو إدخال البيانات يدوياً.');",
  "throw new Error((errJson.error || 'فشل نظام القراءة الضوئية (OCR) في تحليل المستند.') + (errJson.details ? '\\nالسبب: ' + errJson.details : ''));"
);
fs.writeFileSync('src/utils/ocrService.ts', content);
