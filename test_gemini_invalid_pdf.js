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
              data: Buffer.from("This is not a real PDF file!").toString("base64"),
              mimeType: "application/pdf"
            }
          },
          { text: "Extract text." }
        ]
      }
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.log("Error:", err.message);
  }
})();
