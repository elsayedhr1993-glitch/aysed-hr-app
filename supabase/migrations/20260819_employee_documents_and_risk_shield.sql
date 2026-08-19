-- 1. جدول وثائق ومستندات الموظفين الرسمية
CREATE TABLE IF NOT EXISTS hr_employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES hr_employee(id) ON DELETE CASCADE,
    document_type VARCHAR(50) CHECK (document_type IN ('civil_id', 'passport', 'driving_license', 'work_permit', 'health_card', 'contract')),
    document_number VARCHAR(100) NOT NULL,
    issue_date DATE,
    expiry_date DATE NOT NULL,
    document_url TEXT, -- رابط صورة الوثيقة المخزنة
    notified_30_days BOOLEAN DEFAULT FALSE,
    notified_60_days BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- تفعيل حماية البيانات (Row Level Security)
ALTER TABLE hr_employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read/write on employee documents"
ON hr_employee_documents FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. عرض "درع المخاطر" (Risk Shield View) لرصد الوثائق المنتهية والوشيكة
CREATE OR REPLACE VIEW v_aysed_risk_shield AS
SELECT 
    d.id as document_id,
    e.id as employee_id,
    e.name as employee_name,
    e.l10n_kw_civil_id as civil_id,
    d.document_type,
    d.document_number,
    d.expiry_date,
    d.document_url,
    (d.expiry_date - CURRENT_DATE) as days_to_expiry,
    CASE 
        WHEN (d.expiry_date - CURRENT_DATE) < 0 THEN 'منتهي الصلاحية'
        WHEN (d.expiry_date - CURRENT_DATE) <= 30 THEN 'خطر عالي (أقل من 30 يوم)'
        WHEN (d.expiry_date - CURRENT_DATE) <= 60 THEN 'تنبيه مبكر (أقل من 60 يوم)'
        ELSE 'سليم'
    END as risk_level
FROM hr_employee_documents d
JOIN hr_employee e ON e.id = d.employee_id
ORDER BY days_to_expiry ASC;
