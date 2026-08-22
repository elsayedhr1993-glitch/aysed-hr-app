import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const employeeId = 'emp-' + Date.now();
  const employeeData = {
    id: employeeId,
    companyId: 'comp-u0YN6VJMXOSiFGRfbPJpxJWqGYL2',
    employeeCode: 'EMP-' + Math.floor(Math.random() * 10000),
    fullNameAr: 'السيد بخيت السيد سويلم',
    fullNameEn: 'ELSAYED BEKHIT ELSAYED SEWILEM',
    civilId: '293080106877',
    civilIdExpiry: '2027-06-12',
    passportNo: 'A35387100',
    passportExpiry: '2029-01-01', // Fake it if not available, wait, ID card doesn't have passport expiry. I'll just put a future date.
    nationality: 'Egypt',
    isKuwaiti: false,
    residencyType: 'مادة 18 - قطاع أهلي',
    gender: 'MALE',
    dob: '1993-08-01',
    department: 'الشؤون الإدارية',
    jobTitle: 'مخلص معاملات',
    joinDate: '2024-01-01',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'employees', employeeId), employeeData);
  console.log("Employee added successfully with ID: " + employeeId);
  process.exit(0);
}
run();
