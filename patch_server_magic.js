import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const regexToReplace = /let resolvedMimeType = mimeType \|\| "image\/jpeg";\s*if \(resolvedMimeType.includes\('bdf'\) \|\| resolvedMimeType === '' \|\| !resolvedMimeType\) \{\s*resolvedMimeType = 'application\/pdf';\s*\}/g;

const newMimeLogic = `
  let rawBase64 = imageBase64.replace(/^data:.*?;base64,/, "").replace(/\\s/g, "");
  let resolvedMimeType = "image/jpeg";
  
  if (rawBase64.startsWith("JVBERi")) {
    resolvedMimeType = "application/pdf";
  } else if (rawBase64.startsWith("/9j/")) {
    resolvedMimeType = "image/jpeg";
  } else if (rawBase64.startsWith("iVBORw")) {
    resolvedMimeType = "image/png";
  } else if (rawBase64.startsWith("UklGR")) {
    resolvedMimeType = "image/webp";
  } else {
    // Fallback to what the client sent if we don't recognize the magic number
    resolvedMimeType = mimeType || "image/jpeg";
    if (resolvedMimeType.includes('bdf') || resolvedMimeType === '' || !resolvedMimeType) {
      resolvedMimeType = 'application/pdf';
    }
  }
`;

content = content.replace(regexToReplace, newMimeLogic);

// Then update inlineData extraction to use rawBase64
const oldInlineData = `              inlineData: {
                data: imageBase64.replace(/^data:.*?;base64,/, "").replace(/\\s/g, ""),
                mimeType: resolvedMimeType,
              },`;
const newInlineData = `              inlineData: {
                data: rawBase64,
                mimeType: resolvedMimeType,
              },`;
content = content.replace(oldInlineData, newInlineData);
// There are two places for this in server.ts
content = content.replace(oldInlineData, newInlineData);

fs.writeFileSync('server.ts', content);
