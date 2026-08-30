import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const oldReturn = `  return res.status(500).json({
    error: "فشل نظام القراءة الضوئية (OCR) في تحليل المستند. يرجى التأكد من وضوح الملف أو إدخال البيانات يدوياً.",
    details: lastError?.message || lastError
  });`;
  
const newReturn = `
  const errorMessage = lastError?.message || "";
  let friendlyError = "فشل نظام القراءة الضوئية (OCR) في تحليل المستند. يرجى التأكد من وضوح الملف أو إدخال البيانات يدوياً.";
  if (errorMessage.includes("INVALID_ARGUMENT")) {
    friendlyError = "الملف المرفق غير صالح أو معطوب. الرجاء التأكد من رفع صورة صحيحة أو ملف PDF صالح.";
  }
  
  return res.status(500).json({
    error: friendlyError,
    details: lastError?.message || lastError
  });`;

content = content.replace(oldReturn, newReturn);
fs.writeFileSync('server.ts', content);
