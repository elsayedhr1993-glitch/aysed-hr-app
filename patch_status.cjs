const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Change 403 to 400
content = content.replace(/res\.status\(403\)\.json\(\{ success: false, error: "Firebase Admin is not configured/g, 
  'res.status(400).json({ success: false, error: "Firebase Admin is not configured');

fs.writeFileSync('server.ts', content);
