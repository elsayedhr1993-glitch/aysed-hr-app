import { jsPDF } from 'jspdf';
import html2canvasPro from 'html2canvas-pro';

/**
 * دالة تصدير أي عنصر HTML مباشرة إلى ملف PDF عالي الجودة
 * تستخدم html2canvas-pro + jsPDF لضمان دقة اللغة العربية والتنسيق 100%
 */
export async function exportElementToPdf(
  elementIdOrEl: string | HTMLElement, 
  fileName: string = 'Document'
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const element = typeof elementIdOrEl === 'string' 
      ? document.getElementById(elementIdOrEl) 
      : elementIdOrEl;

    if (!element) {
      console.error('Element not found for PDF export:', elementIdOrEl);
      return false;
    }

    // Scroll to top to ensure complete render
    window.scrollTo(0,);

    const canvas = await html2canvasPro(element, {
      scale: 2, // High resolution (Retina/Print quality)
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Scale image to fit A4 width while maintaining aspect ratio
    const imgWidth = pdfWidth - 10; // 5mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 5; // 5mm top margin

    pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= (pdfHeight - 10);

    // Multi-page support if content is long
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 5;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= (pdfHeight - 10);
    }

    const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(cleanFileName);
    return true;
  } catch (error) {
    console.error('Failed to export PDF:', error);
    return false;
  }
}

/**
 * وظيفة الطباعة الشاملة والذكية (Universal Print Function)
 * تضمن طباعة الجزء المطلوب فقط وعزل باقي عناصر الشاشة، مع نافذة طباعة مخصصة ودعم التصدير التلقائي.
 */
export async function printDocument(htmlContentOrId: string, fileName: string = 'Document') {
  if (typeof window === 'undefined') return;

  const targetEl = document.getElementById(htmlContentOrId);

  // إذا لم يكن العنصر موجوداً كـ ID وكانت نصوص HTML مباشرة
  let htmlToPrint = '';
  if (targetEl) {
    htmlToPrint = targetEl.innerHTML;
  } else {
    htmlToPrint = htmlContentOrId;
  }

  // 1. محاولة الطباعة عبر نافذة منبثقة مخصصة مع كامل الخطوط والتنسيقات
  try {
    const printWindow = window.open('', '_blank', 'width=950,height=750,toolbar=0,menubar=0,location=0');
    if (printWindow && !printWindow.closed) {
      const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>${fileName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
          ${styleTags}
          <style>
            * { box-sizing: border-box; }
            body {
              background-color: #ffffff !important;
              font-family: 'Cairo', 'Amiri', sans-serif !important;
              margin: 0;
              padding: 20px;
              color: #0f172a;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden, button, input[type="button"], select {
              display: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          </style>
        </head>
        <body>
          <div class="printable-content">
            ${htmlToPrint}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                try {
                  window.focus();
                  window.print();
                } catch(e) {
                  console.error('Print failed', e);
                }
              }, 400);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      return;
    }
  } catch (e) {
    console.warn('Popup print blocked or not supported, using in-page isolated print', e);
  }

  // 2. إذا تم حظر النوافذ المنبثقة، استخدام عزل الصفحة الحالية للطباعة
  const styleId = 'aysed-print-isolated-style';
  let existingStyle = document.getElementById(styleId);
  if (existingStyle) existingStyle.remove();

  const printStyle = document.createElement('style');
  printStyle.id = styleId;
  printStyle.innerHTML = `
    @media print {
      body * {
        visibility: hidden !important;
      }
      #${htmlContentOrId}, #${htmlContentOrId} * {
        visibility: visible !important;
      }
      #${htmlContentOrId} {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
      }
      .print\\:hidden, button, input[type="button"] {
        display: none !important;
      }
      @page {
        margin: 10mm;
        size: A4 portrait;
      }
    }
  `;
  document.head.appendChild(printStyle);

  try {
    window.print();
  } catch (err) {
    console.warn('window.print failed, falling back to PDF download', err);
    if (targetEl) {
      await exportElementToPdf(targetEl, fileName);
    }
  } finally {
    setTimeout(() => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    }, 2000);
  }
}
