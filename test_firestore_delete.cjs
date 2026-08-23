const fs = require('fs');
let file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/const handleDeleteCommencement = \(id: string\) => \{[\s\S]*?toast\.success\('تم حذف مباشرة العمل'\);\n  \};/m, `const handleDeleteCommencement = async (id: string) => {
    setCommencements(prev => {
      const updated = prev.filter(x => x.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.COMMENCEMENTS, updated);
      return updated;
    });
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      const { db } = await import('./lib/firebase');
      await deleteDoc(doc(db, "commencements", id));
    } catch (e) {
      console.error("Firestore delete commencement error:", e);
    }
    toast.success('تم حذف مباشرة العمل بنجاح');
  };`);

fs.writeFileSync(file, c);
console.log('App.tsx updated for Firestore deletion');
