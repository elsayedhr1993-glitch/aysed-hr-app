import { GoogleGenAI, Type } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
(async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-4.0-fake",
      contents: "Hello"
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.log("Error:", err.message);
  }
})();
