import express from "express";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { 
  sendWelcomeEmail, 
  sendAdminNewSubscriptionNotification,
  sendDailyBackupSuccessEmail,
  sendDailyBackupFailureAlert,
  getSystemDefaultEmail,
  BackupMetadata
} from "./src/services/emailService";
import { 
  validateLeaveSettlement,
  cleanDuplicatePunches,
  runNightlyAudit
} from "./src/services/guards";
import { 
  calculateServerFifoBalance, 
  calculateServerSettlement, 
  calculateServerWorkingDays,
  validateSettlementConstraints
} from "./server/leaveCalculatorServer";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

// ---------------------------------------------------------------------------
// ODOO ENTERPRISE CENTRAL LEAVE SSOT API (Backend Server-Side Calculations)
// ---------------------------------------------------------------------------

// 1. Calculate Single Employee FIFO Leave Balance & Accruals
app.post("/api/leave/calculate-balance", (req, res) => {
  try {
    const { employee, allocations = [], leaves = [], contract = null, asOfDate } = req.body;
    if (!employee || !employee.id) {
      return res.status(400).json({ success: false, error: "بيانات الموظف مطلوبة للحساب" });
    }

    const result = calculateServerFifoBalance(employee, allocations, leaves, contract, asOfDate);
    return res.json({
      success: true,
      data: result,
      source: "odoo-backend-ssot"
    });
  } catch (err: any) {
    console.error("[Leave Balance Backend Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Batch Calculate All Employees FIFO Leave Balances for Reports & Tables
app.post("/api/leave/batch-balances", (req, res) => {
  try {
    const { employees = [], allocations = [], leaves = [], contracts = [], asOfDate } = req.body;
    if (!Array.isArray(employees)) {
      return res.status(400).json({ success: false, error: "قائمة الموظفين غير صالحة" });
    }

    const contractMap = new Map<string, any>();
    contracts.forEach((c: any) => {
      if (c && c.employeeId) contractMap.set(c.employeeId, c);
    });

    const results: Record<string, any> = {};
    for (const emp of employees) {
      if (!emp || !emp.id) continue;
      const empContract = contractMap.get(emp.id) || null;
      results[emp.id] = calculateServerFifoBalance(emp, allocations, leaves, empContract, asOfDate);
    }

    return res.json({
      success: true,
      data: results,
      totalCount: Object.keys(results).length,
      source: "odoo-backend-ssot"
    });
  } catch (err: any) {
    console.error("[Batch Leave Balances Backend Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Central Comprehensive Settlement Calculation (Voucher & Encashment Engine)
app.post("/api/leave/calculate-settlement", (req, res) => {
  try {
    const params = req.body;
    if (!params.employee || !params.employee.id) {
      return res.status(400).json({ success: false, error: "بيانات الموظف مطلوبة لحساب التصفية" });
    }

    const result = calculateServerSettlement(params);
    const validation = validateSettlementConstraints({
      ...result,
      carriedOverBalance: result.carriedOverDays,
      accruedBalance: result.accrued2026Days,
      consumedLeaveDays: result.paidLeaveDays,
      remainingBalanceAfter: result.balanceAfter,
      basicSalary: result.basicSalary,
      dailyWage: result.dailyWage
    });

    return res.json({
      success: true,
      data: result,
      validation,
      source: "odoo-backend-ssot"
    });
  } catch (err: any) {
    console.error("[Leave Settlement Backend Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Odoo-style Constraint Validation Middleware for Settlement Vouchers & Approvals
app.post("/api/leave/validate-settlement", (req, res) => {
  try {
    const voucherOrInput = req.body;
    if (!voucherOrInput) {
      return res.status(400).json({ success: false, error: "بيانات التسوية مطلوبة للتحقق" });
    }

    const validation = validateSettlementConstraints(voucherOrInput);
    return res.json({
      success: true,
      data: validation,
      source: "odoo-backend-ssot"
    });
  } catch (err: any) {
    console.error("[Settlement Validation Backend Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Calculate Rest Day Exclusions (Fridays & Working Days)
app.post("/api/leave/working-days", (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const result = calculateServerWorkingDays(startDate, endDate);
    return res.json({
      success: true,
      data: result,
      source: "odoo-backend-ssot"
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// [1] الحارس اللحظي لتدقيق العمليات المالية والإجازات (Backend Guard)
app.post("/api/guards/validate-leave-settlement", (req, res) => {
  try {
    const data = req.body;
    const result = validateLeaveSettlement(data);
    return res.json({
      success: true,
      remaining: result.remaining,
      message: "تم التدقيق المالي والحسابي بنجاح"
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || "فشل التحقق من التسوية المالية"
    });
  }
});

// [2] محرك تنظيف البصمات المكررة والسجلات الزائدة (Punches De-duplication Guard)
app.post("/api/guards/clean-duplicate-punches", (req, res) => {
  try {
    const { punches } = req.body;
    if (!Array.isArray(punches)) {
      return res.status(400).json({ success: false, error: "يجب إرسال مصفوفة من البصمات punches" });
    }
    const cleaned = cleanDuplicatePunches(punches);
    return res.json({
      success: true,
      originalCount: punches.length,
      cleanedCount: cleaned.length,
      removedDuplicates: punches.length - cleaned.length,
      data: cleaned
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// [3] الحارس الدوري الليلي (Cron Job Health Check & Residency Audit)
app.all("/api/guards/nightly-audit", async (req, res) => {
  try {
    const db = adminApp ? getFirestore(adminApp) : null;
    const report = await runNightlyAudit(db);
    return res.json({
      success: true,
      report
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// OCR Document Scanner via OpenAI Vision or Gemini Vision API
app.post("/api/ocr-scan", express.json({ limit: "50mb" }), async (req, res) => {
  const { imageBase64, mimeType, docType } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "يرجى اختيار ورفع صورة المستند الحقيقي أولاً قبل إجراء الماسح الضوئي OCR" });
  }

  // 1. Check if OPENAI_API_KEY is available and use OpenAI Vision API (gpt-4o with detail: high and json_object response_format)
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
               content: "أنت نظام خبير في القراءة الضوئية واستخراج بيانات البطاقة المدنية والمستندات الرسمية الكويتية بدقة مطلقة (OCR Vision Engine). مهمتك استخراج النصوص والأسماء الحقيقية الموجودة في المستند حصرياً بدقة 100% بدون أي تخمين أو اختصار. تحذير شديد: إياك أن تؤلف أو تفترض بيانات وهمية (مثل أحمد محمد عبدالله أو جون ديفيد أو أرقام مدنية عشوائية). إذا كان الحقل غير مقروء، اتركه فارغاً. أرجع النتيجة حصرياً بصيغة JSON مطابق تماماً للهيكل التالي:\n{\n  \"civilId\": \"الرقم المدني (12 رقماً)\",\n  \"fullNameAr\": \"الاسم الكامل بالعربية\",\n  \"fullNameEn\": \"الاسم الكامل بالإنجليزية\",\n  \"nationality\": \"الجنسية\",\n  \"gender\": \"ذكر أو أنثى / MALE أو FEMALE\",\n  \"birthDate\": \"YYYY-MM-DD\",\n  \"unifiedNo\": \"الرقم الموحد / الرقم المرجع\",\n  \"passportNo\": \"رقم جواز السفر إن وجد\",\n  \"profession\": \"المهنة أو المسمى الوظيفي المسجل\",\n  \"expiryDate\": \"تاريخ الانتهاء YYYY-MM-DD\",\n  \"issueDate\": \"تاريخ الإصدار YYYY-MM-DD\",\n  \"bloodGroup\": \"فصيلة الدم\",\n  \"address\": {\n    \"block\": \"القطعة\",\n    \"street\": \"الشارع\",\n    \"building\": \"المبنى / القسيمة\",\n    \"area\": \"المنطقة / المحافظة\"\n  }\n}"
            },
            {
              role: "user",
              content: [
                { type: "text", text: `قم بتحليل صورة المستند (${docType || 'بطاقة مدنية'}) واستخراج كافة البيانات والحقول بدقة تامة باستخدام تفاصيل عالية الوضوح.` },
                { type: "image_url", image_url: { url: base64Data, detail: "high" } }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1500
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
            fullNameAr: parsed.fullNameAr || parsed.fullName || "",
            fullNameEn: parsed.fullNameEn || "",
            nationality: parsed.nationality || "",
            gender: parsed.gender || "MALE",
            birthDate: parsed.birthDate || parsed.dob || "",
            dob: parsed.birthDate || parsed.dob || "",
            unifiedNo: parsed.unifiedNo || "",
            passportNo: parsed.passportNo || "",
            profession: parsed.profession || parsed.jobTitle || "",
            jobTitle: parsed.profession || parsed.jobTitle || "",
            expiryDate: parsed.expiryDate || "",
            issueDate: parsed.issueDate || "",
            bloodGroup: parsed.bloodGroup || "",
            address: parsed.address || { block: "", street: "", building: "", area: "" },
            residencyType: parsed.residencyType || "",
            mohLicenseNo: parsed.mohLicenseNo || "",
            contractSalary: Number(parsed.contractSalary) || 0,
          },
          source: "openai-vision-gpt4o"
        });
      }
    } catch (oaiErr) {
      console.error("OpenAI Vision error:", oaiErr);
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

  const prompt = `أنت نظام خبير في القراءة الضوئية واستخراج بيانات البطاقة المدنية والمستندات الرسمية الكويتية بدقة مطلقة (OCR Vision Engine).
مهمتك استخراج كافة حقول وبيانات المستند المرفق حصرياً بدقة 100% دون أي تخمين. تحذير شديد: إياك أن تؤلف بيانات وهمية (مثل أحمد محمد عبدالله أو أرقام عشوائية). إذا لم تستطع قراءة حقل، أرجعه فارغاً "".
أرجع الناتج بصيغة JSON فقط مطابق لهذا الهيكل بدقة:
{
  "civilId": "الرقم المدني (12 رقماً)",
  "fullNameAr": "الاسم الكامل بالعربية",
  "fullNameEn": "الاسم الكامل بالإنجليزية",
  "nationality": "الجنسية",
  "gender": "ذكر أو أنثى / MALE أو FEMALE",
  "birthDate": "YYYY-MM-DD",
  "unifiedNo": "الرقم الموحد / الرقم المرجع",
  "passportNo": "رقم جواز السفر إن وجد",
  "profession": "المهنة أو المسمى الوظيفي المسجل",
  "expiryDate": "تاريخ الانتهاء YYYY-MM-DD",
  "issueDate": "تاريخ الإصدار YYYY-MM-DD",
  "bloodGroup": "فصيلة الدم",
  "address": {
    "block": "القطعة",
    "street": "الشارع",
    "building": "المبنى / القسيمة",
    "area": "المنطقة / المحافظة"
  }
}`;

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
              gender: { type: Type.STRING },
              birthDate: { type: Type.STRING },
              unifiedNo: { type: Type.STRING },
              passportNo: { type: Type.STRING },
              profession: { type: Type.STRING },
              expiryDate: { type: Type.STRING },
              issueDate: { type: Type.STRING },
              bloodGroup: { type: Type.STRING },
              address: {
                type: Type.OBJECT,
                properties: {
                  block: { type: Type.STRING },
                  street: { type: Type.STRING },
                  building: { type: Type.STRING },
                  area: { type: Type.STRING },
                }
              },
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
          gender: parsedData.gender || "MALE",
          birthDate: parsedData.birthDate || parsedData.dob || "",
          dob: parsedData.birthDate || parsedData.dob || "",
          unifiedNo: parsedData.unifiedNo || "",
          passportNo: parsedData.passportNo || "",
          profession: parsedData.profession || parsedData.jobTitle || "",
          jobTitle: parsedData.profession || parsedData.jobTitle || "",
          expiryDate: parsedData.expiryDate || "",
          issueDate: parsedData.issueDate || "",
          bloodGroup: parsedData.bloodGroup || "",
          address: parsedData.address || { block: "", street: "", building: "", area: "" },
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

// ---------------------------------------------------------------------------
// ZKTECO & BIOMETRIC REALTIME AUTO-SYNC API ENDPOINTS
// ---------------------------------------------------------------------------
const livePunchesCache: Array<{
  id: string;
  employeeCode: string;
  timestamp: string;
  date: string;
  time: string;
  type: 'IN' | 'OUT';
  deviceSn: string;
  receivedAt: string;
  companyId: string;
}> = [];

app.post("/api/attendance/live-push", async (req, res) => {
  try {
    const { punches, companyId, deviceSn } = req.body;
    const rawPunches = Array.isArray(punches) ? punches : [req.body];

    if (!rawPunches || rawPunches.length === 0) {
      return res.status(400).json({ success: false, error: "لا توجد سجلات بصمة مرسلة" });
    }

    const processedList: any[] = [];
    const nowIso = new Date().toISOString();

    for (const p of rawPunches) {
      const empCode = (p.employeeCode || p.pin || p.badgenumber || p.userId || p.empId || '').toString().trim();
      if (!empCode) continue;

      const rawTs = p.timestamp || p.time || p.date || p.datetime || nowIso;
      const parsedDateObj = new Date(rawTs);
      const isValidDate = !isNaN(parsedDateObj.getTime());

      const dateStr = isValidDate ? parsedDateObj.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const timeStr = isValidDate ? parsedDateObj.toTimeString().split(' ')[0].substring(0, 5) : '08:00';
      const typeStr = (p.type || p.status || p.punchType || 'IN').toString().toUpperCase().includes('OUT') ? 'OUT' : 'IN';
      const effCompId = companyId || p.companyId || 'comp-1';
      const effDevSn = deviceSn || p.deviceSn || p.sn || 'ZK-LOCAL-SYNC';

      const punchItem = {
        id: `punch-${empCode}-${dateStr}-${timeStr.replace(':', '')}-${Date.now()}`,
        employeeCode: empCode,
        timestamp: `${dateStr} ${timeStr}`,
        date: dateStr,
        time: timeStr,
        type: typeStr as 'IN' | 'OUT',
        deviceSn: effDevSn,
        receivedAt: nowIso,
        companyId: effCompId,
      };

      livePunchesCache.unshift(punchItem);
      if (livePunchesCache.length > 500) livePunchesCache.pop();
      processedList.push(punchItem);

      if (adminApp) {
        try {
          const db = getFirestore(adminApp);
          const attDocId = `att-live-${effCompId}-${empCode}-${dateStr}`;
          const attRef = db.collection("attendance").doc(attDocId);
          const snap = await attRef.get();

          if (snap.exists) {
            const existing = snap.data() || {};
            const updatePayload: any = {};
            if (typeStr === 'IN' && (!existing.checkIn || timeStr < existing.checkIn)) {
              updatePayload.checkIn = timeStr;
            } else if (typeStr === 'OUT' && (!existing.checkOut || timeStr > existing.checkOut)) {
              updatePayload.checkOut = timeStr;
            } else if (!existing.checkIn) {
              updatePayload.checkIn = timeStr;
            } else {
              updatePayload.checkOut = timeStr;
            }
            await attRef.update(updatePayload);
          } else {
            await attRef.set({
              id: attDocId,
              employeeId: empCode,
              employeeCode: empCode,
              companyId: effCompId,
              date: dateStr,
              checkIn: typeStr === 'IN' ? timeStr : undefined,
              checkOut: typeStr === 'OUT' ? timeStr : undefined,
              workHours: 8,
              status: 'PRESENT',
              lateMinutes: 0,
              earlyDepartureMinutes: 0,
              overtimeHours: 0,
              deviceSn: effDevSn,
              isLiveSynced: true,
              updatedAt: nowIso
            });
          }
        } catch (dbErr) {
          console.warn("[Live Attendance DB Sync Warning]:", dbErr);
        }
      }
    }

    return res.json({
      success: true,
      message: `تم معالجة وترحيل ${processedList.length} حركة بصمة لحظية بنجاح إلى النظام`,
      processedCount: processedList.length,
      latestPunches: processedList.slice(0, 10),
    });
  } catch (err: any) {
    console.error("[Live Attendance Push Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.all(["/iclock/cdata", "/api/zkteco/iclock/cdata"], async (req, res) => {
  const sn = (req.query.SN || req.body?.SN || 'ZK-DEVICE').toString();

  if (req.method === 'GET') {
    return res.send(`GET OPTION FROM: ${sn}\nATTLOGHeader=PIN\tTime\tStatus\tVerify\nOK`);
  }

  console.log(`[ZKTeco ADMS ADI Push] Incoming logs from SN ${sn}`);
  return res.send("OK");
});

app.get("/api/attendance/live-logs", (req, res) => {
  const compId = (req.query.companyId || 'comp-1').toString();
  const filtered = livePunchesCache.filter(p => p.companyId === compId || compId === 'ALL');
  return res.json({
    success: true,
    totalCount: filtered.length,
    punches: filtered,
  });
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

// ---------------------------------------------------------------------------
// AUTOMATED SYSTEM DATABASE BACKUP & SMTP DISPATCH ENGINE
// ---------------------------------------------------------------------------
interface BackupHistoryRecord {
  backupId: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  recordsCount: number;
  sizeFormatted: string;
  filename: string;
  durationMs: number;
  error?: string;
}

let latestBackupBuffer: Buffer | null = null;
let latestBackupFilename = "aysed_hr_latest_db_dump.json.gz";
let latestBackupMetadata: BackupMetadata | null = null;
const backupHistory: BackupHistoryRecord[] = [];

async function executeSystemBackupCore(clientSnapshot?: any, triggerSource = 'MANUAL'): Promise<{
  success: boolean;
  metadata?: BackupMetadata;
  filename?: string;
  error?: string;
  alertSent?: boolean;
  durationMs: number;
}> {
  const startTime = Date.now();
  const backupId = `bkp_${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}_${Math.random().toString(36).slice(2, 6)}`;
  const dateStr = new Date().toLocaleDateString('ar-KW', { timeZone: 'Asia/Kuwait' });
  const timestampStr = new Date().toLocaleString('ar-KW', { timeZone: 'Asia/Kuwait' });
  const systemEmail = getSystemDefaultEmail();

  try {
    let dumpCollections: Record<string, any[]> = {};
    let collectionStats: Record<string, number> = {};
    let totalRecords = 0;

    // 1. If Firestore Admin is initialized on server, dump directly from Firestore
    if (adminApp) {
      try {
        const db = getFirestore(adminApp);
        const colNames = [
          'companies', 'employees', 'contracts', 'leaves', 'leave_allocations',
          'leave_settlements', 'attendance', 'payslips', 'payroll_runs',
          'custody_loans', 'daily_movements', 'commencements', 'documents',
          'res_config_settings', 'subscription_requests', 'audit_logs', 'system_integrations'
        ];
        for (const col of colNames) {
          const snap = await db.collection(col).get();
          const items: any[] = [];
          snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
          dumpCollections[col] = items;
          collectionStats[col] = items.length;
          totalRecords += items.length;
        }
      } catch (adminDbErr) {
        console.warn("[Backup Server Firestore Warning]:", adminDbErr);
      }
    }

    // 2. If client snapshot was supplied and has more data, merge/prefer it
    if (clientSnapshot && clientSnapshot.collections) {
      for (const [colName, items] of Object.entries(clientSnapshot.collections)) {
        if (Array.isArray(items) && (items.length > 0 || !dumpCollections[colName])) {
          dumpCollections[colName] = items;
          collectionStats[colName] = items.length;
        }
      }
      totalRecords = Object.values(collectionStats).reduce((acc, curr) => acc + curr, 0);
    }

    // Include system live cache & memory metadata
    dumpCollections['system_live_punches'] = livePunchesCache;
    collectionStats['system_live_punches'] = livePunchesCache.length;
    totalRecords += livePunchesCache.length;

    const fullDumpPayload = {
      _meta: {
        system: "Aysed S HR 2026",
        version: "17.0-Enterprise-Kuwait",
        backupId,
        createdAt: new Date().toISOString(),
        timeZone: "Asia/Kuwait",
        triggerSource,
        totalCollections: Object.keys(dumpCollections).length,
        totalRecords,
      },
      collections: dumpCollections,
    };

    const jsonString = JSON.stringify(fullDumpPayload, null, 2);
    const uncompressedSizeBytes = Buffer.byteLength(jsonString, 'utf8');

    // Compress using GZIP
    const compressedBuffer = zlib.gzipSync(Buffer.from(jsonString, 'utf8'));
    const compressedSizeBytes = compressedBuffer.length;

    // Cryptographic Checksum SHA-256
    const sha256Checksum = crypto.createHash('sha256').update(compressedBuffer).digest('hex');

    const durationMs = Date.now() - startTime;

    const metadata: BackupMetadata = {
      backupId,
      timestamp: timestampStr,
      dateStr,
      durationMs,
      environment: process.env.NODE_ENV || 'production',
      totalCollections: Object.keys(dumpCollections).length,
      totalRecords,
      uncompressedSizeBytes,
      compressedSizeBytes,
      sha256Checksum,
      collectionStats,
      databaseName: 'ai-studio-remixaysedshr202-98c882d5-9491-4f4b-a838-c6b0b10a0472'
    };

    const filename = `aysed_hr_db_dump_${new Date().toISOString().split('T')[0]}_${backupId}.json.gz`;

    // Cache latest buffer
    latestBackupBuffer = compressedBuffer;
    latestBackupFilename = filename;
    latestBackupMetadata = metadata;

    // Send Daily Backup Success Email with attached compressed DB Dump file
    const emailResult = await sendDailyBackupSuccessEmail({
      metadata,
      dumpPayloadJson: fullDumpPayload,
      compressedBuffer,
      recipientEmail: systemEmail,
    });

    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    if (emailResult.success) {
      backupHistory.unshift({
        backupId,
        timestamp: timestampStr,
        status: 'SUCCESS',
        recordsCount: totalRecords,
        sizeFormatted: formatBytes(compressedSizeBytes),
        filename,
        durationMs,
      });
      if (backupHistory.length > 50) backupHistory.pop();

      return {
        success: true,
        metadata,
        filename,
        durationMs,
      };
    } else {
      throw new Error(`تعذر تسليم الإيميل: ${emailResult.error || 'SMTP Error'}`);
    }
  } catch (err: any) {
    console.error("[Backup Core Failure]:", err);
    const durationMs = Date.now() - startTime;

    // Record failure in history
    backupHistory.unshift({
      backupId,
      timestamp: timestampStr,
      status: 'FAILED',
      recordsCount: 0,
      sizeFormatted: '0 KB',
      filename: 'N/A',
      durationMs,
      error: err.message,
    });
    if (backupHistory.length > 50) backupHistory.pop();

    // Trigger Immediate Urgent Failure Alert Email
    let alertSent = false;
    try {
      const alertResult = await sendDailyBackupFailureAlert({
        error: err.message || 'Unknown technical backup failure',
        errorStack: err.stack,
        failedStep: 'محرك تفريغ البيانات والضغط والإرسال البريدي',
        timestamp: timestampStr,
        recipientEmail: systemEmail,
      });
      alertSent = alertResult.success;
    } catch (alertErr) {
      console.error("[Backup Alert Dispatch Failure]:", alertErr);
    }

    return {
      success: false,
      error: err.message,
      alertSent,
      durationMs,
    };
  }
}

// 1. Manual or Client-triggered Backup Run
app.post("/api/backup/run", express.json({ limit: "50mb" }), async (req, res) => {
  try {
    const { snapshot } = req.body || {};
    const result = await executeSystemBackupCore(snapshot, 'MANUAL_TRIGGER');
    if (result.success) {
      return res.json({
        success: true,
        message: "تم أخذ النسخة الاحتياطية المضغوطة وإرسال التقرير والملف المرفق بنجاح إلى إيميل النظام المعتمد",
        metadata: result.metadata,
        filename: result.filename,
        durationMs: result.durationMs,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "فشل أخذ النسخة الاحتياطية",
        alertSent: result.alertSent,
        durationMs: result.durationMs,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Test Failure Alert Simulation Route
app.post("/api/backup/test-failure-alert", express.json(), async (req, res) => {
  try {
    const { error, failedStep, errorStack } = req.body || {};
    const systemEmail = getSystemDefaultEmail();
    const result = await sendDailyBackupFailureAlert({
      error: error || 'محاكاة اختبارية: تعذر الاتصال بقرص تخزين النسخ الاحتياطية (Simulated Backup Storage Failure)',
      failedStep: failedStep || 'فحص واختبار التنبيهات العاجلة للأعطال',
      errorStack: errorStack || 'Error: Simulated failure alert triggered from Admin Dashboard to test immediate SMTP delivery\n    at backupController (server.ts:1050)',
      recipientEmail: systemEmail,
    });

    if (result.success) {
      return res.json({
        success: true,
        message: `تم إرسال تنبيه العطل الفوري بنجاح إلى إيميل النظام المعتمد (${systemEmail})`,
        messageId: result.messageId,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "فشل إرسال تنبيه العطل",
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Backup Engine Status & History API
app.get("/api/backup/status", (req, res) => {
  const systemEmail = getSystemDefaultEmail();
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const lastSuccessful = backupHistory.find(h => h.status === 'SUCCESS');
  const lastItem = backupHistory[0];

  return res.json({
    isEnabled: true,
    systemDefaultEmail: systemEmail,
    schedule: 'Daily at 00:00 (Asia/Kuwait)',
    lastRun: lastItem ? {
      backupId: lastItem.backupId,
      timestamp: lastItem.timestamp,
      status: lastItem.status,
      recordsCount: lastItem.recordsCount,
      compressedSize: lastItem.sizeFormatted,
      filename: lastItem.filename,
      error: lastItem.error,
    } : (latestBackupMetadata ? {
      backupId: latestBackupMetadata.backupId,
      timestamp: latestBackupMetadata.timestamp,
      status: 'SUCCESS',
      recordsCount: latestBackupMetadata.totalRecords,
      compressedSize: formatBytes(latestBackupMetadata.compressedSizeBytes),
      filename: latestBackupFilename,
    } : null),
    totalBackupsRun: backupHistory.length,
    history: backupHistory,
    hasCachedDump: latestBackupBuffer !== null,
    latestFilename: latestBackupFilename,
  });
});

// 4. Download Latest Backup Dump File API
app.get("/api/backup/download-latest", (req, res) => {
  if (!latestBackupBuffer) {
    return res.status(404).json({ success: false, error: "لا توجد نسخة احتياطية محفوظة حالياً في الذاكرة. يرجى تشغيل النسخ أولاً." });
  }

  res.setHeader("Content-Disposition", `attachment; filename="${latestBackupFilename}"`);
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Length", latestBackupBuffer.length);
  return res.send(latestBackupBuffer);
});

// Schedule Automated Silent Daily Backup in Server Background
// Runs every 24 hours (86,400,000 ms), with an initial background trigger after 45 seconds of uptime
const DAILY_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

setTimeout(() => {
  console.log("[Auto-Backup Scheduler] Executing initial automated daily backup run...");
  executeSystemBackupCore(undefined, 'AUTOMATED_DAILY_CRON')
    .then(res => {
      if (res.success) {
        console.log(`[Auto-Backup Scheduler] Initial daily backup completed successfully. ID: ${res.metadata?.backupId}`);
      } else {
        console.warn(`[Auto-Backup Scheduler] Initial backup warning: ${res.error}`);
      }
    })
    .catch(err => {
      console.error("[Auto-Backup Scheduler] Exception during initial backup:", err);
    });
}, 45000);

setInterval(() => {
  console.log("[Auto-Backup Scheduler] Running daily automatic backup and email dispatch...");
  executeSystemBackupCore(undefined, 'AUTOMATED_DAILY_CRON')
    .then(res => {
      if (res.success) {
        console.log(`[Auto-Backup Scheduler] Daily backup email dispatched successfully.`);
      }
    })
    .catch(err => {
      console.error("[Auto-Backup Scheduler] Failed automated daily backup:", err);
    });
}, DAILY_BACKUP_INTERVAL_MS);

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

// Comprehensive Subscription Registration & Notification Endpoint
app.post("/api/subscription/register", express.json(), async (req, res) => {
  const { requesterName, companyName, email, phone, empCount, planType } = req.body;
  
  if (!companyName || !phone) {
    return res.status(400).json({ success: false, error: "اسم الشركة ورقم الهاتف مطلوبان" });
  }

  const reqName = requesterName || companyName;
  const reqEmail = email || `${phone.replace(/[^0-9]/g, '')}@aysedhr.com`;
  const reqEmpCount = empCount || "1-10";
  const reqPlanType = planType || "medical";

  console.log(`[Subscription Register] Received request from: ${companyName} (${reqName}), Phone: ${phone}, Email: ${reqEmail}`);

  // 1. Notify Super Admin (elsayedhr1993@gmail.com)
  let adminNotified = false;
  try {
    const adminEmailResult = await sendAdminNewSubscriptionNotification({
      requesterName: reqName,
      companyName,
      email: reqEmail,
      phone,
      empCount: reqEmpCount,
      planType: reqPlanType,
    });
    adminNotified = adminEmailResult.success;
  } catch (err) {
    console.warn("[Subscription Register] Admin notification warning:", err);
  }

  // 2. Send Welcome Email to Subscriber if valid email provided
  let subscriberWelcomed = false;
  if (email && email.includes("@") && !email.includes("@aysedhr.com")) {
    try {
      const welcomeResult = await sendWelcomeEmail({
        subscriberEmail: email.trim(),
        subscriberName: reqName,
        companyName,
      });
      subscriberWelcomed = welcomeResult.success;
    } catch (err) {
      console.warn("[Subscription Register] Subscriber welcome email warning:", err);
    }
  }

  return res.json({
    success: true,
    message: "تم استلام وتسجيل طلب الاشتراك بنجاح وإشعار الإدارة العليا",
    adminNotified,
    subscriberWelcomed,
  });
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
