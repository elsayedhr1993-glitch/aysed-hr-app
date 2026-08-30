import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  'return res.status(500).json({\n    error: "فشل نظام القراءة الضوئية (OCR) في تحليل المستند. يرجى التأكد من وضوح الملف أو إدخال البيانات يدوياً."\n  });',
  'return res.status(500).json({\n    error: "فشل نظام القراءة الضوئية (OCR) في تحليل المستند. يرجى التأكد من وضوح الملف أو إدخال البيانات يدوياً.",\n    details: lastError?.message || lastError\n  });'
);
content = content.replace(
  'const modelsForChat = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.6-flash"];',
  'const modelsForChat = ["gemini-3.7-flash", "gemini-3.1-pro-preview"];'
);
fs.writeFileSync('server.ts', content);
