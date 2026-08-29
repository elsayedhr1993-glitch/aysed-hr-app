/**
 * قاموس القوى العاملة الشامل (PAM Kuwait Standard Mapping)
 * يشمل كافة الجنسيات والمهن المعتمدة طبياً وإدارياً وتجارياً وفنياً
 */

// 1. قاموس الجنسيات الشامل (Nationalities)
export const NATIONALITIES_MAP: Record<string, string> = {
  // الدول العربية
  "كويتي": "Kuwaiti", "كويتية": "Kuwaiti",
  "مصري": "Egyptian", "مصرية": "Egyptian", "EGY": "Egyptian", "EGYPTIAN": "Egyptian",
  "أردني": "Jordanian", "اردني": "Jordanian", "أردنية": "Jordanian", "JOR": "Jordanian",
  "لبناني": "Lebanese", "لبنانية": "Lebanese", "LBN": "Lebanese",
  "سوري": "Syrian", "سورية": "Syrian", "SYR": "Syrian",
  "عراقي": "Iraqi", "عراقية": "Iraqi", "IRQ": "Iraqi",
  "سعودي": "Saudi", "سعودية": "Saudi", "SAU": "Saudi",
  "إماراتي": "Emirati", "اماراتي": "Emirati", "إماراتية": "Emirati", "ARE": "Emirati",
  "بحريني": "Bahraini", "بحرينية": "Bahraini", "BHR": "Bahraini",
  "عماني": "Omani", "عمانية": "Omani", "OMN": "Omani",
  "قطري": "Qatari", "قطرية": "Qatari", "QAT": "Qatari",
  "يمني": "Yemeni", "يمنية": "Yemeni", "YEM": "Yemeni",
  "سوداني": "Sudanese", "سودانية": "Sudanese", "SDN": "Sudanese",
  "تونسي": "Tunisian", "تونسية": "Tunisian",
  "مغربي": "Moroccan", "مغربية": "Moroccan",
  "جزائري": "Algerian", "جزائرية": "Algerian",
  "فلسطيني": "Palestinian", "فلسطينية": "Palestinian",

  // الدول الآسيوية والأجنبية
  "هندي": "Indian", "هندية": "Indian", "IND": "Indian", "INDIAN": "Indian",
  "فلبيني": "Filipino", "فلبينية": "Filipino", "PHL": "Filipino", "FILIPINO": "Filipino",
  "بنغلاديشي": "Bangladeshi", "بنغالي": "Bangladeshi", "BGD": "Bangladeshi", "BANGLADESHI": "Bangladeshi",
  "باكستاني": "Pakistani", "باكستانية": "Pakistani", "PAK": "Pakistani", "PAKISTANI": "Pakistani",
  "سيريلانكي": "Sri Lankan", "سيريلانكية": "Sri Lankan", "سيلاني": "Sri Lankan", "LKA": "Sri Lankan", "SRI LANKAN": "Sri Lankan",
  "نيبالي": "Nepali", "نيبالية": "Nepali", "NPL": "Nepali",
  "إيراني": "Iranian", "ايراني": "Iranian", "إيرانية": "Iranian", "IRN": "Iranian",
  "تركي": "Turkish", "تركية": "Turkish", "TUR": "Turkish",
  "بريطاني": "British", "أمريكي": "American", "كندي": "Canadian", "KWT": "Kuwaiti"
};

export const NATIONALITIES_AR_MAP: Record<string, string> = {
  "KWT": "كويتي", "KUWAITI": "كويتي", "كويتي": "كويتي", "كويتية": "كويتية",
  "EGY": "مصري", "EGYPTIAN": "مصري", "مصري": "مصري", "مصرية": "مصرية",
  "IND": "هندي", "INDIAN": "هندي", "هندي": "هندي", "هندية": "هندية",
  "PHL": "فلبيني", "FILIPINO": "فلبيني", "فلبيني": "فلبيني", "فلبينية": "فلبينية",
  "LKA": "سيريلانكي", "SRI LANKAN": "سيريلانكي", "سيريلانكي": "سيريلانكي", "سيريلانكية": "سيريلانكية",
  "PAK": "باكستاني", "PAKISTANI": "باكستاني", "باكستاني": "باكستاني", "باكستانية": "باكستانية",
  "BGD": "بنغلاديشي", "BANGLADESHI": "بنغلاديشي", "بنغلاديشي": "بنغلاديشي", "بنغلاديشية": "بنغلاديشية",
  "JOR": "أردني", "JORDANIAN": "أردني", "أردني": "أردني", "أردنية": "أردنية",
  "SYR": "سوري", "SYRIAN": "سوري", "سوري": "سوري", "سورية": "سورية",
  "LBN": "لبناني", "LEBANESE": "لبناني", "لبناني": "لبناني", "لبنانية": "لبنانية"
};

// 2. قاموس المهن والمسميات المعتمدة لدى القوى العاملة (PAM Designations)
export const PAM_JOBS_MAP: Record<string, string> = {
  // القطاع الطبي والصحي (Medical & Health Sector)
  "طبيب عام": "General Practitioner",
  "طبيب ممارس عام": "General Practitioner",
  "طبيب اختصاصي": "Specialist Physician",
  "طبيب استشاري": "Consultant Physician",
  "طبيب أسنان": "Dentist",
  "طبيب أسنان عام": "General Dental Practitioner",
  "طبيب اختصاصي أسنان": "Dental Specialist",
  "طبيب اختصاصي جلدية": "Dermatology Specialist",
  "طبيب اختصاصي نساء وتوليد": "Obstetrics & Gynecology Specialist",
  "طبيب اختصاصي باطنية": "Internal Medicine Specialist",
  "طبيب اختصاصي أطفال": "Pediatrics Specialist",
  "طبيب اختصاصي جراحة": "Surgery Specialist",
  "طبيب اختصاصي عيون": "Ophthalmology Specialist",
  "طبيب اختصاصي عظام": "Orthopedics Specialist",
  "طبيب اختصاصي تخدير": "Anesthesiology Specialist",
  "ممرض": "Nurse",
  "ممرضة": "Nurse",
  "ممرض عام": "General Nurse",
  "ممرضة عامة": "General Nurse",
  "رئيس هيئة تمريض": "Head of Nursing",
  "مشرف تمريض": "Nursing Supervisor",
  "أخصائي علاج طبيعي": "Physiotherapist",
  "اخصائي علاج طبيعي": "Physiotherapist",
  "فني علاج طبيعي": "Physiotherapy Technician",
  "فني ليزر": "Laser Technician",
  "فني مختبر": "Laboratory Technician",
  "فني مختبرات طبية": "Medical Laboratory Technician",
  "أخصائي مختبر": "Laboratory Specialist",
  "فني أشعة": "Radiology Technician",
  "أخصائي أشعة": "Radiology Specialist",
  "صيدلي": "Pharmacist",
  "صيدلاني": "Pharmacist",
  "مساعد صيدلي": "Pharmacist Assistant",
  "فني تعقيم": "Sterilization Technician",
  "أخصائي تغذية": "Dietitian",
  "أخصائي بصريات": "Optometrist",
  "فني بصريات": "Optician",

  // المهن الإدارية والموارد البشرية (Administrative & HR)
  "مسؤول شؤون موظفين": "Personnel Officer",
  "مسئول شؤون موظفين": "Personnel Officer",
  "اختصاصي شؤون موظفين": "Personnel Specialist",
  "أخصائي موارد بشرية": "Human Resources Specialist",
  "مدير موارد بشرية": "Human Resources Manager",
  "مدير إداري": "Administrative Manager",
  "مشرف إداري": "Administrative Supervisor",
  "سكرتير": "Secretary",
  "سكرتيرة": "Secretary",
  "سكرتير تنفيذي": "Executive Secretary",
  "كاتب استقبال عام": "Receptionist",
  "موظف استقبال": "Receptionist",
  "كاتب إداري": "Administrative Clerk",
  "كاتب حسابات": "Accounts Clerk",
  "كاتب شؤون موظفين": "Personnel Clerk",
  "كاتب إدخال بيانات": "Data Entry Clerk",
  "مدخل بيانات": "Data Entry Operator",
  "مندوب": "Representative",
  "مندوب عام": "General Representative",
  "مندوب إنجاز معاملات حكومية": "Government Relations Representative",
  "مندوب مبيعات": "Sales Representative",
  "مندوب مشتريات": "Purchasing Representative",
  "أمين مخزن": "Storekeeper",
  "أمين مستودع": "Warehouse Keeper",
  "مراقب دوام": "Timekeeper",
  "موظف سنترال": "Switchboard Operator",
  "موظف خدمة عملاء": "Customer Service Representative",
  "مترجم": "Translator",
  "مستشار قانوني": "Legal Advisor",
  "باحث قانوني": "Legal Researcher",

  // المهن المالية والمحاسبية (Financial & Accounting)
  "محاسب": "Accountant",
  "محاسب عام": "General Accountant",
  "محاسب تكاليف": "Cost Accountant",
  "محاسب رئيسي": "Chief Accountant",
  "مدير مالي": "Financial Manager",
  "مدقق حسابات": "Auditor",
  "مراجع حسابات": "Accounts Auditor",
  "أمين صندوق": "Cashier",
  "محصل أموال": "Collector",

  // تقنية المعلومات (IT Sector)
  "مهندس كمبيوتر": "Computer Engineer",
  "مبرمج حاسب آلي": "Computer Programmer",
  "مطور برمجيات": "Software Developer",
  "فني شبكات": "Network Technician",
  "فني حاسب آلي": "Computer Technician",
  "فني صيانة حاسب آلي": "Computer Maintenance Technician",
  "أخصائي دعم فني": "IT Support Specialist",
  "مدير تقنية معلومات": "IT Manager",
  "مصمم جرافيك": "Graphic Designer",

  // المهن الفنية والخدمية والمساندة (Services & General)
  "سائق": "Driver",
  "سائق سيارة خفيفة": "Light Vehicle Driver",
  "سائق سيارة ثقيلة": "Heavy Vehicle Driver",
  "سائق إسعاف": "Ambulance Driver",
  "فني صيانة عامة": "General Maintenance Technician",
  "فني تكييف وتبريد": "HVAC Technician",
  "كهربائي": "Electrician",
  "فني كهرباء": "Electrical Technician",
  "سباك": "Plumber",
  "مراسل": "Office Boy",
  "فراش": "Office Attendant",
  "عامل": "Worker",
  "عامل نظافة": "Cleaner",
  "حارس": "Security Guard",
  "حارس أمن": "Security Officer",
  "مشرف أمن وسلامة": "Safety & Security Supervisor",
  "عامل يومية وخدمات": "Daily Wage and Services Worker",
  "عامل يومية": "Daily Wage Worker"
};

/**
 * دالة المعالجة التلقائية لتجهيز بيانات الطباعة ثنائية اللغة
 */
export function formatContractData(employee: any = {}, contract: any = {}) {
  const emp = employee || {};
  const cnt = contract || {};
  const cleanKey = (val: any) => (val ? val.toString().trim() : "");

  // 1. معالجة التواريخ والأيام
  const issueDate = new Date(cnt.issue_date || Date.now());
  const daysAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const daysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const contract_day_ar = daysAr[issueDate.getDay()] || "الأحد";
  const contract_day_en = daysEn[issueDate.getDay()] || "Sunday";
  const contract_date = issueDate.toISOString().split("T")[0];

  // 2. معالجة الجنسية
  const rawNationality = cleanKey(emp?.nationality || 'KWT');
  const isFemale = emp?.gender === 'FEMALE';
  
  let nationality_ar = NATIONALITIES_AR_MAP[rawNationality] || rawNationality;
  if (isFemale && nationality_ar === 'سيريلانكي') nationality_ar = 'سيريلانكية';
  if (isFemale && nationality_ar === 'مصري') nationality_ar = 'مصرية';
  if (isFemale && nationality_ar === 'هندي') nationality_ar = 'هندية';
  if (isFemale && nationality_ar === 'فلبيني') nationality_ar = 'فلبينية';
  if (isFemale && nationality_ar === 'باكستاني') nationality_ar = 'باكستانية';
  if (isFemale && nationality_ar === 'أردني') nationality_ar = 'أردنية';
  if (isFemale && nationality_ar === 'سوري') nationality_ar = 'سورية';
  if (isFemale && nationality_ar === 'لبناني') nationality_ar = 'لبنانية';
  if (isFemale && nationality_ar === 'كويتي') nationality_ar = 'كويتية';

  const nationality_en = emp?.nationality_en || NATIONALITIES_MAP[rawNationality] || (rawNationality.length > 3 ? rawNationality : 'Kuwaiti');

  // 3. معالجة المسمى الوظيفي (طريقة أودو المباشرة: job_title_ar و job_title_en)
  const job_title_ar = emp?.job_title_ar || emp?.job_title || emp?.jobTitle || 'موظف';
  const rawJob = cleanKey(job_title_ar);
  const job_title_en = 
    emp?.job_title_en || 
    emp?.designation?.name_en || 
    PAM_JOBS_MAP[rawJob] || 
    (/^[A-Za-z\s\/()]+$/.test(rawJob) ? rawJob : 'Medical Staff');

  return {
    contract_day_ar,
    contract_day_en,
    contract_date,
    contract_start_date: cnt.start_date || emp?.joinDate || contract_date,
    employee_name_ar: emp?.name_ar || emp?.fullNameAr || emp?.name || 'محمد أحمد',
    employee_name_en: (emp?.name_en || emp?.fullNameEn || emp?.name || 'MOHAMED AHMED').toUpperCase(),
    nationality_ar: nationality_ar,
    nationality_en: nationality_en,
    job_title_ar: rawJob,
    job_title_en: job_title_en,
    civil_id: emp?.civil_id || emp?.civilId || '290010101234',
    residence_type_ar: "مادة 18 - قطاع أهلي",
    residence_type_en: "Article 18 - Private Sector",
    salary_amount: Number(emp?.salary || 0).toString(),
    company_name_en: "AL MANAR CLINIC",
    manager_name_ar: "د. عبد الله المنار",
    manager_name_en: "Dr. Abdullah Al-Manar",
    manager_civil_id: "288051200526"
  };
}

/**
 * دالة ترحيل وتحديث شجرة المسميات الوظيفية لتعبئة titleNameEn تلقائياً
 */
export function migrateJobTitlesWithPAM(jobTitles: any[]): any[] {
  if (!Array.isArray(jobTitles)) return [];
  return jobTitles.map(jt => {
    const titleAr = jt.titleName ? jt.titleName.trim() : '';
    const enName = jt.titleNameEn || jt.nameEn || PAM_JOBS_MAP[titleAr] || titleAr;
    return {
      ...jt,
      titleNameEn: enName,
      nameEn: enName
    };
  });
}

