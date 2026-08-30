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
              data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
              mimeType: "image/png"
            }
          },
          { text: "Extract text." }
        ]
      },
      config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              civilId: { type: Type.STRING },
              address: {
                type: Type.OBJECT,
                properties: {
                  block: { type: Type.STRING },
                }
              },
            },
          },
      }
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.log("Error:", err.message);
    if (err.statusDetails) console.log("Details:", err.statusDetails);
  }
})();
