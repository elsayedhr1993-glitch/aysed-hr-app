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
    getEnglishJobTitle(rawJob) || 
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
  
  // 1. تحديث المسميات الحالية
  const updatedTitles = jobTitles.map(jt => {
    const titleAr = jt.titleName ? jt.titleName.trim() : '';
    const enName = jt.titleNameEn || jt.nameEn || getEnglishJobTitle(titleAr) || titleAr;
    return {
      ...jt,
      titleNameEn: enName,
      nameEn: enName
    };
  });

  // 2. دمج المسميات الجديدة من القاموس إذا لم تكن موجودة
  const existingArNames = new Set(updatedTitles.map(jt => jt.titleName?.trim()));
  
  ALL_KUWAIT_JOB_POSITIONS.forEach((item, idx) => {
    if (!existingArNames.has(item.ar.trim())) {
      updatedTitles.push({
        id: `jt-new-${Date.now()}-${idx}`,
        titleName: item.ar,
        titleNameEn: item.en,
        nameEn: item.en,
        departmentName: item.category,
        description: `${item.category} Cadre`
      });
      existingArNames.add(item.ar.trim());
    }
  });

  return updatedTitles;
}



export const KUWAIT_JOB_POSITIONS_DIRECTORY = [
  // 1. الكادر التمريضي (Nursing Cadre)
  { ar: "ممرض اختصاصي / صحة عامة", en: "Specialist Nurse / Public Health", category: "Medical" },
  { ar: "ممرض اختصاصي", en: "Specialist Nurse", category: "Medical" },
  { ar: "أخصائي تمريض", en: "Nursing Specialist", category: "Medical" },
  { ar: "اخصائي تمريض", en: "Nursing Specialist", category: "Medical" },
  { ar: "ممرض عام", en: "General Nurse", category: "Medical" },
  { ar: "ممرض ممارس", en: "Staff Nurse", category: "Medical" },
  { ar: "ممرض ممارس / هيئة تمريضية", en: "Staff Nurse", category: "Medical" },
  { ar: "هيئة تمريضية", en: "Nursing Staff", category: "Medical" },
  { ar: "فني تمريض", en: "Nursing Technician", category: "Medical" },
  { ar: "مساعد ممرض", en: "Assistant Nurse", category: "Medical" },
  { ar: "ممرض قانوني", en: "Registered Nurse (RN)", category: "Medical" },
  { ar: "مشرف تمريض", en: "Nursing Supervisor", category: "Medical" },
  { ar: "رئيس هيئة التمريض", en: "Head of Nursing", category: "Medical" },

  // 2. الكادر الطبي البشري والأسنان (Physicians & Dentists)
  { ar: "طبيب استشاري", en: "Consultant Physician", category: "Medical" },
  { ar: "طبيب اختصاصي", en: "Specialist Physician", category: "Medical" },
  { ar: "طبيب مسجل أول", en: "Senior Registrar", category: "Medical" },
  { ar: "طبيب مسجل اول", en: "Senior Registrar", category: "Medical" },
  { ar: "طبيب مسجل", en: "Registrar", category: "Medical" },
  { ar: "طبيب ممارس عام", en: "General Practitioner (GP)", category: "Medical" },
  { ar: "طبيب مقيم", en: "Resident Doctor", category: "Medical" },
  { ar: "طبيب جراحة عامة", en: "General Surgeon", category: "Medical" },
  { ar: "طبيب جلدية وتناسلية", en: "Dermatologist", category: "Medical" },
  { ar: "طبيب باطنية", en: "Internist", category: "Medical" },
  { ar: "طبيب أطفال", en: "Pediatrician", category: "Medical" },
  { ar: "طبيب اطفال", en: "Pediatrician", category: "Medical" },
  { ar: "طبيب نساء وتوليد", en: "Obstetrician & Gynecologist", category: "Medical" },
  { ar: "طبيب عظام", en: "Orthopedic Surgeon", category: "Medical" },
  { ar: "طبيب أنف وأذن وحنجرة", en: "ENT Specialist", category: "Medical" },
  { ar: "طبيب انف واذن وحنجرة", en: "ENT Specialist", category: "Medical" },
  { ar: "طبيب عيون", en: "Ophthalmologist", category: "Medical" },
  { ar: "طبيب تخدير", en: "Anesthesiologist", category: "Medical" },
  { ar: "طبيب أسنان استشاري", en: "Consultant Dentist", category: "Medical" },
  { ar: "طبيب اسنان استشاري", en: "Consultant Dentist", category: "Medical" },
  { ar: "طبيب أسنان اختصاصي", en: "Specialist Dentist", category: "Medical" },
  { ar: "طبيب اسنان اختصاصي", en: "Specialist Dentist", category: "Medical" },
  { ar: "طبيب ممارس عام أسنان", en: "General Dental Practitioner", category: "Medical" },
  { ar: "طبيب ممارس عام اسنان", en: "General Dental Practitioner", category: "Medical" },
  { ar: "مساعد طبيب أسنان", en: "Dental Assistant", category: "Medical" },
  { ar: "مساعد طبيب اسنان", en: "Dental Assistant", category: "Medical" },
  { ar: "فني تركيبات أسنان", en: "Dental Lab Technician", category: "Medical" },
  { ar: "فني تركيبات اسنان", en: "Dental Lab Technician", category: "Medical" },
  { ar: "أخصائي صحة فم وأسنان", en: "Dental Hygienist", category: "Medical" },

  // 3. الصيادلة والمهن الطبية المساندة (Pharmacy & Allied Health)
  { ar: "صيدلي أول", en: "Senior Pharmacist", category: "Medical" },
  { ar: "صيدلي اول", en: "Senior Pharmacist", category: "Medical" },
  { ar: "صيدلي", en: "Pharmacist", category: "Medical" },
  { ar: "مساعد صيدلي", en: "Pharmacy Technician", category: "Medical" },
  { ar: "فني صيدلة", en: "Pharmacy Technician", category: "Medical" },
  { ar: "فني أول مختبر طبي", en: "Senior Medical Lab Technician", category: "Medical" },
  { ar: "فني اول مختبر طبي", en: "Senior Medical Lab Technician", category: "Medical" },
  { ar: "فني مختبر طبي", en: "Medical Laboratory Technician", category: "Medical" },
  { ar: "فني مختبر", en: "Laboratory Technician", category: "Medical" },
  { ar: "فني سحب دم", en: "Phlebotomist", category: "Medical" },
  { ar: "فني أشعة تشخيصية", en: "Diagnostic Radiology Technician", category: "Medical" },
  { ar: "فني اشعة تشخيصية", en: "Diagnostic Radiology Technician", category: "Medical" },
  { ar: "فني أشعة", en: "Radiology Technician", category: "Medical" },
  { ar: "فني اشعة", en: "Radiology Technician", category: "Medical" },
  { ar: "فني ليزر طبي", en: "Medical Laser Technician", category: "Medical" },
  { ar: "فني ليزر", en: "Laser Technician", category: "Medical" },
  { ar: "أخصائي علاج طبيعي", en: "Physiotherapist", category: "Medical" },
  { ar: "اخصائي علاج طبيعي", en: "Physiotherapist", category: "Medical" },
  { ar: "فني علاج طبيعي", en: "Physiotherapy Technician", category: "Medical" },
  { ar: "أخصائي تغذية علاجية", en: "Clinical Dietitian", category: "Medical" },
  { ar: "اخصائي تغذية علاجية", en: "Clinical Dietitian", category: "Medical" },
  { ar: "أخصائي تغذية", en: "Dietitian", category: "Medical" },
  { ar: "اخصائي تغذية", en: "Dietitian", category: "Medical" },
  { ar: "أخصائي بصريات", en: "Optometrist", category: "Medical" },
  { ar: "اخصائي بصريات", en: "Optometrist", category: "Medical" },
  { ar: "فني تعقيم", en: "Sterilization Technician", category: "Medical" },
  { ar: "فني أجهزة طبية", en: "Biomedical Equipment Technician", category: "Medical" },
  { ar: "مهندس أجهزة طبية", en: "Biomedical Engineer", category: "Medical" },
  { ar: "مساعد مريض", en: "Patient Care Assistant", category: "Medical" },
  { ar: "معاون صحي", en: "Healthcare Assistant", category: "Medical" },

  // 4. الكادر القيادي والإداري العام (Executive & Administration)
  { ar: "المدير العام", en: "General Manager", category: "Administrative" },
  { ar: "مدير عام", en: "General Manager", category: "Administrative" },
  { ar: "مدير تنفيذي", en: "Chief Executive Officer (CEO)", category: "Administrative" },
  { ar: "مدير العمليات", en: "Chief Operating Officer (COO)", category: "Administrative" },
  { ar: "مدير إداري", en: "Administrative Manager", category: "Administrative" },
  { ar: "مدير اداري", en: "Administrative Manager", category: "Administrative" },
  { ar: "مساعد مدير إداري", en: "Assistant Administrative Manager", category: "Administrative" },
  { ar: "مشرف إداري", en: "Administrative Supervisor", category: "Administrative" },
  { ar: "باحث إداري", en: "Administrative Researcher", category: "Administrative" },
  { ar: "منسق إداري", en: "Administrative Coordinator", category: "Administrative" },
  { ar: "سكرتير تنفيذي", en: "Executive Secretary", category: "Administrative" },
  { ar: "سكرتير", en: "Secretary", category: "Administrative" },
  { ar: "سكرتيرة", en: "Secretary", category: "Administrative" },
  { ar: "سكرتير طبي", en: "Medical Secretary", category: "Administrative" },
  { ar: "سكرتيرة طبية", en: "Medical Secretary", category: "Administrative" },
  { ar: "موظف استقبال", en: "Receptionist", category: "Administrative" },
  { ar: "موظفة استقبال", en: "Receptionist", category: "Administrative" },
  { ar: "موظف خدمة عملاء", en: "Customer Service Representative", category: "Administrative" },
  { ar: "منسق مواعيد وملفات طبية", en: "Medical Records Coordinator", category: "Administrative" },
  { ar: "كاتب ملفات وسجلات", en: "Filing Clerk", category: "Administrative" },
  { ar: "مدخل بيانات", en: "Data Entry Operator", category: "Administrative" },

  // 5. الموارد البشرية والشؤون القانونية والعلاقات العامة (HR & PRO)
  { ar: "مدير الموارد البشرية", en: "HR Manager", category: "HR" },
  { ar: "مسؤول موارد بشرية", en: "HR Officer", category: "HR" },
  { ar: "مسئول موارد بشرية", en: "HR Officer", category: "HR" },
  { ar: "أخصائي شؤون موظفين", en: "Personnel Specialist", category: "HR" },
  { ar: "اخصائي شؤون موظفين", en: "Personnel Specialist", category: "HR" },
  { ar: "أخصائي توظيف", en: "Recruitment Specialist", category: "HR" },
  { ar: "منسق تدريب وتطوير", en: "Training & Development Coordinator", category: "HR" },
  { ar: "مستشار قانوني", en: "Legal Advisor", category: "Legal" },
  { ar: "باحث قانوني", en: "Legal Researcher", category: "Legal" },
  { ar: "محامي", en: "Lawyer", category: "Legal" },
  { ar: "مدير علاقات عامة", en: "Public Relations Manager", category: "PR" },
  { ar: "مسؤول علاقات عامة", en: "Public Relations Officer", category: "PR" },
  { ar: "مندوب شؤون وجوازات (علاقات عامة)", en: "Public Relations Officer (PRO)", category: "PR" },
  { ar: "مندوب شؤون وجوازات", en: "Public Relations Officer (PRO)", category: "PR" },
  { ar: "مندوب إنجاز معاملات حكومية", en: "Government Transactions Officer", category: "PR" },
  { ar: "مندوب انجاز معاملات حكومية", en: "Government Transactions Officer", category: "PR" },
  { ar: "مندوب عام", en: "Company Representative", category: "PR" },
  { ar: "مندوب", en: "Company Representative", category: "PR" },

  // 6. المالية والمحاسبة والمخازن (Finance, Accounting & Logistics)
  { ar: "مدير مالي", en: "Finance Manager", category: "Finance" },
  { ar: "رئيس حسابات", en: "Chief Accountant", category: "Finance" },
  { ar: "محاسب عام", en: "General Accountant", category: "Finance" },
  { ar: "محاسب", en: "Accountant", category: "Finance" },
  { ar: "محاسب تكاليف", en: "Cost Accountant", category: "Finance" },
  { ar: "محاسب رواتب وأجور", en: "Payroll Accountant", category: "Finance" },
  { ar: "مدقق حسابات داخلي", en: "Internal Auditor", category: "Finance" },
  { ar: "أمين صندوق", en: "Cashier", category: "Finance" },
  { ar: "امين صندوق", en: "Cashier", category: "Finance" },
  { ar: "مسؤول تأمين صحي", en: "Medical Insurance Officer", category: "Finance" },
  { ar: "مسئول تأمين صحي", en: "Medical Insurance Officer", category: "Finance" },
  { ar: "مدير مشتريات", en: "Procurement Manager", category: "Logistics" },
  { ar: "مسؤول مشتريات ومخازن", en: "Procurement & Stores Officer", category: "Logistics" },
  { ar: "مسؤول مشتريات", en: "Purchasing Officer", category: "Logistics" },
  { ar: "أمين مخزن طبي", en: "Medical Storekeeper", category: "Logistics" },
  { ar: "امين مخزن طبي", en: "Medical Storekeeper", category: "Logistics" },
  { ar: "أمين مخزن", en: "Storekeeper", category: "Logistics" },
  { ar: "امين مخزن", en: "Storekeeper", category: "Logistics" },

  // 7. التسويق وتقنية المعلومات (Marketing & IT)
  { ar: "مدير تسويق", en: "Marketing Manager", category: "Marketing" },
  { ar: "مدير تسويق وعلاقات عامة", en: "Marketing & PR Manager", category: "Marketing" },
  { ar: "أخصائي تسويق", en: "Marketing Specialist", category: "Marketing" },
  { ar: "اخصائي تسويق", en: "Marketing Specialist", category: "Marketing" },
  { ar: "أخصائي تسويق رقمي", en: "Digital Marketing Specialist", category: "Marketing" },
  { ar: "مصمم جرافيك", en: "Graphic Designer", category: "Marketing" },
  { ar: "مدير تقنية معلومات", en: "IT Manager", category: "IT" },
  { ar: "مسؤول تقنية معلومات", en: "IT Specialist", category: "IT" },
  { ar: "مسؤول شبكات ودعم فني", en: "Network & IT Support Specialist", category: "IT" },
  { ar: "فني دعم فني (Helpdesk)", en: "IT Support Technician", category: "IT" },
  { ar: "مطور برمجيات", en: "Software Developer", category: "IT" },

  // 8. الخدمات المساندة والأمن والصيانة (Support, Security & Maintenance)
  { ar: "مشرف أمن وسلامة", en: "Safety & Security Supervisor", category: "Support" },
  { ar: "حارس أمن", en: "Security Guard", category: "Support" },
  { ar: "فني صيانة عامة", en: "General Maintenance Technician", category: "Support" },
  { ar: "فني تكييف وتبريد", en: "HVAC Technician", category: "Support" },
  { ar: "فني كهرباء", en: "Electrician", category: "Support" },
  { ar: "سائق سيارة خاصة", en: "Private Driver", category: "Support" },
  { ar: "سائق", en: "Driver", category: "Support" },
  { ar: "سائق إسعاف", en: "Ambulance Driver", category: "Support" },
  { ar: "عامل بوفيه وخدمات", en: "Buffet & Services Worker", category: "Support" },
  { ar: "عامل بوفيه", en: "Buffet Worker", category: "Support" },
  { ar: "عامل خدمات ونظافة", en: "Cleaner & Services Worker", category: "Support" },
  { ar: "عامل نظافة", en: "Cleaner", category: "Support" },
  { ar: "مراسل", en: "Office Messenger", category: "Support" }
];


export const KUWAIT_ADMINISTRATIVE_JOBS = [
  // ==========================================
  // 1. الإدارة العليا والتنفيذية (Executive & Senior Management)
  // ==========================================
  { ar: "المدير العام", en: "General Manager", category: "Executive" },
  { ar: "مدير عام", en: "General Manager", category: "Executive" },
  { ar: "نائب المدير العام", en: "Deputy General Manager", category: "Executive" },
  { ar: "مساعد المدير العام", en: "Assistant General Manager", category: "Executive" },
  { ar: "الرئيس التنفيذي", en: "Chief Executive Officer (CEO)", category: "Executive" },
  { ar: "مدير تنفيذي", en: "Chief Executive Officer (CEO)", category: "Executive" },
  { ar: "رئيس العمليات التشغيلية", en: "Chief Operating Officer (COO)", category: "Executive" },
  { ar: "مدير العمليات", en: "Operations Manager", category: "Executive" },
  { ar: "مدير تشغيل", en: "Operations Manager", category: "Executive" },
  { ar: "مدير فرع", en: "Branch Manager", category: "Executive" },
  { ar: "مساعد مدير فرع", en: "Assistant Branch Manager", category: "Executive" },
  { ar: "مدير إدارة التطوير والتخطيط", en: "Planning & Business Development Manager", category: "Executive" },
  { ar: "مستشار إدارة أعمال", en: "Business Management Consultant", category: "Executive" },

  // ==========================================
  // 2. الشؤون الإدارية العامة والمكتبية (General Administration & Office)
  // ==========================================
  { ar: "مدير إداري", en: "Administrative Manager", category: "Administration" },
  { ar: "مدير اداري", en: "Administrative Manager", category: "Administration" },
  { ar: "مساعد مدير إداري", en: "Assistant Administrative Manager", category: "Administration" },
  { ar: "مشرف إداري", en: "Administrative Supervisor", category: "Administration" },
  { ar: "مشرف اداري", en: "Administrative Supervisor", category: "Administration" },
  { ar: "مسؤول إداري", en: "Administrative Officer", category: "Administration" },
  { ar: "مسئول إداري", en: "Administrative Officer", category: "Administration" },
  { ar: "باحث إداري", en: "Administrative Researcher", category: "Administration" },
  { ar: "باحث إداري أول", en: "Senior Administrative Researcher", category: "Administration" },
  { ar: "منسق إداري", en: "Administrative Coordinator", category: "Administration" },
  { ar: "مساعد إداري", en: "Administrative Assistant", category: "Administration" },
  { ar: "مساعد اداري", en: "Administrative Assistant", category: "Administration" },
  { ar: "كاتب إداري", en: "Administrative Clerk", category: "Administration" },
  { ar: "كاتب ملفات وسجلات", en: "Filing & Records Clerk", category: "Administration" },
  { ar: "أمين أرشيف", en: "Archivist / Document Controller", category: "Administration" },
  { ar: "امين ارشيف", en: "Archivist / Document Controller", category: "Administration" },
  { ar: "مسؤول مراقبة مستندات", en: "Document Controller", category: "Administration" },
  { ar: "مدخل بيانات", en: "Data Entry Operator", category: "Administration" },
  { ar: "مدخلة بيانات", en: "Data Entry Operator", category: "Administration" },
  { ar: "طباع", en: "Typist", category: "Administration" },
  { ar: "طباعة", en: "Typist", category: "Administration" },

  // ==========================================
  // 3. الموارد البشرية وشؤون الموظفين (Human Resources & Personnel)
  // ==========================================
  { ar: "مدير الموارد البشرية", en: "HR Manager", category: "Human Resources" },
  { ar: "مدير موارد بشرية", en: "HR Manager", category: "Human Resources" },
  { ar: "نائب مدير الموارد البشرية", en: "Deputy HR Manager", category: "Human Resources" },
  { ar: "رئيس قسم شؤون العاملين", en: "Head of Personnel Section", category: "Human Resources" },
  { ar: "مسؤول الموارد البشرية", en: "Human Resources Officer", category: "Human Resources" },
  { ar: "مسؤول موارد بشرية", en: "HR Officer", category: "Human Resources" },
  { ar: "مسئول موارد بشرية", en: "HR Officer", category: "Human Resources" },
  { ar: "أخصائي موارد بشرية", en: "HR Specialist", category: "Human Resources" },
  { ar: "اخصائي موارد بشرية", en: "HR Specialist", category: "Human Resources" },
  { ar: "أخصائي شؤون موظفين", en: "Personnel Specialist", category: "Human Resources" },
  { ar: "اخصائي شؤون موظفين", en: "Personnel Specialist", category: "Human Resources" },
  { ar: "مسؤول شؤون موظفين", en: "Personnel Officer", category: "Human Resources" },
  { ar: "كاتب شؤون موظفين", en: "Personnel Clerk", category: "Human Resources" },
  { ar: "أخصائي توظيف واستقطاب", en: "Talent Acquisition & Recruitment Specialist", category: "Human Resources" },
  { ar: "مسؤول توظيف", en: "Recruitment Officer", category: "Human Resources" },
  { ar: "أخصائي تدريب وتطوير", en: "Training & Development Specialist", category: "Human Resources" },
  { ar: "مسؤول تدريب", en: "Training Officer", category: "Human Resources" },
  { ar: "أخصائي رواتب ومزايا", en: "Compensation & Benefits Specialist", category: "Human Resources" },
  { ar: "مسؤول رواتب", en: "Payroll Officer", category: "Human Resources" },
  { ar: "مسؤول حضور وانصراف", en: "Time & Attendance Officer", category: "Human Resources" },
  { ar: "مساعد موارد بشرية", en: "HR Assistant", category: "Human Resources" },

  // ==========================================
  // 4. العلاقات العامة والشؤون الحكومية والجوازات (PR & PRO)
  // ==========================================
  { ar: "مدير العلاقات العامة", en: "Public Relations Manager", category: "Public Relations" },
  { ar: "مدير علاقات عامة", en: "Public Relations Manager", category: "Public Relations" },
  { ar: "مشرف علاقات عامة", en: "Public Relations Supervisor", category: "Public Relations" },
  { ar: "مسؤول علاقات عامة", en: "Public Relations Officer (PRO)", category: "Public Relations" },
  { ar: "أخصائي علاقات عامة", en: "Public Relations Specialist", category: "Public Relations" },
  { ar: "مندوب شؤون وجوازات (علاقات عامة)", en: "Government Relations Officer (PRO)", category: "Public Relations" },
  { ar: "مندوب شؤون وجوازات", en: "Public Relations Officer (PRO)", category: "Public Relations" },
  { ar: "مندوب علاقات عامة", en: "Public Relations Representative", category: "Public Relations" },
  { ar: "مندوب إنجاز معاملات حكومية", en: "Government Transactions Officer", category: "Public Relations" },
  { ar: "مندوب انجاز معاملات حكومية", en: "Government Transactions Officer", category: "Public Relations" },
  { ar: "مندوب شؤون", en: "Labor Affairs Representative", category: "Public Relations" },
  { ar: "مندوب جوازات", en: "Immigration & Residency Representative", category: "Public Relations" },
  { ar: "مندوب مرور وتراخيص", en: "Traffic & Licensing Representative", category: "Public Relations" },
  { ar: "مندوب عام", en: "General Company Representative", category: "Public Relations" },
  { ar: "مندوب", en: "Company Representative", category: "Public Relations" },

  // ==========================================
  // 5. الشؤون القانونية والعقود والتفتيش (Legal & Compliance)
  // ==========================================
  { ar: "مدير الشؤون القانونية", en: "Legal Affairs Manager", category: "Legal" },
  { ar: "مستشار قانوني", en: "Legal Advisor", category: "Legal" },
  { ar: "مستشار قانوني أول", en: "Senior Legal Advisor", category: "Legal" },
  { ar: "باحث قانوني", en: "Legal Researcher", category: "Legal" },
  { ar: "باحث قانوني أول", en: "Senior Legal Researcher", category: "Legal" },
  { ar: "أخصائي عقود وتوثيق", en: "Contracts & Documentation Specialist", category: "Legal" },
  { ar: "مسؤول عقود", en: "Contracts Officer", category: "Legal" },
  { ar: "محامي", en: "Lawyer / Legal Counsel", category: "Legal" },
  { ar: "مسؤول التزام ومطابقة", en: "Compliance Officer", category: "Legal" },
  { ar: "مدير الالتزام والرقابة", en: "Compliance & Governance Manager", category: "Legal" },
  { ar: "مفتش إداري", en: "Administrative Inspector", category: "Legal" },

  // ==========================================
  // 6. السكرتارية والاستقبال وإدارة المكاتب (Secretarial & Reception)
  // ==========================================
  { ar: "مدير مكتب", en: "Office Manager", category: "Secretarial" },
  { ar: "مديرة مكتب", en: "Office Manager", category: "Secretarial" },
  { ar: "سكرتير تنفيذي", en: "Executive Secretary", category: "Secretarial" },
  { ar: "سكرتيرة تنفيذية", en: "Executive Secretary", category: "Secretarial" },
  { ar: "سكرتير مجلس إدارة", en: "Board Secretary", category: "Secretarial" },
  { ar: "سكرتير خاص", en: "Private Secretary", category: "Secretarial" },
  { ar: "سكرتير", en: "Secretary", category: "Secretarial" },
  { ar: "سكرتيرة", en: "Secretary", category: "Secretarial" },
  { ar: "مساعد سكرتير", en: "Assistant Secretary", category: "Secretarial" },
  { ar: "سكرتير طبي", en: "Medical Secretary", category: "Secretarial" },
  { ar: "سكرتيرة طبية", en: "Medical Secretary", category: "Secretarial" },
  { ar: "سكرتير قانوني", en: "Legal Secretary", category: "Secretarial" },
  { ar: "مشرف استقبال", en: "Reception Supervisor", category: "Secretarial" },
  { ar: "موظف استقبال", en: "Receptionist", category: "Secretarial" },
  { ar: "موظفة استقبال", en: "Receptionist", category: "Secretarial" },
  { ar: "موظف بدالة وسنترال", en: "Telephone Operator / Switchboard", category: "Secretarial" },
  { ar: "موظفة بدالة", en: "Telephone Operator", category: "Secretarial" },
  { ar: "منسق مواعيد وسجلات", en: "Appointments & Records Coordinator", category: "Secretarial" },
  { ar: "موظف خدمة عملاء", en: "Customer Service Representative", category: "Secretarial" },
  { ar: "مشرف خدمة عملاء", en: "Customer Service Supervisor", category: "Secretarial" },
  { ar: "مسؤول علاقات مرضى", en: "Patient Relations Officer", category: "Secretarial" },

  // ==========================================
  // 7. الإدارة المالية والمحاسبة والتدقيق (Finance & Accounting)
  // ==========================================
  { ar: "المدير المالي", en: "Chief Financial Officer (CFO)", category: "Finance" },
  { ar: "مدير مالي", en: "Finance Manager", category: "Finance" },
  { ar: "نائب المدير المالي", en: "Deputy Finance Manager", category: "Finance" },
  { ar: "رئيس حسابات", en: "Chief Accountant", category: "Finance" },
  { ar: "مشرف حسابات", en: "Accounting Supervisor", category: "Finance" },
  { ar: "محاسب أول", en: "Senior Accountant", category: "Finance" },
  { ar: "محاسب اول", en: "Senior Accountant", category: "Finance" },
  { ar: "محاسب عام", en: "General Accountant", category: "Finance" },
  { ar: "محاسب", en: "Accountant", category: "Finance" },
  { ar: "محاسب تكاليف", en: "Cost Accountant", category: "Finance" },
  { ar: "محاسب رواتب وأجور", en: "Payroll Accountant", category: "Finance" },
  { ar: "محاسب ضرائب وإقرارات", en: "Tax Accountant", category: "Finance" },
  { ar: "محاسب مدفوعات وموردين", en: "Accounts Payable (AP) Accountant", category: "Finance" },
  { ar: "محاسب مقبوضات وعملاء", en: "Accounts Receivable (AR) Accountant", category: "Finance" },
  { ar: "محاسب بنوك وتسويات", en: "Bank Reconciliation Accountant", category: "Finance" },
  { ar: "مساعد محاسب", en: "Assistant Accountant", category: "Finance" },
  { ar: "كاتب حسابات", en: "Accounts Clerk", category: "Finance" },
  { ar: "مدقق حسابات داخلي", en: "Internal Auditor", category: "Finance" },
  { ar: "مدير التدقيق الداخلي", en: "Internal Audit Manager", category: "Finance" },
  { ar: "محلل مالي", en: "Financial Analyst", category: "Finance" },
  { ar: "أمين خزينة", en: "Treasury Officer / Head Cashier", category: "Finance" },
  { ar: "أمين صندوق", en: "Cashier", category: "Finance" },
  { ar: "امين صندوق", en: "Cashier", category: "Finance" },
  { ar: "محصل أموال وديون", en: "Debt Collector", category: "Finance" },
  { ar: "مسؤول تأمين صحي", en: "Medical Insurance Officer", category: "Finance" },
  { ar: "أخصائي مطالبات وتأمين", en: "Insurance Claims Specialist", category: "Finance" },

  // ==========================================
  // 8. المشتريات والمخازن واللوجستيات (Procurement, Stores & Logistics)
  // ==========================================
  { ar: "مدير المشتريات والتوريد", en: "Procurement & Supply Chain Manager", category: "Logistics" },
  { ar: "مدير مشتريات", en: "Procurement Manager", category: "Logistics" },
  { ar: "رئيس قسم المشتريات", en: "Head of Procurement Section", category: "Logistics" },
  { ar: "مسؤول مشتريات أول", en: "Senior Purchasing Officer", category: "Logistics" },
  { ar: "مسؤول مشتريات ومخازن", en: "Procurement & Stores Officer", category: "Logistics" },
  { ar: "مسؤول مشتريات", en: "Purchasing Officer", category: "Logistics" },
  { ar: "أخصائي مشتريات خارجية", en: "Foreign Purchasing Specialist", category: "Logistics" },
  { ar: "مندوب مشتريات", en: "Purchasing Representative", category: "Logistics" },
  { ar: "مدير مخازن", en: "Warehouse Manager", category: "Logistics" },
  { ar: "مشرف مخازن", en: "Warehouse Supervisor", category: "Logistics" },
  { ar: "أمين مخزن رئيسي", en: "Head Storekeeper", category: "Logistics" },
  { ar: "أمين مخزن طبي", en: "Medical Storekeeper", category: "Logistics" },
  { ar: "امين مخزن طبي", en: "Medical Storekeeper", category: "Logistics" },
  { ar: "أمين مخزن أدوية", en: "Pharmacy Storekeeper", category: "Logistics" },
  { ar: "أمين مخزن", en: "Storekeeper", category: "Logistics" },
  { ar: "امين مخزن", en: "Storekeeper", category: "Logistics" },
  { ar: "مساعد أمين مخزن", en: "Assistant Storekeeper", category: "Logistics" },
  { ar: "مراقب مخزون وجرد", en: "Inventory Controller", category: "Logistics" },
  { ar: "كاتب مستودع", en: "Warehouse Clerk", category: "Logistics" },
  { ar: "منسق حركة ونقل", en: "Logistics & Fleet Coordinator", category: "Logistics" },
  { ar: "مسؤول حركة وسيارات", en: "Fleet Supervisor", category: "Logistics" },

  // ==========================================
  // 9. التسويق والمبيعات وتطوير الأعمال (Marketing & Sales)
  // ==========================================
  { ar: "مدير التسويق", en: "Marketing Manager", category: "Marketing" },
  { ar: "مدير تسويق", en: "Marketing Manager", category: "Marketing" },
  { ar: "مدير تسويق وعلاقات عامة", en: "Marketing & PR Manager", category: "Marketing" },
  { ar: "مشرف تسويق", en: "Marketing Supervisor", category: "Marketing" },
  { ar: "أخصائي تسويق", en: "Marketing Specialist", category: "Marketing" },
  { ar: "اخصائي تسويق", en: "Marketing Specialist", category: "Marketing" },
  { ar: "أخصائي تسويق رقمي", en: "Digital Marketing Specialist", category: "Marketing" },
  { ar: "مسؤول منصات التواصل الاجتماعي", en: "Social Media Specialist", category: "Marketing" },
  { ar: "كاتب محتوى إعلاني", en: "Content Creator / Copywriter", category: "Marketing" },
  { ar: "مصمم جرافيك", en: "Graphic Designer", category: "Marketing" },
  { ar: "مدير مبيعات", en: "Sales Manager", category: "Sales" },
  { ar: "مشرف مبيعات", en: "Sales Supervisor", category: "Sales" },
  { ar: "مسؤول مبيعات", en: "Sales Executive", category: "Sales" },
  { ar: "مندوب مبيعات", en: "Sales Representative", category: "Sales" },
  { ar: "مندوب مبيعات وتسويق", en: "Sales & Marketing Representative", category: "Sales" },
  { ar: "مندوب دعاية طبية", en: "Medical Representative", category: "Sales" },
  { ar: "أخصائي تسويق طبي", en: "Healthcare Marketing Specialist", category: "Sales" },
  { ar: "أخصائي تطوير أعمال", en: "Business Development Specialist", category: "Sales" },

  // ==========================================
  // 10. تقنية المعلومات والدعم الإداري الفني (IT & Administrative Support)
  // ==========================================
  { ar: "مدير إدارة تكنولوجيا المعلومات", en: "IT Director", category: "IT" },
  { ar: "مدير تقنية معلومات", en: "IT Manager", category: "IT" },
  { ar: "رئيس قسم الحاسب الآلي", en: "Head of IT Section", category: "IT" },
  { ar: "مسؤول تقنية معلومات", en: "IT Specialist", category: "IT" },
  { ar: "مسؤول شبكات ودعم فني", en: "Network & Systems Specialist", category: "IT" },
  { ar: "مهندس شبكات", en: "Network Engineer", category: "IT" },
  { ar: "فني دعم فني (Helpdesk)", en: "IT Support Technician", category: "IT" },
  { ar: "فني دعم فني", en: "IT Support Technician", category: "IT" },
  { ar: "فني حاسب آلي", en: "Computer Technician", category: "IT" },
  { ar: "مدير قواعد بيانات", en: "Database Administrator (DBA)", category: "IT" },
  { ar: "مسؤول أمن معلومات", en: "Information Security Officer", category: "IT" },
  { ar: "مطور نظم وبرمجيات", en: "Software Developer", category: "IT" },
  { ar: "مشرف موقع إلكتروني", en: "Webmaster", category: "IT" },

  // ==========================================
  // 11. الجودة والتفتيش والصحة المهنية (Quality & Compliance)
  // ==========================================
  { ar: "مدير إدارة الجودة", en: "Quality Assurance Manager", category: "Quality" },
  { ar: "مدير جودة", en: "Quality Manager", category: "Quality" },
  { ar: "أخصائي توكيد وجودة", en: "Quality Assurance Specialist", category: "Quality" },
  { ar: "مفتش جودة", en: "Quality Inspector", category: "Quality" },
  { ar: "مدير الصحة والسلامة والبيئة", en: "HSE Manager", category: "HSE" },
  { ar: "ضابط أمن وسلامة مهنية", en: "Occupational Health & Safety Officer", category: "HSE" },
  { ar: "مشرف أمن وسلامة", en: "Safety & Security Supervisor", category: "HSE" },
  { ar: "مفتش سلامة", en: "Safety Inspector", category: "HSE" },

  // ==========================================
  // 12. الخدمات الإدارية والمساندة المباشرة (Support Services)
  // ==========================================
  { ar: "مشرف خدمات عامة", en: "General Services Supervisor", category: "Support" },
  { ar: "مسؤول خدمات إدارية", en: "Administrative Services Officer", category: "Support" },
  { ar: "مشرف أمن", en: "Security Supervisor", category: "Support" },
  { ar: "حارس أمن", en: "Security Guard", category: "Support" },
  { ar: "حارس", en: "Security Guard", category: "Support" },
  { ar: "سائق سيارة خاصة", en: "Private Driver", category: "Support" },
  { ar: "سائق باص", en: "Bus Driver", category: "Support" },
  { ar: "سائق نقل خفيف", en: "Light Vehicle Driver", category: "Support" },
  { ar: "سائق", en: "Driver", category: "Support" },
  { ar: "مراسل إداري", en: "Office Messenger", category: "Support" },
  { ar: "مراسل مكتبي", en: "Office Messenger", category: "Support" },
  { ar: "مراسل", en: "Office Messenger", category: "Support" },
  { ar: "فراش", en: "Office Boy", category: "Support" },
  { ar: "عامل بوفيه وخدمات", en: "Buffet & Hospitality Worker", category: "Support" },
  { ar: "عامل بوفيه", en: "Buffet Worker", category: "Support" },
  { ar: "مشرف نظافة", en: "Housekeeping / Cleaning Supervisor", category: "Support" },
  { ar: "عامل خدمات ونظافة", en: "Cleaner & General Services", category: "Support" },
  { ar: "عامل نظافة", en: "Cleaner", category: "Support" },
  { ar: "عامل خدمات", en: "Services Worker", category: "Support" },
  { ar: "عامل تحميل وتنزيل", en: "Loader / Helper", category: "Support" },
  { ar: "عامل عادي", en: "General Worker", category: "Support" },
  { ar: "عامل", en: "Worker", category: "Support" }
];


export const EXTRACTED_CIVIL_ID_JOBS = [
  // 1. آيه ماجد الصمد
  { ar: "كاتب ادخال بيانات", en: "Data Entry Clerk", category: "Administration" },
  { ar: "كاتب إدخال بيانات", en: "Data Entry Clerk", category: "Administration" },

  // 2. بارعه عبدالله قصير
  { ar: "كاتب استقبال/عام", en: "General Reception Clerk", category: "Administration" },
  { ar: "كاتب استقبال / عام", en: "General Reception Clerk", category: "Administration" },

  // 3. رضوى عمر بللو + سعود شاكر طعمه مناحي (إذن العمل 12011)
  { ar: "كاتب استقبال مرضى", en: "Patient Reception Clerk", category: "Medical Administration" },
  { ar: "كاتب استقبال مرضي", en: "Patient Reception Clerk", category: "Medical Administration" },

  // 4. ريماري جوي دونيسا سانشيز
  { ar: "كاتب دوام", en: "Timekeeper / Attendance Clerk", category: "Administration" },

  // 5. سميه اسحق اميريان
  { ar: "كاتب علاقات عامة", en: "Public Relations Clerk", category: "Public Relations" },
  { ar: "كاتب علاقات عامه", en: "Public Relations Clerk", category: "Public Relations" },

  // 6. سوجاتا بيسالا جوندا
  { ar: "فراش", en: "Office Boy / Cleaner", category: "Support" },

  // 7. علي محمد غلامي
  { ar: "مخلص معاملات", en: "Transactions Clearance Officer (PRO)", category: "Public Relations" },

  // 8. عماد احمد محمد سبوبه
  { ar: "مندوب مبيعات", en: "Sales Representative", category: "Sales" },

  // 9. لافيلا اريسينو بليناردو
  { ar: "عامل تنظيف / مكاتب", en: "Office Cleaner", category: "Support" },
  { ar: "عامل تنظيف/مكاتب", en: "Office Cleaner", category: "Support" },
  { ar: "عامل تنظيف مكاتب", en: "Office Cleaner", category: "Support" }
];


export const EXTRACTED_CIVIL_ID_JOBS_BATCH_2 = [
  // 1. باسل سعد سلامه عليان
  { ar: "طبيب اسنان", en: "Dentist", category: "Medical" },
  { ar: "طبيب أسنان", en: "Dentist", category: "Medical" },

  // 2. ايرينا شاكر
  { ar: "طبيب مسجل امراض جلديه وتناسليه", en: "Registrar - Dermatology & Venereology", category: "Medical" },
  { ar: "طبيب مسجل أمراض جلدية وتناسلية", en: "Registrar - Dermatology & Venereology", category: "Medical" },
  { ar: "طبيب مسجل جلدية وتناسلية", en: "Registrar - Dermatology & Venereology", category: "Medical" },

  // 3. طلال مالك محمد خير الكردى
  { ar: "طبيب أسنان/عام", en: "General Dental Practitioner", category: "Medical" },
  { ar: "طبيب اسنان/عام", en: "General Dental Practitioner", category: "Medical" },
  { ar: "طبيب اسنان / عام", en: "General Dental Practitioner", category: "Medical" },
  { ar: "طبيب أسنان عام", en: "General Dental Practitioner", category: "Medical" },

  // 4. عامر خضر شاكر
  { ar: "مسئول تسويق", en: "Marketing Officer", category: "Marketing" },
  { ar: "مسؤول تسويق", en: "Marketing Officer", category: "Marketing" },

  // 5. ان ماري ريجينا جوزون جينيو
  { ar: "فني اسنان", en: "Dental Lab Technician", category: "Medical" },
  { ar: "فني أسنان", en: "Dental Lab Technician", category: "Medical" },

  // 6. جوليانيسا مانتيلا سانشيز
  { ar: "ممرض اختصاصي/صحة عامة", en: "Specialist Nurse / Public Health", category: "Medical" },
  { ar: "ممرض اختصاصي / صحة عامة", en: "Specialist Nurse / Public Health", category: "Medical" },
  { ar: "ممرض اختصاصي صحة عامة", en: "Specialist Nurse / Public Health", category: "Medical" },

  // 7. دينا ماريا ديسوزا
  { ar: "مساعد تمريض عام", en: "General Nursing Assistant", category: "Medical" },
  { ar: "مساعد تمريض", en: "Nursing Assistant", category: "Medical" }
];


export const EXTRACTED_CIVIL_ID_JOBS_BATCH_3 = [
  // 1. احمد حسين ورودى
  { ar: "كاتب استقبال/عام", en: "General Reception Clerk", category: "Administration" },
  { ar: "كاتب استقبال / عام", en: "General Reception Clerk", category: "Administration" },

  // 2. اصف بشير بنى محمد بشير
  { ar: "مراسل", en: "Office Messenger", category: "Support" },
  { ar: "مراسل مكتبي", en: "Office Messenger", category: "Support" },

  // 3. جاتجامول ماداثيلفيلي اوماتاكوتان
  { ar: "كاتب ادخال بيانات", en: "Data Entry Clerk", category: "Administration" },
  { ar: "كاتب إدخال بيانات", en: "Data Entry Clerk", category: "Administration" },

  // 4. فؤاد نصر عبدالكريم الحجوج
  { ar: "مدير مالي", en: "Finance Manager", category: "Finance" },
  { ar: "المدير المالي", en: "Chief Financial Officer (CFO)", category: "Finance" },

  // 5. لين باسم حمدان محمود
  { ar: "سكرتير", en: "Secretary", category: "Secretarial" },
  { ar: "سكرتيرة", en: "Secretary", category: "Secretarial" },

  // 6. معصومه محمد ضيائي
  { ar: "مدير علاقات عامه", en: "Public Relations Manager", category: "Public Relations" },
  { ar: "مدير علاقات عامة", en: "Public Relations Manager", category: "Public Relations" },
  { ar: "مدير العلاقات العامة", en: "Public Relations Manager", category: "Public Relations" },

  // 7. نورهان حسن كربوج
  { ar: "كاتب دوام", en: "Timekeeper / Attendance Clerk", category: "Administration" }
];


export const EXTRACTED_CIVIL_ID_JOBS_BATCH_4 = [
  // 1. سيد محمد سيد محمد هادي مدرسي
  { ar: "طبيب بشري", en: "Human Physician / General Physician", category: "Medical" },
  { ar: "طبيب بشري عام", en: "General Physician", category: "Medical" },

  // 2. عمار محمد محمود بني فواز
  { ar: "طبيب اختصاصي/أمراض جلدية", en: "Specialist - Dermatology", category: "Medical" },
  { ar: "طبيب اختصاصي / أمراض جلدية", en: "Specialist - Dermatology", category: "Medical" },
  { ar: "طبيب اختصاصي/امراض جلدية", en: "Specialist - Dermatology", category: "Medical" },
  { ar: "طبيب اختصاصي أمراض جلدية", en: "Specialist - Dermatology", category: "Medical" },

  // 3. فؤاد عوض خالد عداد
  { ar: "طبيب أسنان/عام", en: "General Dental Practitioner", category: "Medical" },
  { ar: "طبيب اسنان/عام", en: "General Dental Practitioner", category: "Medical" },

  // 4. احمد رحيم بخش ساميراد
  { ar: "مندوب مشتريات", en: "Purchasing Representative", category: "Logistics" },
  { ar: "مندوب المشتريات", en: "Purchasing Representative", category: "Logistics" },

  // 5. الله بخش كريم بخش ساميراد
  { ar: "موظف علاقات عامة", en: "Public Relations Officer (PRO)", category: "Public Relations" },
  { ar: "موظف علاقات عامه", en: "Public Relations Officer (PRO)", category: "Public Relations" },

  // 6. انجليسا لازيليتا سلبنتان
  { ar: "كاتب استقبال/عام", en: "General Reception Clerk", category: "Administration" },
  { ar: "كاتب استقبال / عام", en: "General Reception Clerk", category: "Administration" },

  // 7. عبدالوهاب طارق نزير
  { ar: "مراسل", en: "Office Messenger", category: "Support" },
  { ar: "مراسل مكتبي", en: "Office Messenger", category: "Support" }
];


export const EXTRACTED_CIVIL_ID_JOBS_BATCH_5 = [
  // 1. حنان محمد احمد ابوالغيط
  { ar: "طبيب ممارس عام", en: "General Practitioner (GP)", category: "Medical" },
  { ar: "طبيب ممارس عام بشري", en: "General Practitioner (GP)", category: "Medical" },

  // 2. داني مأمون نصر
  { ar: "طبيب صحة عامة", en: "Public Health Physician", category: "Medical" },
  { ar: "طبيب صحه عامه", en: "Public Health Physician", category: "Medical" },

  // 3. سودير كومار نينجا ريدي
  { ar: "طبيب اختصاصي/أمراض جلدية", en: "Specialist - Dermatology", category: "Medical" },
  { ar: "طبيب اختصاصي / أمراض جلدية", en: "Specialist - Dermatology", category: "Medical" },
  { ar: "طبيب اختصاصي/امراض جلدية", en: "Specialist - Dermatology", category: "Medical" },
  { ar: "طبيب اختصاصي أمراض جلدية", en: "Specialist - Dermatology", category: "Medical" },

  // 4. على أ ك حسون
  { ar: "طبيب أسنان/عام", en: "General Dental Practitioner", category: "Medical" },
  { ar: "طبيب اسنان/عام", en: "General Dental Practitioner", category: "Medical" },
  { ar: "طبيب اسنان / عام", en: "General Dental Practitioner", category: "Medical" },
  { ar: "طبيب أسنان عام", en: "General Dental Practitioner", category: "Medical" }
];

export const ALL_KUWAIT_JOB_POSITIONS = [...KUWAIT_JOB_POSITIONS_DIRECTORY, ...KUWAIT_ADMINISTRATIVE_JOBS, ...EXTRACTED_CIVIL_ID_JOBS, ...EXTRACTED_CIVIL_ID_JOBS_BATCH_2, ...EXTRACTED_CIVIL_ID_JOBS_BATCH_3, ...EXTRACTED_CIVIL_ID_JOBS_BATCH_4, ...EXTRACTED_CIVIL_ID_JOBS_BATCH_5];
export function getEnglishJobTitle(arabicTitle: string): string {
  if (!arabicTitle) return "Staff Member";
  const cleanTitle = arabicTitle.trim();
  const found = ALL_KUWAIT_JOB_POSITIONS.find(
    (item) => item.ar === cleanTitle || cleanTitle.includes(item.ar)
  );
  return found ? found.en : cleanTitle;
}
