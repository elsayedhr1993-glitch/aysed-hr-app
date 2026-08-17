const fs = require('fs');

function patchFile(file, regex, replace) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(regex, replace);
  fs.writeFileSync(file, content);
}

// 1. AysedAICopilot.tsx
patchFile(
  'src/components/AysedAICopilot.tsx',
  /const data = await response\.json\(\);/,
  `const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error(text.includes('502') ? 'الخادم قيد التحديث، يرجى المحاولة بعد قليل.' : 'استجابة غير صالحة من الخادم'); }`
);

// 2. AICopilotApp.tsx
patchFile(
  'src/apps/AICopilotApp.tsx',
  /const data = await res\.json\(\);/,
  `const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error(text.includes('502') ? 'الخادم قيد التحديث، يرجى المحاولة بعد قليل.' : 'استجابة غير صالحة من الخادم'); }`
);

// 3. ocrService.ts
patchFile(
  'src/utils/ocrService.ts',
  /const result = await response\.json\(\);/,
  `const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch(e) { throw new Error('استجابة غير صالحة من الخادم (تحديث النظام).'); }`
);

// 4. SystemSettingsPage.tsx
patchFile(
  'src/components/SystemSettingsPage.tsx',
  /const data = await response\.json\(\);/,
  `const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { throw new Error('الخادم قيد التحديث، يرجى المحاولة بعد قليل.'); }`
);

console.log('patched all fetches');
