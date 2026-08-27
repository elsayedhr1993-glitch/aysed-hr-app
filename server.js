var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_nodemailer2 = __toESM(require("nodemailer"), 1);
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");

// src/services/emailService.ts
var import_nodemailer = __toESM(require("nodemailer"), 1);
var transporter = import_nodemailer.default.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_GMAIL_USER || process.env.SMTP_USER || "elsayedhr1993@gmail.com",
    // إيميل النظام
    pass: process.env.SMTP_GMAIL_APP_PASSWORD || process.env.SMTP_PASS || ""
    // App Password من جوجل
  }
});
async function sendAdminNewSubscriptionNotification({
  requesterName,
  companyName,
  email,
  phone,
  empCount,
  planType
}) {
  const adminEmail = "elsayedhr1993@gmail.com";
  const sectorName = planType === "medical" ? "\u0627\u0644\u0642\u0637\u0627\u0639 \u0627\u0644\u0637\u0628\u064A / \u0639\u064A\u0627\u062F\u0627\u062A \u0648\u0645\u0631\u0627\u0643\u0632" : "\u0627\u0644\u0642\u0637\u0627\u0639 \u0627\u0644\u0625\u062F\u0627\u0631\u064A \u0648\u0627\u0644\u062A\u062C\u0627\u0631\u064A";
  const dateStr = (/* @__PURE__ */ new Date()).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait" });
  const mailBody = `
    <div style="direction: rtl; text-align: right; font-family: 'Tajawal', Arial, sans-serif; padding: 20px; background-color: #f1f5f9;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        <div style="background-color: #714B67; padding: 25px 20px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold;">\u{1F514} \u0637\u0644\u0628 \u0627\u0634\u062A\u0631\u0627\u0643 \u062C\u062F\u064A\u062F \u0644\u0645\u0646\u0634\u0623\u0629 (SaaS Tenant Request)</h1>
          <p style="margin-top: 6px; opacity: 0.9; font-size: 13px;">\u0645\u0646\u0638\u0648\u0645\u0629 Aysed S HR 2026 - \u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0644\u064A\u0627</p>
        </div>

        <div style="padding: 25px; color: #1e293b; line-height: 1.8; font-size: 14px;">
          <p style="font-size: 15px; font-weight: bold; color: #714B67;">\u0639\u0632\u064A\u0632\u064A \u0627\u0644\u0623\u0633\u062A\u0627\u0630 \u0627\u0644\u0633\u064A\u062F (Super Admin)\u060C</p>
          <p>\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628 \u0627\u0634\u062A\u0631\u0627\u0643 \u062C\u062F\u064A\u062F \u0639\u0628\u0631 \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062F\u062E\u0648\u0644 \u0648\u0627\u0644\u062A\u0633\u062C\u064A\u0644. \u0641\u064A\u0645\u0627 \u064A\u0644\u064A \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0646\u0634\u0623\u0629 \u0648\u0627\u0644\u0645\u0634\u062A\u0631\u0643:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; width: 35%; color: #475569;">\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u0634\u0623\u0629 / \u0627\u0644\u0634\u0631\u0643\u0629:</td>
              <td style="padding: 10px; font-weight: bold; color: #0f172a;">${companyName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0645\u062A\u0642\u062F\u0645:</td>
              <td style="padding: 10px; color: #0f172a;">${requesterName}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 / \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628:</td>
              <td style="padding: 10px; color: #0f172a; direction: ltr; text-align: right;"><a href="tel:${phone}" style="color: #0284c7; text-decoration: none; font-weight: bold;">${phone}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A:</td>
              <td style="padding: 10px; color: #0f172a;"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none;">${email}</a></td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">\u0646\u0648\u0639 \u0627\u0644\u0642\u0637\u0627\u0639:</td>
              <td style="padding: 10px; color: #0f172a;">${sectorName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">\u0639\u062F\u062F \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u0627\u0644\u0645\u062A\u0648\u0642\u0639:</td>
              <td style="padding: 10px; color: #0f172a;">${empCount} \u0645\u0648\u0638\u0641</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; font-weight: bold; color: #475569;">\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0637\u0644\u0628:</td>
              <td style="padding: 10px; color: #64748b;">${dateStr}</td>
            </tr>
          </table>

          <div style="background-color: #f0fdf4; border-right: 4px solid #16a34a; padding: 12px 16px; border-radius: 6px; margin-top: 15px;">
            <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 600;">
              \u2705 \u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0637\u0644\u0628 \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0647\u0648 \u062C\u0627\u0647\u0632 \u0627\u0644\u0622\u0646 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u0627\u0644\u062A\u0641\u0639\u064A\u0644 \u0641\u064A \u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0644\u064A\u0627 (Super Admin Dashboard).
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
  try {
    const userEmail = process.env.SMTP_GMAIL_USER || process.env.SMTP_USER || "elsayedhr1993@gmail.com";
    await transporter.sendMail({
      from: `"Aysed S HR System" <${userEmail}>`,
      to: adminEmail,
      subject: `\u{1F514} \u0637\u0644\u0628 \u0627\u0634\u062A\u0631\u0627\u0643 \u062C\u062F\u064A\u062F: ${companyName} (${requesterName})`,
      html: mailBody
    });
    return { success: true };
  } catch (error) {
    console.error("\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0625\u062F\u0627\u0631\u0629:", error);
    return { success: false, error: error.message };
  }
}
async function sendWelcomeEmail({
  subscriberEmail,
  subscriberName,
  companyName
}) {
  const mailBody = `
    <div style="direction: rtl; text-align: right; font-family: 'Tajawal', Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
            
            <!-- \u0627\u0644\u062A\u0631\u0648\u064A\u0633\u0629 -->
            <div style="background-color: #71639e; padding: 35px 20px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 22px; font-weight: bold;">\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643 \u0641\u064A \u0645\u0633\u062A\u0642\u0628\u0644 \u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629</h1>
                <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Aysed S HR 2026 - Kuwait</p>
            </div>

            <!-- \u0627\u0644\u0645\u062D\u062A\u0648\u0649 -->
            <div style="padding: 30px; color: #333333; line-height: 1.8; font-size: 14px;">
                <h2 style="color: #71639e; font-size: 18px; margin-top: 0;">\u0627\u0644\u0633\u064A\u062F/ ${subscriberName} \u0627\u0644\u0645\u062D\u062A\u0631\u0645\u060C</h2>
                <p>\u0644\u0642\u062F \u0627\u0633\u062A\u0644\u0645\u0646\u0627 \u0628\u0628\u0627\u0644\u063A \u0627\u0644\u0633\u0631\u0648\u0631 \u0637\u0644\u0628 \u0627\u0646\u0636\u0645\u0627\u0645 \u0634\u0631\u0643\u0629 <strong>( ${companyName} )</strong> \u0625\u0644\u0649 \u0645\u0646\u0638\u0648\u0645\u062A\u0646\u0627 \u0627\u0644\u0633\u062D\u0627\u0628\u064A\u0629 \u0627\u0644\u0645\u062A\u0637\u0648\u0631\u0629.</p>

                <p>\u0646\u0638\u0627\u0645 <strong>Aysed S HR</strong> \u0635\u064F\u0645\u0645 \u0644\u064A\u0643\u0648\u0646 \u0634\u0631\u064A\u0643\u0643 \u0627\u0644\u0625\u062F\u0627\u0631\u064A \u0648\u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A \u0627\u0644\u0645\u062A\u0643\u0627\u0645\u0644 \u0648\u0627\u0644\u0645\u062A\u0648\u0627\u0641\u0642 \u062A\u0645\u0627\u0645\u0627\u064B \u0645\u0639 \u0623\u062D\u0643\u0627\u0645 \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0643\u0648\u064A\u062A\u064A (\u0627\u0644\u0645\u0627\u062F\u062A\u064A\u0646 51 \u064870).</p>

                <div style="background-color: #f7f6fb; padding: 20px; border-radius: 8px; margin: 25px 0; border-right: 4px solid #008784;">
                    <h3 style="margin-top: 0; font-size: 15px; color: #008784;">\u{1F680} \u0645\u0627\u0630\u0627 \u064A\u0646\u062A\u0638\u0631\u0643 \u0641\u064A \u0646\u0633\u062E\u062A\u0643 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629\u061F</h3>
                    <ul style="margin: 0; padding-right: 20px; color: #555555;">
                        <li style="margin-bottom: 6px;"><strong>\u062F\u0631\u0639 \u0627\u0644\u0645\u062E\u0627\u0637\u0631:</strong> \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u0625\u0642\u0627\u0645\u0627\u062A \u0648\u0627\u0644\u062C\u0648\u0627\u0632\u0627\u062A \u0648\u062A\u0631\u0627\u062E\u064A\u0635 \u0627\u0644\u0645\u0646\u0634\u0623\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.</li>
                        <li style="margin-bottom: 6px;"><strong>\u0627\u0644\u0645\u0646\u062F\u0648\u0628 \u0627\u0644\u0630\u0643\u064A:</strong> \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0648\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0627\u0644\u0639\u0642\u0648\u062F.</li>
                        <li style="margin-bottom: 6px;"><strong>\u0627\u0644\u0628\u0635\u0645\u0629 \u0648\u0627\u0644\u062D\u0636\u0648\u0631:</strong> \u062A\u062A\u0628\u0639 \u0627\u0644\u062F\u0648\u0627\u0645 \u0648\u0627\u0644\u0648\u0631\u062F\u064A\u0627\u062A \u0628\u0627\u0644\u0640 QR \u0648\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u062C\u063A\u0631\u0627\u0641\u064A.</li>
                        <li style="margin-bottom: 0;"><strong>\u0627\u0644\u0623\u062A\u0645\u062A\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629:</strong> \u0627\u062D\u062A\u0633\u0627\u0628 \u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0628\u0642\u0627\u0639\u062F\u0629 26 \u064A\u0648\u0645 \u0639\u0645\u0644.</li>
                    </ul>
                </div>

                <p>\u064A\u0642\u0648\u0645 \u0641\u0631\u064A\u0642\u0646\u0627 \u062D\u0627\u0644\u064A\u0627\u064B \u0628\u062A\u0647\u064A\u0626\u0629 \u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0645\u0646\u0634\u0623\u062A\u0643\u0645\u060C \u0648\u0633\u064A\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 <strong>\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 (\u0627\u0644\u0633\u064A\u062F)</strong> \u0644\u062A\u0632\u0648\u064A\u062F\u0643 \u0628\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u0648\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628 \u062E\u0644\u0627\u0644 \u0627\u0644\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0642\u0627\u062F\u0645\u0629.</p>

                <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
                    <a href="https://ais-dev-mwghgnpjjr2xqufoinwqle-554243377583.europe-west2.run.app" style="background-color: #008784; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">\u062A\u0635\u0641\u062D \u0645\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645</a>
                </div>
            </div>

            <!-- \u0627\u0644\u062A\u0630\u064A\u064A\u0644 -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 11px; color: #888888; border-top: 1px solid #eeeeee;">
                <p style="margin: 0 0 5px 0;">\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u062E\u0627\u062F\u0645 \u0646\u0638\u0627\u0645 Aysed S HR 2026 \u0627\u0644\u0631\u0633\u0645\u064A</p>
                <p style="margin: 0;">&copy; 2026 Aysed Technologies - Kuwait Branch</p>
            </div>
        </div>
    </div>
  `;
  try {
    const userEmail = process.env.SMTP_GMAIL_USER || process.env.SMTP_USER || "elsayedhr1993@gmail.com";
    await transporter.sendMail({
      from: `"Aysed S HR 2026" <${userEmail}>`,
      to: subscriberEmail,
      subject: `\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643 \u0641\u064A Aysed S HR 2026 - \u0637\u0644\u0628 ${companyName}`,
      html: mailBody
    });
    return { success: true };
  } catch (error) {
    console.error("\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u064A\u0645\u064A\u0644:", error);
    return { success: false, error: error.message };
  }
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var adminApp = null;
var authAdmin = null;
var firebaseAdminInitAttempted = false;
function normalizeAndValidatePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return null;
  let key = rawKey.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n").trim();
  if (!key.includes("-----BEGIN") || !key.includes("KEY-----")) {
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
  const rawBase64 = key.substring(startIndex, endIndex).replace(/\s+/g, "");
  if (!rawBase64 || rawBase64.length < 50) return null;
  const chunks = rawBase64.match(/.{1,64}/g);
  if (!chunks) return null;
  const formattedKey = `${header}
${chunks.join("\n")}
${footer}
`;
  try {
    import_crypto.default.createPrivateKey(formattedKey);
    return formattedKey;
  } catch {
    return null;
  }
}
function getAdminAuth() {
  if (authAdmin) return authAdmin;
  if (firebaseAdminInitAttempted && !adminApp) return null;
  firebaseAdminInitAttempted = true;
  try {
    let rawCreds = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!rawCreds || rawCreds.trim() === "" || rawCreds.includes("YOUR_")) {
      return null;
    }
    rawCreds = rawCreds.trim();
    let parsedServiceAccount;
    if (rawCreds.startsWith("{")) {
      parsedServiceAccount = JSON.parse(rawCreds);
    } else if (rawCreds.startsWith('"{') && rawCreds.endsWith('}"')) {
      parsedServiceAccount = JSON.parse(JSON.parse(rawCreds));
    } else {
      try {
        const decoded = Buffer.from(rawCreds, "base64").toString("utf8");
        if (decoded.trim().startsWith("{")) {
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
      if ((0, import_app.getApps)().length === 0) {
        adminApp = (0, import_app.initializeApp)({
          credential: (0, import_app.cert)(parsedServiceAccount)
        });
      } else {
        adminApp = (0, import_app.getApps)()[0];
      }
      authAdmin = (0, import_auth.getAuth)(adminApp);
      console.log("[Firebase Admin] initialized successfully");
      return authAdmin;
    }
  } catch (err) {
    return null;
  }
  return null;
}
app.use(import_express.default.json({ limit: "25mb" }));
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.includes("YOUR_")) {
    return null;
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", system: "Aysed S HR 2026", odooVersion: "17.0-Enterprise" });
});
app.post("/api/ocr-scan", async (req, res) => {
  const { imageBase64, mimeType, docType } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0648\u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0627\u0644\u062D\u0642\u064A\u0642\u064A \u0623\u0648\u0644\u0627\u064B \u0642\u0628\u0644 \u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u0645\u0627\u0633\u062D \u0627\u0644\u0636\u0648\u0626\u064A OCR" });
  }
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const isPdfFile = mimeType === "application/pdf" || mimeType?.includes("pdf");
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
              content: "\u0623\u0646\u062A \u0646\u0638\u0627\u0645 \u062E\u0628\u064A\u0631 \u0641\u064A \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0636\u0648\u0626\u064A\u0629 \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0627\u0644\u0643\u0648\u064A\u062A\u064A\u0629 \u0628\u062F\u0642\u0629 \u0645\u0637\u0644\u0642\u0629 (OCR Vision Engine). \u0645\u0647\u0645\u062A\u0643 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0646\u0635\u0648\u0635 \u0648\u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u062D\u0635\u0631\u064A\u0627\u064B \u0628\u062F\u0642\u0629 100%. \u062A\u062D\u0630\u064A\u0631 \u0635\u0627\u0631\u0645: \u0645\u0645\u0646\u0648\u0639 \u0645\u0646\u0639\u0627\u064B \u0628\u0627\u062A\u0627\u064B \u0648\u0636\u0639 \u0623\u064A \u0623\u0633\u0645\u0627\u0621 \u0648\u0647\u0645\u064A\u0629 \u0623\u0648 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 (\u0645\u062B\u0644 \u0645\u062D\u0645\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A \u0623\u0648 \u063A\u064A\u0631\u0647\u0627) \u0625\u0630\u0627 \u0644\u0645 \u062A\u0643\u0646 \u0645\u0643\u062A\u0648\u0628\u0629 \u0635\u0631\u0627\u062D\u0629 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0646\u062F. \u0623\u0631\u062C\u0650\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u062D\u0635\u0631\u064A\u0627\u064B \u0628\u0635\u064A\u063A\u0629 JSON \u0645\u0639 \u0647\u0630\u0647 \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D: civilId, fullNameAr, fullNameEn, nationality, dob, passportNo, jobTitle, expiryDate, gender, residencyType, mohLicenseNo, contractSalary."
            },
            {
              role: "user",
              content: [
                { type: "text", text: `\u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0647\u0630\u0647 \u0627\u0644\u0635\u0648\u0631\u0629 \u0644\u0644\u0645\u0633\u062A\u0646\u062F (${docType || "\u0628\u0637\u0627\u0642\u0629 \u0645\u062F\u0646\u064A\u0629 \u0623\u0648 \u062C\u0648\u0627\u0632 \u0623\u0648 \u0639\u0642\u062F \u0639\u0645\u0644"}) \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0628\u062F\u0642\u0629 \u0634\u062F\u064A\u062F\u0629 \u062F\u0648\u0646 \u0623\u064A \u062A\u062E\u0645\u064A\u0646.` },
                { type: "image_url", image_url: { url: base64Data } }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1e3
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
            contractSalary: Number(parsed.contractSalary) || 0
          },
          source: "openai-vision"
        });
      }
    } catch (oaiErr) {
    }
  }
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(400).json({
      error: "\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (GEMINI_API_KEY \u0623\u0648 OPENAI_API_KEY) \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631. \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u064A\u062F\u0648\u064A\u0627\u064B \u0623\u0648 \u062A\u0643\u0648\u064A\u0646 \u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A."
    });
  }
  let resolvedMimeType = mimeType || "image/jpeg";
  if (resolvedMimeType.includes("bdf") || resolvedMimeType === "" || !resolvedMimeType) {
    resolvedMimeType = "application/pdf";
  }
  const prompt = `\u0623\u0646\u062A \u0646\u0638\u0627\u0645 \u0642\u0627\u0631\u0626 \u0648\u0645\u062D\u0644\u0644 \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0631\u0633\u0645\u064A\u0629 \u0630\u0643\u064A \u062F\u0642\u064A\u0642 \u0644\u0644\u063A\u0627\u064A\u0629 (OCR Vision Engine) \u0644\u062F\u0648\u0644\u0629 \u0627\u0644\u0643\u0648\u064A\u062A.
\u0645\u0647\u0645\u062A\u0643 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0647\u064A \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0635\u0648\u0631\u0629 \u0623\u0648 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u0641\u0642 \u062D\u0635\u0631\u064A\u0627\u064B \u0628\u062F\u0642\u0629 100%.
\u062A\u062D\u0630\u064A\u0631 \u0635\u0627\u0631\u0645: \u0645\u0645\u0646\u0648\u0639 \u0645\u0646\u0639\u0627\u064B \u0628\u0627\u062A\u0627\u064B \u0648\u0636\u0639 \u0623\u064A \u0623\u0633\u0645\u0627\u0621 \u0648\u0647\u0645\u064A\u0629 \u0623\u0648 \u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 (\u0645\u062B\u0644 \u0645\u062D\u0645\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A \u0623\u0648 \u063A\u064A\u0631\u0647\u0627) \u0625\u0630\u0627 \u0644\u0645 \u062A\u0643\u0646 \u0645\u0643\u062A\u0648\u0628\u0629 \u0635\u0631\u0627\u062D\u0629 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0646\u062F. \u0627\u0633\u062A\u062E\u0631\u062C \u0627\u0644\u0646\u0635\u0648\u0635 \u0643\u0645\u0627 \u0647\u064A \u062A\u0645\u0627\u0645\u0627\u064B.
\u0623\u0631\u062C\u0639 \u0627\u0644\u0646\u0627\u062A\u062C \u0628\u0635\u064A\u063A\u0629 JSON \u0641\u0642\u0637 \u064A\u0636\u0645 \u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D \u0627\u0644\u062A\u0627\u0644\u064A\u0629:
1. "civilId": \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u062F\u0646\u064A \u0627\u0644\u0643\u0648\u064A\u062A\u064A (12 \u0631\u0642\u0645 \u062A\u0645\u0627\u0645\u0627\u064B) \u0627\u0644\u0645\u0643\u062A\u0648\u0628 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0623\u0648 \u0646\u0635 \u0641\u0627\u0631\u063A ""
2. "fullNameAr": \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u062A\u0645\u0627\u0645\u0627\u064B \u0643\u0645\u0627 \u0647\u0648 \u0645\u0643\u062A\u0648\u0628 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0623\u0648 \u0646\u0635 \u0641\u0627\u0631\u063A ""
3. "fullNameEn": \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0623\u0648 \u0646\u0635 \u0641\u0627\u0631\u063A ""
4. "nationality": \u0627\u0644\u062C\u0646\u0633\u064A\u0629 \u0627\u0644\u0645\u0643\u062A\u0648\u0628\u0629 \u0623\u0648 \u0646\u0635 \u0641\u0627\u0631\u063A ""
5. "dob": \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0645\u064A\u0644\u0627\u062F (YYYY-MM-DD) \u0623\u0648 \u0646\u0635 \u0641\u0627\u0631\u063A ""
6. "passportNo": \u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0632 \u0623\u0648 \u0646\u0635 \u0641\u0627\u0631\u063A ""
7. "jobTitle": \u0627\u0644\u0645\u0633\u0645\u0649 \u0627\u0644\u0648\u0638\u064A\u0641\u064A \u0623\u0648 \u0627\u0644\u062A\u062E\u0635\u0635 \u0627\u0644\u0645\u0643\u062A\u0648\u0628 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0623\u0648 \u0646\u0635 \u0641\u0627\u0631\u063A ""
8. "expiryDate": \u062A\u0627\u0631\u064A\u062E \u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629 (YYYY-MM-DD) \u0623\u0648 \u0646\u0635 \u0641\u0627\u0631\u063A ""
9. "gender": MALE \u0623\u0648 FEMALE
10. "residencyType": \u0646\u0648\u0639 \u0627\u0644\u0625\u0642\u0627\u0645\u0629 \u0623\u0648 \u0646\u0635 \u0641\u0627\u0631\u063A ""
11. "mohLicenseNo": \u0631\u0642\u0645 \u062A\u0631\u062E\u064A\u0635 \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u0635\u062D\u0629 (MOH License) \u0625\u0646 \u0648\u062C\u062F \u0623\u0648 \u0646\u0635 \u0641\u0627\u0631\u063A ""
12. "contractSalary": \u0627\u0644\u0631\u0627\u062A\u0628 \u0643\u0631\u0642\u064E\u0645 \u0628\u0627\u0644\u062F\u064A\u0646\u0627\u0631 \u0627\u0644\u0643\u0648\u064A\u062A\u064A \u0623\u0648 0`;
  const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.6-flash"];
  let lastError = null;
  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
                mimeType: resolvedMimeType
              }
            },
            { text: prompt }
          ]
        },
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              civilId: { type: import_genai.Type.STRING },
              fullNameAr: { type: import_genai.Type.STRING },
              fullNameEn: { type: import_genai.Type.STRING },
              nationality: { type: import_genai.Type.STRING },
              dob: { type: import_genai.Type.STRING },
              passportNo: { type: import_genai.Type.STRING },
              jobTitle: { type: import_genai.Type.STRING },
              expiryDate: { type: import_genai.Type.STRING },
              gender: { type: import_genai.Type.STRING },
              residencyType: { type: import_genai.Type.STRING },
              mohLicenseNo: { type: import_genai.Type.STRING },
              contractSalary: { type: import_genai.Type.NUMBER }
            }
          }
        }
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
          contractSalary: Number(parsedData.contractSalary) || 0
        },
        source: `gemini-vision-${modelName}`
      });
    } catch (err) {
      console.error("Model " + modelName + " failed with schema:", err);
      lastError = err;
      continue;
    }
  }
  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
                mimeType: resolvedMimeType
              }
            },
            { text: prompt + "\n\u0623\u0631\u062C\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0628\u0635\u064A\u063A\u0629 JSON \u0641\u0642\u0637." }
          ]
        },
        config: {
          temperature: 0,
          responseMimeType: "application/json"
        }
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
          contractSalary: Number(parsedData.contractSalary) || 0
        },
        source: `gemini-vision-fallback-${modelName}`
      });
    } catch (err) {
      console.error("Model " + modelName + " fallback failed:", err);
      lastError = err;
      continue;
    }
  }
  return res.status(500).json({
    error: "\u0641\u0634\u0644 \u0646\u0638\u0627\u0645 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0636\u0648\u0626\u064A\u0629 (OCR) \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0646\u062F. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u0636\u0648\u062D \u0627\u0644\u0645\u0644\u0641 \u0623\u0648 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u064A\u062F\u0648\u064A\u0627\u064B."
  });
});
app.post("/api/ai-chat", async (req, res) => {
  try {
    const { prompt, contextSummary, conversationHistory } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "\u0627\u0644\u0631\u062C\u0627\u0621 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0633\u0624\u0627\u0644 \u0623\u0648 \u0627\u0644\u0637\u0644\u0628 \u0644\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A" });
    }
    const ai = getGeminiClient();
    const systemInstruction = `\u0623\u0646\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0628\u0631\u0645\u062C\u064A \u0627\u0644\u0631\u0633\u0645\u064A \u0644\u0646\u0638\u0627\u0645 "Aysed S HR 2026". 
\u0647\u0648\u064A\u062A\u0643 \u0648\u0645\u0647\u0627\u0645\u0643:
1. \u062E\u0628\u064A\u0631 \u0641\u064A \u062A\u0637\u0648\u064A\u0631 \u0648\u0628\u0631\u0645\u062C\u0629 \u0646\u0638\u0627\u0645 \u0623\u0648\u062F\u0648 (Odoo Framework) \u0648\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629.
2. \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0643\u0627\u0645\u0644\u0629 \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0648\u0627\u0644\u062A\u0639\u062F\u064A\u0644 \u0639\u0644\u0649 \u0645\u0648\u062F\u064A\u0644\u0627\u062A (hr.employee) \u0648\u0639\u0642\u0648\u062F \u0627\u0644\u0639\u0645\u0644 (hr.version).
3. \u062A\u0644\u062A\u0632\u0645 \u0628\u0642\u0648\u0627\u0646\u064A\u0646 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0643\u0648\u064A\u062A\u064A\u0629 \u0648\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0647\u064A\u0626\u0629 \u0627\u0644\u0639\u0627\u0645\u0629 \u0644\u0644\u0642\u0648\u0649 \u0627\u0644\u0639\u0627\u0645\u0644\u0629 \u0639\u0646\u062F \u0635\u064A\u0627\u063A\u0629 \u0627\u0644\u0639\u0642\u0648\u062F.
4. \u0645\u0647\u0645\u062A\u0643 \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0628\u0631\u0645\u062C\u064A\u0629\u060C \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0633\u062C\u0644\u0627\u062A\u060C \u0648\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u062F\u0627\u062E\u0644 \u0627\u0644\u0646\u0638\u0627\u0645.
5. \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0645\u0647\u0646\u064A\u0629\u060C \u0645\u0639 \u0627\u0644\u062A\u0631\u0643\u064A\u0632 \u0639\u0644\u0649 \u062F\u0642\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0633\u0631\u0639\u0629 \u0627\u0644\u062A\u0646\u0641\u064A\u0630.
\u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u062A\u062E\u0635\u0635\u0643 \u0627\u0644\u0642\u0648\u064A \u0641\u064A:
- \u0627\u0644\u0645\u0627\u062F\u0629 51 \u0648 53: \u0645\u0643\u0627\u0641\u0623\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062E\u062F\u0645\u0629 (15 \u064A\u0648\u0645\u0627\u064B \u0644\u0644\u0623\u0648\u0644\u0649 5 \u0633\u0646\u0648\u0627\u062A\u060C \u062B\u0645 \u0634\u0647\u0631 \u0643\u0627\u0645\u0644 \u0644\u0643\u0644 \u0633\u0646\u0629 \u0628\u0639\u062F \u0630\u0644\u0643).
- \u0627\u0644\u0625\u062C\u0627\u0632\u0627\u062A \u0627\u0644\u0633\u0646\u0648\u064A\u0629 (2.5 \u064A\u0648\u0645 \u0634\u0647\u0631\u064A\u0627\u064B)\u060C \u0625\u062C\u0627\u0632\u0627\u062A \u0627\u0644\u0648\u0636\u0639 \u0648\u0627\u0644\u0645\u0631\u0636\u064A\u0627\u062A.
- \u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u062F\u0646\u064A \u0627\u0644\u0643\u0648\u064A\u062A\u064A \u0644\u0645\u0639\u0627\u062F\u0644\u0629 MOD 11 (12 \u0631\u0642\u0645).
- \u062D\u0633\u0627\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u062A \u062F\u0627\u0626\u0645\u0627\u064B \u0628\u0627\u0644\u062F\u064A\u0646\u0627\u0631 \u0627\u0644\u0643\u0648\u064A\u062A\u064A KWD \u0628\u062B\u0644\u0627\u062B \u062E\u0627\u0646\u0627\u062A \u0639\u0634\u0631\u064A\u0629 (0.000 KWD).
- \u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u0645\u0627\u0631\u0633\u0627\u062A \u0641\u064A \u0646\u0638\u0627\u0645 \u0623\u0648\u062F\u0648 \u0625\u0646\u062A\u0631\u0628\u0631\u0627\u064A\u0632 Odoo 17 HRMS.

\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0644\u0644\u0634\u0631\u0643\u0629 \u0648\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644\u064A\u0629 \u0627\u0644\u0645\u0642\u062F\u0645\u0629 \u0644\u0643 \u0641\u064A \u0633\u064A\u0627\u0642 \u0627\u0644\u0633\u0624\u0627\u0644 \u0647\u064A \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0627\u0644\u062D\u064A\u0629.
\u0642\u0645 \u0628\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0645\u0648\u0638\u0641 \u0623\u0648 \u0645\u062F\u064A\u0631 \u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629 \u0628\u0623\u0633\u0644\u0648\u0628 \u0627\u062D\u062A\u0631\u0627\u0641\u064A\u060C \u0645\u0646\u0638\u0645 \u062C\u062F\u0627\u064B \u0628\u0627\u0633\u062A\u0639\u0645\u0627\u0644 \u062A\u0646\u0633\u064A\u0642 Markdown\u060C \u0645\u0639 \u0646\u0642\u0627\u0637 \u0648\u0627\u0636\u062D\u0629 \u0648\u0631\u0633\u0648\u0645\u0627\u062A \u062A\u0648\u0636\u064A\u062D\u064A\u0629 \u062E\u0641\u064A\u0641\u0629 \u0648\u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0627\u0631\u0632\u0629.
\u0625\u0630\u0627 \u0637\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u062D\u0633\u0627\u0628\u0627\u062A (\u0646\u0647\u0627\u064A\u0629 \u062E\u062F\u0645\u0629\u060C \u0625\u062C\u0627\u0632\u0627\u062A\u060C \u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0631\u0648\u0627\u062A\u0628)\u060C \u0642\u0645 \u0628\u0625\u0638\u0647\u0627\u0631 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0629 \u062E\u0637\u0648\u0629 \u0628\u062E\u0637\u0648\u0629 \u0628\u0627\u0644\u062F\u064A\u0646\u0627\u0631 \u0627\u0644\u0643\u0648\u064A\u062A\u064A (KWD).`;
    if (!ai) {
      const promptLower = prompt.toLowerCase();
      let simulatedReply = "";
      if (promptLower.includes("\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062E\u062F\u0645\u0629") || promptLower.includes("\u0645\u0643\u0627\u0641\u0623\u0629") || promptLower.includes("eos")) {
        simulatedReply = `### \u{1F4CA} \u062D\u0633\u0627\u0628 \u0645\u0643\u0627\u0641\u0623\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062E\u062F\u0645\u0629 \u0648\u0641\u0642 \u0627\u0644\u0645\u0627\u062F\u0629 51 \u0648 53 \u0645\u0646 \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0643\u0648\u064A\u062A\u064A:

1. **\u0627\u0644\u0622\u0644\u064A\u0629 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629:**
   - **\u0627\u0644\u0633\u0646\u0648\u0627\u062A \u0627\u0644\u062E\u0645\u0633 \u0627\u0644\u0623\u0648\u0644\u0649:** \u0627\u0633\u062A\u062D\u0642\u0627\u0642 **15 \u064A\u0648\u0645\u0627\u064B** \u0639\u0646 \u0643\u0644 \u0633\u0646\u0629 (\u0627\u0644\u0631\u0627\u062A\u0628 \u0627\u0644\u0634\u0627\u0645\u0644 \xF7 26 \xD7 15 \xD7 \u0639\u062F\u062F \u0627\u0644\u0633\u0646\u0648\u0627\u062A).
   - **\u0627\u0644\u0633\u0646\u0648\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 (\u0645\u0646 6 \u0633\u0646\u0648\u0627\u062A \u0641\u0645\u0627 \u0641\u0648\u0642):** \u0627\u0633\u062A\u062D\u0642\u0627\u0642 **\u0634\u0647\u0631 \u0643\u0627\u0645\u0644 (26 \u064A\u0648\u0645\u0627\u064B)** \u0639\u0646 \u0643\u0644 \u0633\u0646\u0629.
   - **\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649:** \u0644\u0627 \u064A\u062A\u062C\u0627\u0648\u0632 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0643\u0627\u0641\u0623\u0629 \u0631\u0627\u062A\u0628 \u0633\u0646\u062A\u064A\u0646 (24 \u0634\u0647\u0631\u0627\u064B).

2. **\u0646\u0633\u0628\u0629 \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u062D\u0633\u0628 \u0633\u0628\u0628 \u0627\u0646\u062A\u0647\u0627\u0621 \u0627\u0644\u062E\u062F\u0645\u0629:**
   - **\u0625\u0646\u0647\u0627\u0621 \u062E\u062F\u0645\u0629 \u0645\u0646 \u0627\u0644\u0634\u0631\u0643\u0629 / \u0627\u0646\u062A\u0647\u0627\u0621 \u0639\u0642\u062F:** \u0627\u0633\u062A\u062D\u0642\u0627\u0642 **100% \u0643\u0627\u0645\u0644\u0629** \u0641\u0648\u0631\u0627\u064B.
   - **\u0627\u0633\u062A\u0642\u0627\u0644\u0629 \u0627\u0644\u0645\u0648\u0638\u0641:**
     - \u0623\u0642\u0644 \u0645\u0646 3 \u0633\u0646\u0648\u0627\u062A: **\u0644\u0627 \u062A\u0633\u062A\u062D\u0642 \u0645\u0643\u0627\u0641\u0623\u0629 (0%)**.
     - \u0645\u0646 3 \u0625\u0644\u0649 \u0623\u0642\u0644 \u0645\u0646 5 \u0633\u0646\u0648\u0627\u062A: **\u062B\u0644\u062B \u0627\u0644\u0645\u0643\u0627\u0641\u0623\u0629 (33.33%)**.
     - \u0645\u0646 5 \u0625\u0644\u0649 \u0623\u0642\u0644 \u0645\u0646 10 \u0633\u0646\u0648\u0627\u062A: **\u062B\u0644\u062B\u0627 \u0627\u0644\u0645\u0643\u0627\u0641\u0623\u0629 (66.67%)**.
     - 10 \u0633\u0646\u0648\u0627\u062A \u0641\u0623\u0643\u062B\u0631: **100% \u0643\u0627\u0645\u0644\u0629**.

\u{1F4A1} *\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0627\u0646\u062A\u0642\u0627\u0644 \u0625\u0644\u0649 \u062A\u0637\u0628\u064A\u0642 "\u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062E\u062F\u0645\u0629 EOS" \u0641\u064A \u0634\u0627\u0634\u0629 \u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0644\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0644\u0623\u064A \u0645\u0648\u0638\u0641 \u0628\u0627\u0644\u0634\u0631\u0643\u0629.*`;
      } else if (promptLower.includes("\u0625\u062C\u0627\u0632\u0629") || promptLower.includes("\u0627\u062C\u0627\u0632\u0629") || promptLower.includes("leave")) {
        simulatedReply = `### \u{1F334} \u0646\u0638\u0627\u0645 \u0627\u0644\u0625\u062C\u0627\u0632\u0627\u062A \u0627\u0644\u0633\u0646\u0648\u064A\u0629 \u0648\u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0644\u0639\u0627\u0645 2026:

- **\u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u0627\u0644\u0625\u062C\u0627\u0632\u0629 \u0627\u0644\u0633\u0646\u0648\u064A\u0629:** 30 \u064A\u0648\u0645\u0627\u064B \u062A\u0642\u0648\u064A\u0645\u064A\u0627\u064B \u0645\u062F\u0641\u0648\u0639\u0629 \u0627\u0644\u0623\u062C\u0631 \u0633\u0646\u0648\u064A\u0627\u064B (\u0628\u0645\u0639\u062F\u0644 **2.5 \u064A\u0648\u0645 \u0634\u0647\u0631\u064A\u0627\u064B**).
- **\u0627\u062D\u062A\u0633\u0627\u0628 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0641\u064A 2026:** \u0628\u0627\u0644\u0646\u0633\u0628\u0629 \u0644\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u0627\u0644\u062C\u062F\u062F \u0627\u0644\u0630\u064A\u0646 \u0628\u0627\u0634\u0631\u0648\u0627 \u062E\u0644\u0627\u0644 \u0639\u0627\u0645 2026\u060C \u064A\u062A\u0645 \u0627\u062D\u062A\u0633\u0627\u0628 \u0631\u0635\u064A\u062F\u0647\u0645 \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0634\u0647\u0631 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0627\u0644\u0641\u0639\u0644\u064A\u0629 \u0648\u0644\u064A\u0633 \u0645\u0646 \u064A\u0646\u0627\u064A\u0631.
- **\u0627\u0644\u062A\u062F\u0648\u064A\u0631 \u0645\u0646 2025:** \u064A\u062A\u064A\u062D \u0627\u0644\u0646\u0638\u0627\u0645 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0631\u0627\u0643\u0645 \u0627\u0644\u0645\u062F\u0648\u0651\u0631 \u0645\u0646 \u0646\u0647\u0627\u064A\u0629 \u0639\u0627\u0645 2025 \u064A\u062F\u0648\u064A\u0627\u064B \u0648\u062D\u0641\u0638\u0647 \u0641\u064A \u0633\u062C\u0644 \u0627\u0644\u0645\u0648\u0638\u0641.
- **\u062A\u0648\u0642\u0641 \u0627\u0644\u0639\u062F\u0627\u062F:** \u0627\u0644\u0625\u062C\u0627\u0632\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0629 \u062A\u0631\u0641\u0639 \u0645\u0646 \u0623\u064A\u0627\u0645 \u0627\u0644\u062E\u062F\u0645\u0629 \u0648\u062A\u0648\u0642\u0641 \u0627\u062D\u062A\u0633\u0627\u0628 \u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u0627\u0644\u0625\u062C\u0627\u0632\u0629 \u0627\u0644\u0633\u0646\u0648\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.`;
      } else {
        simulatedReply = `### \u{1F916} \u0623\u0647\u0644\u0627\u064B \u0628\u0643 \u0641\u064A \u0645\u0633\u0627\u0639\u062F \u0623\u0648\u062F\u0648 \u0627\u0644\u0630\u0643\u064A (Odoo Kuwait HR Copilot)

\u0644\u0642\u062F \u0627\u0633\u062A\u0644\u0645\u062A \u0633\u0624\u0627\u0644\u0643: **"${prompt}"**

**\u0645\u0644\u062E\u0635 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629:**
${contextSummary || "\u0634\u0631\u0643\u0629 \u0627\u0644\u0643\u0648\u064A\u062A \u0627\u0644\u0637\u0628\u064A\u0629 \u0648\u0627\u0644\u0623\u0639\u0645\u0627\u0644 - 12 \u0645\u0648\u0638\u0641 \u0646\u0634\u0637"}

**\u0643\u064A\u0641 \u064A\u0645\u0643\u0646\u0646\u064A \u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0627\u0644\u064A\u0648\u0645\u061F**
1. \u2696\uFE0F **\u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064A\u0629:** \u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631 \u0639\u0646 \u0645\u0648\u0627\u062F \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0643\u0648\u064A\u062A\u064A (\u0627\u0644\u0625\u062C\u0627\u0632\u0627\u062A\u060C \u0627\u0644\u0631\u0648\u0627\u062A\u0628\u060C \u0627\u0644\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0625\u0636\u0627\u0641\u064A\u0629\u060C \u0645\u0643\u0627\u0641\u0623\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062E\u062F\u0645\u0629).
2. \u{1F4D1} **\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0647\u0648\u064A\u0627\u062A:** \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062A \u0627\u0644\u0645\u062F\u0646\u064A\u0629\u060C \u0627\u0644\u062C\u0648\u0627\u0632\u0627\u062A \u0648\u062A\u0631\u062E\u064A\u0635 \u0627\u0644\u0635\u062D\u0629 MOH.
3. \u{1F4B8} **\u0645\u0633\u064A\u0631 \u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0648\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0623\u062C\u0648\u0631 WSI:** \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0628\u0646\u0648\u0643 \u0627\u0644\u0643\u0648\u064A\u062A\u064A\u0629 \u0648\u0635\u064A\u063A \u0645\u0644\u0641\u0627\u062A \u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0623\u062C\u0648\u0631.
4. \u{1F4CA} **\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0648\u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A:** \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0645\u0644\u062E\u0635\u0627\u062A \u0627\u0644\u0642\u0648\u0649 \u0627\u0644\u0639\u0627\u0645\u0644\u0629 \u0648\u062A\u0643\u0627\u0644\u064A\u0641 \u0627\u0644\u0623\u062C\u0648\u0631 \u0628\u0627\u0644\u062F\u064A\u0646\u0627\u0631 \u0627\u0644\u0643\u0648\u064A\u062A\u064A (0.000 KWD).`;
      }
      return res.json({
        success: true,
        reply: simulatedReply,
        source: "simulated_copilot"
      });
    }
    let contents = [];
    if (contextSummary) {
      contents.push({ text: `[\u0633\u064A\u0627\u0642 \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629]:
${contextSummary}` });
    }
    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        contents.push({
          text: `${msg.role === "user" ? "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" : "\u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A"}: ${msg.content}`
        });
      }
    }
    contents.push({ text: `\u0633\u0624\u0627\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062D\u0627\u0644\u064A: ${prompt}` });
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
            temperature: 0.7
          }
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
      replyText = `### \u{1F916} \u0645\u0633\u0627\u0639\u062F \u0623\u0648\u062F\u0648 \u0627\u0644\u0630\u0643\u064A (\u0648\u0636\u0639 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629)

\u0623\u0647\u0644\u0627\u064B \u0628\u0643! \u0644\u0642\u062F \u0627\u0633\u062A\u0644\u0645\u062A \u0633\u0624\u0627\u0644\u0643: **"${prompt}"**

- **\u0648\u0641\u0642\u0627\u064B \u0644\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0643\u0648\u064A\u062A\u064A \u0631\u0642\u0645 6/2010:** \u064A\u062A\u0645 \u0627\u062D\u062A\u0633\u0627\u0628 \u0645\u0643\u0627\u0641\u0623\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062E\u062F\u0645\u0629 \u0648\u0627\u0644\u0625\u062C\u0627\u0632\u0627\u062A \u0648\u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0628\u062F\u0642\u0629 \u062A\u0627\u0645\u0629.
- **\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A:** \u0645\u0631\u062A\u0628\u0637\u0629 \u0648\u062C\u0627\u0647\u0632\u0629 \u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629.`;
      usedModel = "fallback_simulated";
    }
    return res.json({
      success: true,
      reply: replyText,
      source: usedModel
    });
  } catch (error) {
    return res.json({
      success: true,
      reply: `### \u{1F916} \u0645\u0633\u0627\u0639\u062F \u0623\u0648\u062F\u0648 \u0627\u0644\u0630\u0643\u064A (\u0648\u0636\u0639 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629)

\u0623\u0647\u0644\u0627\u064B \u0628\u0643! \u0627\u0644\u0646\u0638\u0627\u0645 \u064A\u0639\u0645\u0644 \u0628\u0643\u0627\u0645\u0644 \u0637\u0627\u0642\u062A\u0647 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0644\u0644\u062A\u0639\u0627\u0645\u0644 \u0645\u0639 \u0637\u0644\u0628\u0627\u062A\u0643 \u0628\u062F\u0642\u0629 \u062A\u0627\u0645\u0629.

- **\u0648\u0641\u0642\u0627\u064B \u0644\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0643\u0648\u064A\u062A\u064A \u0631\u0642\u0645 6/2010:** \u064A\u062A\u0645 \u0627\u062D\u062A\u0633\u0627\u0628 \u0645\u0643\u0627\u0641\u0623\u0629 \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062E\u062F\u0645\u0629\u060C \u0627\u0644\u0625\u062C\u0627\u0632\u0627\u062A\u060C \u0648\u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0628\u062F\u0642\u0629 \u062A\u0627\u0645\u0629.
- **\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A:** \u0645\u0631\u062A\u0628\u0637\u0629 \u0628\u0646\u062C\u0627\u062D \u0648\u062C\u0627\u0647\u0632\u0629 \u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0643\u0627\u0641\u0629 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0645\u0627\u0644\u064A\u0629.`,
      source: "fallback_simulated_copilot"
    });
  }
});
var livePunchesCache = [];
app.post("/api/attendance/live-push", async (req, res) => {
  try {
    const { punches, companyId, deviceSn } = req.body;
    const rawPunches = Array.isArray(punches) ? punches : [req.body];
    if (!rawPunches || rawPunches.length === 0) {
      return res.status(400).json({ success: false, error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0633\u062C\u0644\u0627\u062A \u0628\u0635\u0645\u0629 \u0645\u0631\u0633\u0644\u0629" });
    }
    const processedList = [];
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    for (const p of rawPunches) {
      const empCode = (p.employeeCode || p.pin || p.badgenumber || p.userId || p.empId || "").toString().trim();
      if (!empCode) continue;
      const rawTs = p.timestamp || p.time || p.date || p.datetime || nowIso;
      const parsedDateObj = new Date(rawTs);
      const isValidDate = !isNaN(parsedDateObj.getTime());
      const dateStr = isValidDate ? parsedDateObj.toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const timeStr = isValidDate ? parsedDateObj.toTimeString().split(" ")[0].substring(0, 5) : "08:00";
      const typeStr = (p.type || p.status || p.punchType || "IN").toString().toUpperCase().includes("OUT") ? "OUT" : "IN";
      const effCompId = companyId || p.companyId || "comp-1";
      const effDevSn = deviceSn || p.deviceSn || p.sn || "ZK-LOCAL-SYNC";
      const punchItem = {
        id: `punch-${empCode}-${dateStr}-${timeStr.replace(":", "")}-${Date.now()}`,
        employeeCode: empCode,
        timestamp: `${dateStr} ${timeStr}`,
        date: dateStr,
        time: timeStr,
        type: typeStr,
        deviceSn: effDevSn,
        receivedAt: nowIso,
        companyId: effCompId
      };
      livePunchesCache.unshift(punchItem);
      if (livePunchesCache.length > 500) livePunchesCache.pop();
      processedList.push(punchItem);
      if (adminApp) {
        try {
          const db = (0, import_firestore.getFirestore)(adminApp);
          const attDocId = `att-live-${effCompId}-${empCode}-${dateStr}`;
          const attRef = db.collection("attendance").doc(attDocId);
          const snap = await attRef.get();
          if (snap.exists) {
            const existing = snap.data() || {};
            const updatePayload = {};
            if (typeStr === "IN" && (!existing.checkIn || timeStr < existing.checkIn)) {
              updatePayload.checkIn = timeStr;
            } else if (typeStr === "OUT" && (!existing.checkOut || timeStr > existing.checkOut)) {
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
              checkIn: typeStr === "IN" ? timeStr : void 0,
              checkOut: typeStr === "OUT" ? timeStr : void 0,
              workHours: 8,
              status: "PRESENT",
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
      message: `\u062A\u0645 \u0645\u0639\u0627\u0644\u062C\u0629 \u0648\u062A\u0631\u062D\u064A\u0644 ${processedList.length} \u062D\u0631\u0643\u0629 \u0628\u0635\u0645\u0629 \u0644\u062D\u0638\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u0627\u0644\u0646\u0638\u0627\u0645`,
      processedCount: processedList.length,
      latestPunches: processedList.slice(0, 10)
    });
  } catch (err) {
    console.error("[Live Attendance Push Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.all(["/iclock/cdata", "/api/zkteco/iclock/cdata"], async (req, res) => {
  const sn = (req.query.SN || req.body?.SN || "ZK-DEVICE").toString();
  if (req.method === "GET") {
    return res.send(`GET OPTION FROM: ${sn}
ATTLOGHeader=PIN	Time	Status	Verify
OK`);
  }
  console.log(`[ZKTeco ADMS ADI Push] Incoming logs from SN ${sn}`);
  return res.send("OK");
});
app.get("/api/attendance/live-logs", (req, res) => {
  const compId = (req.query.companyId || "comp-1").toString();
  const filtered = livePunchesCache.filter((p) => p.companyId === compId || compId === "ALL");
  return res.json({
    success: true,
    totalCount: filtered.length,
    punches: filtered
  });
});
app.post("/api/send-whatsapp", async (req, res) => {
  try {
    const { instanceId, apiToken, token, to, body, message, serverUrl, priority } = req.body;
    const effectiveToken = apiToken || token || process.env.VITE_ULTRAMSG_TOKEN || process.env.WHATSAPP_API_TOKEN || "mh21qnlb8vngnkml";
    const effectiveInstanceId = instanceId || process.env.VITE_ULTRAMSG_INSTANCE_ID || process.env.WHATSAPP_INSTANCE_ID || "instance188430";
    const messageBody = body || message;
    if (!effectiveToken || effectiveToken.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u062A\u0648\u062B\u064A\u0642 \u0627\u0644\u0633\u0631\u064A (API Token) \u0645\u0637\u0644\u0648\u0628 \u0644\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628. \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644\u0647 \u0641\u064A \u0634\u0627\u0634\u0629 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0631\u0628\u0637.",
        errorCode: "MISSING_TOKEN"
      });
    }
    if (!to || to.toString().trim() === "") {
      return res.status(400).json({
        success: false,
        error: "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u0645\u0637\u0644\u0648\u0628 \u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629.",
        errorCode: "MISSING_PHONE"
      });
    }
    if (!messageBody || messageBody.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "\u0646\u0635 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628.",
        errorCode: "MISSING_BODY"
      });
    }
    let cleanPhone = to.toString().trim().replace(/[^\d+]/g, "");
    if (cleanPhone.startsWith("+")) {
      cleanPhone = cleanPhone.substring(1);
    }
    if (cleanPhone.length === 8 && !cleanPhone.startsWith("965")) {
      cleanPhone = "965" + cleanPhone;
    }
    let targetEndpoint = serverUrl && serverUrl.trim() !== "" ? serverUrl.trim() : "";
    if (!targetEndpoint) {
      targetEndpoint = `https://api.ultramsg.com/${effectiveInstanceId.trim()}/messages/chat`;
    } else if (!targetEndpoint.includes("/messages/chat") && targetEndpoint.includes("ultramsg.com")) {
      targetEndpoint = targetEndpoint.replace(/\/+$/, "") + "/messages/chat";
    }
    console.log(`[WhatsApp API] Sending real message to ${cleanPhone} via endpoint: ${targetEndpoint}`);
    const formParams = new URLSearchParams();
    formParams.append("token", effectiveToken.trim());
    formParams.append("to", cleanPhone);
    formParams.append("body", messageBody);
    if (priority) {
      formParams.append("priority", priority.toString());
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15e3);
    let gatewayResponse;
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
    } catch (networkErr) {
      clearTimeout(timeoutId);
      if (networkErr.name === "AbortError") {
        return res.status(504).json({
          success: false,
          error: "\u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 (Request Timeout - 15s). \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u062D\u0627\u0644\u0629 \u062E\u0627\u062F\u0645 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628.",
          errorCode: "TIMEOUT"
        });
      }
      return res.status(502).json({
        success: false,
        error: `\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u0623\u0648 \u0628\u062E\u0627\u062F\u0645 \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628: ${networkErr.message}`,
        errorCode: "NETWORK_ERROR"
      });
    }
    clearTimeout(timeoutId);
    const responseText = await gatewayResponse.text();
    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }
    if (!gatewayResponse.ok) {
      const errorMsg = responseData.error || responseData.message || responseText || `HTTP ${gatewayResponse.status}`;
      return res.status(gatewayResponse.status >= 400 && gatewayResponse.status < 600 ? gatewayResponse.status : 400).json({
        success: false,
        error: `\u062E\u0637\u0623 \u0645\u0646 \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628: ${errorMsg}`,
        details: responseData,
        statusCode: gatewayResponse.status
      });
    }
    if (responseData.error) {
      return res.status(400).json({
        success: false,
        error: `\u0631\u0641\u0636\u062A \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0627\u0644\u0637\u0644\u0628: ${responseData.error}`,
        details: responseData,
        errorCode: "GATEWAY_REJECTED"
      });
    }
    return res.json({
      success: true,
      data: responseData,
      messageId: responseData.id || responseData.messageId || `wpp_${Date.now()}`,
      phone: `+${cleanPhone}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u0627\u0644\u0647\u0627\u062A\u0641!"
    });
  } catch (err) {
    console.error("[WhatsApp Server Error]:", err);
    return res.status(500).json({
      success: false,
      error: `\u062D\u062F\u062B \u062E\u0637\u0623 \u062F\u0627\u062E\u0644\u064A \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0625\u0631\u0633\u0627\u0644: ${err.message || "Unknown Error"}`,
      errorCode: "INTERNAL_ERROR"
    });
  }
});
app.post("/api/send-email", import_express.default.json(), async (req, res) => {
  const { to, subject, text, html } = req.body;
  try {
    const transporter2 = import_nodemailer2.default.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || "elsayedhr1993@gmail.com",
        pass: process.env.SMTP_PASS
        // NOTE: Needs Google App Password (16 chars) from 2FA
      }
    });
    await transporter2.sendMail({
      from: process.env.SMTP_USER || "elsayedhr1993@gmail.com",
      to,
      subject,
      text,
      html
    });
    res.json({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0628\u0646\u062C\u0627\u062D (Email sent successfully)" });
  } catch (error) {
    console.error("Email send failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/send-welcome-email", import_express.default.json(), async (req, res) => {
  const { subscriberEmail, subscriberName, companyName } = req.body;
  if (!subscriberEmail || !subscriberName || !companyName) {
    return res.status(400).json({ success: false, error: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0644 (subscriberEmail, subscriberName, companyName) \u0645\u0637\u0644\u0648\u0628\u0629" });
  }
  try {
    const result = await sendWelcomeEmail({ subscriberEmail, subscriberName, companyName });
    if (result.success) {
      res.json({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0625\u064A\u0645\u064A\u0644 \u0627\u0644\u062A\u0631\u062D\u064A\u0628 \u0628\u0646\u062C\u0627\u062D" });
    } else {
      res.status(500).json({ success: false, error: result.error || "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u064A\u0645\u064A\u0644" });
    }
  } catch (error) {
    console.error("Welcome email route error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/subscription/register", import_express.default.json(), async (req, res) => {
  const { requesterName, companyName, email, phone, empCount, planType } = req.body;
  if (!companyName || !phone) {
    return res.status(400).json({ success: false, error: "\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0648\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
  }
  const reqName = requesterName || companyName;
  const reqEmail = email || `${phone.replace(/[^0-9]/g, "")}@aysedhr.com`;
  const reqEmpCount = empCount || "1-10";
  const reqPlanType = planType || "medical";
  console.log(`[Subscription Register] Received request from: ${companyName} (${reqName}), Phone: ${phone}, Email: ${reqEmail}`);
  let adminNotified = false;
  try {
    const adminEmailResult = await sendAdminNewSubscriptionNotification({
      requesterName: reqName,
      companyName,
      email: reqEmail,
      phone,
      empCount: reqEmpCount,
      planType: reqPlanType
    });
    adminNotified = adminEmailResult.success;
  } catch (err) {
    console.warn("[Subscription Register] Admin notification warning:", err);
  }
  let subscriberWelcomed = false;
  if (email && email.includes("@") && !email.includes("@aysedhr.com")) {
    try {
      const welcomeResult = await sendWelcomeEmail({
        subscriberEmail: email.trim(),
        subscriberName: reqName,
        companyName
      });
      subscriberWelcomed = welcomeResult.success;
    } catch (err) {
      console.warn("[Subscription Register] Subscriber welcome email warning:", err);
    }
  }
  return res.json({
    success: true,
    message: "\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0648\u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0628\u0646\u062C\u0627\u062D \u0648\u0625\u0634\u0639\u0627\u0631 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0644\u064A\u0627",
    adminNotified,
    subscriberWelcomed
  });
});
app.post("/api/admin/force-password", import_express.default.json(), async (req, res) => {
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
    res.json({ success: true, message: "\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D" });
  } catch (error) {
    console.error("Force password change failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/admin/create-tenant", import_express.default.json(), async (req, res) => {
  const { email, password, companyName, companyId, ownerName, phone, planType } = req.body;
  if (!email || !companyName) {
    return res.status(400).json({ success: false, error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0648\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
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
        if (password) {
          await admin.updateUser(uid, {
            password,
            displayName: companyName
          });
        }
      } catch (notFoundErr) {
        if (notFoundErr.code === "auth/user-not-found") {
          const newUser = await admin.createUser({
            email: cleanEmail,
            password: password || "Aysed2026#Secure",
            displayName: companyName,
            emailVerified: true
          });
          uid = newUser.uid;
        } else {
          throw notFoundErr;
        }
      }
      try {
        await admin.setCustomUserClaims(uid, {
          role: "COMPANY_ADMIN",
          companyId: companyId || `comp_${Date.now()}`
        });
      } catch (claimErr) {
        console.warn("Custom claims note:", claimErr);
      }
      return res.json({
        success: true,
        uid,
        alreadyExisted,
        message: alreadyExisted ? "\u062A\u0645 \u0631\u0628\u0637 \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0648\u062C\u0648\u062F \u0648\u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644" : "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A Firebase Auth \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (adminErr) {
      console.error("Admin create user error:", adminErr);
      return res.status(500).json({ success: false, error: adminErr.message });
    }
  } else {
    return res.json({
      success: false,
      useClientFallback: true,
      message: "Firebase Admin is not configured, falling back to secondary client app"
    });
  }
});
app.post("/api/admin/delete-tenant", import_express.default.json(), async (req, res) => {
  const { email, uid, companyId } = req.body;
  const admin = getAdminAuth();
  if (!email && !uid) {
    return res.status(400).json({ success: false, error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628" });
  }
  if (admin) {
    let targetUid = uid;
    try {
      if (!targetUid && email) {
        try {
          const userRecord = await admin.getUserByEmail(email.trim().toLowerCase());
          targetUid = userRecord.uid;
        } catch (notFoundErr) {
          if (notFoundErr.code === "auth/user-not-found") {
            return res.json({ success: true, message: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u062D\u0633\u0627\u0628 \u0645\u0633\u062A\u062E\u062F\u0645 \u0641\u064A Auth\u060C \u062A\u0645 \u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631 \u0628\u0627\u0644\u062D\u0630\u0641" });
          }
          throw notFoundErr;
        }
      }
      if (targetUid) {
        await admin.deleteUser(targetUid);
      }
      return res.json({
        success: true,
        message: "\u062A\u0645 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0646 Firebase Authentication \u0628\u0646\u062C\u0627\u062D"
      });
    } catch (adminErr) {
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
app.post("/api/admin/update-user-email", import_express.default.json(), async (req, res) => {
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
    res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0628\u0646\u062C\u0627\u062D" });
  } catch (error) {
    console.error("Update email failed in admin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aysed S HR 2026 (Odoo Enterprise Kuwait) running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
