import { printDocument } from '../utils/printUtils';
import { tafqeet } from '../utils/tafqeet';
import { formatContractData } from '../utils/pam-dictionary';
import React, { useState } from 'react';
import { 
  DocumentTemplate, GeneratedDocument, Employee, Company, DocumentItem, Contract, AuditLog 
} from '../types';
import { 
  FileText, Plus, Printer, Download, Eye, Edit3, Trash2, CheckCircle2, 
  Search, Sparkles, FolderArchive, ArrowRight, Copy, Code, Save, X, 
  UserCheck, ShieldCheck, FileSpreadsheet, Layers, RefreshCw, Languages, Globe
} from 'lucide-react';
import { formatKWD } from '../utils/kuwaitLaw';

interface DocumentTemplatesAppProps {
  templates: DocumentTemplate[];
  generatedDocs: GeneratedDocument[];
  employees: Employee[];
  contracts: Contract[];
  activeCompany: Company;
  onSaveTemplate: (template: DocumentTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onIssueDocument: (genDoc: GeneratedDocument, docItem: DocumentItem) => void;
  onAddAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
}

export const DEFAULT_TEMPLATES_SEED: DocumentTemplate[] = [
  {
    id: 'salary_cert_ar',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'SALARY_CERTIFICATE_AR',
    titleAr: 'شهادة راتب واستمرارية (عربي)',
    titleEn: 'Salary Certificate (Arabic)',
    category: 'الشهادات والخطابات',
    contentHtml: `<div class="salary-cert-wrapper" dir="rtl">
  <div class="cert-date">
    التاريخ: {{issue_date}}
  </div>

  <div class="cert-title">
    شهادة راتب وإستمرارية راتب
  </div>

  <div class="cert-recipient">
    السادة / إلى من يهمه الأمر
  </div>

  <div class="cert-body">
    <p>
      نحيط سيادتكم علماً بأن/ <strong>{{employee_name_ar}}</strong> (الجنسية: <strong>{{nationality_ar}}</strong>) بموجب بطاقة مدنية رقم/ <code>{{civil_id}}</code>، {{work_status_verb_ar}} لدينا بـ <strong>{{company_name_ar}}</strong>، بوظيفة/ <strong>{{job_title_ar}}</strong> وذلك إعتباراً من <strong>{{hire_date}}</strong> براتب شهري وقدره <strong>({{salary_amount}} د.ك) فقط {{salary_in_words_ar}} لا غير</strong>، ويتم تحويل راتب{{pronoun_object_ar}} إلى حساب{{pronoun_object_ar}} لدى <strong>{{bank_name_ar}}</strong> رقم الآيبان (<code>{{iban_number}}</code>) ومستمر{{gender_suffix_ar}} بالعمل حتى تاريخه.
    </p>

    <p>
      وقد أُعطيت لـ{{pronoun_prep_ar}} هذه الشهادة بناءً على طلبـ{{pronoun_object_ar}} دون أدنى مسؤولية على المؤسسة تجاه حقوق الغير.
    </p>

    <div class="closing-phrase">
      وتفضلوا بقبول فائق التحية والاحترام ،,,
    </div>
  </div>

  <div class="signature-section">
    <p class="sig-title">المفوض بالتوقيع</p>
    <div class="sig-line">...................................................</div>
  </div>
</div>

<style>
  @page {
    size: A4;
    margin: 15mm 20mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .salary-cert-wrapper {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #ffffff;
    padding: 15mm 20mm;
    font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
    color: #111827;
    font-size: 13.5px;
    line-height: 1.9;
  }
  .cert-date {
    font-size: 12.5px;
    font-weight: bold;
    color: #374151;
    margin-bottom: 25px;
  }
  .cert-title {
    text-align: center;
    font-size: 16px;
    font-weight: 800;
    margin-bottom: 25px;
    color: #0f172a;
  }
  .cert-recipient {
    font-size: 14.5px;
    font-weight: 800;
    margin-bottom: 20px;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .cert-body {
    text-align: justify;
    margin-bottom: 20px;
  }
  .cert-body p {
    margin-bottom: 16px;
  }
  .closing-phrase {
    margin-top: 25px;
    font-weight: 600;
    text-align: center;
  }
  .signature-section {
    margin-top: 45px;
    width: 250px;
  }
  .sig-title {
    font-size: 13.5px;
    font-weight: 800;
    margin: 0 0 40px 0;
  }
  .sig-line {
    color: #6b7280;
    letter-spacing: 1px;
    margin: 0;
  }

  @media print {
    body {
      background: none;
    }
    .salary-cert-wrapper {
      width: 100%;
      padding: 5mm 10mm;
      box-shadow: none;
    }
  }
</style>`,
    variables: ['issue_date', 'employee_name_ar', 'nationality_ar', 'civil_id', 'work_status_verb_ar', 'company_name_ar', 'job_title_ar', 'hire_date', 'salary_amount', 'salary_in_words_ar', 'pronoun_object_ar', 'bank_name_ar', 'iban_number', 'gender_suffix_ar', 'pronoun_prep_ar'],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'salary_cert_en',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'SALARY_CERTIFICATE_EN',
    titleAr: 'Salary Certificate (English)',
    titleEn: 'Salary Certificate (English)',
    category: 'الشهادات والخطابات',
    contentHtml: `<div class="salary-cert-wrapper" dir="ltr">
  <div class="cert-date" style="text-align: right;">
    Date: {{issue_date}}
  </div>

  <div class="cert-title">
    Salary and Salary Continuation Certificate
  </div>

  <div class="cert-recipient">
    To Whom It May Concern
  </div>

  <div class="cert-body">
    <p>
      We hereby certify that <strong>{{title_en}} {{employee_name_en}}</strong>, a <strong>{{nationality_en}}</strong> national, holding Civil ID No. <code>{{civil_id}}</code>, is employed with us at <strong>{{company_name_en}}</strong> in the position of <strong>{{job_title_en}}</strong>, effective from <strong>{{hire_date}}</strong>. {{pronoun_subject_en}} receives a monthly salary of <strong>KWD {{salary_amount}} ({{salary_in_words_en}})</strong> and is still continuously holding {{pronoun_possessive_en}} position to date.
    </p>

    <p>
      Please be informed that the clinic will continue to transfer {{pronoun_possessive_en}} monthly salary, as well as {{pronoun_possessive_en}} end-of-service indemnity benefits when due, to {{pronoun_possessive_en}} personal bank account held at <strong>{{bank_name_en}}</strong> under IBAN: <code>{{iban_number}}</code>.
    </p>

    <p>
      This certificate has been issued upon {{pronoun_possessive_en}} personal request without any liability or responsibility on the institution towards third-party rights.
    </p>

    <div class="closing-phrase">
      Please accept our highest respect and appreciation.
    </div>
  </div>

  <div class="signature-section" style="text-align: right;">
    <p class="sig-title">Authorized Signatory</p>
    <div class="sig-line">...................................................</div>
  </div>
</div>

<style>
  @page {
    size: A4;
    margin: 15mm 20mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .salary-cert-wrapper {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #ffffff;
    padding: 15mm 20mm;
    font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
    color: #111827;
    font-size: 13.5px;
    line-height: 1.9;
  }
  .cert-date {
    font-size: 12.5px;
    font-weight: bold;
    color: #374151;
    margin-bottom: 25px;
  }
  .cert-title {
    text-align: center;
    font-size: 16px;
    font-weight: 800;
    margin-bottom: 25px;
    color: #0f172a;
  }
  .cert-recipient {
    font-size: 14.5px;
    font-weight: 800;
    margin-bottom: 20px;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .cert-body {
    text-align: justify;
    margin-bottom: 20px;
  }
  .cert-body p {
    margin-bottom: 16px;
  }
  .closing-phrase {
    margin-top: 25px;
    font-weight: 600;
    text-align: center;
  }
  .signature-section {
    margin-top: 45px;
    width: 250px;
  }
  .sig-title {
    font-size: 13.5px;
    font-weight: 800;
    margin: 0 0 40px 0;
  }
  .sig-line {
    color: #6b7280;
    letter-spacing: 1px;
    margin: 0;
  }

  @media print {
    body {
      background: none;
    }
    .salary-cert-wrapper {
      width: 100%;
      padding: 5mm 10mm;
      box-shadow: none;
    }
  }
</style>`,
    variables: ['issue_date', 'title_en', 'employee_name_en', 'nationality_en', 'civil_id', 'company_name_en', 'job_title_en', 'hire_date', 'salary_amount', 'salary_in_words_en', 'pronoun_subject_en', 'pronoun_possessive_en', 'bank_name_en', 'iban_number'],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'tpl-salary-certificate-almanar',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'SALARY_CERTIFICATE',
    titleAr: 'شهادة راتب واستمرارية عمل رسمية',
    titleEn: 'Salary & Continuity Certificate',
    category: 'الشهادات والخطابات',
    contentHtml: `<div class="page" dir="rtl" style="font-family: 'Cairo', Tahoma, sans-serif; padding: 30px; font-size: 14px; line-height: 1.8; background: #fff;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 25px;">
        <div>
          <h4 style="font-weight: bold; margin: 0 0 5px 0;">{{company_name_ar}}</h4>
          <p style="color: #666; margin: 0; font-size: 12px;">الرقم الآلي للجهة: <span>{{commercial_reg_no}}</span></p>
        </div>
        <div style="text-align: left;">
          <p style="margin: 0 0 5px 0;">التاريخ: <span>{{today_date}}</span></p>
          <p style="margin: 0; font-size: 12px;">الرقم المرجعي: HR-CERT-{{civil_id}}</p>
        </div>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <h3 style="font-weight: bold; text-decoration: underline; margin-bottom: 10px;">شهادة راتب ومباشرة عمل</h3>
        <p style="font-weight: bold;">إلى من يهمه الأمر</p>
      </div>
      <div style="margin: 30px 0; text-align: justify;">
        <p style="margin-bottom: 20px;">
          تشهد شركة/مؤسسة <strong>{{company_name_ar}}</strong> بأن السيد/السيدة: 
          <strong>{{emp_name}}</strong>، 
          يحمل جنسية: <strong>{{nationality}}</strong>، 
          والرقم المدني: <strong>{{civil_id}}</strong>، 
          يعمل لدينا بموجب عقد عمل أهلي بمهنة: <strong>{{job_title}}</strong>، 
          وذلك منذ تاريخ مباشرته للعمل في <strong>{{joining_date}}</strong> وما زال على رأس عمله حتى تاريخه.
        </p>
        <p style="margin-bottom: 20px;">ويتقاضى بموجب العقد راتباً شهرياً إجمالياً مفصلاً كالتالي:</p>
        <table style="width: 85%; margin: 20px auto; border-collapse: collapse; text-align: center;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="border: 1px solid #cbd5e1; padding: 8px;">الراتب الأساسي</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px;">بدل السكن / الانتقال</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px;">بدلات أخرى</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">إجمالي الراتب الشهري</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">{{basic_salary}} د.ك</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">{{allowances}} د.ك</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">0.000 د.ك</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">{{salary_total}} د.ك</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top: 20px;">
          وقد أُعطيت له هذه الشهادة بناءً على طلبه لتقديمها إلى الجهات المعنية دون أدنى مسؤولية مالية أو قانونية على الشركة تجاه حقوق الغير.
        </p>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 60px; text-align: center;">
        <div style="width: 45%;">
          <p><strong>إدارة الموارد البشرية والشؤون الإدارية</strong></p>
          <br/><br/>
          <p>التوقيع: .......................................</p>
        </div>
        <div style="width: 45%;">
          <p><strong>ختم المنشأة الرسمي</strong></p>
          <br/><br/>
          <p>.......................................</p>
        </div>
      </div>
    </div>`,
    variables: ['today_date', 'emp_name', 'nationality', 'civil_id', 'company_name_ar', 'job_title', 'joining_date', 'basic_salary', 'allowances', 'salary_total', 'commercial_reg_no'],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'tpl-kuwait-payslip',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'KUWAIT_PAYSLIP',
    titleAr: 'قسيمة الراتب المعتمدة (WPS Slip)',
    titleEn: 'Kuwait Official Payslip',
    category: 'الرواتب والأجور',
    contentHtml: `<div class="page" dir="rtl" style="font-family: 'Cairo', Tahoma, sans-serif; padding: 25px; font-size: 13px; background: #fff;">
      <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px;">
        <div>
          <h4 style="font-weight: bold; margin: 0 0 5px 0;">{{company_name_ar}}</h4>
          <p style="margin: 0; color: #555;">كشف مسير راتب شهر: <strong>{{current_date}}</strong></p>
        </div>
        <div style="text-align: left;">
          <p style="margin: 0 0 5px 0;">رقم القسيمة: SLP-{{civil_id}}</p>
          <p style="margin: 0; color: #555;">تاريخ الإصدار: {{today_date}}</p>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tbody>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; width: 20%;"><strong>اسم الموظف:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; width: 30%;">{{emp_name}}</td>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; width: 20%;"><strong>الرقم المدني:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; width: 30%;">{{civil_id}}</td>
          </tr>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px;"><strong>المسمى الوظيفي:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">{{job_title}}</td>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px;"><strong>القسم:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">{{department}}</td>
          </tr>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px;"><strong>البنك المحول له:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">{{bank_name}}</td>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px;"><strong>رقم الآيبان (IBAN):</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;"><code>{{iban}}</code></td>
          </tr>
        </tbody>
      </table>
      <div style="display: flex; gap: 15px; margin-bottom: 20px;">
        <div style="flex: 1;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc; text-align: center;">
                <th colspan="2" style="border: 1px solid #cbd5e1; padding: 8px;">الاستحقاقات والبدلات (Earnings)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">الراتب الأساسي</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">{{basic_salary}} د.ك</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">بدل سكن وانتقال</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">{{allowances}} د.ك</td>
              </tr>
              <tr style="background: #f0fdf4; font-weight: bold;">
                <td style="border: 1px solid #cbd5e1; padding: 8px;">إجمالي الاستحقاقات</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">{{salary_total}} د.ك</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="flex: 1;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc; text-align: center;">
                <th colspan="2" style="border: 1px solid #cbd5e1; padding: 8px;">الاستقطاعات والخصومات (Deductions)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">التأمينات الاجتماعية (PIFSS)</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">0.000 د.ك</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px;">سلف وأقساط وقروض</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">0.000 د.ك</td>
              </tr>
              <tr style="background: #fef2f2; font-weight: bold;">
                <td style="border: 1px solid #cbd5e1; padding: 8px;">إجمالي الخصومات</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">0.000 د.ك</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style="background: #e2e8f0; text-align: center; padding: 12px; border-radius: 6px; margin-bottom: 25px;">
        <h5 style="margin: 0; font-weight: bold; color: #0f172a;">
          صافي الراتب المستحق للتحويل (Net Payable): 
          <span style="color: #047857;">{{salary_total}} د.ك</span>
        </h5>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 30px; text-align: center;">
        <div><p>إعداد المحاسب / الموارد البشرية: .....................</p></div>
        <div><p>توقيع الموظف بالاستلام / إشعار تحويل بنكي</p></div>
      </div>
    </div>`,
    variables: ['current_date', 'today_date', 'company_name_ar', 'emp_name', 'civil_id', 'job_title', 'department', 'bank_name', 'iban', 'basic_salary', 'allowances', 'salary_total'],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'tpl-kuwait-eos-clearance',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'EOS_CLEARANCE',
    titleAr: 'استمارة تسوية ونهاية الخدمة (المادة 51)',
    titleEn: 'EOS Settlement & Clearance',
    category: 'نهاية الخدمة',
    contentHtml: `<div class="page" dir="rtl" style="font-family: 'Cairo', Tahoma, sans-serif; padding: 25px; font-size: 13px; line-height: 1.7; background: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px;">
        <h4 style="font-weight: bold; margin: 0 0 5px 0;">{{company_name_ar}}</h4>
        <h3 style="font-weight: bold; margin: 5px 0 0 0;">استمارة تسوية مستحقات نهاية الخدمة وبراءة ذمة شاملة</h3>
        <p style="color: #666; font-size: 11px; margin: 3px 0 0 0;">وفقاً لقانون العمل الكويتي رقم 6 لسنة 2010 (المادة 51)</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tbody>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; width: 20%;"><strong>اسم الموظف:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; width: 30%;">{{emp_name}}</td>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; width: 20%;"><strong>الرقم المدني:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; width: 30%;">{{civil_id}}</td>
          </tr>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px;"><strong>تاريخ التعيين:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">{{joining_date}}</td>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px;"><strong>تاريخ انتهاء الخدمة:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">{{current_date}}</td>
          </tr>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px;"><strong>سبب انتهاء الخدمة:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">استقالة / انتهاء عقد</td>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px;"><strong>إجمالي مدة الخدمة:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;"><strong>3 سنوات</strong></td>
          </tr>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px;"><strong>آخر راتب شامل محتسب:</strong></td>
            <td colspan="3" style="border: 1px solid #cbd5e1; padding: 8px;"><strong>{{salary_total}} د.ك</strong> (أساس احتساب الأجر اليومي = الراتب ÷ 26 يوم)</td>
          </tr>
        </tbody>
      </table>
      <table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="border: 1px solid #cbd5e1; padding: 8px;">بيان المستحقات القانونية</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">طريقة الاحتساب وفق قانون العمل الكويتي</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">المبلغ المستحق (د.ك)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">مكافأة نهاية الخدمة عن السنوات الأولى</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">15 يوماً عن كل سنة عمل</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">{{salary_total}} د.ك</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">بدل رصيد الإجازات السنوية المتبقية</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">30 يوم × الأجر اليومي</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">0.000 د.ك</td>
          </tr>
          <tr style="background: #f0fdf4; font-weight: bold;">
            <td colspan="2" style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">إجمالي المستحقات الإجمالية</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">{{salary_total}} د.ك</td>
          </tr>
          <tr style="background: #fef2f2;">
            <td colspan="2" style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">يخصم: السلف، المديونيات، أو التلفيات والعهد</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">(0.000) د.ك</td>
          </tr>
          <tr style="background: #dcfce7; font-weight: bold; font-size: 14px;">
            <td colspan="2" style="border: 1px solid #cbd5e1; padding: 10px; text-align: right;">صافي المبلغ النهائي المستحق للصرف</td>
            <td style="border: 1px solid #cbd5e1; padding: 10px; color: #166534;">{{salary_total}} د.ك</td>
          </tr>
        </tbody>
      </table>
      <div style="border: 1px solid #cbd5e1; padding: 12px; background: #f8fafc; margin-bottom: 20px; font-size: 12px;">
        <p style="margin: 0 0 5px 0; font-weight: bold; text-align: center;">إقرار استلام ومخالصة تامة وإبراء ذمة نهائي</p>
        <p style="margin: 0; text-align: justify;">
          أقر أنا الموقع أدناه <strong>{{emp_name}}</strong> بأنني استلمت كامل مستحقاتي العمالية ونهاية الخدمة وبدل الإجازات وكافة حقوقي الناتجة عن عقد العمل المبرم مع الشركة المذكورة أعلاه، وأبرئ ذمة المنشأة إبراءً شاملاً ومانعاً من أي حق أو مطالبة حالية أو مستقبلية.
        </p>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 30px; text-align: center;">
        <div><p><strong>مسؤول الموارد البشرية</strong><br/>..................................</p></div>
        <div><p><strong>الإدارة المالية</strong><br/>..................................</p></div>
        <div><p><strong>توقيع الموظف (المقر بما فيه)</strong><br/>..................................</p></div>
      </div>
    </div>`,
    variables: ['company_name_ar', 'emp_name', 'civil_id', 'joining_date', 'current_date', 'salary_total'],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'tpl-kuwait-joining-duty',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'JOINING_DUTY',
    titleAr: 'إشعار استلام ومباشرة عمل',
    titleEn: 'Work Commencement Notice',
    category: 'التعيين والتعاقد',
    contentHtml: `<div class="page" dir="rtl" style="font-family: 'Cairo', Tahoma, sans-serif; padding: 30px; font-size: 14px; background: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 25px;">
        <h4 style="font-weight: bold; margin: 0 0 5px 0;">{{company_name_ar}}</h4>
        <h3 style="font-weight: bold; margin: 5px 0 0 0;">إشعار استلام ومباشرة عمل</h3>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <tbody>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; width: 25%;"><strong>اسم الموظف:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">{{emp_name}}</td>
          </tr>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px;"><strong>الرقم المدني / الجنسية:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">{{civil_id}} - ({{nationality}})</td>
          </tr>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px;"><strong>الوظيفة المعين عليها:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">{{job_title}}</td>
          </tr>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px;"><strong>القسم / الفرع:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">{{department}}</td>
          </tr>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px;"><strong>تاريخ المباشرة الفعلية:</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;"><strong>{{joining_date}}</strong></td>
          </tr>
          <tr>
            <td style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px;"><strong>فترة التجربة (Probation):</strong></td>
            <td style="border: 1px solid #cbd5e1; padding: 10px;">100 يوم عمل فعلي (وفقاً للمادة 32 من قانون العمل الكويتي)</td>
          </tr>
        </tbody>
      </table>
      <p style="line-height: 1.8; margin-bottom: 40px; text-align: justify;">
        بهذا تم تسجيل حضور الموظف المذكور وبدء مهامه الوظيفية رسمياً، ويُرجى من الشؤون المالية وإدارة تكنولوجيا المعلومات تفعيل حساباته وصرف العهد اللازمة وفق اللائحة الداخلية.
      </p>
      <div style="display: flex; justify-content: space-between; margin-top: 50px; text-align: center;">
        <div><p><strong>توقيع الموظف</strong><br/>............................</p></div>
        <div><p><strong>المسؤول المباشر</strong><br/>............................</p></div>
        <div><p><strong>اعتماد الموارد البشرية</strong><br/>............................</p></div>
      </div>
    </div>`,
    variables: ['company_name_ar', 'emp_name', 'civil_id', 'nationality', 'job_title', 'department', 'joining_date'],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'tpl-kuwait-contract-pam',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'EMPLOYMENT_CONTRACT_PAM',
    titleAr: 'عقد العمل الموحد (نموذج 2 - القوى العاملة)',
    titleEn: 'Kuwait Employment Contract (PAM Form)',
    category: 'التعيين والتعاقد',
    contentHtml: `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <title>نموذج عقد عمل استرشادي - الهيئة العامة للقوى العاملة</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #000000;
      font-weight: 500;
    }

    /* صفحة A4 مستقلة */
    .contract-page {
      width: 180mm;
      min-height: 260mm;
      max-height: 265mm;
      overflow: hidden;
      margin: 0 auto;
      background: #ffffff;
      font-size: 10px;
      line-height: 1.36;
      position: relative;
    }

    .page-break {
      page-break-before: always;
      margin-top: 10mm;
    }

    /* الترويسة الحكومية الرسمية مع الشعار في المنتصف */
    .gov-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
    }
    .hdr-en {
      width: 38%;
      text-align: left;
      direction: ltr;
    }
    .hdr-logo {
      width: 24%;
      text-align: center;
    }
    .hdr-ar {
      width: 38%;
      text-align: right;
      direction: rtl;
    }
    .hdr-ar p, .hdr-en p {
      margin: 1px 0;
      font-size: 9.5px;
    }
    .hdr-title-bold {
      font-size: 11px;
      font-weight: 900;
    }
    .pam-logo-img {
      max-width: 60px;
      max-height: 60px;
      object-fit: contain;
    }

    /* تقسيم العمودين */
    .columns-container {
      display: flex;
      justify-content: space-between;
      gap: 14px;
    }
    .col-en {
      width: 49%;
      direction: ltr;
      text-align: justify;
    }
    .col-ar {
      width: 49%;
      direction: rtl;
      text-align: justify;
    }

    /* مربعات الأطراف */
    .party-block {
      border: 1px solid #000;
      padding: 4px 6px;
      margin-bottom: 6px;
      background-color: #fff;
    }
    .party-block p {
      margin: 2px 0;
    }
    .party-badge {
      text-align: center;
      font-weight: 900;
      margin-top: 3px;
      border-top: 1px dashed #666;
      padding-top: 2px;
    }

    .sec-title {
      font-weight: 900;
      text-align: center !important;
      text-decoration: underline;
      margin: 6px 0 4px 0;
      font-size: 11px;
    }
    .preamble-body {
      margin: 0 0 6px 0;
    }

    /* تنسيق البنود وعناوينها في المنتصف */
    .clause-block {
      margin-bottom: 5px;
    }
    .clause-title {
      font-weight: 900;
      display: block;
      text-align: center !important;
      font-size: 10.5px;
      margin-bottom: 1px;
    }
    .clause-subtitle {
      font-weight: 900;
      display: block;
      text-align: center !important;
      font-size: 10.5px;
      margin-bottom: 2px;
    }

    /* التوقيعات الرسمية أسفل الصفحة 2 */
    .signatures-block {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
      padding-top: 10px;
      border-top: 1.5px solid #000;
    }
    .sig-col {
      width: 45%;
      text-align: center;
    }
    .sig-col .main-title {
      font-weight: 900;
      font-size: 11px;
      margin: 0;
    }
    .sig-col .sub-title {
      font-size: 10px;
      color: #000;
      margin: 2px 0 0 0;
      font-weight: 800;
    }
    .sig-empty {
      height: 35px;
    }
    .sig-dots {
      color: #444;
      margin: 0;
      letter-spacing: 1px;
    }

    @media print {
      body {
        background: none;
      }
      .contract-page {
        width: 100%;
        margin: 0;
        page-break-after: always;
      }
      .page-break {
        page-break-before: always;
        margin-top: 0;
      }
    }
  </style>
</head>
<body>

<!-- =================================================================== -->
<!-- الصفحة الأولى (من التمهيد حتى البند السادس) -->
<!-- =================================================================== -->
<div class="contract-page">
  <div class="gov-header">
    <div class="hdr-ar">
      <p class="hdr-title-bold">دولة الكويت</p>
      <p class="hdr-title-bold">الهيئة العامة للقوي العاملة</p>
      <p>الهيئة العامة للقوي العاملة إدارة عمل حولى</p>
      <p class="hdr-title-bold" style="margin-top: 3px;">نموذج عقد عمل استرشادي<br>في القطاع الأهلي</p>
    </div>

    <!-- الشعار الحكومي الرسمي لدولة الكويت في المنتصف -->
    <div class="hdr-logo">
      <img src="https://media.alanba.com.kw/articlefiles/2017/03/731678-1.jpg?height=500" alt="Kuwait Government Emblem" class="pam-logo-img" style="width: 72px; height: 72px; object-fit: contain;" />
    </div>

    <div class="hdr-en">
      <p class="hdr-title-bold">State of Kuwait</p>
      <p class="hdr-title-bold">The Public Authority for Manpower</p>
      <p>Public Authority for Manpower, Hawalli Work Department</p>
      <p class="hdr-title-bold" style="margin-top: 3px;">Sample Form of an Employment Contract<br>In the Civil Sector</p>
    </div>
  </div>

  <div class="columns-container">
    <!-- عمود يسار (عربي) - صفحة 1 -->
    <div class="col-ar">
      <div class="party-block">
        <p>إنه في يوم <strong>{{contract_day_ar}}</strong> الموافق <strong>{{contract_date}}</strong> تحرر هذا العقد بين كل من:</p>
        <p><strong>شركة / مؤسسة:</strong> {{company_name_ar}} ويمثلها في التوقيع على العقد:</p>
        <p>الاسم: <strong>{{manager_name_ar}}</strong></p>
        <p>الرقم المدني: <strong>{{manager_civil_id}}</strong></p>
        <div class="party-badge">" طرف أول "</div>
      </div>

      <div class="party-block">
        <p>الاسم: <strong>{{employee_name_ar}}</strong></p>
        <p>الجنسية: <strong>{{nationality_ar}}</strong></p>
        <p>الرقم المدني: <strong>{{civil_id}}</strong></p>

        <div class="party-badge">" طرف ثان "</div>
      </div>

      <div class="sec-title">تمهيد</div>
      <p class="preamble-body">
        يمتلك الطرف الأول منشأة باسم <strong>{{company_name_ar}}</strong> تعمل بمجال <strong>({{business_activity}})</strong> ويرغب في التعاقد مع الطرف الثاني للعمل لديه بمهنة <strong>{{job_title_ar}}</strong> وبعد أن أقر الطرفان بأهليتهما في إبرام هذا العقد تم الاتفاق على ما يلي:
      </p>

      <div class="clause-block">
        <span class="clause-title">البند الأول</span>
        يعتبر التمهيد السابق جزءاً لا يتجزأ من هذا العقد.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند الثاني</span>
        <span class="clause-subtitle">"طبيعة العمل"</span>
        تعاقد الطرف الأول مع الطرف الثاني للعمل لديه بمهنة: <strong>{{job_title_ar}}</strong> داخل دولة الكويت.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند الثالث</span>
        <span class="clause-subtitle">"فترة التجربة"</span>
        يخضع الطرف الثاني لفترة تجربة لمدة لا تزيد عن 100 يوم عمل ويحق لكل طرف إنهاء العقد خلال تلك الفترة دون إخطار.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند الرابع</span>
        <span class="clause-subtitle">"قيمة الأجر"</span>
        يتقاضى الطرف الثاني عن تنفيذ هذا العقد أجراً مبلغ وقدره <strong>{{salary_amount}} دينار كويتي</strong> يدفع في نهاية كل شهر. ولا يجوز للطرف الأول تخفيض الأجر أثناء سريان هذا العقد. ولا يجوز نقل الطرف الثاني إلى الأجر اليومي دون موافقته.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند الخامس</span>
        <span class="clause-subtitle">"نفاذ العقد"</span>
        يبدأ نفاذ العقد اعتباراً من <strong>{{contract_start_date}}</strong> ويلتزم الطرف الثاني بالقيام بأداء عمله طوال مدة نفاذه.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند السادس</span>
        <span class="clause-subtitle">"مدة العقد"</span>
        هذا العقد <strong>{{contract_term_ar}}</strong> ويبدأ اعتباراً من <strong>{{contract_start_date}}</strong>. اعتبار العقد محدد المدة أو غير محدد المدة يخضع لاختيار وإرادة الطرفين.
      </div>
    </div>

    <!-- عمود يمين (إنجليزي) - صفحة 1 -->
    <div class="col-en">
      <div class="party-block">
        <p>On <strong>{{contract_day_en}}</strong> corresponding to <strong>{{contract_date}}</strong> present contract was concluded by between: <strong>{{company_name_en}}</strong></p>
        <p>represented in signature in the present contract by:</p>
        <p>Name: <strong>{{manager_name_en}}</strong></p>
        <p>Civil Card: <strong>{{manager_civil_id}}</strong></p>
        <div class="party-badge">(First Party)</div>
      </div>

      <div class="party-block">
        <p>Name: <strong>{{employee_name_en}}</strong></p>
        <p>Nationality: <strong>{{nationality_en}}</strong></p>
        <p>Civil Card: <strong>{{civil_id}}</strong></p>

        <div class="party-badge">(Second Party)</div>
      </div>

      <div class="sec-title">Preamble</div>
      <p class="preamble-body">
        The first party owns the facility entitled <strong>{{company_name_en}}</strong> working in the field of <strong>{{business_activity_en}}</strong>, Whereas it wishes to conclude a contract with second party to work for it in the profession of <strong>{{job_title_en}}</strong>. Whereas the parties acknowledged their capacity to conclude this contract, They agreed as follow:
      </p>

      <div class="clause-block">
        <span class="clause-title">Article One</span>
        The preamble above shall constitute an integral part of the present contract.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Two</span>
        <span class="clause-subtitle">"Nature of the Work"</span>
        The first party concluded a contract with the second party to work for it in the profession of: <strong>{{job_title_en}}</strong> in the state of Kuwait.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Three</span>
        <span class="clause-subtitle">"Probation Period"</span>
        The second party shall be subject to a probation period for a term not exceeding 100 work days. Each party shall have the right to terminate the contract during the said term without notification.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Four</span>
        <span class="clause-subtitle">"Lease Value"</span>
        For executing the present contract, the second party shall receive the wage of <strong>{{salary_amount}} Kuwaiti Dinars</strong> to be paid at the end of every month. The first party may not decrease the wage during the term of the contract. It may not transfer the second party to daily wage without his approval.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Five</span>
        <span class="clause-subtitle">"Contract Term"</span>
        The contract shall come into force on <strong>{{contract_start_date}}</strong>. The second party shall execute his work during the entire execution term therefore.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Six</span>
        <span class="clause-subtitle">"Contract Term"</span>
        The present contract has an <strong>{{contract_term_en}}</strong> and it shall come into force on <strong>{{contract_start_date}}</strong>. Considering the contract as having a definite or indefinite term shall be subject to the will of the two parties.
      </div>
    </div>
  </div>
</div>

<!-- =================================================================== -->
<!-- الصفحة الثانية (من البند السابع حتى السادس عشر والتوقيعات) -->
<!-- =================================================================== -->
<div class="contract-page page-break">
  <div class="columns-container">
    <!-- عمود يسار (عربي) - صفحة 2 -->
    <div class="col-ar">
      <div class="clause-block">
        <span class="clause-title">البند السابع</span>
        <span class="clause-subtitle">"الإجازة السنوية"</span>
        للطرف الثاني الحق في إجازة سنوية مدفوعة الأجر مدتها 30 يوماً، ولا يستحقها عن السنة الأولى إلا بعد انقضاء مدة تسعة أشهر تحسب من تاريخ نفاذ العقد.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند الثامن</span>
        <span class="clause-subtitle">"عدد ساعات العمل"</span>
        لا يجوز للطرف الأول تشغيل الطرف الثاني لمدة تزيد عن ثماني ساعات عمل يومياً تتخللها فترة راحة لا تقل عن ساعة باستثناء الحالات المقررة قانوناً.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند التاسع</span>
        <span class="clause-subtitle">"قيمة تذكرة السفر"</span>
        يتحمل الطرف الأول مصاريف عودة الطرف الثاني إلى بلده عند انتهاء علاقة العمل ومغادرته نهائياً للبلاد.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند العاشر</span>
        <span class="clause-subtitle">"التأمين ضد إصابات وأمراض العمل"</span>
        يلتزم الطرف الأول بالتأمين على الطرف الثاني ضد إصابات وأمراض العمل، كما يلتزم بقيمة التأمين الصحي طبقاً للقانون رقم (1) لسنة 1999.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند الحادي عشر</span>
        <span class="clause-subtitle">"مكافأة نهاية الخدمة"</span>
        يستحق الطرف الثاني مكافأة نهاية الخدمة المنصوص عليها بالقوانين المنظمة.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند الثاني عشر</span>
        <span class="clause-subtitle">"القانون الواجب التطبيق"</span>
        تسري أحكام قانون العمل في القطاع الأهلي رقم 6 لسنة 2010 والقرارات المنفذة له فيما لم يرد بشأنه نص في هذا العقد، ويقع باطلاً كل شرط تم الاتفاق عليه بالمخالفة لأحكام القانون، ما لم يكن فيه ميزة أفضل للعامل.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند الثالث عشر</span>
        <span class="clause-subtitle">"شروط خاصة"</span>
        1. يخضع هذا العقد لقانون العمل بالقطاع الأهلي والقوانين الكويتية المنظمة لممارسة المهنة.<br>
        2. وعند رفض السلطات إصدار أو تجديد تراخيص العمل أو مزاولة المهنة للطرف الثاني فيعتبر هذا إنهاء للعقد دون إخطار أو حكم قضائي أو سداد أي تعويض.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند الرابع عشر</span>
        <span class="clause-subtitle">"المحكمة المختصة"</span>
        تختص المحكمة الكلية ودوائرها العمالية طبقاً لأحكام القانون رقم 46 لسنة 1987 بنظر كافة المنازعات الناشئة عن تطبيق أو تفسير هذا العقد.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند الخامس عشر</span>
        <span class="clause-subtitle">"لغة العقد"</span>
        حرر هذا العقد باللغتين العربية والإنجليزية، ويعتمد بنصوص اللغة العربية عند وقوع أي تعارض بينهما.
      </div>

      <div class="clause-block">
        <span class="clause-title">البند السادس عشر</span>
        <span class="clause-subtitle">"نسخ العقد"</span>
        حرر هذا العقد من ثلاث نسخ بيد كل طرف نسخة للعمل بموجبها والثالثة تودع لدى الهيئة العامة للقوى العاملة.
      </div>
    </div>

    <!-- عمود يمين (إنجليزي) - صفحة 2 -->
    <div class="col-en">
      <div class="clause-block">
        <span class="clause-title">Article Seven</span>
        <span class="clause-subtitle">"Annual Leave"</span>
        The second party shall have the right to a paid annual leave with a term of 30 days. It shall not be due on the first year save after the expiration of nine months to be calculated from the date of the contract coming into force.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Eight</span>
        <span class="clause-subtitle">"Number of Work Hours"</span>
        The first party may not require that the second party work for a term exceeding eight daily work hours with rest period not less than one hour except for the cases set forth in the law.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Nine</span>
        <span class="clause-subtitle">"Ticket Value"</span>
        The first party shall bear the expenses of the return of the second party to his country after the expiration of the work relationship and his final departure from the country.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Ten</span>
        <span class="clause-subtitle">"Insurance against Injuries and Work Maladies"</span>
        The first party shall insure the second party against injuries and work maladies. It shall also commit to the health insurance value in accordance with the law No. (1) of the year 1999.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Eleven</span>
        <span class="clause-subtitle">"End of Service Benefit"</span>
        The second party shall be due the end of the service benefit as set forth in the regulating laws.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Twelve</span>
        <span class="clause-subtitle">"Applicable Law"</span>
        The provisions of the Labour code in the civil sector No. 6 of 2010 and the decisions executing the same shall apply for all matters not provided for in the present contract. Shall be considered null every condition agreed upon in violation of the provisions of the law, unless the same has a better benefit for the worker.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Thirteen</span>
        <span class="clause-subtitle">"Special Conditions"</span>
        1. This contract is subject to the Labor Law No. 6/2010 and the Kuwaiti laws regulating the practice of the profession.<br>
        2. In case the Kuwaiti Authorities refuse to issue or renew the second party's work permits or License, your contract shall be terminating without right for any claim of whatsoever kind.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Fourteen</span>
        <span class="clause-subtitle">"Specialized Court"</span>
        The court of first instance and its Labour departments, in accordance with the provisions of the law No. 46 of the year 1987, shall be competent to peruse conflicts resulting from the execution or interpretation of the present contract.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Fifteen</span>
        <span class="clause-subtitle">"Contract Language"</span>
        The present contract was made in Arabic and English. The Arabic texts shall prevail in the case of conflict between them.
      </div>

      <div class="clause-block">
        <span class="clause-title">Article Sixteen</span>
        <span class="clause-subtitle">"Contract Copies"</span>
        The present contract was made in three copies, one for each party to work in accordance therewith. The third copy shall be deposited with the Public Authority for Manpower.
      </div>
    </div>
  </div>

  <!-- التوقيعات فقط في الأسفل -->
  <div class="signatures-block">
    <div class="sig-col" dir="ltr">
      <p class="main-title">Second Party</p>
      <p class="sub-title">الطرف الثاني</p>
      <div class="sig-empty"></div>
      <p class="sig-dots">...................................................</p>
    </div>

    <div class="sig-col" dir="rtl">
      <p class="main-title">الطرف الأول</p>
      <p class="sub-title">First Party</p>
      <div class="sig-empty"></div>
      <p class="sig-dots">...................................................</p>
    </div>
  </div>
</div>

</body>
</html>`,
    variables: [
      'employee_name_ar', 'employee_name_en', 'manager_name_ar', 'manager_name_en', 'manager_civil_id',
      'civil_id', 'nationality_ar', 'nationality_en', 'residence_type_ar', 'residence_type_en',
      'job_title_ar', 'job_title_en', 'salary_amount', 'contract_start_date', 'contract_term_ar',
      'contract_term_en', 'contract_date', 'contract_day_ar', 'contract_day_en', 'business_activity', 'business_activity_en', 'company_name_ar', 'company_name_en'
    ],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'tpl-emp-contract-01',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'EMPLOYMENT_CONTRACT',
    titleAr: 'عقد عمل كويتي (Sat-Thu)',
    titleEn: 'Employment Contract',
    category: 'التعيين والتعاقد',
    contentHtml: `<div style="font-family: 'Arial'; padding: 30px; direction: rtl; border: 1px solid #000;">
            <h2 style="text-align: center;">عقد عمل / Employment Contract</h2>
            <p><strong>الطرف الأول:</strong> {{company_name_ar}}</p>
            <p><strong>الطرف الثاني:</strong> {{emp_name}}</p>
            <hr>
            <p>1. الأجر الشهري الإجمالي: {{total_salary}} د.ك (يصرف بالكامل بدون استقطاعات تأمينية).</p>
            <p>2. أيام العمل: من السبت إلى الخميس، والجمعة عطلة أسبوعية.</p>
            <p>3. الإجازة السنوية: 30 يوماً مدفوعة الأجر عن كل عام.</p>
            <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                <span>توقيع الموظف / Employee</span>
                <span>توقيع المدير: سيد / Manager</span>
            </div>
        </div>`,
    variables: ['emp_name', 'total_salary'],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'tpl-payslip-02',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'PAYSLIP_PRINT',
    titleAr: 'قسيمة الراتب (Payslip)',
    titleEn: 'Payslip',
    category: 'المالية والرواتب',
    contentHtml: `<div style="font-family: 'Arial'; padding: 20px; border: 1px solid #714B67; direction: rtl;">
            <h3 style="text-align: center;">قسيمة الراتب / Salary Slip</h3>
            <table style="width: 100%; border-collapse: collapse; text-align: center;">
                <tr style="background: #f2f2f2;">
                    <th style="border: 1px solid #ddd; padding: 10px;">الوصف / Description</th>
                    <th style="border: 1px solid #ddd; padding: 10px;">المبلغ / Amount</th>
                </tr>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 10px;">الراتب المستحق (أساسي + بدلات)</td>
                    <td style="border: 1px solid #ddd; padding: 10px;">{{total_salary}} د.ك</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 10px;">خصم أيام الغياب (Unpaid Days / Lateness / Loans)</td>
                    <td style="color: red; border: 1px solid #ddd; padding: 10px;">- {{deductions_amount}} د.ك</td>
                </tr>
                <tr style="font-weight: bold; background: #eee;">
                    <td style="border: 1px solid #ddd; padding: 10px;">صافي الراتب المستلم / Net Salary</td>
                    <td style="border: 1px solid #ddd; padding: 10px;">{{net_payable}} د.ك</td>
                </tr>
            </table>
        </div>`,
    variables: ['total_salary', 'deductions_amount', 'net_payable'],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'tpl-sal-cert-03',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'SALARY_CERTIFICATE',
    titleAr: 'شهادة راتب موجهة للبنك',
    titleEn: 'Bank Salary Certificate',
    category: 'المعاملات البنكية والرسمية',
    contentHtml: `<div style="font-family: 'Arial'; padding: 30px; direction: rtl;">
            <h2 style="text-align: center;">شهادة راتب وإقرار عمل</h2>
            <p>تشهد إدارة <strong>{{company_name_ar}}</strong> بأن السيد/ {{emp_name}} يتقاضى راتباً شهرياً إجمالياً قدره {{total_salary}} د.ك.</p>
            <p>ويتم صرف الراتب كاملاً دون أي استقطاعات تأمينية أو ديون للشركة حتى تاريخه.</p>
            <br>
            <p style="text-align: left;">مدير عام الشركة: سيد (Sayed)</p>
        </div>`,
    variables: ['emp_name', 'total_salary'],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
];

export const AVAILABLE_VARIABLES = [
  { tag: '{{emp_name}}', label: 'اسم الموظف' },
  { tag: '{{full_name}}', label: 'اسم الموظف الثلاثي' },
  { tag: '{{civil_id}}', label: 'الرقم المدني' },
  { tag: '{{nationality}}', label: 'الجنسية' },
  { tag: '{{job_title}}', label: 'المسمى الوظيفي' },
  { tag: '{{department}}', label: 'القسم / الإدارة' },
  { tag: '{{joining_date}}', label: 'تاريخ المباشرة/التعيين' },
  { tag: '{{current_date}}', label: 'تاريخ اليوم' },
  { tag: '{{basic_salary}}', label: 'الراتب الأساسي (KWD)' },
  { tag: '{{allowances}}', label: 'إجمالي البدلات (KWD)' },
  { tag: '{{salary_total}}', label: 'إجمالي الراتب (KWD)' },
  { tag: '{{bank_name}}', label: 'اسم البنك' },
  { tag: '{{iban}}', label: 'رقم الـ IBAN' },
  { tag: '{{contract_duration}}', label: 'مدة العقد' },
  { tag: '{{leave_type}}', label: 'نوع الإجازة' },
  { tag: '{{leave_start}}', label: 'تاريخ بداية الإجازة' },
  { tag: '{{leave_end}}', label: 'تاريخ نهاية الإجازة' },
  { tag: '{{leave_days}}', label: 'عدد أيام الإجازة' },
  { tag: '{{last_return_date}}', label: 'تاريخ آخر عودة من إجازة' },
  { tag: '{{leave_allowance_amount}}', label: 'مستحقات راتب الإجازة' },
  { tag: '{{deductions_amount}}', label: 'الخصومات والسلف' },
  { tag: '{{net_payable}}', label: 'صافي المستحق للصرف' },
  { tag: '{{warning_reason}}', label: 'سبب الإنذار' },
  { tag: '{{incident_date}}', label: 'تاريخ المخالفة' },
  { tag: '{{end_date}}', label: 'تاريخ نهاية الخدمة' },
  { tag: '{{company_name_ar}}', label: 'اسم الشركة' },
  { tag: '{{labor_department}}', label: 'إدارة العمل (عربي)' },
  { tag: '{{labor_department_en}}', label: 'إدارة العمل (إنجليزي)' },
  { tag: '{{contract_day_ar}}', label: 'اليوم (عربي)' },
  { tag: '{{contract_day_en}}', label: 'اليوم (إنجليزي)' },
  { tag: '{{contract_date}}', label: 'تاريخ العقد' },
  { tag: '{{manager_name}}', label: 'اسم ممثل الشركة / المدير' },
  { tag: '{{manager_civil_id}}', label: 'الرقم المدني للمدير' },
  { tag: '{{business_activity}}', label: 'نشاط المنشأة/الشركة' },
  { tag: '{{contract_type_ar}}', label: 'نوع العقد (محدد/غير محدد)' },
  { tag: '{{annual_leave_days}}', label: 'أيام الإجازة السنوية' },
  { tag: '{{special_conditions}}', label: 'الشروط الخاصة' },
];

export const DocumentTemplatesApp: React.FC<DocumentTemplatesAppProps> = ({
  templates,
  generatedDocs,
  employees,
  contracts,
  activeCompany,
  onSaveTemplate,
  onDeleteTemplate,
  onIssueDocument,
  onAddAuditLog,
}) => {
  const [activeTab, setActiveTab] = useState<'ISSUANCE' | 'TEMPLATES' | 'ARCHIVE'>('ISSUANCE');
  
  // Combine custom templates with default seeds
  const allTemplates = templates.length > 0 ? templates : DEFAULT_TEMPLATES_SEED;

  // Issuance State
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [selectedTplId, setSelectedTplId] = useState<string>(allTemplates[0]?.id || '');
  const [issueSearchTerm, setIssueSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [docLang, setDocLang] = useState<'AR' | 'EN'>('AR');
  const [specialConditions, setSpecialConditions] = useState<string>('يلتزم الطرف الثاني بالسرية التامة لجميع البيانات واللوائح الداخلية ومستندات المنشأة وتأدية المهام الموكلة إليه بإخلاص.');

  // Print Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeGenDoc, setActiveGenDoc] = useState<GeneratedDocument | null>(null);

  // Editor Modal State
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate>({
    id: `tpl-${Date.now()}`,
    companyId: activeCompany?.id || 'comp-1',
    templateCode: `TPL-CUSTOM-${Math.floor(Math.random() * 900) + 100}`,
    titleAr: '',
    titleEn: '',
    category: 'GENERAL',
    contentHtml: '<p>أدخل نص القالب هنا واستخدم المتغيرات التفاعلية...</p>',
    variables: [],
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  });

  // Selected Employee & Selected Contract
  const selectedEmp = employees.find(e => e.id === selectedEmpId);
  const selectedContract = contracts.find(c => c.employeeId === selectedEmpId);
  const selectedTemplate = allTemplates.find(t => t.id === selectedTplId) || allTemplates[0];

  // Substitute Variables into HTML Template
  const fillTemplateHtml = (template: DocumentTemplate, emp?: Employee, cnt?: Contract, lang: 'AR' | 'EN' = docLang): string => {
    if (!template) return '';
    let html = (lang === 'EN' && template.contentHtmlEn) ? template.contentHtmlEn : template.contentHtml;

    if (lang === 'EN' && !template.contentHtmlEn) {
      if (template.templateCode === 'EXPERIENCE_RECOMMENDATION' || template.templateCode === 'EXPERIENCE_CLEARANCE') {
        html = `<div style="direction: ltr; font-family: Arial, Helvetica, sans-serif; padding: 40px; max-width: 800px; margin: auto; line-height: 2; color: #000;"><div style="text-align: right; margin-bottom: 30px; font-weight: bold; font-size: 16px;">Date: {{current_date}}</div><div style="text-align: center; margin-bottom: 40px;"><h2 style="text-decoration: underline; font-size: 24px; font-weight: bold;">EXPERIENCE & RECOMMENDATION CERTIFICATE</h2></div><div style="font-size: 18px; text-align: justify; margin-bottom: 30px;">This is to certify that <b>{{company_name}}</b> declares that Mr./Ms. <b>{{emp_name}}</b>, holding nationality: <b>{{nationality}}</b> and Civil ID: <b>{{civil_id}}</b>, was employed with us as <b>{{job_title}}</b> from <b>{{joining_date}}</b> until <b>{{end_date}}</b>.</div><div style="font-size: 18px; text-align: justify; margin-bottom: 50px;">This certificate is issued upon his/her request without any financial or legal liability on <b>{{company_name}}</b> towards third parties.</div><div style="font-size: 18px; margin-bottom: 60px;">We wish him/her all success and prosperity in future endeavors.</div><div style="margin-top: 80px; font-size: 18px; font-weight: bold;">General Manager</div></div>`;
      }
    }

    const basicSalary = cnt ? cnt.basicSalary : 800;
    const allowances = cnt ? (cnt.housingAllowance + cnt.transportAllowance + cnt.otherAllowance) : 200;
    const totalSalary = basicSalary + allowances;

    const empName = lang === 'EN' 
      ? (emp?.fullNameEn || emp?.fullNameAr || 'Ahmed Mahmoud Al-Kuwaiti') 
      : (emp?.fullNameAr || 'أحمد محمود الكويتي');
    const companyName = lang === 'EN' ? (activeCompany?.nameEn || activeCompany?.nameAr || '') : (activeCompany?.nameAr || '');
    const civilId = emp ? emp.civilId : '293041501234';

    const isFemale = emp?.gender === 'FEMALE';
    const genderVerb = isFemale ? 'تعمل لدينا' : 'يعمل لدينا';
    const genderPronoun = isFemale ? 'حسابها' : 'حسابه';
    const genderStatus = isFemale ? 'ومستمرة بالعمل' : 'ومستمر بالعمل';
    const genderObj = isFemale ? 'لها' : 'له';
    const genderRequest = isFemale ? 'طلبها' : 'طلبه';

    const natRaw = (emp?.nationality || (lang === 'EN' ? 'Kuwaiti' : 'كويتي')).trim();
    const natUpper = natRaw.toUpperCase();
    const nationalityMap: Record<string, { male: string; female: string }> = {
      'KWT': { male: 'كويتي', female: 'كويتية' },
      'KUWAITI': { male: 'كويتي', female: 'كويتية' },
      'الكويت': { male: 'كويتي', female: 'كويتية' },
      'EGY': { male: 'مصري', female: 'مصرية' },
      'EGYPTIAN': { male: 'مصري', female: 'مصرية' },
      'مصر': { male: 'مصري', female: 'مصرية' },
      'IND': { male: 'هندي', female: 'هندية' },
      'INDIAN': { male: 'هندي', female: 'هندية' },
      'الهند': { male: 'هندي', female: 'هندية' },
      'IRN': { male: 'إيراني', female: 'إيرانية' },
      'IRANIAN': { male: 'إيراني', female: 'إيرانية' },
      'إيران': { male: 'إيراني', female: 'إيرانية' },
      'PAK': { male: 'باكستاني', female: 'باكستانية' },
      'PAKISTANI': { male: 'باكستاني', female: 'باكستانية' },
      'باكستان': { male: 'باكستاني', female: 'باكستانية' },
      'SYR': { male: 'سوري', female: 'سورية' },
      'SYRIAN': { male: 'سوري', female: 'سورية' },
      'سوريا': { male: 'سوري', female: 'سورية' },
      'JOR': { male: 'أردني', female: 'أردنية' },
      'JORDANIAN': { male: 'أردني', female: 'أردنية' },
      'الأردن': { male: 'أردني', female: 'أردنية' },
      'LBN': { male: 'لبناني', female: 'لبنانية' },
      'LEBANESE': { male: 'لبناني', female: 'لبنانية' },
      'لبنان': { male: 'لبناني', female: 'لبنانية' },
      'PHL': { male: 'فلبيني', female: 'فلبينية' },
      'FILIPINO': { male: 'فلبيني', female: 'فلبينية' },
      'الفلبين': { male: 'فلبيني', female: 'فلبينية' },
      'BHR': { male: 'بحريني', female: 'بحرينية' },
      'SAU': { male: 'سعودي', female: 'سعودية' },
      'ARE': { male: 'إماراتي', female: 'إماراتية' },
      'QAT': { male: 'قطري', female: 'قطرية' },
      'OMN': { male: 'عماني', female: 'عمانية' },
      'SDN': { male: 'سوداني', female: 'سودانية' },
      'YEM': { male: 'يمني', female: 'يمنية' },
    };

    const pamData = formatContractData(emp, cnt);

    const jobTitle = emp ? emp.jobTitle : (lang === 'EN' ? 'Senior Accountant' : 'محاسب عام أول');
    const dept = emp ? emp.department : (lang === 'EN' ? 'Finance' : 'الإدارة المالية');
    const joinDate = cnt?.startDate || emp?.joinDate || '2022-01-15';
    const today = new Date().toISOString().split('T')[0];
    const bankName = emp?.bankName || activeCompany?.bankName || (lang === 'EN' ? 'National Bank of Kuwait' : 'البنك التجاري الكويتي');
    const bankNameEnMap: Record<string, string> = {
      'البنك التجاري الكويتي': 'Commercial Bank of Kuwait',
      'بنك بيت التمويل الكويتي': 'Kuwait Finance House',
      'بنك الكويتي الوطني': 'National Bank of Kuwait',
      'الوطني': 'National Bank of Kuwait',
      'التجاري': 'Commercial Bank of Kuwait',
      'بيتك': 'Kuwait Finance House',
      'بنك الخليج': 'Gulf Bank',
      'بنك برقان': 'Burgan Bank',
      'بنك بوبيان': 'Boubyan Bank',
      'بنك وربة': 'Warba Bank',
      'البنك الأهلي الكويتي': 'Al Ahli Bank of Kuwait',
    };
    const bankNameEn = bankNameEnMap[bankName] || ((emp as any)?.bankNameEn || (/^[A-Za-z\s]+$/.test(bankName) ? bankName : 'Commercial Bank of Kuwait'));
    const iban = emp?.iban || activeCompany?.iban || 'KW19 KFHO 0000000000071050546531';
    const contractDuration = cnt?.contractType === 'FIXED_TERM' 
      ? (lang === 'EN' ? 'One Year' : 'سنة واحدة') 
      : (lang === 'EN' ? 'Indefinite' : 'غير محدد المدة');

    let contractEndDate = '---';
    if (cnt?.contractType === 'FIXED_TERM') {
      const endD = new Date(joinDate);
      endD.setFullYear(endD.getFullYear() + 1);
      contractEndDate = endD.toISOString().split('T')[0];
    }
    
    const valuesMap: Record<string, string> = {
      '{{emp_name}}': empName,
      '{{employee_name_ar}}': emp ? emp.fullNameAr : empName,
      '{{employee_name_en}}': emp?.fullNameEn || pamData.employee_name_en,
      '{{full_name}}': empName,
      '{{civil_id}}': civilId,
      '{{passport_no}}': emp ? emp.passportNo : 'P01234567',
      '{{job_title}}': jobTitle,
      '{{job_title_ar}}': pamData.job_title_ar,
      '{{job_title_en}}': pamData.job_title_en,
      '{{department}}': dept,
      '{{basic_salary}}': basicSalary.toFixed(3),
      '{{allowances}}': allowances.toFixed(3),
      '{{total_salary}}': totalSalary.toFixed(3),
      '{{salary_total}}': totalSalary.toFixed(3),
      '{{salary_amount}}': totalSalary.toFixed(3),
      '{{joining_date}}': joinDate,
      '{{join_date}}': joinDate,
      '{{contract_start_date}}': joinDate,
      '{{nationality}}': pamData.nationality_ar,
      '{{nationality_ar}}': pamData.nationality_ar,
      '{{nationality_en}}': pamData.nationality_en,
      '{{residence_type}}': emp?.residencyType || 'إقامة صالحة - المادة 18',
      '{{residence_type_ar}}': emp?.residencyType || 'إقامة صالحة - المادة 18',
      '{{residence_type_en}}': emp?.residencyType || 'Article 18 - Private Sector',
      '{{gender_verb}}': genderVerb,
      '{{gender_pronoun}}': genderPronoun,
      '{{gender_status}}': genderStatus,
      '{{gender_obj}}': genderObj,
      '{{gender_request}}': genderRequest,
      '{{current_date}}': today,
      '{{date_today}}': today,
      '{{bank_name}}': bankName,
      '{{bank_name_ar}}': bankName,
      '{{bank_name_en}}': bankNameEn,
      '{{iban}}': iban,
      '{{iban_number}}': iban,
      '{{moh_license}}': emp?.mohLicenseNo || 'MOH-8842',
      '{{company_name}}': companyName,
      '{{company_name_ar}}': activeCompany?.nameAr || 'مستوصف المنار كلينك',
      '{{company_name_en}}': activeCompany?.nameEn ? activeCompany.nameEn.toUpperCase() : 'AL MANAR CLINIC',
      '{{commercial_reg_no}}': activeCompany?.commercialRegNo || '',
      '{{wsi_code}}': activeCompany?.wsiCode || '',
      '{{contract_duration}}': contractDuration,
      '{{leave_type}}': lang === 'EN' ? 'Annual Leave' : 'إجازة سنوية اعتيادية',
      '{{leave_start}}': today,
      '{{leave_end}}': new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      '{{leave_days}}': '30',
      '{{last_return_date}}': '2025-08-01',
      '{{leave_allowance_amount}}': totalSalary.toFixed(3),
      '{{deductions_amount}}': '0.000',
      '{{net_payable}}': totalSalary.toFixed(3),
      '{{warning_reason}}': lang === 'EN' ? 'Repeated tardiness without permission' : 'التأخر المتكرر عن مواعيد الدوام الرسمي دون إذن مسبق',
      '{{incident_date}}': today,
      '{{end_date}}': contractEndDate,
      '{{labor_department}}': 'العاصمة',
      '{{labor_department_en}}': 'Capital',
      '{{contract_day_ar}}': pamData.contract_day_ar,
      '{{contract_day_en}}': pamData.contract_day_en,
      '{{contract_date}}': pamData.contract_date,
      '{{today_date}}': today,
      '{{salary_in_words}}': tafqeet(totalSalary),
      '{{manager_name}}': (activeCompany as any).managerName || 'د. عبدالله المنار',
      '{{manager_name_ar}}': (activeCompany as any).managerNameAr || (activeCompany as any).managerName || 'د. عبدالله المنار',
      '{{manager_name_en}}': (activeCompany as any).managerNameEn || 'Dr. Abdullah Al-Manar',
      '{{manager_civil_id}}': (activeCompany as any).managerCivilId || '288051200526',
      '{{business_activity}}': (activeCompany as any).businessActivity || 'الطب والرعاية الصحية',
      '{{business_activity_en}}': (activeCompany as any).businessActivityEn || 'Medical and Healthcare',
      '{{contract_type_ar}}': cnt?.contractType === 'FIXED_TERM' ? 'محدد المدة' : 'غير محدد المدة',
      '{{contract_term_ar}}': cnt?.contractType === 'FIXED_TERM' ? 'عقد محدد المدة' : 'عقد غير محدد المدة',
      '{{contract_term_en}}': cnt?.contractType === 'FIXED_TERM' ? 'definite term contract' : 'indefinite term contract',
      '{{annual_leave_days}}': '30',
      '{{special_conditions}}': specialConditions || 'يلتزم الطرف الثاني بالسرية التامة لجميع البيانات واللوائح الداخلية ومستندات المنشأة.',
      '{{issue_date}}': today,
      '{{hire_date}}': joinDate,
      '{{work_status_verb_ar}}': isFemale ? 'تعمل' : 'يعمل',
      '{{salary_in_words_ar}}': tafqeet(totalSalary),
      '{{salary_in_words_en}}': `${totalSalary.toFixed(3)} Kuwaiti Dinars Only`,

      '{{pronoun_prep_ar}}': isFemale ? 'ها' : 'ه',
      '{{title_en}}': isFemale ? 'Ms.' : 'Mr.',
      '{{pronoun_subject_en}}': isFemale ? 'She' : 'He',
      '{{pronoun_possessive_en}}': isFemale ? 'her' : 'his',
    };

    Object.entries(valuesMap).forEach(([tag, val]) => {
      const reg = new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g');
      html = html.replace(reg, val);
    });

    return html;
  };

  // Trigger Issue and Digital Archiving
  const handleIssueDocumentConfirm = () => {
    if (!selectedEmp || !selectedTemplate) {
      alert('يرجى اختيار الموظف والقالب المخصص.');
      return;
    }

    const filledHtml = fillTemplateHtml(selectedTemplate, selectedEmp, selectedContract, docLang);
    const docNum = `DOC-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
    const today = new Date().toISOString().split('T')[0];

    const basicSalary = selectedContract ? selectedContract.basicSalary : 800;
    const allowances = selectedContract ? (selectedContract.housingAllowance + selectedContract.transportAllowance + selectedContract.otherAllowance) : 200;

    const genDoc: GeneratedDocument = {
      id: `gendoc-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      employeeId: selectedEmp.id,
      templateId: selectedTemplate.id,
      templateTitle: docLang === 'EN' ? (selectedTemplate.titleEn || selectedTemplate.titleAr) : selectedTemplate.titleAr,
      documentNumber: docNum,
      issueDate: today,
      language: docLang,
      contentHtml: filledHtml,
      snapshotData: {
        fullNameAr: selectedEmp.fullNameAr,
        civilId: selectedEmp.civilId,
        jobTitle: selectedEmp.jobTitle,
        department: selectedEmp.department,
        basicSalary,
        totalSalary: basicSalary + allowances,
        joinDate: selectedEmp.joinDate,
        companyNameAr: activeCompany?.nameAr || '',
        commercialRegNo: activeCompany?.commercialRegNo || '',
        passportNo: selectedEmp.passportNo,
      },
      issuedBy: 'مسؤول الموارد البشرية (HR Admin)',
      createdAt: new Date().toISOString(),
    };

    // Auto Archive into Employee Digital Files
    const docItem: DocumentItem = {
      id: `doc-gen-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      employeeId: selectedEmp.id,
      title: `${selectedTemplate.titleAr} (${docNum})`,
      category: 'WORK_CONTRACT',
      documentNumber: docNum,
      fileUrl: '#',
      fileName: `${selectedTemplate.titleAr}_${selectedEmp.employeeCode}.pdf`,
      issueDate: today,
      expiryDate: '2099-12-31', // Perpetual certificate
      status: 'ACTIVE',
      createdAt: today,
      tags: ['مستند صادر', selectedTemplate.category],
    };

    onIssueDocument(genDoc, docItem);

    // Audit Trail Logging
    onAddAuditLog({
      companyId: activeCompany?.id || 'comp-1',
      userId: 'HR-ADMIN',
      userName: 'مدير الموارد البشرية',
      action: 'ISSUE',
      entity: 'DOCUMENT',
      entityId: genDoc.id,
      details: `تم إصدار مستند رسمى (${selectedTemplate.titleAr}) للموظف (${selectedEmp.fullNameAr}) برقم تسلسلي ${docNum}`,
    });

    setActiveGenDoc(genDoc);
    setShowPreviewModal(true);
  };

  // Variable Tag Inserter for Editor
  const insertVariableTag = (tag: string) => {
    setEditingTemplate(prev => ({
      ...prev,
      contentHtml: prev.contentHtml + ` ${tag} `,
      variables: prev.variables.includes(tag.replace(/[{}]/g, '')) 
        ? prev.variables 
        : [...prev.variables, tag.replace(/[{}]/g, '')]
    }));
  };

  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate.titleAr) {
      alert('يرجى إدخال عنوان القالب العربي');
      return;
    }

    onSaveTemplate({
      ...editingTemplate,
      updatedAt: new Date().toISOString().split('T')[0],
    });

    onAddAuditLog({
      companyId: activeCompany?.id || 'comp-1',
      userId: 'HR-ADMIN',
      userName: 'مدير الموارد البشرية',
      action: 'CREATE',
      entity: 'TEMPLATE',
      entityId: editingTemplate.id,
      details: `تم إنشاء/تحديث قالب مستندات (${editingTemplate.titleAr})`,
    });

    setShowEditorModal(false);
    alert('تم حفظ القالب بنجاح في المكتبة الموحدة!');
  };

  // Filtered employees for dropdown search
  const filteredEmployees = (employees || []).filter(e => {
    if (e.companyId !== (activeCompany?.id || 'comp-1')) return false;
    if (issueSearchTerm) {
      return e.fullNameAr.includes(issueSearchTerm) || e.employeeCode.includes(issueSearchTerm) || e.civilId.includes(issueSearchTerm);
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 bg-transparent min-h-[calc(100vh-3rem)] space-y-5">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#714B67]" />
            <span>نظام قوالب المستندات والأرشفة الآلية (Document Templates & Archiving)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            صياغة شهادات الخبرة، إشعار الراتب، الإنذارات الرسمية، التعبئة الفورية بالبيانات وحفظ النسخة في الملف الرقمي للموظف
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-bold">
          <button
            onClick={() => setActiveTab('ISSUANCE')}
            className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'ISSUANCE' ? 'bg-[#714B67] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>إصدار مستند جديد</span>
          </button>

          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'TEMPLATES' ? 'bg-[#714B67] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>مكتبة ومحرر القوالب</span>
          </button>

          <button
            onClick={() => setActiveTab('ARCHIVE')}
            className={`px-3.5 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'ARCHIVE' ? 'bg-[#714B67] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>أرشيف المستندات الصادرة ({generatedDocs.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DOCUMENT ISSUANCE & LIVE PREVIEW */}
      {activeTab === 'ISSUANCE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Controls Panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <UserCheck className="w-4 h-4 text-[#714B67]" />
                <span>1. اختيار الموظف والقالب</span>
              </h3>

              {/* Employee Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">الموظف المستهدف:</label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="تصفية بالاسم أو الرقم المدني..."
                    value={issueSearchTerm}
                    onChange={(e) => setIssueSearchTerm(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <select
                  value={selectedEmpId || ''}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-bold text-slate-900 bg-white"
                >
                  {filteredEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullNameAr} ({emp.jobTitle} - {emp.employeeCode})
                    </option>))}
                </select>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع المستند / القالب:</label>
                <select
                  value={selectedTplId || ''}
                  onChange={(e) => setSelectedTplId(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 font-bold text-slate-900 bg-white"
                >
                  {allTemplates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.titleAr} ({tpl.templateCode})
                    </option>))}
                </select>
              </div>

              {/* Language Selection Toggle */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>لغة المستند (Document Language):</span>
                  <span className="text-[10px] text-[#714B67] font-semibold">عربي / English</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDocLang('AR')}
                    className={`py-1.5 px-3 text-xs font-bold rounded transition flex items-center justify-center gap-1.5 ${
                      docLang === 'AR'
                        ? 'bg-[#714B67] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-white'
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>عربي | Arabic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocLang('EN')}
                    className={`py-1.5 px-3 text-xs font-bold rounded transition flex items-center justify-center gap-1.5 ${
                      docLang === 'EN'
                        ? 'bg-[#714B67] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>إنجليزي | English</span>
                  </button>
                </div>
              </div>

              {/* Special Conditions Input (For Contracts & Custom Conditions) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>الشروط الخاصة للعقد (Special Conditions):</span>
                  <span className="text-[10px] text-purple-700 font-semibold">قابلة للتعديل قبل الطباعة</span>
                </label>
                <textarea
                  rows={3}
                  value={specialConditions}
                  onChange={(e) => setSpecialConditions(e.target.value)}
                  placeholder="أدخل البنود أو الشروط الخاصة بالعقد هنا..."
                  className="w-full border border-slate-300 rounded p-2 text-xs font-medium text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              {/* Selected Employee Snapshot Card */}
              {selectedEmp && (
                <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{selectedEmp.fullNameAr}</span>
                    <span className="px-2 py-0.5 bg-purple-200 text-[#714B67] rounded font-mono font-bold text-[10px]">
                      {selectedEmp.employeeCode}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{selectedEmp.jobTitle} | {selectedEmp.department}</p>
                  <p className="text-slate-500 font-mono text-[10px]">الرقم المدني: {selectedEmp.civilId || '—'}</p>
                  <p className="text-slate-500 font-mono text-[10px]">الراتب الأساسي: {formatKWD(selectedContract?.basicSalary || 800)}</p>
                </div>)}

              {/* Issue Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleIssueDocumentConfirm}
                  className="w-full py-2.5 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded-lg shadow transition flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>إصدار المستند وتوثيقه بالأرشيف الرقمي</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Document Preview Panel */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>المعاينة المباشرة للمستند وقت الإصدار (Live Snapshot Preview)</span>
                </span>
                <span className="text-xs font-mono font-bold text-[#714B67] bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                  {selectedTemplate?.titleAr}
                </span>
              </div>

              {/* Official Document Sheet */}
              <div className="p-8 border border-slate-300 rounded-lg shadow-inner bg-slate-50/30 space-y-8 dir-rtl text-right">
                {/* Company Header */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                  <div className="space-y-1">
                    <h1 className="text-base font-black text-[#714B67]">{activeCompany?.nameAr || ''}</h1>
                    <p className="text-[11px] text-slate-600 font-mono">سجل تجاري: {activeCompany?.commercialRegNo || ''}</p>
                    <p className="text-[11px] text-slate-600 font-mono">ملف حماية الأجور (WSI): {activeCompany?.wsiCode || ''}</p>
                  </div>
                  <div className="text-left font-mono text-xs space-y-1">
                    <p className="font-bold text-slate-800">التاريخ: {new Date().toISOString().split('T')[0]}</p>
                    <p className="text-slate-500">الرقم المرجعي: PREVIEW-DOC</p>
                  </div>
                </div>

                {/* Filled Content */}
                <div 
                  className="prose max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ 
                    __html: fillTemplateHtml(selectedTemplate, selectedEmp, selectedContract) 
                  }}
                />


              </div>
            </div>
          </div>
        </div>)}

      {/* TAB 2: TEMPLATES LIBRARY & EDITOR */}
      {activeTab === 'TEMPLATES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 gap-3">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Code className="w-4 h-4 text-[#714B67]" />
              <span>قائمة النماذج والقوالب المعتمدة بالمؤسسة ({allTemplates.length})</span>
            </h3>

            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'التعيين والتعاقد', label: 'التعيين والتعاقد' },
                { id: 'المعاملات البنكية والرسمية', label: 'المعاملات البنكية والرسمية' },
                { id: 'الحركة اليومية والإجازات', label: 'الحركة اليومية والإجازات' },
                { id: 'الشؤون القانونية وإنهاء الخدمة', label: 'الشؤون القانونية وإنهاء الخدمة' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded text-[11px] transition ${
                    selectedCategoryFilter === cat.id
                      ? 'bg-[#714B67] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>))}

              <button
                type="button"
                onClick={() => {
                  setEditingTemplate({
                    id: `tpl-${Date.now()}`,
                    companyId: activeCompany?.id || 'comp-1',
                    templateCode: `TPL-CUSTOM-${Math.floor(Math.random() * 900) + 100}`,
                    titleAr: '',
                    titleEn: '',
                    category: 'التعيين والتعاقد',
                    contentHtml: '<p>أدخل نص القالب هنا واستخدم المتغيرات التفاعلية...</p>',
                    variables: [],
                    createdAt: new Date().toISOString().split('T')[0],
                    updatedAt: new Date().toISOString().split('T')[0],
                  });
                  setShowEditorModal(true);
                }}
                className="mr-auto px-3 py-1 bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold rounded flex items-center gap-1.5 shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إنشاء قالب مستند جديد</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTemplates
              .filter(tpl => selectedCategoryFilter === 'ALL' || tpl.category === selectedCategoryFilter)
              .map(tpl => (
              <div key={tpl.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {tpl.templateCode}
                    </span>
                    <span className="text-[10px] font-bold bg-purple-50 text-[#714B67] px-2 py-0.5 rounded border border-purple-200">
                      {tpl.category}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{tpl.titleAr}</h4>
                  <p className="text-slate-500 text-xs">{tpl.titleEn || '—'}</p>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    {tpl.variables.map(v => (
                      <span key={v} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {`{{${v}}}`}
                      </span>))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[10px]">تاريخ التحديث: {tpl.updatedAt}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setShowEditorModal(true);
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-[#714B67]"
                      title="تعديل القالب"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(tpl.id)}
                      className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                      title="حذف القالب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>))}
          </div>
        </div>)}

      {/* TAB 3: ISSUED DOCUMENTS ARCHIVE */}
      {activeTab === 'ARCHIVE' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-[#714B67]" />
                <span>سجل الأرشيف الإلكتروني للمستندات والشهادات الصادرة</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500">إجمالي الصادر: {generatedDocs.length}</span>
            </div>

            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-3">الرقم المرجعي</th>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">نوع المستند</th>
                  <th className="p-3">تاريخ الإصدار</th>
                  <th className="p-3">المصدر بواسطة</th>
                  <th className="p-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generatedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 space-y-2">
                      <FolderArchive className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-600">لا توجد مستندات صادرة مسجلة في الأرشيف حتى الآن</p>
                    </td>
                  </tr>) : (
                  generatedDocs.map((doc, idx) => (
                    <tr key={doc.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-3 font-mono font-bold text-purple-900">{doc.documentNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{doc.snapshotData.fullNameAr}</td>
                      <td className="p-3 font-bold text-slate-700">{doc.templateTitle}</td>
                      <td className="p-3 font-mono text-slate-600">{doc.issueDate}</td>
                      <td className="p-3 text-slate-500">{doc.issuedBy || 'HR System'}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveGenDoc(doc);
                            setShowPreviewModal(true);
                          }}
                          className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-[#714B67] font-bold rounded border border-purple-200 flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض وطباعة</span>
                        </button>
                      </td>
                    </tr>))
                )}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* TEMPLATE EDITOR MODAL */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveTemplateSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-5 text-xs text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-[#714B67]" />
                <span>محرر القوالب والصيغ المعتمدة</span>
              </h3>
              <button type="button" onClick={() => setShowEditorModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">كود القالب المرجعي:</label>
                <input
                  type="text"
                  value={editingTemplate.templateCode}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, templateCode: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">فئة المستند:</label>
                <select
                  value={editingTemplate.category || 'GENERAL'}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as any })}
                  className="w-full border border-slate-300 rounded p-2 font-bold bg-white"
                >
                  <option value="التعيين والتعاقد">التعيين والتعاقد</option>
                  <option value="المعاملات البنكية والرسمية">المعاملات البنكية والرسمية</option>
                  <option value="الحركة اليومية والإجازات">الحركة اليومية والإجازات</option>
                  <option value="الشؤون القانونية وإنهاء الخدمة">الشؤون القانونية وإنهاء الخدمة</option>
                  <option value="GENERAL">عام / غير ذلك</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">اسم القالب باللغة العربية:</label>
                <input
                  type="text"
                  value={editingTemplate.titleAr}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, titleAr: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-bold text-slate-900"
                  placeholder="مثال: شهادة راتب واستمرارية تحويل للبنك"
                  required
                />
              </div>
            </div>

            {/* Dynamic Variable Insertion Toolbar */}
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-slate-700 text-[11px] block">
                اضغط لإدراج المتغيرات التفاعلية داخل نص القالب:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_VARIABLES.map(v => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertVariableTag(v.tag)}
                    className="px-2 py-1 bg-white hover:bg-purple-50 text-slate-800 border border-slate-300 rounded text-[10px] font-bold font-mono transition flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3 h-3 text-[#714B67]" />
                    <span>{v.label}</span>
                  </button>))}
              </div>
            </div>

            {/* Template Content HTML Editor */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">نص ومحتوى القالب (HTML Text):</label>
              <textarea
                rows={10}
                value={editingTemplate.contentHtml}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, contentHtml: e.target.value })}
                className="w-full border border-slate-300 rounded p-3 font-mono text-xs text-slate-900 leading-relaxed bg-slate-950 text-slate-100"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#714B67] hover:bg-[#5a3a52] text-white font-bold rounded shadow flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>حفظ القالب بالمكتبة</span>
              </button>
            </div>
          </form>
        </div>)}

      {/* PRINT PREVIEW MODAL */}
      {showPreviewModal && activeGenDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 space-y-6 text-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <h3 className="font-bold text-sm text-slate-800">طباعة وتصدير المستند المعتمد</h3>
              <div className="flex items-center gap-2">
                {/* Switch language in modal */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      const newHtml = fillTemplateHtml(selectedTemplate, selectedEmp, selectedContract, 'AR');
                      setActiveGenDoc(prev => prev ? { ...prev, contentHtml: newHtml, language: 'AR' } : null);
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] transition ${
                      activeGenDoc.language === 'AR' || (!activeGenDoc.language)
                        ? 'bg-[#714B67] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    عربي | AR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newHtml = fillTemplateHtml(selectedTemplate, selectedEmp, selectedContract, 'EN');
                      setActiveGenDoc(prev => prev ? { ...prev, contentHtml: newHtml, language: 'EN' } : null);
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] transition ${
                      activeGenDoc.language === 'EN'
                        ? 'bg-[#714B67] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    English | EN
                  </button>
                </div>

                <button
                  onClick={() => printDocument('print-area', 'document')}
                  className="px-4 py-2 bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold rounded shadow flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة رسمية</span>
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="print-area" className={selectedTemplate?.templateCode === 'EMPLOYMENT_CONTRACT_PAM' ? "dir-rtl text-right print:p-0" : "space-y-8 dir-rtl text-right print:p-8"}>
              {selectedTemplate?.templateCode !== 'EMPLOYMENT_CONTRACT_PAM' && (
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                  <div>
                    <h1 className="text-lg font-black text-[#714B67]">{activeCompany?.nameAr || ''}</h1>
                    <p className="text-xs text-slate-600 font-mono">سجل تجاري: {activeCompany?.commercialRegNo || ''} | ملف حماية الأجور: {activeCompany?.wsiCode || ''}</p>
                  </div>
                  <div className="text-left font-mono text-xs">
                    <p className="font-bold">الرقم المرجعي: {activeGenDoc.documentNumber}</p>
                    <p className="text-slate-500">تاريخ الإصدار: {activeGenDoc.issueDate}</p>
                  </div>
                </div>
              )}

              {/* Rendered Document Body */}
              <div 
                className={selectedTemplate?.templateCode === 'EMPLOYMENT_CONTRACT_PAM' ? "max-w-none" : "prose max-w-none text-slate-800"}
                dangerouslySetInnerHTML={{ __html: activeGenDoc.contentHtml }}
              />

              {selectedTemplate?.templateCode !== 'EMPLOYMENT_CONTRACT_PAM' && (
                <div className="grid grid-cols-2 gap-8 pt-10 border-t border-slate-200 text-center text-xs">
                  <div className="space-y-8">
                    <p className="font-bold">توقيع مسؤول الموارد البشرية</p>
                    <p className="border-b border-dashed border-slate-400 w-32 mx-auto"></p>
                  </div>
                  <div className="space-y-8">
                    <p className="font-bold">ختم واعتماد الشركة</p>
                    <p className="border-b border-dashed border-slate-400 w-32 mx-auto"></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>)}
    </div>);
};
