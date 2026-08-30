import { GoogleGenAI, Type } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
(async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: "hello"
    });
    console.log("Success with gemini-3.1-pro-preview");
  } catch (err) {
    console.log("Error with gemini-3.1-pro-preview:", err.message);
  }
})();
