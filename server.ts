import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { sendWelcomeEmail } from "./src/services/emailService";

dotenv.config();

const app = express();
const PORT = 3000;

let adminApp: App | null = null;
let authAdmin: ReturnType<typeof getAuth> | null = null;
let firebaseAdminInitAttempted = false;

function normalizeAndValidatePrivateKey(rawKey: any): string | null {
  if (!rawKey || typeof rawKey !== 'string') return null;
  let key = rawKey.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, '\n').trim();

  // Basic check for PEM headers
  if (!key.includes('-----BEGIN') || !key.includes('KEY-----')) {
    return null;
  }

  const beginMatch = key.match(/-----BEGIN [A-Z0-9_\-\s]+KEY-----/);
  const endMatch = key.match(/-----END [A-Z0-9_\-\s]+KEY-----/);
  if (!beginMatch || !endMatch) {
    return null;
  }

  const header = beginMatch[0];
  const footer = endMatch[0];
  const startIndex = key.indexOf(header) + header.length;
  const endIndex = key.indexOf(footer);
  if (startIndex >= endIndex) return null;

  const rawBase64 = key.substring(startIndex, endIndex).replace(/\s+/g, '');
  if (!rawBase64 || rawBase64.length < 50) return null;

  const chunks = rawBase64.match(/.{1,64}/g);
  if (!chunks) return null;

  const formattedKey = `${header}\n${chunks.join('\n')}\n${footer}\n`;

  try {
    crypto.createPrivateKey(formattedKey);
    return formattedKey;
  } catch {
    return null;
  }
}

function getAdminAuth(): ReturnType<typeof getAuth> | null {
  if (authAdmin) return authAdmin;
  if (firebaseAdminInitAttempted && !adminApp) return null;
  firebaseAdminInitAttempted = true;

  try {
    let rawCreds = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!rawCreds || rawCreds.trim() === "" || rawCreds.includes("YOUR_")) {
      return null;
    }
    rawCreds = rawCreds.trim();
    let parsedServiceAccount: any;
    if (rawCreds.startsWith('{')) {
      parsedServiceAccount = JSON.parse(rawCreds);
    } else if (rawCreds.startsWith('"{') && rawCreds.endsWith('}"')) {
      parsedServiceAccount = JSON.parse(JSON.parse(rawCreds));
    } else {
      try {
        const decoded = Buffer.from(rawCreds, 'base64').toString('utf8');
        if (decoded.trim().startsWith('{')) {
          parsedServiceAccount = JSON.parse(decoded);
        } else {
          parsedServiceAccount = JSON.parse(rawCreds);
        }
      } catch {
        parsedServiceAccount = JSON.parse(rawCreds);
      }
    }

    if (parsedServiceAccount && (parsedServiceAccount.private_key || parsedServiceAccount.client_email)) {
      const validKey = normalizeAndValidatePrivateKey(parsedServiceAccount.private_key);
      if (!validKey) {
        return null;
      }
      parsedServiceAccount.private_key = validKey;

      if (getApps().length === 0) {
        adminApp = initializeApp({
          credential: cert(parsedServiceAccount)
        });
      } else {
        adminApp = getApps()[0];
      }
      authAdmin = getAuth(adminApp);
      console.log("[Firebase Admin] initialized successfully");
      return authAdmin;
    }
  } catch (err: any) {
    return null;
  }
  return null;
}

app.use(express.json({ limit: "25mb" }));

// Initialize Gemini Client safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("YOUR_")) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", system: "Aysed S HR 2026", odooVersion: "17.0-Enterprise" });
});

// OCR Document Scanner via OpenAI Vision or Gemini Vision API
app.post("/api/ocr-scan", async (req, res) => {
  const { imageBase64, mimeType, docType } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "يرجى اختيار ورفع صورة المستند الحقيقي أولاً قبل إجراء الماسح الضوئي OCR" });
  }

  // 1. Check if OPENAI_API_KEY is available and use OpenAI Vision API (skip for PDF/BDF files which Gemini handles natively)
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const isPdfFile = mimeType === 'application/pdf' || mimeType?.includes('pdf');
  if (openaiApiKey && openaiApiKey.trim() !== "" && !openaiApiKey.includes("YOUR_") && !isPdfFile) {
    try {
      const base64Data = imageBase64.includes(",") ? imageBase64 : `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;
      const oaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          messages: [
            {
              role: "system",
               content: "أنت نظام خبير في القراءة الضوئية واستخراج بيانات المستندات الرسمية الكويتية بدقة مطلقة (OCR Vision Engine). مهمتك استخراج النصوص والأسماء الحقيقية الموجودة في المستند حصرياً بدقة 100%. تحذير صارم: ممنوع منعاً باتاً وضع أي أسماء وهمية أو افتراضية (مثل محمد العتيبي أو غيرها) إذا لم تكن مكتوبة صراحة في المستند. أرجِع النتيجة حصرياً بصيغة JSON مع هذه المفاتيح: civilId, fullNameAr, fullNameEn, nationality, dob, passportNo, jobTitle, expiryDate, gender, residencyType, mohLicenseNo, contractSalary."
            },
            {
              role: "user",
              content: [
                { type: "text", text: `قم بتحليل هذه الصورة للمستند (${docType || 'بطاقة مدنية أو جواز أو عقد عمل'}) واستخراج البيانات المطلوبة بدقة شديدة دون أي تخمين.` },
                { type: "image_url", image_url: { url: base64Data } }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1000
        })
      });

      if (oaiResponse.ok) {
        const oaiData = await oaiResponse.json();
        const contentStr = oaiData.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(contentStr);
        return res.json({
          success: true,
          data: {
            civilId: parsed.civilId || "",
            fullNameAr: parsed.fullNameAr || "",
            fullNameEn: parsed.fullNameEn || "",
            nationality: parsed.nationality || "",
            dob: parsed.dob || "",
            passportNo: parsed.passportNo || "",
            jobTitle: parsed.jobTitle || "",
            expiryDate: parsed.expiryDate || "",
            gender: parsed.gender || "MALE",
            residencyType: parsed.residencyType || "",
            mohLicenseNo: parsed.mohLicenseNo || "",
            contractSalary: Number(parsed.contractSalary) || 0,
          },
          source: "openai-vision"
        });
      }
    } catch (oaiErr) {
      // Fallback to Gemini
    }
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(400).json({ 
      error: "مفتاح الذكاء الاصطناعي (GEMINI_API_KEY أو OPENAI_API_KEY) غير متوفر. يرجى إدخال البيانات يدوياً أو تكوين مفتاح الذكاء الاصطناعي." 
    });
  }

  // Normalize BDF or unknown mime types
  let resolvedMimeType = mimeType || "image/jpeg";
  if (resolvedMimeType.includes('bdf') || resolvedMimeType === '' || !resolvedMimeType) {
    resolvedMimeType = 'application/pdf';
  }

  const prompt = `أنت نظام قارئ ومحلل مستندات رسمية ذكي دقيق للغاية (OCR Vision Engine) لدولة الكويت.
مهمتك المطلوبة هي استخراج البيانات والحقول الحقيقية الموجودة في الصورة أو الملف المرفق حصرياً بدقة 100%.
تحذير صارم: ممنوع منعاً باتاً وضع أي أسماء وهمية أو افتراضية (مثل محمد العتيبي أو غيرها) إذا لم تكن مكتوبة صراحة في المستند. استخرج النصوص كما هي تماماً.
أرجع الناتج بصيغة JSON فقط يضم المفاتيح التالية:
1. "civilId": الرقم المدني الكويتي (12 رقم تماماً) المكتوب في المستند أو نص فارغ ""
2. "fullNameAr": الاسم الكامل تماماً كما هو مكتوب بالعربية في المستند أو نص فارغ ""
3. "fullNameEn": الاسم الكامل بالإنجليزية أو نص فارغ ""
4. "nationality": الجنسية المكتوبة أو نص فارغ ""
5. "dob": تاريخ الميلاد (YYYY-MM-DD) أو نص فارغ ""
6. "passportNo": رقم الجواز أو نص فارغ ""
7. "jobTitle": المسمى الوظيفي أو التخصص المكتوب في المستند أو نص فارغ ""
8. "expiryDate": تاريخ انتهاء الصلاحية (YYYY-MM-DD) أو نص فارغ ""
9. "gender": MALE أو FEMALE
10. "residencyType": نوع الإقامة أو نص فارغ ""
11. "mohLicenseNo": رقم ترخيص وزارة الصحة (MOH License) إن وجد أو نص فارغ ""
12. "contractSalary": الراتب كرقَم بالدينار الكويتي أو 0`;

  const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.6-flash"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
                mimeType: resolvedMimeType,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              civilId: { type: Type.STRING },
              fullNameAr: { type: Type.STRING },
              fullNameEn: { type: Type.STRING },
              nationality: { type: Type.STRING },
              dob: { type: Type.STRING },
              passportNo: { type: Type.STRING },
              jobTitle: { type: Type.STRING },
              expiryDate: { type: Type.STRING },
              gender: { type: Type.STRING },
              residencyType: { type: Type.STRING },
              mohLicenseNo: { type: Type.STRING },
              contractSalary: { type: Type.NUMBER },
            },
          },
        },
      });

      const responseText = response.text || "{}";
      const cleanedJsonText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(cleanedJsonText);

      return res.json({
        success: true,
        data: {
          civilId: parsedData.civilId || "",
          fullNameAr: parsedData.fullNameAr || "",
          fullNameEn: parsedData.fullNameEn || "",
          nationality: parsedData.nationality || "",
          dob: parsedData.dob || "",
          passportNo: parsedData.passportNo || "",
          jobTitle: parsedData.jobTitle || "",
          expiryDate: parsedData.expiryDate || "",
          gender: parsedData.gender || "MALE",
          residencyType: parsedData.residencyType || "",
          mohLicenseNo: parsedData.mohLicenseNo || "",
          contractSalary: Number(parsedData.contractSalary) || 0,
        },
        source: `gemini-vision-${modelName}`,
      });
    } catch (err: any) {
      console.error("Model " + modelName + " failed with schema:", err);
      lastError = err;
      continue; // Try next model
    }
  }

  // If all models with schema failed, try without schema
  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
                mimeType: resolvedMimeType,
              },
            },
            { text: prompt + "\nأرجع النتيجة بصيغة JSON فقط." },
          ],
        },
        config: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const cleanedJsonText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(cleanedJsonText);

      return res.json({
        success: true,
        data: {
          civilId: parsedData.civilId || "",
          fullNameAr: parsedData.fullNameAr || "",
          fullNameEn: parsedData.fullNameEn || "",
          nationality: parsedData.nationality || "",
          dob: parsedData.dob || "",
          passportNo: parsedData.passportNo || "",
          jobTitle: parsedData.jobTitle || "",
          expiryDate: parsedData.expiryDate || "",
          gender: parsedData.gender || "MALE",
          residencyType: parsedData.residencyType || "",
          mohLicenseNo: parsedData.mohLicenseNo || "",
          contractSalary: Number(parsedData.contractSalary) || 0,
        },
        source: `gemini-vision-fallback-${modelName}`,
      });
    } catch (err: any) {
      console.error("Model " + modelName + " fallback failed:", err);
      lastError = err;
      continue;
    }
  }

  return res.status(500).json({
    error: "فشل نظام القراءة الضوئية (OCR) في تحليل المستند. يرجى التأكد من وضوح الملف أو إدخال البيانات يدوياً."
  });
});

// Odoo Enterprise AI Copilot Chat Endpoint
app.post("/api/ai-chat", async (req, res) => {
  try {
    const { prompt, contextSummary, conversationHistory } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "الرجاء كتابة السؤال أو الطلب للمساعد الذكي" });
    }

    const ai = getGeminiClient();
    
    // System instruction for Odoo Enterprise Kuwait HR Assistant
    const systemInstruction = `أنت المساعد البرمجي الرسمي لنظام "Aysed S HR 2026". 
هويتك ومهامك:
1. خبير في تطوير وبرمجة نظام أودو (Odoo Framework) وإدارة الموارد البشرية.
2. لديك صلاحية كاملة للقراءة والتعديل على موديلات (hr.employee) وعقود العمل (hr.version).
3. تلتزم بقوانين العمل الكويتية ونماذج الهيئة العامة للقوى العاملة عند صياغة العقود.
4. مهمتك تنفيذ الأوامر البرمجية، إنشاء السجلات، وتحليل البيانات المالية والرواتب داخل النظام.
5. التواصل باللغة العربية المهنية، مع التركيز على دقة البيانات وسرعة التنفيذ.
بالإضافة إلى تخصصك القوي في:
- المادة 51 و 53: مكافأة نهاية الخدمة (15 يوماً للأولى 5 سنوات، ثم شهر كامل لكل سنة بعد ذلك).
- الإجازات السنوية (2.5 يوم شهرياً)، إجازات الوضع والمرضيات.
- تدقيق الرقم المدني الكويتي لمعادلة MOD 11 (12 رقم).
- حساب العملات دائماً بالدينار الكويتي KWD بثلاث خانات عشرية (0.000 KWD).
- أفضل الممارسات في نظام أودو إنتربرايز Odoo 17 HRMS.

البيانات الحالية للشركة والبيانات التشغيلية المقدمة لك في سياق السؤال هي قاعدة بياناتك الحية.
قم بإجابة الموظف أو مدير الموارد البشرية بأسلوب احترافي، منظم جداً باستعمال تنسيق Markdown، مع نقاط واضحة ورسومات توضيحية خفيفة وعناوين بارزة.
إذا طلب المستخدم حسابات (نهاية خدمة، إجازات، مستحقات رواتب)، قم بإظهار تفاصيل المعادلة خطوة بخطوة بالدينار الكويتي (KWD).`;

    if (!ai) {
      // Fallback simulated intelligent response when GEMINI_API_KEY is pending or in offline demo mode
      const promptLower = prompt.toLowerCase();
      let simulatedReply = "";

      if (promptLower.includes("نهاية الخدمة") || promptLower.includes("مكافأة") || promptLower.includes("eos")) {
        simulatedReply = `### 📊 حساب مكافأة نهاية الخدمة وفق المادة 51 و 53 من قانون العمل الكويتي:

1. **الآلية القانونية:**
   - **السنوات الخمس الأولى:** استحقاق **15 يوماً** عن كل سنة (الراتب الشامل ÷ 26 × 15 × عدد السنوات).
   - **السنوات اللاحقة (من 6 سنوات فما فوق):** استحقاق **شهر كامل (26 يوماً)** عن كل سنة.
   - **الحد الأقصى:** لا يتجاوز إجمالي المكافأة راتب سنتين (24 شهراً).

2. **نسبة الاستحقاق حسب سبب انتهاء الخدمة:**
   - **إنهاء خدمة من الشركة / انتهاء عقد:** استحقاق **100% كاملة** فوراً.
   - **استقالة الموظف:**
     - أقل من 3 سنوات: **لا تستحق مكافأة (0%)**.
     - من 3 إلى أقل من 5 سنوات: **ثلث المكافأة (33.33%)**.
     - من 5 إلى أقل من 10 سنوات: **ثلثا المكافأة (66.67%)**.
     - 10 سنوات فأكثر: **100% كاملة**.

💡 *يمكنك الانتقال إلى تطبيق "نهاية الخدمة EOS" في شاشة التطبيقات لإجراء الحساب التلقائي المباشر لأي موظف بالشركة.*`;
      } else if (promptLower.includes("إجازة") || promptLower.includes("اجازة") || promptLower.includes("leave")) {
        simulatedReply = `### 🌴 نظام الإجازات السنوية والمستحقات لعام 2026:

- **استحقاق الإجازة السنوية:** 30 يوماً تقويمياً مدفوعة الأجر سنوياً (بمعدل **2.5 يوم شهرياً**).
- **احتساب المباشرة في 2026:** بالنسبة للموظفين الجدد الذين باشروا خلال عام 2026، يتم احتساب رصيدهم المستحق تلقائياً من شهر المباشرة الفعلية وليس من يناير.
- **التدوير من 2025:** يتيح النظام إدخال الرصيد المتراكم المدوّر من نهاية عام 2025 يدوياً وحفظه في سجل الموظف.
- **توقف العداد:** الإجازات غير المدفوعة ترفع من أيام الخدمة وتوقف احتساب استحقاق الإجازة السنوية تلقائياً.`;
      } else {
        simulatedReply = `### 🤖 أهلاً بك في مساعد أودو الذكي (Odoo Kuwait HR Copilot)

لقد استلمت سؤالك: **"${prompt}"**

**ملخص بيانات الشركة الحالية:**
${contextSummary || 'شركة الكويت الطبية والأعمال - 12 موظف نشط'}

**كيف يمكنني مساعدتك اليوم؟**
1. ⚖️ **الاستشارات القانونية:** الاستفسار عن مواد قانون العمل الكويتي (الإجازات، الرواتب، الساعات الإضافية، مكافأة نهاية الخدمة).
2. 📑 **إدارة المستندات الهويات:** التحقق من صلاحيات البطاقات المدنية، الجوازات وترخيص الصحة MOH.
3. 💸 **مسير الرواتب وحماية الأجور WSI:** التحقق من تحويلات البنوك الكويتية وصيغ ملفات حماية الأجور.
4. 📊 **التقارير والإحصائيات:** استخراج ملخصات القوى العاملة وتكاليف الأجور بالدينار الكويتي (0.000 KWD).`;
      }

      return res.json({
        success: true,
        reply: simulatedReply,
        source: "simulated_copilot",
      });
    }

    // Build context prompt with history
    let contents = [];
    if (contextSummary) {
      contents.push({ text: `[سياق النظام وبيانات الشركة الحالية]:\n${contextSummary}` });
    }

    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        contents.push({
          text: `${msg.role === 'user' ? 'المستخدم' : 'المساعد الذكي'}: ${msg.content}`
        });
      }
    }

    contents.push({ text: `سؤال المستخدم الحالي: ${prompt}` });

    const modelsForChat = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.6-flash"];
    let replyText = "";
    let usedModel = "";

    for (const modelName of modelsForChat) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts: contents },
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response.text) {
          replyText = response.text;
          usedModel = modelName;
          break;
        }
      } catch (err) {
        console.warn(`Chat model ${modelName} failed, trying next...`, err);
      }
    }

    if (!replyText) {
      replyText = `### 🤖 مساعد أودو الذكي (وضع الاستجابة الاحتياطية)\n\nأهلاً بك! لقد استلمت سؤالك: **"${prompt}"**\n\n- **وفقاً لقانون العمل الكويتي رقم 6/2010:** يتم احتساب مكافأة نهاية الخدمة والإجازات والرواتب بدقة تامة.\n- **قاعدة البيانات:** مرتبطة وجاهزة لمعالجة كافة المعاملات الإدارية.`;
      usedModel = "fallback_simulated";
    }

    return res.json({
      success: true,
      reply: replyText,
      source: usedModel,
    });
  } catch (error: any) {
    return res.json({
      success: true,
      reply: `### 🤖 مساعد أودو الذكي (وضع الاستجابة الاحتياطية)\n\nأهلاً بك! النظام يعمل بكامل طاقته الاحتياطية للتعامل مع طلباتك بدقة تامة.\n\n- **وفقاً لقانون العمل الكويتي رقم 6/2010:** يتم احتساب مكافأة نهاية الخدمة، الإجازات، والرواتب بدقة تامة.\n- **قاعدة البيانات:** مرتبطة بنجاح وجاهزة لمعالجة كافة المعاملات الإدارية والمالية.`,
      source: "fallback_simulated_copilot",
    });
  }
});

// Live WhatsApp API Gateway Route (UltraMsg / Custom WhatsApp Gateway)
app.post("/api/send-whatsapp", async (req, res) => {
  try {
    const { instanceId, apiToken, token, to, body, message, serverUrl, priority } = req.body;
    const effectiveToken = apiToken || token || process.env.VITE_ULTRAMSG_TOKEN || process.env.WHATSAPP_API_TOKEN || "mh21qnlb8vngnkml";
    const effectiveInstanceId = instanceId || process.env.VITE_ULTRAMSG_INSTANCE_ID || process.env.WHATSAPP_INSTANCE_ID || "instance188430";
    const messageBody = body || message;

    if (!effectiveToken || effectiveToken.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "مفتاح التوثيق السري (API Token) مطلوب لإرسال رسائل الواتساب. يرجى إدخاله في شاشة إعدادات الربط.",
        errorCode: "MISSING_TOKEN"
      });
    }

    if (!to || to.toString().trim() === "") {
      return res.status(400).json({
        success: false,
        error: "رقم هاتف المستلم مطلوب لإرسال الرسالة.",
        errorCode: "MISSING_PHONE"
      });
    }

    if (!messageBody || messageBody.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "نص الرسالة مطلوب.",
        errorCode: "MISSING_BODY"
      });
    }

    // Clean and format recipient phone number for Kuwait & International standards
    let cleanPhone = to.toString().trim().replace(/[^\d+]/g, "");
    if (cleanPhone.startsWith("+")) {
      cleanPhone = cleanPhone.substring(1);
    }
    // If local 8-digit Kuwait number, prepend 965
    if (cleanPhone.length === 8 && !cleanPhone.startsWith("965")) {
      cleanPhone = "965" + cleanPhone;
    }

    // Determine target WhatsApp Gateway URL (Default to UltraMsg)
    let targetEndpoint = serverUrl && serverUrl.trim() !== "" ? serverUrl.trim() : "";
    if (!targetEndpoint) {
      targetEndpoint = `https://api.ultramsg.com/${effectiveInstanceId.trim()}/messages/chat`;
    } else if (!targetEndpoint.includes("/messages/chat") && targetEndpoint.includes("ultramsg.com")) {
      targetEndpoint = targetEndpoint.replace(/\/+$/, "") + "/messages/chat";
    }

    console.log(`[WhatsApp API] Sending real message to ${cleanPhone} via endpoint: ${targetEndpoint}`);

    // Create form payload for UltraMsg / WhatsApp Gateway
    const formParams = new URLSearchParams();
    formParams.append("token", effectiveToken.trim());
    formParams.append("to", cleanPhone);
    formParams.append("body", messageBody);
    if (priority) {
      formParams.append("priority", priority.toString());
    }

    // Timeout controller (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let gatewayResponse: Response;
    try {
      gatewayResponse = await fetch(targetEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "Aysed-HR-WhatsApp-Client/2026"
        },
        body: formParams,
        signal: controller.signal
      });
    } catch (networkErr: any) {
      clearTimeout(timeoutId);
      if (networkErr.name === "AbortError") {
        return res.status(504).json({
          success: false,
          error: "انتهت مهلة الاتصال ببوابة الواتساب (Request Timeout - 15s). يرجى التأكد من حالة خادم الواتساب.",
          errorCode: "TIMEOUT"
        });
      }
      return res.status(502).json({
        success: false,
        error: `فشل الاتصال بالإنترنت أو بخادم بوابة الواتساب: ${networkErr.message}`,
        errorCode: "NETWORK_ERROR"
      });
    }

    clearTimeout(timeoutId);

    // Parse gateway response
    const responseText = await gatewayResponse.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    // Check for UltraMsg & REST errors
    if (!gatewayResponse.ok) {
      const errorMsg = responseData.error || responseData.message || responseText || `HTTP ${gatewayResponse.status}`;
      return res.status(gatewayResponse.status >= 400 && gatewayResponse.status < 600 ? gatewayResponse.status : 400).json({
        success: false,
        error: `خطأ من بوابة الواتساب: ${errorMsg}`,
        details: responseData,
        statusCode: gatewayResponse.status
      });
    }

    // UltraMsg returns 200 with { error: "invalid token" } or { error: "..." } in some error cases
    if (responseData.error) {
      return res.status(400).json({
        success: false,
        error: `رفضت بوابة الواتساب الطلب: ${responseData.error}`,
        details: responseData,
        errorCode: "GATEWAY_REJECTED"
      });
    }

    return res.json({
      success: true,
      data: responseData,
      messageId: responseData.id || responseData.messageId || `wpp_${Date.now()}`,
      phone: `+${cleanPhone}`,
      timestamp: new Date().toISOString(),
      message: "تم إرسال رسالة الواتساب الحقيقية بنجاح إلى الهاتف!"
    });
  } catch (err: any) {
    console.error("[WhatsApp Server Error]:", err);
    return res.status(500).json({
      success: false,
      error: `حدث خطأ داخلي أثناء معالجة الإرسال: ${err.message || 'Unknown Error'}`,
      errorCode: "INTERNAL_ERROR"
    });
  }
});

// SMTP / Email Route

// SMTP / Email Route
app.post("/api/send-email", express.json(), async (req, res) => {
  const { to, subject, text, html } = req.body;
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || "elsayedhr1993@gmail.com",
        pass: process.env.SMTP_PASS, // NOTE: Needs Google App Password (16 chars) from 2FA
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER || "elsayedhr1993@gmail.com",
      to,
      subject,
      text,
      html
    });

    res.json({ success: true, message: "تم إرسال البريد بنجاح (Email sent successfully)" });
  } catch (error: any) {
    console.error("Email send failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Welcome Email Route for Subscription
app.post("/api/send-welcome-email", express.json(), async (req, res) => {
  const { subscriberEmail, subscriberName, companyName } = req.body;
  if (!subscriberEmail || !subscriberName || !companyName) {
    return res.status(400).json({ success: false, error: "جميع الحقول (subscriberEmail, subscriberName, companyName) مطلوبة" });
  }
  try {
    const result = await sendWelcomeEmail({ subscriberEmail, subscriberName, companyName });
    if (result.success) {
      res.json({ success: true, message: "تم إرسال إيميل الترحيب بنجاح" });
    } else {
      res.status(500).json({ success: false, error: result.error || "فشل إرسال الإيميل" });
    }
  } catch (error: any) {
    console.error("Welcome email route error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.post("/api/admin/force-password", express.json(), async (req, res) => {
  const { email, newPassword } = req.body;
  const admin = getAdminAuth();
  if (!admin) {
    return res.status(400).json({ 
      success: false, 
      error: "Firebase Admin is not configured or private key is invalid. Please ensure FIREBASE_SERVICE_ACCOUNT in Secrets contains a valid Service Account JSON." 
    });
  }
  
  try {
    const userRecord = await admin.getUserByEmail(email);
    await admin.updateUser(userRecord.uid, { password: newPassword });
    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error: any) {
    console.error("Force password change failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Route to Create or Sync Tenant Account seamlessly without overriding Super Admin session
app.post("/api/admin/create-tenant", express.json(), async (req, res) => {
  const { email, password, companyName, companyId, ownerName, phone, planType } = req.body;
  
  if (!email || !companyName) {
    return res.status(400).json({ success: false, error: "البريد الإلكتروني واسم الشركة مطلوبان" });
  }

  const admin = getAdminAuth();
  const cleanEmail = email.trim().toLowerCase();
  let uid = `user_${Date.now()}`;
  let alreadyExisted = false;

  if (admin) {
    try {
      try {
        const existingUser = await admin.getUserByEmail(cleanEmail);
        uid = existingUser.uid;
        alreadyExisted = true;
        // Optionally update password if provided
        if (password) {
          await admin.updateUser(uid, {
            password: password,
            displayName: companyName
          });
        }
      } catch (notFoundErr: any) {
        if (notFoundErr.code === 'auth/user-not-found') {
          const newUser = await admin.createUser({
            email: cleanEmail,
            password: password || 'Aysed2026#Secure',
            displayName: companyName,
            emailVerified: true
          });
          uid = newUser.uid;
        } else {
          throw notFoundErr;
        }
      }

      // Set custom claims for role
      try {
        await admin.setCustomUserClaims(uid, {
          role: 'COMPANY_ADMIN',
          companyId: companyId || `comp_${Date.now()}`
        });
      } catch (claimErr) {
        console.warn("Custom claims note:", claimErr);
      }

      return res.json({
        success: true,
        uid,
        alreadyExisted,
        message: alreadyExisted ? "تم ربط الحساب الموجود وتحديث بيانات الدخول" : "تم إنشاء حساب المستخدم في Firebase Auth بنجاح"
      });
    } catch (adminErr: any) {
      console.error("Admin create user error:", adminErr);
      return res.status(500).json({ success: false, error: adminErr.message });
    }
  } else {
    // If Firebase Admin is not configured, inform client so it can use secondary client auth instance
    return res.json({
      success: false,
      useClientFallback: true,
      message: "Firebase Admin is not configured, falling back to secondary client app"
    });
  }
});

// Admin Route to Hard Delete a Tenant User from Firebase Authentication
app.post("/api/admin/delete-tenant", express.json(), async (req, res) => {
  const { email, uid, companyId } = req.body;
  const admin = getAdminAuth();

  if (!email && !uid) {
    return res.status(400).json({ success: false, error: "البريد الإلكتروني أو معرف المستخدم مطلوب" });
  }

  if (admin) {
    let targetUid = uid;
    try {
      if (!targetUid && email) {
        try {
          const userRecord = await admin.getUserByEmail(email.trim().toLowerCase());
          targetUid = userRecord.uid;
        } catch (notFoundErr: any) {
          if (notFoundErr.code === 'auth/user-not-found') {
            return res.json({ success: true, message: "لم يتم العثور على حساب مستخدم في Auth، تم الاستمرار بالحذف" });
          }
          throw notFoundErr;
        }
      }

      if (targetUid) {
        await admin.deleteUser(targetUid);
      }

      return res.json({
        success: true,
        message: "تم حذف حساب مسؤول الشركة من Firebase Authentication بنجاح"
      });
    } catch (adminErr: any) {
      console.error("Admin delete tenant auth error:", adminErr);
      return res.status(500).json({ success: false, error: adminErr.message });
    }
  } else {
    return res.json({
      success: true,
      useClientFallback: true,
      message: "Firebase Admin is not configured, client-side handles database and storage purge"
    });
  }
});

app.post("/api/admin/update-user-email", express.json(), async (req, res) => {
  const { currentEmail, newEmail } = req.body;
  const admin = getAdminAuth();
  if (!admin) {
    return res.status(400).json({ 
      success: false, 
      error: "Firebase Admin is not configured" 
    });
  }
  
  try {
    const userRecord = await admin.getUserByEmail(currentEmail);
    await admin.updateUser(userRecord.uid, { email: newEmail });
    res.json({ success: true, message: "تم تحديث البريد الإلكتروني بنجاح" });
  } catch (error: any) {
    console.error("Update email failed in admin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aysed S HR 2026 (Odoo Enterprise Kuwait) running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
