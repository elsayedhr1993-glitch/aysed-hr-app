import React from 'react';

export interface EmploymentContractTemplateProps {
  employeeNameAr?: string;
  employeeNameEn?: string;
  civilId?: string;
  nationalityAr?: string;
  nationalityEn?: string;
  residenceType?: string;
  companyName?: string;
  managerName?: string;
  managerCivilId?: string;
  businessField?: string;
  jobTitle?: string;
  contractDay?: string;
  contractDate?: string;
  salaryAmount?: string;
  contractStartDate?: string;
  contractType?: string;
  companyLogoUrl?: string;
}

export const EmploymentContractTemplate: React.FC<EmploymentContractTemplateProps> = ({
  employeeNameAr = 'أحمد محمد العتيبي',
  employeeNameEn = 'Ahmed Mohammed Al-Otaibi',
  civilId = '293041501234',
  nationalityAr = 'كويتي',
  nationalityEn = 'Kuwaiti',
  residenceType = 'إقامة صالحة - المادة 18',
  companyName = 'مستوصف المنار كلينك',
  managerName = 'د. عبدالله المنار',
  managerCivilId = '288051200526',
  businessField = 'الرعاية الصحية والخدمات الطبية والمساندة',
  jobTitle = 'محاسب عام أول',
  contractDay = 'الأحد',
  contractDate = '2026-01-01',
  salaryAmount = '450.000',
  contractStartDate = '2026-01-01',
  contractType = 'غير محدد المدة (عقد عمل دائم)',
  companyLogoUrl = 'https://api.dicebear.com/7.x/initials/svg?seed=Almanar',
}) => {
  return (
    <div className="contract-doc-container">
      {/* ترويسة الدولة والهيئة والمنشأة */}
      <header className="doc-header">
        <div className="state-banner">
          <h2>دولة الكويت</h2>
          <h3>نموذج عقد عمل استرشادي في القطاع الأهلي</h3>
          <p>الهيئة العامة للقوى العاملة - إدارة عمل حولى</p>
        </div>
        <div className="header-right">
          <img src={companyLogoUrl} alt="Logo" className="company-logo" />
          <span className="contract-form-tag">نموذج (2)</span>
        </div>
      </header>

      <div className="header-divider"></div>

      {/* مقدمة العقد وتاريخ التحرير */}
      <div className="contract-intro-box">
        <p>
          إنه في يوم <strong>{contractDay}</strong> الموافق <strong>{contractDate}</strong> تحرر هذا العقد بين كل من:
        </p>
      </div>

      {/* أطراف التعاقد (الطرف الأول والطرف الثاني) */}
      <div className="parties-grid">
        {/* الطرف الأول (المنشأة) */}
        <div className="party-card">
          <span className="party-badge">طرف أول (صاحب العمل) / First Party</span>
          <p><strong>اسم المنشأة:</strong> {companyName}</p>
          <p><strong>يمثلها في التوقيع:</strong> {managerName}</p>
          <p><strong>الرقم المدني للممثل:</strong> <code>{managerCivilId}</code></p>
        </div>

        {/* الطرف الثاني (الموظف) */}
        <div className="party-card">
          <span className="party-badge">طرف ثان (العامل) / Second Party</span>
          <p><strong>الاسم:</strong> {employeeNameAr} / {employeeNameEn}</p>
          <p><strong>الجنسية:</strong> {nationalityAr} / {nationalityEn}</p>
          <p><strong>الرقم المدني:</strong> <code>{civilId}</code></p>
          <p><strong>الإقامة:</strong> {residenceType}</p>
        </div>
      </div>

      {/* التمهيد */}
      <div className="contract-section">
        <h3 className="sec-title">تمهيد / Preamble</h3>
        <p className="sec-text">
          يمتلك الطرف الأول منشأة باسم <strong>{companyName}</strong> تعمل في مجال <strong>({businessField})</strong>، ويرغب في التعاقد مع الطرف الثاني للعمل لديه بمهنة <strong>({jobTitle})</strong>. وبعد أن أقر الطرفان بأهليتهما في إبرام هذا العقد، تم الاتفاق على ما يلي:
        </p>
      </div>

      {/* البنود الأساسية للعقد */}
      <div className="clauses-grid">
        <div className="clause-box">
          <h4>البند الأول / Article One</h4>
          <p>يعتبر التمهيد السابق جزءاً لا يتجزأ من هذا العقد.</p>
        </div>

        <div className="clause-box">
          <h4>البند الثاني - طبيعة العمل / Article Two</h4>
          <p>تعاقد الطرف الأول مع الطرف الثاني للعمل لديه بمهنة: <strong>{jobTitle}</strong> داخل دولة الكويت.</p>
        </div>

        <div className="clause-box">
          <h4>البند الثالث - فترة التجربة / Article Three</h4>
          <p>يخضع الطرف الثاني لفترة تجربة لمدة لا تزيد عن 100 يوم عمل، ويحق لكل طرف إنهاء العقد خلال تلك الفترة دون إخطار.</p>
        </div>

        <div className="clause-box salary-highlight">
          <h4>البند الرابع - قيمة الأجر / Article Four</h4>
          <p>يتقاضى الطرف الثاني عن تنفيذ هذا العقد أجراً مبلغ وقدره <strong>{salaryAmount} دينار كويتي</strong> يدفع في نهاية كل شهر. ولا يجوز للطرف الأول تخفيض الأجر أثناء سريان هذا العقد أو نقله للأجر اليومي دون موافقته.</p>
        </div>

        <div className="clause-box">
          <h4>البند الخامس والسادس - نفاذ ومدة العقد / Article Five & Six</h4>
          <p>يبدأ نفاذ العقد اعتباراً من <strong>{contractStartDate}</strong>، والعقد <strong>({contractType})</strong>.</p>
        </div>

        <div className="clause-box">
          <h4>البند السابع - الإجازة السنوية / Article Seven</h4>
          <p>للطرف الثاني الحق في إجازة سنوية مدفوعة الأجر مدتها 30 يوماً، ولا يستحقها عن السنة الأولى إلا بعد انقضاء تسعة أشهر.</p>
        </div>

        <div className="clause-box">
          <h4>البند الثامن والتاسع والعاشر / Working Conditions</h4>
          <p>الحد الأقصى لساعات العمل 8 ساعات يومياً تتخللها فترة راحة. يتحمل الطرف الأول تذاكر العودة عند انتهاء التعاقد، والتأمين ضد إصابات العمل والصحي طبقاً للقانون.</p>
        </div>

        <div className="clause-box">
          <h4>البند الحادي عشر والثاني عشر / End of Service & Law</h4>
          <p>يستحق الطرف الثاني مكافأة نهاية الخدمة طبقاً لقانون العمل في القطاع الأهلي رقم 6 لسنة 2010 والقرارات المنفذة له.</p>
        </div>

        <div className="clause-box special-clause">
          <h4>البند الثالث عشر - شروط خاصة / Special Conditions</h4>
          <p>1. يخضع هذا العقد لقانون العمل بالقطاع الأهلي والقوانين الكويتية المنظمة لممارسة المهن الطبية. وعند رفض السلطات إصدار أو تجديد تراخيص العمل، يعتبر العقد منتهياً دون تعويض.</p>
        </div>

        <div className="clause-box">
          <h4>البند الرابع عشر، الخامس عشر والسادس عشر / Courts & Copies</h4>
          <p>تختص المحكمة الكلية ودوائرها العمالية بالنظر في المنازعات. حُرر العقد من ثلاث نسخ، نسخة لكل طرف والثالثة تودع لدى الهيئة العامة للقوى العاملة.</p>
        </div>
      </div>

      {/* التوقيعات والأختام الرسمية */}
      <div className="signatures-section">
        <div className="sig-box">
          <p className="sig-role">الطرف الأول (صاحب العمل)</p>
          <p className="sig-role-en">First Party / Authorized Signatory</p>
          <div className="sig-line">........................................</div>
        </div>

        <div className="sig-box official-stamp-area">
          <div className="stamp-circle">
            <span>ختم المنشأة الرسمي</span>
            <small>Official Seal</small>
          </div>
        </div>

        <div className="sig-box">
          <p className="sig-role">الطرف الثاني (العامل)</p>
          <p className="sig-role-en">Second Party</p>
          <div className="sig-line">........................................</div>
        </div>
      </div>

      {/* تذييل الصفحة */}
      <footer className="doc-footer">
        <div className="footer-divider"></div>
        <div className="footer-content">
          <span>{companyName} | عقد عمل رسمي معتمد</span>
          <span>صفحة 1 من 1</span>
        </div>
      </footer>

      <style>{`
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .contract-doc-container {
          width: 210mm;
          min-height: 297mm;
          padding: 12mm 15mm;
          margin: 0 auto;
          background: #ffffff;
          font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
          color: #1e293b;
          box-sizing: border-box;
          direction: rtl;
          line-height: 1.35;
          font-size: 11px;
        }

        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .state-banner {
          text-align: right;
        }
        .state-banner h2 {
          font-size: 14px;
          margin: 0;
          color: #0f172a;
          font-weight: 800;
        }
        .state-banner h3 {
          font-size: 12px;
          margin: 2px 0;
          color: #0284c7;
          font-weight: bold;
        }
        .state-banner p {
          font-size: 10px;
          color: #64748b;
          margin: 0;
        }
        .header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .company-logo {
          max-height: 40px;
          object-fit: contain;
        }
        .contract-form-tag {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9.5px;
          font-weight: bold;
        }
        .header-divider {
          height: 2px;
          background: #0284c7;
          margin: 8px 0 10px 0;
        }

        .contract-intro-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 6px 10px;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .parties-grid {
          display: flex;
          gap: 10px;
          margin-bottom: 8px;
        }
        .party-card {
          flex: 1;
          background: #fafafa;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px;
          position: relative;
        }
        .party-badge {
          background: #0f172a;
          color: white;
          font-size: 9.5px;
          padding: 1px 6px;
          border-radius: 3px;
          display: inline-block;
          margin-bottom: 4px;
          font-weight: bold;
        }
        .party-card p {
          margin: 3px 0;
          font-size: 10.5px;
        }

        .contract-section {
          margin-bottom: 8px;
        }
        .sec-title {
          font-size: 11px;
          font-weight: bold;
          color: #0f172a;
          margin: 0 0 2px 0;
          border-bottom: 1px dashed #cbd5e1;
          padding-bottom: 2px;
        }
        .sec-text {
          margin: 0;
          text-align: justify;
          color: #334155;
        }

        .clauses-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          margin-bottom: 12px;
        }
        .clause-box {
          background: #fdfdfd;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 6px 8px;
        }
        .clause-box h4 {
          font-size: 10px;
          font-weight: bold;
          color: #0369a1;
          margin: 0 0 2px 0;
        }
        .clause-box p {
          margin: 0;
          font-size: 10px;
          color: #334155;
          text-align: justify;
        }
        .salary-highlight {
          background-color: #f0fdf4 !important;
          border-color: #86efac !important;
        }
        .special-clause {
          grid-column: span 2;
          background-color: #fef2f2 !important;
          border-color: #fca5a5 !important;
        }

        .signatures-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 15px;
          padding: 0 10px;
        }
        .sig-box {
          text-align: center;
          width: 30%;
        }
        .sig-role {
          font-weight: bold;
          font-size: 10.5px;
          margin: 0;
          color: #0f172a;
        }
        .sig-role-en {
          font-size: 9px;
          color: #64748b;
          margin: 1px 0 15px 0;
        }
        .sig-line {
          color: #94a3b8;
          letter-spacing: 1px;
          margin: 0;
        }
        .stamp-circle {
          width: 75px;
          height: 75px;
          border: 2px dashed #cbd5e1;
          border-radius: 50%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-size: 9px;
        }

        .doc-footer {
          margin-top: 15px;
        }
        .footer-divider {
          height: 1px;
          background: #cbd5e1;
          margin-bottom: 4px;
        }
        .footer-content {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #94a3b8;
        }

        @media print {
          body {
            margin: 0;
            background: none;
          }
          .contract-doc-container {
            width: 100%;
            padding: 5mm;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
};
