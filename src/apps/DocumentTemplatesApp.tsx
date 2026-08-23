import { printDocument } from '../utils/printUtils';
import { tafqeet } from '../utils/tafqeet';
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
    id: 'tpl-salary-certificate-almanar',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'SALARY_CERTIFICATE',
    titleAr: 'شهادة راتب واستمرارية عمل (almanar222222)',
    titleEn: 'Salary & Continuity Certificate',
    category: 'الشهادات والخطابات',
    contentHtml: `<div class="official-document" style="font-family: 'Amiri', serif; padding: 40px; font-size: 18px; line-height: 2; color: #000; direction: rtl; text-align: right;">
        <p style="text-align: right; margin-bottom: 30px; font-weight: bold; font-family: 'Inter', 'Cairo', sans-serif;">التاريخ {{today_date}}</p>
        <p style="text-align: right; margin-bottom: 30px; font-weight: bold; font-family: 'Inter', 'Cairo', sans-serif;">السادة / إلى من يهمه الأمر</p>
        <h2 style="text-align: center; margin-bottom: 40px; font-weight: bold; font-family: 'Inter', 'Cairo', sans-serif;">شهادة راتب وإستمرارية راتب</h2>
        
        <p style="text-align: justify; text-justify: inter-word; margin-bottom: 30px; font-family: 'Inter', 'Cairo', sans-serif;">
            نحيط سيادتكم علماً بأن/ <strong>{{emp_name}}</strong> - <strong>{{nationality}}</strong> الجنسية بموجب بطاقة مدنية رقم/ <strong>{{civil_id}}</strong> وتعمل لدينا بـ <strong>{{company_name_ar}}</strong>، بوظيفة/ <strong>{{job_title}}</strong> وذلك إعتباراً من <strong>{{joining_date}}</strong> م براتب شهري وقدره (<strong>{{salary_total}} د.ك</strong>) <strong>فقط {{salary_in_words}}</strong>، ويتم تحويل راتبها الى حسابها لدى <strong>{{bank_name}}</strong> رقم الآيبان (<strong>{{iban}}</strong>) ومستمره بالعمل حتى تاريخه.
        </p>
        
        <p style="text-align: justify; text-justify: inter-word; margin-bottom: 60px; font-family: 'Inter', 'Cairo', sans-serif;">
            وقد أعطيت لها هذه الشهادة بناءاً على طلبها دون أدنى مسئولية على المؤسسة تجاه حقوق الغير.
        </p>
        
        <p style="text-align: center; margin-bottom: 60px; font-weight: bold; font-family: 'Inter', 'Cairo', sans-serif;">وتفضلوا بقبول فائق التحية والاحترام ،،،</p>
        
        <div style="text-align: left; margin-left: 50px;">
            <p style="text-align: center; display: inline-block; font-weight: bold; font-family: 'Inter', 'Cairo', sans-serif;">
                المفوض بالتوقيع<br>
                <img src="https://api.dicebear.com/7.x/initials/svg?seed=Manager" width="80" style="opacity: 0.3; margin-top: 10px;" />
            </p>
        </div>
    </div>`,
    variables: ['today_date', 'emp_name', 'nationality', 'civil_id', 'company_name_ar', 'job_title', 'joining_date', 'salary_total', 'salary_in_words', 'bank_name', 'iban'],
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'tpl-kuwait-contract-pam',
    companyId: 'a0000000-0000-0000-0000-000000000001',
    templateCode: 'EMPLOYMENT_CONTRACT_PAM',
    titleAr: 'عقد عمل كويتي (نموذج الهيئة العامة للقوى العاملة)',
    titleEn: 'Kuwait Employment Contract (PAM Form)',
    category: 'التعيين والتعاقد',
    contentHtml: `<div class="official-document" style="font-family: 'Amiri', serif; padding: 20px; font-size: 14px; line-height: 1.6; color: #000;">
    <h2 style="text-align: center; margin-bottom: 20px;">
        <span style="font-weight: bold; background: #ccc; padding: 2px 10px;">نموذج عقد عمل استرشادي في القطاع الأهلي</span><br>
        <span style="font-size: 16px; font-family: 'Arial', sans-serif;">Sample Form of an Employment Contract in the Civil Sector</span>
    </h2>
    <div style="display: flex; justify-content: space-between; border: 3px solid #000; min-height: 800px;">
        
        <!-- English Column (Left) -->
        <div style="width: 50%; padding: 15px; direction: ltr; font-family: 'Arial', sans-serif; font-size: 12px; border-right: 3px solid #000;">
            <p><strong>State of Kuwait</strong><br>
               <strong>Public Authority for Manpower:</strong> {{labor_department_en}} Labour Department.<br>
               On <strong>{{contract_day_en}}</strong> corresponding to <strong>{{contract_date}}</strong> the present contract was concluded by and between:</p>
            <p>1. Company/institution: <strong>{{company_name}}</strong><br>
               2. represented in signature in the present contract by:<br>
               Name: <strong>{{manager_name}}</strong><br>
               Civil card: <strong>{{manager_civil_id}}</strong><br>
               <span style="display: block; text-align: center;"><strong>(First party)</strong></span>
            </p>
            <p>2. Name: <strong>{{emp_name}}</strong><br>
               Nationality: <strong>{{nationality}}</strong><br>
               Civil card: <strong>{{civil_id}}</strong><br>
               <span style="display: block; text-align: center;"><strong>(Second party)</strong></span>
            </p>
            <h4 style="text-align: center; text-decoration: underline; margin-top: 15px; margin-bottom: 5px;">Preamble</h4>
            <p style="text-align: justify; margin-top: 0;">The first party owns the facility entitled <strong>{{company_name}}</strong> working in the field of <strong>{{business_activity}}</strong> whereas it wishes to conclude a contract with the second party to work for it in the profession of <strong>{{job_title}}</strong> whereas the parties acknowledged their capacity to conclude this contract, they agreed upon the following:</p>
            <h4 style="text-align: center; text-decoration: underline; margin-top: 10px; margin-bottom: 5px;">Article One</h4>
            <p style="text-align: justify; margin-top: 0;">The preamble above shall constitute an integral part of the present contract.</p>
            <h4 style="text-align: center; text-decoration: underline; margin-top: 10px; margin-bottom: 5px;">Article Two</h4>
            <p style="text-align: center; margin-top: 0;"><strong>"Nature of the Work"</strong></p>
            <p style="text-align: justify;">The first party concluded a contract with the second party to work for it in the profession of <strong>{{job_title}}</strong> in the State of Kuwait.</p>
            <h4 style="text-align: center; text-decoration: underline; margin-top: 10px; margin-bottom: 5px;">Article Three</h4>
            <p style="text-align: center; margin-top: 0;"><strong>"Probation Period"</strong></p>
            <p style="text-align: justify;">The second party shall be subject to a probation period for a term not exceeding 100 work days. Each party shall have the right to terminate the contract during the said term without notification.</p>
            <h4 style="text-align: center; text-decoration: underline; margin-top: 10px; margin-bottom: 5px;">Article Four</h4>
            <p style="text-align: center; margin-top: 0;"><strong>"Lease Value"</strong></p>
            <p style="text-align: justify;">For executing the present contract, the second party shall receive the wage of <strong>{{salary_total}}</strong> to be paid at the end of every MONTH. The first party may not decrease the wage during the term of the contract. It may not transfer the second party to daily wage without his approval.</p>
            <h4 style="text-align: center; text-decoration: underline; margin-top: 10px; margin-bottom: 5px;">Article Five</h4>
            <p style="text-align: center; margin-top: 0;"><strong>"Contract Term"</strong></p>
            <p style="text-align: justify;">The contract shall come into force ON <strong>{{joining_date}}</strong> The second party shall execute his work during the entire execution term thereof.</p>
            <h4 style="text-align: center; text-decoration: underline; margin-top: 10px; margin-bottom: 5px;">Article Six</h4>
            <p style="text-align: center; margin-top: 0;"><strong>"Contract Term"</strong></p>
            <p style="text-align: justify;">The present contract has a <strong>{{contract_type_ar}}</strong> term. It shall come into force on <strong>{{joining_date}}</strong> for a term of ONE years. The contract may be renewed with the approval of the parties for similar terms not exceeding five years.</p>
            
            <div style="margin-top: 80px; display: flex; justify-content: space-between;">
                <div>
                  <p><strong>First Party:</strong></p>
                  <div style="height: 60px; width: 120px; border-bottom: 1px dashed #000; display: flex; align-items: flex-end; justify-content: center;">
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed=Manager" width="40" style="opacity: 0.3;" />
                  </div>
                </div>
                <div>
                  <p><strong>Second Party:</strong></p>
                  <div style="height: 60px; width: 120px; border-bottom: 1px dashed #000; display: flex; align-items: flex-end; justify-content: center;">
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed={{emp_name}}" width="40" style="opacity: 0.3;" />
                  </div>
                </div>
            </div>
        </div>

        <!-- Arabic Column (Right) -->
        <div style="width: 50%; padding: 15px; direction: rtl;">
            <p><strong>دولة الكويت</strong><br>
               <strong>الهيئة العامة للقوى العاملة / إدارة عمل:</strong> {{labor_department}}<br>
               إنه في يوم <strong>{{contract_day_ar}}</strong> الموافق <strong>{{contract_date}}</strong><br>
               تحرر هذا العقد بين كل من :</p>
            <p>1. <strong>{{company_name_ar}}</strong><br>
               ويمثلها في التوقيع على العقد:<br>
               الاسم: <strong>{{manager_name}}</strong><br>
               رقم مدني: <strong>{{manager_civil_id}}</strong><br>
               <span style="display: block; text-align: center;"><strong>"طرف أول"</strong></span>
            </p>
            <p>2. الاسم: <strong>{{emp_name}}</strong><br>
               الجنسية: <strong>{{nationality}}</strong><br>
               الرقم المدني: <strong>{{civil_id}}</strong><br>
               <span style="display: block; text-align: center;"><strong>"طرف ثان"</strong></span>
            </p>
            <h4 style="text-align: center; margin-top: 15px; margin-bottom: 5px;"><span style="background: #ccc; padding: 2px 15px; font-weight: bold;">تمهيد</span></h4>
            <p style="text-align: justify; margin-top: 0;">يمتلك الطرف الأول منشأة باسم <strong>{{company_name_ar}}</strong> تعمل في مجال (<strong>{{business_activity}}</strong>) ويرغب في التعاقد مع الطرف الثاني للعمل لديه بمهنة (<strong>{{job_title}}</strong>).</p>
            <h4 style="text-align: center; margin-top: 10px; margin-bottom: 5px;"><span style="background: #ccc; padding: 2px 15px; font-weight: bold;">البند الأول</span></h4>
            <p style="text-align: justify; margin-top: 0;">يعتبر التمهيد السابق جزءا لا يتجزأ من هذا العقد.</p>
            <h4 style="text-align: center; margin-top: 10px; margin-bottom: 5px;"><span style="background: #ccc; padding: 2px 15px; font-weight: bold;">البند الثاني</span></h4>
            <p style="text-align: center; margin-top: 0;"><strong>" طبيعة العمل "</strong></p>
            <p style="text-align: justify;">تعاقد الطرف الأول مع الطرف الثاني للعمل لديه بمهنة (<strong>{{job_title}}</strong>) داخل دولة الكويت.</p>
            <h4 style="text-align: center; margin-top: 10px; margin-bottom: 5px;"><span style="background: #ccc; padding: 2px 15px; font-weight: bold;">البند الثالث</span></h4>
            <p style="text-align: center; margin-top: 0;"><strong>" فترة التجربة "</strong></p>
            <p style="text-align: justify;">يخضع الطرف الثاني لفترة تجربة لمدة لا تزيد عن 100 يوم عمل، ويحق لكل طرف إنهاء العقد خلال تلك الفترة دون إخطار.</p>
            <h4 style="text-align: center; margin-top: 10px; margin-bottom: 5px;"><span style="background: #ccc; padding: 2px 15px; font-weight: bold;">البند الرابع</span></h4>
            <p style="text-align: center; margin-top: 0;"><strong>" قيمة الأجر "</strong></p>
            <p style="text-align: justify;">يتقاضى الطرف الثاني عن تنفيذ هذا العقد أجرا مقداره (<strong>{{salary_total}}</strong>) يدفع في نهاية كل شهر ولا يجوز للطرف الأول تخفيض الأجر أثناء سريان هذا العقد. ولا يجوز نقل الطرف الثاني إلى الأجر اليومي دون موافقته.</p>
            <h4 style="text-align: center; margin-top: 10px; margin-bottom: 5px;"><span style="background: #ccc; padding: 2px 15px; font-weight: bold;">البند الخامس</span></h4>
            <p style="text-align: center; margin-top: 0;"><strong>" نفاذ العقد "</strong></p>
            <p style="text-align: justify;">يبدأ نفاذ العقد اعتبارا من <strong>{{joining_date}}</strong> ويلتزم الطرف الثاني بالقيام بأداء عمله طوال مدة نفاذه.</p>
            <h4 style="text-align: center; margin-top: 10px; margin-bottom: 5px;"><span style="background: #ccc; padding: 2px 15px; font-weight: bold;">البند السادس</span></h4>
            <p style="text-align: center; margin-top: 0;"><strong>" مدة العقد "</strong></p>
            <p style="text-align: justify;">العقد <strong>{{contract_type_ar}}</strong> ويبدأ اعتبارا من <strong>{{joining_date}}</strong> وينتهي في <strong>{{end_date}}</strong>، ويجوز تجديد العقد بموافقة الطرفين لمدد مماثلة.</p>
            
            <div style="margin-top: 80px; display: flex; justify-content: space-between;">
                <div>
                  <p><strong>توقيع الطرف الأول:</strong></p>
                  <div style="height: 60px; width: 120px; border-bottom: 1px dashed #000; display: flex; align-items: flex-end; justify-content: center;">
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed=Manager" width="40" style="opacity: 0.3;" />
                  </div>
                </div>
                <div>
                  <p><strong>توقيع الطرف الثاني:</strong></p>
                  <div style="height: 60px; width: 120px; border-bottom: 1px dashed #000; display: flex; align-items: flex-end; justify-content: center;">
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed={{emp_name}}" width="40" style="opacity: 0.3;" />
                  </div>
                </div>
            </div>
        </div>
    </div>
</div>`,
    variables: ['emp_name', 'salary_total', 'civil_id', 'nationality', 'job_title', 'joining_date', 'contract_date', 'contract_day_ar', 'contract_day_en', 'company_name_ar', 'manager_name', 'manager_civil_id', 'labor_department', 'business_activity'],
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
            <p><strong>الطرف الأول:</strong> شركة المنار (almanar222222)</p>
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
            <p>تشهد شركة <strong>المنار</strong> بأن السيد/ {{emp_name}} يتقاضى راتباً شهرياً إجمالياً قدره {{total_salary}} د.ك.</p>
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
    const nationality = emp ? emp.nationality : (lang === 'EN' ? 'Kuwaiti' : 'كويتي');
    const jobTitle = emp ? emp.jobTitle : (lang === 'EN' ? 'Senior Accountant' : 'محاسب عام أول');
    const dept = emp ? emp.department : (lang === 'EN' ? 'Finance' : 'الإدارة المالية');
    const joinDate = emp ? emp.joinDate : '2022-01-15';
    const today = new Date().toISOString().split('T')[0];
    const bankName = emp?.bankName || activeCompany?.bankName || (lang === 'EN' ? 'National Bank of Kuwait' : 'بنك بيت التمويل الكويتي');
    const iban = emp?.iban || activeCompany?.iban || 'KW19 KFHO 0000000000071050546531';
    const contractDuration = cnt?.contractType === 'FIXED_TERM' 
      ? (lang === 'EN' ? 'One Year' : 'سنة واحدة') 
      : (lang === 'EN' ? 'Indefinite' : 'غير محدد المدة');

    const contractDateObj = new Date(joinDate);
    const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIdx = contractDateObj.getDay();
    const currentDayAr = daysAr[dayIdx];
    const currentDayEn = daysEn[dayIdx];

    let contractEndDate = '---';
    if (cnt?.contractType === 'FIXED_TERM') {
      const endD = new Date(joinDate);
      endD.setFullYear(endD.getFullYear() + 1);
      contractEndDate = endD.toISOString().split('T')[0];
    }
    
    const valuesMap: Record<string, string> = {
      '{{emp_name}}': empName,
      '{{full_name}}': empName,
      '{{civil_id}}': civilId,
      '{{passport_no}}': emp ? emp.passportNo : 'P01234567',
      '{{job_title}}': jobTitle,
      '{{department}}': dept,
      '{{basic_salary}}': basicSalary.toFixed(3),
      '{{allowances}}': allowances.toFixed(3),
      '{{total_salary}}': totalSalary.toFixed(3),
      '{{salary_total}}': totalSalary.toFixed(3),
      '{{joining_date}}': joinDate,
      '{{join_date}}': joinDate,
      '{{nationality}}': nationality,
      '{{current_date}}': today,
      '{{date_today}}': today,
      '{{bank_name}}': bankName,
      '{{iban}}': iban,
      '{{moh_license}}': emp?.mohLicenseNo || 'MOH-8842',
      '{{company_name}}': companyName,
      '{{company_name_ar}}': activeCompany?.nameAr || '',
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
      '{{contract_day_ar}}': currentDayAr,
      '{{contract_day_en}}': currentDayEn,
      '{{contract_date}}': joinDate,
      '{{today_date}}': today,
      '{{salary_in_words}}': tafqeet(totalSalary),
      '{{manager_name}}': (activeCompany as any).managerName || 'Sayed',
      '{{manager_civil_id}}': (activeCompany as any).managerCivilId || '288051200526',
      '{{business_activity}}': (activeCompany as any).businessActivity || 'الرعاية الصحية والخدمات الطبية والمساندة',
      '{{contract_type_ar}}': cnt?.contractType === 'FIXED_TERM' ? 'محدد المدة' : 'غير محدد المدة',
      '{{annual_leave_days}}': '30',
      '{{special_conditions}}': specialConditions || 'يلتزم الطرف الثاني بالسرية التامة لجميع البيانات واللوائح الداخلية ومستندات المنشأة.',
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

                {/* Official Signatures & Seal */}
                <div className="grid grid-cols-2 gap-8 pt-10 border-t border-slate-200 text-center text-xs">
                  <div className="space-y-10">
                    <p className="font-bold text-slate-800">توقيع مسؤول الموارد البشرية</p>
                    <p className="border-b border-dashed border-slate-400 w-36 mx-auto"></p>
                  </div>

                  <div className="space-y-10">
                    <p className="font-bold text-slate-800">ختم الشركة واعتماد الإدارة</p>
                    <div className="w-20 h-20 border-2 border-dashed border-purple-800/40 rounded-full mx-auto flex items-center justify-center text-[10px] text-purple-900 font-bold rotate-12 bg-purple-50/50">
                      ختم رسمى
                    </div>
                  </div>
                </div>
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

            <div id="print-area" className="space-y-8 dir-rtl text-right print:p-8">
              {/* Company Official Header */}
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

              {/* Rendered Document Body */}
              <div 
                className="prose max-w-none text-slate-800"
                dangerouslySetInnerHTML={{ __html: activeGenDoc.contentHtml }}
              />

              {/* Signatures */}
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
            </div>
          </div>
        </div>)}
    </div>);
};
