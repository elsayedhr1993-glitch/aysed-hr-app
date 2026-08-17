const fs = require('fs');

function patchFile(file, regex, replace) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(regex, replace);
  fs.writeFileSync(file, content);
}

// 1. CompaniesSubscriptionApp.tsx - force-password
let forcePassRegex = /const data = await res\.json\(\);\s*if \(data\.success\) \{/g;
let forcePassReplace = `const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error(text.includes('502') ? 'الخادم قيد التحديث، يرجى المحاولة بعد قليل.' : 'استجابة غير صالحة من الخادم'); }
      if (data.success) {`;

patchFile('src/apps/CompaniesSubscriptionApp.tsx', forcePassRegex, forcePassReplace);

// 2. CompaniesSubscriptionApp.tsx - send-email
let sendEmailRegex = /const data = await res\.json\(\);\s*if \(data\.success\) emailSent = true;/g;
let sendEmailReplace = `const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch(e) { throw new Error('Invalid response'); }
        if (data.success) emailSent = true;`;

patchFile('src/apps/CompaniesSubscriptionApp.tsx', sendEmailRegex, sendEmailReplace);

// 3. OdooLogin.tsx - send-email
let loginEmailRegex = /const data = await res\.json\(\);\s*if \(\!data\.success\) \{/g;
let loginEmailReplace = `const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch(e) { throw new Error(text.includes('502') ? 'الخادم قيد التحديث، يرجى المحاولة بعد قليل.' : 'استجابة غير صالحة من الخادم'); }
        if (!data.success) {`;

patchFile('src/components/OdooLogin.tsx', loginEmailRegex, loginEmailReplace);

console.log('patched fetches');
