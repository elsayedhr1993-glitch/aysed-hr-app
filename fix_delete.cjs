const fs = require('fs');
let file = 'src/App.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/const handleSaveCommencement = \(c: EmploymentCommencement\) => \{/g, `const handleDeleteCommencement = (id: string) => {
    setCommencements(prev => {
      const updated = prev.filter(x => x.id !== id);
      setPersistentData(MANARA_STORAGE_KEYS.COMMENCEMENTS, updated);
      return updated;
    });
    toast.success('تم حذف مباشرة العمل');
  };

  const handleSaveCommencement = (c: EmploymentCommencement) => {`);

c = c.replace(/handleSaveCommencement=\{handleSaveCommencement\}/g, `handleSaveCommencement={handleSaveCommencement}
              handleDeleteCommencement={handleDeleteCommencement}`);

fs.writeFileSync(file, c);
console.log('App.tsx updated');
