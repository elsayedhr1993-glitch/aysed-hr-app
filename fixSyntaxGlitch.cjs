const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

walk('src').forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = content;

  // Fix Omit<..., ...> 0
  updated = updated.replace(/Omit<([^>]+)>\s+0\s*\)/g, 'Omit<$1>)');
  updated = updated.replace(/Omit<([^>]+)>\s+0\s*,/g, 'Omit<$1>,');
  
  // Fix slice(0, 7) if it became slice(, 7)
  updated = updated.replace(/\.slice\(\s*,\s*(\d+)\s*\)/g, '.slice(0, $1)');

  if (updated !== content) {
    fs.writeFileSync(file, updated, 'utf8');
    console.log('Fixed syntax glitches in:', file);
  }
});
