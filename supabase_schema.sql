-- =====================================================================
-- Supabase SQL Schema for Aysed S HR 2026
-- Tables: document_templates, generated_documents, audit_logs
-- =====================================================================

-- 1. Table: document_templates
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    template_code VARCHAR(50) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    content_html TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_template_code_company UNIQUE (company_id, template_code)
);

-- Index for fast queries by company
CREATE INDEX IF NOT EXISTS idx_doc_templates_company ON public.document_templates(company_id);

-- 2. Table: generated_documents (Snapshot Archive)
CREATE TABLE IF NOT EXISTS public.generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
    template_title VARCHAR(255) NOT NULL,
    document_number VARCHAR(100) NOT NULL UNIQUE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    content_html TEXT NOT NULL,
    snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    pdf_url TEXT,
    issued_by VARCHAR(255) DEFAULT 'HR System Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for fast employee file lookups
CREATE INDEX IF NOT EXISTS idx_gen_docs_company ON public.generated_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_gen_docs_employee ON public.generated_documents(employee_id);

-- 3. Table: audit_logs (Audit Trail System)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, SOFT_DELETE, ISSUE, EXPORT
    entity VARCHAR(50) NOT NULL, -- EMPLOYEE, CONTRACT, DOCUMENT, PAYROLL, LEAVE, TEMPLATE
    entity_id VARCHAR(100),
    details TEXT NOT NULL,
    ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- 4. Table: system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_name VARCHAR(100) DEFAULT 'Aysed S HR 2026',
    notification_email VARCHAR(255) DEFAULT 'elsayedhr1993@gmail.com',
    enable_otp_on_password_change BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS & Policy
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for system settings" ON public.system_settings
    FOR ALL USING (true) WITH CHECK (true);

-- Seed System Settings
INSERT INTO public.system_settings (system_name, notification_email) 
VALUES ('Aysed S HR 2026', 'elsayedhr1993@gmail.com')
ON CONFLICT DO NOTHING;

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Default Permissive Policies (SaaS Multi-Company Isolation)
CREATE POLICY "Enable all access for company users" ON public.document_templates
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for company users" ON public.generated_documents
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for company users" ON public.audit_logs
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- Initial Seed Templates Data (نماذج المستندات الرسمية الكويتية)
-- =====================================================================
INSERT INTO public.document_templates (company_id, template_code, title_ar, title_en, category, content_html, variables, is_default)
VALUES 
(
  'a0000000-0000-0000-0000-000000000001',
  'TPL-EXP-01',
  'شهادة خبرة رسمية',
  'Official Experience Certificate',
  'EXPERIENCE_CERTIFICATE',
  '<div style="line-height:2.0; font-family: Cairo, sans-serif; text-align: justify;">
    <h2 style="text-align: center; color: #714B67;">شهادة خبرة واستمرار عمل</h2>
    <p>تشهد شركة <strong>{{company_name_ar}}</strong> (سجل تجاري رقم: {{commercial_reg_no}}) بأن السيد/ <strong>{{full_name}}</strong>، يحمل البطاقة المدنية رقم (<strong>{{civil_id}}</strong>) وجنسيته {{nationality}}.</p>
    <p>قد عمل لدينا بمسمى وظيفي: <strong>{{job_title}}</strong> بقسم <strong>{{department}}</strong> وذلك اعتباراً من تاريخ <strong>{{join_date}}</strong> وحتى تاريخه.</p>
    <p>وخلال فترة عمله معنا، كان مثالاً للموظف المجتهد الملتزم باللوائح والنظم الداخلية وقانون العمل الكويتي رقم 6 لسنة 2010. وقد أُعطيت له هذه الشهادة بناءً على طلبه دون أدنى مسؤولية على الشركة تجاه حقوق الغير.</p>
  </div>',
  '["full_name", "civil_id", "job_title", "department", "company_name_ar", "commercial_reg_no", "join_date", "nationality", "date_today"]'::jsonb,
  true
),
(
  'a0000000-0000-0000-0000-000000000001',
  'TPL-SAL-01',
  'شهادة راتب واستمرارية تحويل',
  'Salary Certificate & Transfer Undertaking',
  'SALARY_CERTIFICATE',
  '<div style="line-height:2.0; font-family: Cairo, sans-serif; text-align: justify;">
    <h2 style="text-align: center; color: #714B67;">شهادة إشعار بالراتب وتعهد تحويل</h2>
    <p>إلى من يهمه الأمر / المحترمين،</p>
    <p>تحية طيبة وبعد،،،</p>
    <p>نفيدكم علماً بأن السيد/ <strong>{{full_name}}</strong>، كويتي/مقيم يحمل بطاقة مدنية رقم (<strong>{{civil_id}}</strong>)، يعمل لدينا في شركة <strong>{{company_name_ar}}</strong> بمسمى <strong>{{job_title}}</strong>.</p>
    <p>ويتقاضى راتباً شهرياً مقداره: <strong>{{basic_salary}} د.ك</strong> (فقط ثمانمائة دينار كويتي لا غير) ويتم تحويل راتبه شهرياً عبر نظام حماية الأجور (WSI) على حسابه لدى بنك <strong>{{bank_name}}</strong> بالحساب (IBAN: <strong>{{iban}}</strong>).</p>
    <p>وتتعهد الشركة باستمرار تحويل راتبه الشهري طيلة فترة خدمته لدينا، وهذه الشهادة لا تعتبر ضماناً مالياً للغير.</p>
  </div>',
  '["full_name", "civil_id", "job_title", "basic_salary", "bank_name", "iban", "company_name_ar", "date_today"]'::jsonb,
  true
)
ON CONFLICT (company_id, template_code) DO NOTHING;
