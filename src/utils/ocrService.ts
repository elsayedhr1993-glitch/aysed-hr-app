import * as pdfjsLib from 'pdfjs-dist';
// Vite will statically analyze this and serve the file correctly
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

export interface ScannedData {
  documentType?: 'civil_id' | 'license' | 'contract' | 'passport' | 'other';
  civilId?: string;
  fullNameAr?: string;
  fullName?: string;
  fullNameEn?: string;
  nationality?: string;
  gender?: string;
  birthDate?: string;
  dob?: string;
  unifiedNo?: string;
  passportNo?: string;
  profession?: string;
  jobTitle?: string;
  expiryDate?: string;
  issueDate?: string;
  bloodGroup?: string;
  address?: {
    block?: string;
    street?: string;
    building?: string;
    area?: string;
  };
  rawText?: string;
  confidenceScore?: number;
  residencyType?: string;
  mohLicenseNo?: string;
  contractSalary?: number;
}

/**
 * دالة تحويل الصفحة الأولى من ملف الـ PDF أو BDF إلى صورة عالية الجودة (Canvas rendering) داخل المتصفح
 */
async function convertPdfPageToImage(file: File): Promise<{ base64: string; mimeType: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) throw new Error('فشل في إنشاء سياق Canvas');

    await page.render({ canvasContext: context, viewport, canvas: canvas as any }).promise;
    
    return {
      base64: canvas.toDataURL('image/jpeg', 0.95),
      mimeType: 'image/jpeg'
    };
  } catch (err) {
    console.error("PDF to Image conversion failed:", err);
    // Fallback to raw file reader
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        base64: reader.result as string,
        mimeType: 'application/pdf'
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

/**
 * دالة تحويل الصور العادية إلى Base64
 */
function convertImageToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      base64: reader.result as string,
      mimeType: file.type || 'image/jpeg'
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * الدالة الرئيسية الشاملة للماسح الضوئي الذكي (تعالج PDF, BDF, والـ صور بكفاءة عالية)
 */
export async function processAnyDocument(file: File, apiKey?: string, docType?: string): Promise<ScannedData> {
  const fileNameLower = file.name.toLowerCase();
  const isPdfOrBdf = file.type === 'application/pdf' || 
                     file.type.includes('pdf') || 
                     fileNameLower.endsWith('.pdf') || 
                     fileNameLower.endsWith('.bdf');

  let docData: { base64: string; mimeType: string };

  if (isPdfOrBdf) {
    docData = await convertPdfPageToImage(file);
  } else {
    docData = await convertImageToBase64(file);
  }

  // إرسال البيانات لمعالج الرؤية البصرية في السيرفر
  let response;
  try {
    response = await fetch('/api/ocr-scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: docData.base64,
        mimeType: docData.mimeType,
        docType: docType || 'CIVIL_ID',
      }),
    });
  } catch (netErr: any) {
    throw new Error('فشل الاتصال بالخادم. يرجى التأكد من اتصالك بالإنترنت أو تحديث الصفحة.');
  }

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error((errJson.error || 'فشل نظام القراءة الضوئية (OCR) في تحليل المستند.') + (errJson.details ? '\nالسبب: ' + errJson.details : ''));
  }

  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch(e) { throw new Error('استجابة غير صالحة من الخادم (تحديث النظام).'); }
  return result.data;
}
