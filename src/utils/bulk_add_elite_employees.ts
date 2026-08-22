import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const companyId = 'comp-LUXsPsoipqUAqUQZ4WD8HTSq0oM2'; // Elite Clinic

const employees = [
  // TODO: Add employees here
];

async function addEmployees() {
  let successCount = 0;
  for (const emp of employees) {
    try {
      const empId = `emp-${emp.civilId}`;
      const docRef = doc(db, 'companies', companyId, 'employees', empId);
      
      const employeeData = {
        id: empId,
        companyId: companyId,
        isActive: true,
        joinedAt: new Date().toISOString(),
        ...emp
      };
      
      await setDoc(docRef, employeeData, { merge: true });
      console.log(`✅ Added: ${emp.fullNameAr} - ${emp.civilId}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to add ${emp.fullNameAr}:`, error);
    }
  }
  console.log(`\n🎉 Successfully added ${successCount}/${employees.length} employees to Elite Clinic!`);
}

addEmployees();
