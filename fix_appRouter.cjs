const fs = require('fs');
let file = 'src/routes/appRouter.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/handleSaveCommencement: \(c: any\) => void;/g, `handleSaveCommencement: (c: any) => void;
  handleDeleteCommencement?: (id: string) => void;`);

c = c.replace(/handleSaveCommencement,\n    handleUpdateEmployeeStatus/g, `handleSaveCommencement,
    handleDeleteCommencement,
    handleUpdateEmployeeStatus`);

c = c.replace(/onSaveCommencement=\{handleSaveCommencement\}/g, `onSaveCommencement={handleSaveCommencement}
          onDeleteCommencement={handleDeleteCommencement}`);

fs.writeFileSync(file, c);
console.log('appRouter.tsx updated');
