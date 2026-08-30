import { GoogleGenAI, Type } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
(async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: "iVBORw0KGgoAAAAN\nSUhEUgAAAAEAAAABCAQAAAC1HAw\nCAAAAC0lEQVR42mNkYAAAAAYAAjCB\n0C8AAAAASUVORK5CYII=",
              mimeType: "image/png"
            }
          },
          { text: "Extract text." }
        ]
      }
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.log("Error:", err.message);
    if (err.statusDetails) console.log("Details:", err.statusDetails);
  }
})();
