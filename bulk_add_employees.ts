import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const companyId = 'comp-u0YN6VJMXOSiFGRfbPJpxJWqGYL2';

const employees = [
  {
    fullNameAr: 'عمار محمد محمود بني فواز',
    fullNameEn: 'AMMAR MOHAMMAD MAHMOUD BANI FAWWAZ',
    civilId: '281052307606',
    civilIdExpiry: '2027-03-08',
    passportNo: 'S0266427',
    nationality: 'Jordan',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'MALE',
    dob: '1981-05-23',
    department: 'الطاقم الطبي',
    jobTitle: 'طبيب اختصاصي / أمراض جلدية'
  },
  {
    fullNameAr: 'فؤاد عوض خالد عداد',
    fullNameEn: 'FUAD AWAD KHALED ADDAD',
    civilId: '275081400294',
    civilIdExpiry: '2027-09-06',
    passportNo: 'U0191055',
    nationality: 'Jordan',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'MALE',
    dob: '1975-08-14',
    department: 'الطاقم الطبي',
    jobTitle: 'طبيب أسنان / عام'
  },
  {
    fullNameAr: 'ناديه رابح مفرح الرشيدي',
    fullNameEn: 'NADIAH RABEH MEFARREH ALRASHEEDI',
    civilId: '265082400641',
    civilIdExpiry: '2027-03-31',
    passportNo: '',
    nationality: 'Kuwait',
    isKuwaiti: true,
    residencyType: 'كويتي',
    gender: 'FEMALE',
    dob: '1965-08-24',
    department: 'الإدارة',
    jobTitle: 'غير محدد'
  },
  {
    fullNameAr: 'الفونسا فيلوثارا بارامبيل سيباستيان',
    fullNameEn: 'ALPHONSA VELUTHARA PARAMBIL SEBASTIAN',
    civilId: '291101105015',
    civilIdExpiry: '2026-06-08',
    passportNo: 'W3242476',
    nationality: 'India',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1991-10-11',
    department: 'التمريض',
    jobTitle: 'ممرض اختصاصي / صحة عامة'
  },
  {
    fullNameAr: 'شيبي سباستيان',
    fullNameEn: 'SHIBI SEBASTIAN',
    civilId: '285053007427',
    civilIdExpiry: '2026-06-15',
    passportNo: 'V7437715',
    nationality: 'India',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1985-05-30',
    department: 'التمريض',
    jobTitle: 'مساعد تمريض عام'
  },
  {
    fullNameAr: 'فداء محمد سلامه الدرعاوى',
    fullNameEn: 'FEDA M S ALDARAWI',
    civilId: '269042100079',
    civilIdExpiry: '2026-09-16',
    passportNo: 'R861308',
    nationality: 'Jordan',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1969-04-21',
    department: 'التمريض',
    jobTitle: 'مساعد تمريض عام'
  },
  {
    fullNameAr: 'نيمي سيباستيان توماس',
    fullNameEn: 'NIMMY SEBASTIAN',
    civilId: '287123003982',
    civilIdExpiry: '2027-12-20',
    passportNo: 'X8238142',
    nationality: 'India',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1987-12-30',
    department: 'التمريض',
    jobTitle: 'مساعد تمريض عام'
  },
  {
    fullNameAr: 'انابيلي اوبين ميلاندريس',
    fullNameEn: 'ANABELLE OBIEN MELENDRES',
    civilId: '281060709226',
    civilIdExpiry: '2027-12-20',
    passportNo: 'P2896088B',
    nationality: 'Philippines',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1981-06-07',
    department: 'الخدمات',
    jobTitle: 'عامل تنظيف / مكاتب'
  },
  {
    fullNameAr: 'اصف بشير بتى محمد بشير بتى',
    fullNameEn: 'ASIF BASHIR B M BHATTI',
    civilId: '267120501662',
    civilIdExpiry: '2027-09-10',
    passportNo: 'CU3176862',
    nationality: 'Pakistan',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'MALE',
    dob: '1967-12-05',
    department: 'الخدمات',
    jobTitle: 'مراسل'
  },
  {
    fullNameAr: 'برييتا بابو',
    fullNameEn: 'PREETHA BABU',
    civilId: '290092009835',
    civilIdExpiry: '2026-06-23',
    passportNo: 'U9487864',
    nationality: 'India',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1990-09-20',
    department: 'الخدمات',
    jobTitle: 'فراش'
  },
  {
    fullNameAr: 'جانجامول ماداثيلفيلي اوماتاكوتان',
    fullNameEn: 'GANGAMOL MADATHILVELI OMANAKUTTAN',
    civilId: '295021105486',
    civilIdExpiry: '2026-07-02',
    passportNo: 'Y4394817',
    nationality: 'India',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1995-02-11',
    department: 'الشؤون الإدارية',
    jobTitle: 'كاتب ادخال بيانات'
  },
  {
    fullNameAr: 'سيلفا راجو',
    fullNameEn: 'SILPA RAJU',
    civilId: '297062304595',
    civilIdExpiry: '2027-01-26',
    passportNo: 'W8844198',
    nationality: 'India',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1997-06-23',
    department: 'الاستقبال',
    jobTitle: 'كاتب استقبال/عام'
  },
  {
    fullNameAr: 'فاطمه احمد محمد بالرشيد',
    fullNameEn: 'FATIMA AHMED MOHAMMED BALRASHED',
    civilId: '283061801226',
    civilIdExpiry: '2026-05-27',
    passportNo: '09574107',
    nationality: 'Yemen',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1983-06-18',
    department: 'الاستقبال',
    jobTitle: 'كاتب استقبال/عام'
  },
  {
    fullNameAr: 'فؤاد نصر عبدالكريم الحجوج',
    fullNameEn: 'FUAD NASER ABDELKARIM AL HJOUJ',
    civilId: '284082903269',
    civilIdExpiry: '2027-05-29',
    passportNo: 'S0440637',
    nationality: 'Jordan',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'MALE',
    dob: '1984-08-29',
    department: 'الإدارة',
    jobTitle: 'مدير مالي'
  },
  {
    fullNameAr: 'ليزل داجويمول دونيسا',
    fullNameEn: 'LIEZL DONESA',
    civilId: '285121004384',
    civilIdExpiry: '2026-08-16',
    passportNo: 'P7894904A',
    nationality: 'Philippines',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1985-12-10',
    department: 'الاستقبال',
    jobTitle: 'كاتب استقبال/عام'
  },
  {
    fullNameAr: 'لين باسم حمدان محمود',
    fullNameEn: 'LEEN BASEM HAMDAN MAHMOUD',
    civilId: '302010101167',
    civilIdExpiry: '2027-01-10',
    passportNo: 'S017336',
    nationality: 'Jordan',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '2002-01-01',
    department: 'الاستقبال',
    jobTitle: 'سكرتير'
  },
  {
    fullNameAr: 'محمد شاجور حسين',
    fullNameEn: 'MOHAMMAD SHAGOR HOSSEN',
    civilId: '296052502462',
    civilIdExpiry: '2025-08-28',
    passportNo: 'EK0166658',
    nationality: 'Bangladesh',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'MALE',
    dob: '1996-05-25',
    department: 'الشؤون الإدارية',
    jobTitle: 'كاتب ادخال بيانات'
  },
  {
    fullNameAr: 'معصومه محمد ضيائي',
    fullNameEn: 'MASOUMEH MOHAMMAD ZYAEI',
    civilId: '296040305023',
    civilIdExpiry: '2027-11-30',
    passportNo: 'B61712020',
    nationality: 'Iran',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1996-04-03',
    department: 'الإدارة',
    jobTitle: 'مدير علاقات عامه'
  },
  {
    fullNameAr: 'منال صبحي الريس',
    fullNameEn: 'MANAL EL RAYESS',
    civilId: '291010115613',
    civilIdExpiry: '2026-09-21',
    passportNo: 'RL4127817',
    nationality: 'Lebanon',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1991-01-01',
    department: 'الاستقبال',
    jobTitle: 'كاتب استقبال/عام'
  },
  {
    fullNameAr: 'نورهان حسن كربوج',
    fullNameEn: 'NOURHAN HASAN KARBOUJ',
    civilId: '289072500354',
    civilIdExpiry: '2027-02-22',
    passportNo: 'N02863781',
    nationality: 'Syria',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1989-07-25',
    department: 'الشؤون الإدارية',
    jobTitle: 'كاتب دوام'
  },
  {
    fullNameAr: 'نيلوكا شانداني هيراث موديانسيلإجي',
    fullNameEn: 'NILUKA CHANDANI HERATH',
    civilId: '280030604437',
    civilIdExpiry: '2026-08-16',
    passportNo: 'N7470706',
    nationality: 'Sri Lanka',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'FEMALE',
    dob: '1980-03-06',
    department: 'الاستقبال',
    jobTitle: 'كاتب استقبال مرضى'
  },
  {
    fullNameAr: 'كريم بخش رحيم بخش ساميراد',
    fullNameEn: 'KARIM BAKHSH RAHIM BAKHSH SAMIRAD',
    civilId: '275101201453',
    civilIdExpiry: '2028-08-19',
    passportNo: 'W97950440',
    nationality: 'Iran',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'MALE',
    dob: '1976-09-23',
    department: 'الشؤون الإدارية',
    jobTitle: 'كاتب اداري / عام'
  },
  {
    fullNameAr: 'احمد حسين ورودي',
    fullNameEn: 'AHMAD HOSSEIN VOROUDI',
    civilId: '291071401218',
    civilIdExpiry: '2027-05-31',
    passportNo: 'T97676198',
    nationality: 'Iran',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'MALE',
    dob: '1991-07-04',
    department: 'الاستقبال',
    jobTitle: 'كاتب استقبال / عام'
  },
  {
    fullNameAr: 'سيد محمد سيد محمد هادي مدرسي',
    fullNameEn: 'SEYED MOHAMMAD S H MODARRESI',
    civilId: '284042701953',
    civilIdExpiry: '2024-05-29',
    passportNo: 'H96871543',
    nationality: 'Iran',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'MALE',
    dob: '1984-09-14',
    department: 'الطاقم الطبي',
    jobTitle: 'طبيب بشري'
  }
];

async function run() {
  let counter = 1;
  for (const emp of employees) {
    const employeeId = 'emp-' + Date.now() + '-' + counter++;
    const employeeData = {
      id: employeeId,
      companyId: companyId,
      employeeCode: 'EMP-' + Math.floor(Math.random() * 10000),
      ...emp,
      passportExpiry: '2029-01-01', // Placeholder
      joinDate: '2024-01-01',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'employees', employeeId), employeeData);
    console.log(`Added: ${emp.fullNameAr} (${emp.civilId})`);
  }
  process.exit(0);
}
run();
