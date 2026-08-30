import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

// Replace inlineData extraction
const oldInlineData = `              inlineData: {
                data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
                mimeType: resolvedMimeType,
              },`;
const newInlineData = `              inlineData: {
                data: imageBase64.replace(/^data:.*?;base64,/, "").replace(/\\s/g, ""),
                mimeType: resolvedMimeType,
              },`;

content = content.replace(oldInlineData, newInlineData);
content = content.replace(oldInlineData, newInlineData);

fs.writeFileSync('server.ts', content);
