const fs = require('fs');
const files = fs.readdirSync('src/apps/').filter(f => f.endsWith('.tsx'));
files.forEach(f => {
  let content = fs.readFileSync('src/apps/' + f, 'utf8');
  content = content.replace(/bg-\[\#f8fafc\]/g, 'bg-transparent');
  content = content.replace(/bg-slate-50 min-h/g, 'bg-transparent min-h');
  fs.writeFileSync('src/apps/' + f, content);
});
