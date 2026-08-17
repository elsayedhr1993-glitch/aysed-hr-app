import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

const clinics = [
  { email: 'almanar@clinic.com', password: 'Password@123', name: 'المنار كلينك' },
  { email: 'alfanar@clinic.com', password: 'Password@123', name: 'الفنار كلينك' },
  { email: 'elite@clinic.com', password: 'Password@123', name: 'إيليت كلينك' }
];

async function seed() {
  for (const clinic of clinics) {
    try {
      const userCred = await createUserWithEmailAndPassword(auth, clinic.email, clinic.password);
      console.log('Created user:', clinic.email, userCred.user.uid);
      
      const compId = `comp-${userCred.user.uid}`;
      const company = {
        id: compId,
        nameAr: clinic.name,
        nameEn: clinic.name,
        commercialRegNo: '12345',
        civilIdCompany: '123456789012',
        isPrimary: true,
        isTrial: true,
        ownerId: userCred.user.uid
      };
      
      await setDoc(doc(db, 'companies', compId), company);
      console.log('Created company:', company.nameAr);
      
      await setDoc(doc(db, 'users', userCred.user.uid), {
        email: clinic.email,
        role: 'CLINIC_ADMIN',
        companyId: compId
      });
      console.log('Created user record');
    } catch (e: any) {
      console.log('Error for', clinic.email, e.message);
    }
  }
  process.exit(0);
}

seed();
