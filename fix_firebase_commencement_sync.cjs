const fs = require('fs');

// 1. Update useFirebaseSync to include commencements sync
let fileSync = 'src/hooks/useFirebaseSync.ts';
let syncContent = fs.readFileSync(fileSync, 'utf8');

if (!syncContent.includes('EmploymentCommencement')) {
  syncContent = syncContent.replace(
    /import { Employee, Contract, LeaveRequest, AttendanceRecord, Payslip, DocumentItem, CustodyItem, LoanAdvance, DisciplinaryWarning, EmployeeNote, EmployeeNotification, Company } from '\.\.\/types';/,
    "import { Employee, Contract, LeaveRequest, AttendanceRecord, Payslip, DocumentItem, CustodyItem, LoanAdvance, DisciplinaryWarning, EmployeeNote, EmployeeNotification, Company, EmploymentCommencement } from '../types';"
  );
}

if (!syncContent.includes("COMMENCEMENTS")) {
  syncContent = syncContent.replace(
    /setSubscriptions\(remote\);\n\s*\}\n\s*\}\);\n\s*\}\n\s*\},/g,
    `setSubscriptions(remote);
              }
            });
          }

          // 17. Commencements listener
          if (setCommencements) {
            const commRef = collection(db, "commencements");
            const commQuery = activeCompanyId
              ? query(commRef, where("companyId", "==", activeCompanyId))
              : commRef;

            onSnapshot(commQuery, (snapshot) => {
              const remote = snapshot.docs.map(doc => doc.data() as EmploymentCommencement);
              if (remote.length > 0) {
                setCommencements(remote);
                setPersistentData(MANARA_STORAGE_KEYS.COMMENCEMENTS, remote);
              }
            }, (err) => handleFirestoreError(err, OperationType.LIST, "commencements"));
          }`
  );

  syncContent = syncContent.replace(
    /export function useFirebaseSync\(\n\s*isAuthenticated: boolean,\n\s*activeCompanyId: string,\n\s*currentUserRole: string,/g,
    `export function useFirebaseSync(
  isAuthenticated: boolean,
  activeCompanyId: string,
  currentUserRole: string,`
  );

  // Add setCommencements param
  syncContent = syncContent.replace(
    /setSubscriptions\?: \(subscriptions: CompanySubscription\[\]\) => void\n\): void \{/g,
    `setSubscriptions?: (subscriptions: CompanySubscription[]) => void,
  setCommencements?: (commencements: EmploymentCommencement[]) => void
): void {`
  );
  
  fs.writeFileSync(fileSync, syncContent);
  console.log('useFirebaseSync updated for commencements');
}

// 2. Pass setCommencements in App.tsx
let fileApp = 'src/App.tsx';
let appContent = fs.readFileSync(fileApp, 'utf8');

if (!appContent.includes('setSubscriptions,\n    setCommencements')) {
  appContent = appContent.replace(
    /setSubscriptions\n\s*\);/g,
    `setSubscriptions,\n    setCommencements\n  );`
  );
  fs.writeFileSync(fileApp, appContent);
  console.log('App.tsx updated to pass setCommencements to useFirebaseSync');
}

// 3. Make sure handleSaveCommencement saves to Firestore as well
if (!appContent.includes('doc(db, "commencements"')) {
  appContent = fs.readFileSync(fileApp, 'utf8');
  appContent = appContent.replace(
    /setPersistentData\(MANARA_STORAGE_KEYS\.COMMENCEMENTS, updated\);\n\s*return updated;\n\s*\}\);/g,
    `setPersistentData(MANARA_STORAGE_KEYS.COMMENCEMENTS, updated);
      return updated;
    });
    try {
      import('firebase/firestore').then(({ setDoc, doc }) => {
        import('./lib/firebase').then(({ db, cleanFirestoreData }) => {
          setDoc(doc(db, "commencements", c.id), cleanFirestoreData(c));
        });
      });
    } catch(e) {
      console.error("Firestore save commencement error:", e);
    }`
  );
  fs.writeFileSync(fileApp, appContent);
  console.log('App.tsx updated for Firestore save commencement');
}

