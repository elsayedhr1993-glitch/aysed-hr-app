sed -i 's/import { auth } from '\''\.\/lib\/firebase'\'';/import { auth, db } from '\''\.\/lib\/firebase'\'';\nimport { doc, setDoc, deleteDoc } from '\''firebase\/firestore'\'';/' src/App.tsx

sed -i '/const handleSaveJobTitle =/c\
  const handleSaveJobTitle = async (title: any) => {\
    setJobTitles(prev => { const idx = prev.findIndex(t => t.id === title.id); if(idx>=0){ const c=[...prev]; c[idx]=title; return c; } return [...prev, title]; });\
    try { await setDoc(doc(db, "job_titles", title.id), title); toast.success("تم حفظ المسمى الوظيفي في قاعدة البيانات"); } catch(e) { console.error(e); toast.error("خطأ في حفظ المسمى الوظيفي"); }\
  };' src/App.tsx

sed -i '/const handleDeleteJobTitle =/c\
  const handleDeleteJobTitle = async (id: string) => {\
    setJobTitles(prev => prev.filter(t => t.id !== id));\
    try { await deleteDoc(doc(db, "job_titles", id)); toast.success("تم حذف المسمى الوظيفي"); } catch(e) { console.error(e); }\
  };' src/App.tsx

sed -i '/const handleDeleteEmployee =/c\
  const handleDeleteEmployee = async (id: string) => {\
    setEmployees(prev => prev.filter(e => e.id !== id));\
    try { await deleteDoc(doc(db, "employees", id)); toast.success("تم حذف الموظف"); } catch(e) { console.error(e); }\
  };' src/App.tsx

sed -i '/const handleSaveEmployee =/c\
  const handleSaveEmployee = async (emp: Employee) => {\
    setEmployees(prev => {\
      const idx = prev.findIndex(e => e.id === emp.id);\
      if(idx>=0){ const c=[...prev]; c[idx]=emp; return c; }\
      return [emp, ...prev];\
    });\
    try { await setDoc(doc(db, "employees", emp.id), emp); toast.success("تم حفظ بيانات الموظف بنجاح"); } catch(e) { console.error(e); toast.error("خطأ في حفظ الموظف"); }\
  };' src/App.tsx
