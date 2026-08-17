const fs = require('fs');
let code = fs.readFileSync('src/components/OdooLogin.tsx', 'utf8');
code = code.replace(/onLoginSuccess/g, 'onLogin');
code = code.replace(/onLogin\(userCredential\.user\.uid, email\);/g, 'onLogin(email);');
code = code.replace(/onLogin\('demo-uid-1234', email\);/g, 'onLogin(email);');
code = code.replace(/onLogin: \(uid: string, email: string\) => void;/g, 'onLogin: (email: string) => void;');
fs.writeFileSync('src/components/OdooLogin.tsx', code);
