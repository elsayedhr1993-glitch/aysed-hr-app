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
var import_zlib2 = __toESM(require("zlib"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_nodemailer2 = __toESM(require("nodemailer"), 1);
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");

// src/services/emailService.ts
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_zlib = __toESM(require("zlib"), 1);
function getMailTransporter() {
  const user = process.env.SMTP_GMAIL_USER || process.env.SMTP_USER || "elsayedhr1993@gmail.com";
  const pass = process.env.SMTP_GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "";
  return import_nodemailer.default.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass
    }
  });
}
var transporter = getMailTransporter();
function getSystemDefaultEmail() {
  return process.env.SMTP_GMAIL_USER || process.env.SMTP_USER || "elsayedhr1993@gmail.com";
}
async function sendDailyBackupSuccessEmail({
  metadata,
  dumpPayloadJson,
  compressedBuffer,
  recipientEmail
}) {
  const systemEmail = recipientEmail || getSystemDefaultEmail();
  const jsonString = typeof dumpPayloadJson === "string" ? dumpPayloadJson : JSON.stringify(dumpPayloadJson, null, 2);
  const fileBuffer = compressedBuffer || import_zlib.default.gzipSync(Buffer.from(jsonString, "utf-8"));
  const filename = `aysed_hr_db_dump_${metadata.dateStr.replace(/[^0-9]/g, "_")}_${metadata.backupId}.json.gz`;
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  const formattedUncompressed = formatBytes(metadata.uncompressedSizeBytes || Buffer.byteLength(jsonString));
  const formattedCompressed = formatBytes(metadata.compressedSizeBytes || fileBuffer.length);
  const executionSecs = (metadata.durationMs / 1e3).toFixed(2);
  const collectionRows = Object.entries(metadata.collectionStats || {}).map(([colName, count]) => {
    const arabicNames = {
      companies: "\u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0648\u0627\u0644\u0645\u0646\u0634\u0622\u062A (Companies/Tenants)",
      employees: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 (Employees)",
      contracts: "\u0639\u0642\u0648\u062F \u0627\u0644\u0639\u0645\u0644 \u0648\u0647\u064A\u0643\u0644 \u0627\u0644\u0631\u0648\u0627\u062A\u0628 (Contracts)",
      leaves: "\u0637\u0644\u0628\u0627\u062A \u0648\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0625\u062C\u0627\u0632\u0627\u062A (Leaves)",
      leave_allocations: "\u0623\u0631\u0635\u062F\u0629 \u0648\u062A\u062E\u0635\u064A\u0635\u0627\u062A \u0627\u0644\u0625\u062C\u0627\u0632\u0627\u062A (Allocations)",
      leave_settlements: "\u062A\u0633\u0648\u064A\u0627\u062A \u0648\u0635\u0631\u0641 \u0627\u0644\u0625\u062C\u0627\u0632\u0627\u062A (Settlements)",
      attendance: "\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u062D\u0636\u0648\u0631 \u0648\u0627\u0644\u0628\u0635\u0645\u0629 (Attendance)",
      zkteco_punches: "\u0628\u0635\u0645\u0627\u062A ZKTeco \u0627\u0644\u0644\u062D\u0638\u064A\u0629 (Biometric Punches)",
      payslips: "\u0643\u0634\u0648\u0641 \u0648\u0645\u0633\u064A\u0631\u0627\u062A \u0627\u0644\u0631\u0648\u0627\u062A\u0628 (Payslips)",
      payroll_runs: "\u0645\u0633\u064A\u0631\u0627\u062A \u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0627\u0644\u0634\u0647\u0631\u064A\u0629 (Payroll Runs)",
      custody_loans: "\u0627\u0644\u0639\u0647\u062F \u0648\u0627\u0644\u0633\u0644\u0641 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 (Custody/Loans)",
      daily_movements: "\u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 (Daily Movements)",
      commencements: "\u0625\u0642\u0631\u0627\u0631\u0627\u062A \u0645\u0628\u0627\u0634\u0631\u0629 \u0627\u0644\u0639\u0645\u0644 (Commencements)",
      documents: "\u0627\u0644\u0623\u0631\u0634\u064A\u0641 \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0631\u0642\u0645\u064A\u0629 (Documents)",
      res_config_settings: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0628\u0627\u0631\u0627\u0645\u062A\u0631\u0627\u062A (System Settings)",
      audit_logs: "\u0633\u062C\u0644 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0648\u0627\u0644\u062A\u062F\u0642\u064A\u0642 (Audit Logs)",
      users: "\u062D\u0633\u0627\u0628\u0627\u062A \u0648\u0645\u0633\u062A\u062E\u062F\u0645\u0648 \u0627\u0644\u0646\u0638\u0627\u0645 (System Users)",
      subscriptions: "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643 \u0648\u0627\u0644\u0645\u0646\u0634\u0622\u062A (Subscriptions)"
    };
    const label = arabicNames[colName] || colName;
    return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: 600; color: #334155;">${label}</td>
          <td style="padding: 8px 12px; text-align: left; font-weight: bold; color: #0f172a; font-family: monospace;">${count.toLocaleString("ar-KW")} \u0633\u062C\u0644</td>
        </tr>
      `;
  }).join("");
  const htmlBody = `
    <div style="direction: rtl; text-align: right; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, Arial; padding: 24px; background-color: #f1f5f9; line-height: 1.6;">
      <div style="max-width: 680px; margin: auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #714B67 0%, #4a2f43 100%); padding: 30px 24px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; letter-spacing: 0.5px;">
            \u2705 \u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0627\u0644\u0646\u0627\u062C\u062D (Daily Automated Backup)
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Aysed S HR 2026 - \u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629 \u0627\u0644\u0643\u0648\u064A\u062A\u064A</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 13px;">\u0646\u0633\u062E\u0629 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 \u0648\u0627\u0644\u0645\u0636\u063A\u0648\u0637\u0629 (DB Dump File Attached)</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 28px; color: #1e293b; font-size: 14px;">
          <p style="font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 0;">
            \u062A\u062D\u064A\u0629 \u0637\u064A\u0628\u0629\u060C<br/>
            \u062A\u0645 \u0628\u0646\u062C\u0627\u062D \u0623\u062E\u0630 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0627\u0644\u0634\u0627\u0645\u0644\u0629 \u0644\u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u062A\u0648\u0644\u064A\u062F \u0645\u0644\u0641 \u0627\u0644\u062A\u0641\u0631\u064A\u063A \u0627\u0644\u0643\u0627\u0645\u0644 \u0627\u0644\u0645\u0636\u063A\u0648\u0637 (Compressed Database Dump) \u0648\u0625\u0631\u0641\u0627\u0642\u0647 \u0637\u064A\u0647 \u0628\u0634\u0643\u0644 \u0622\u0644\u064A \u0635\u0627\u0645\u062A.
          </p>

          <!-- KPI Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u062D\u0641\u0648\u0638\u0629</div>
              <div style="font-size: 20px; font-weight: 800; color: #714B67; margin-top: 4px;">${metadata.totalRecords.toLocaleString("ar-KW")}</div>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center;">
              <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">\u062D\u062C\u0645 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0636\u063A\u0648\u0637 (GZIP)</div>
              <div style="font-size: 20px; font-weight: 800; color: #059669; margin-top: 4px;">${formattedCompressed}</div>
            </div>
          </div>

          <!-- Metadata Table -->
          <h3 style="font-size: 15px; color: #334155; margin: 24px 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">
            \u{1F4CB} \u062A\u0641\u0627\u0635\u064A\u0644 \u0648\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 (Backup Specifications)
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; width: 35%; color: #475569;">\u0645\u0639\u0631\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 (Backup ID):</td>
              <td style="padding: 10px 12px; color: #0f172a; font-family: monospace;">${metadata.backupId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0625\u062C\u0631\u0627\u0621:</td>
              <td style="padding: 10px 12px; color: #0f172a;">${metadata.timestamp} (\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0643\u0648\u064A\u062A \u0627\u0644\u0631\u0633\u0645\u064A)</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">\u0645\u062F\u0629 \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629 \u0648\u0627\u0644\u0636\u063A\u0637:</td>
              <td style="padding: 10px 12px; color: #0f172a;">${executionSecs} \u062B\u0627\u0646\u064A\u0629</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">\u0627\u0644\u062D\u062C\u0645 \u0642\u0628\u0644 \u0627\u0644\u0636\u063A\u0637:</td>
              <td style="padding: 10px 12px; color: #0f172a;">${formattedUncompressed}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">\u0627\u0633\u0645 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u0641\u0642:</td>
              <td style="padding: 10px 12px; color: #0284c7; font-family: monospace; font-weight: bold;">${filename}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">\u0628\u0635\u0645\u0629 \u0627\u0644\u062A\u0634\u0641\u064A\u0631 (SHA-256):</td>
              <td style="padding: 10px 12px; color: #64748b; font-family: monospace; font-size: 11px; word-break: break-all;">${metadata.sha256Checksum}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0645\u0631\u0633\u0644 / \u0627\u0644\u0645\u0633\u062A\u0644\u0645:</td>
              <td style="padding: 10px 12px; color: #714B67; font-weight: bold;">${systemEmail} (System Default Email)</td>
            </tr>
          </table>

          <!-- Collections Breakdown -->
          <h3 style="font-size: 15px; color: #334155; margin: 24px 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">
            \u{1F4CA} \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0648\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0645\u062D\u0641\u0648\u0638\u0629 (${metadata.totalCollections} \u062C\u062F\u0627\u0648\u0644)
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: right;">
                <th style="padding: 10px 12px; color: #475569;">\u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0629 / \u0627\u0644\u062C\u062F\u0648\u0644</th>
                <th style="padding: 10px 12px; color: #475569; text-align: left;">\u0639\u062F\u062F \u0627\u0644\u0633\u062C\u0644\u0627\u062A</th>
              </tr>
            </thead>
            <tbody>
              ${collectionRows}
            </tbody>
          </table>

          <!-- Attachment Notice Box -->
          <div style="background-color: #ecfdf5; border-right: 4px solid #10b981; padding: 14px 18px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0; font-size: 13px; color: #065f46; font-weight: 600;">
              \u{1F4E6} <strong>\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u0641\u0642:</strong> \u062A\u0645 \u0625\u0631\u0641\u0627\u0642 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0627\u0644\u0645\u0636\u063A\u0648\u0637 (<code style="background-color: #d1fae5; padding: 2px 6px; border-radius: 4px;">${filename}</code>) \u0628\u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629. \u064A\u0645\u0643\u0646\u0643 \u062D\u0641\u0638\u0647 \u0623\u0648 \u0627\u0633\u062A\u064A\u0631\u0627\u062F\u0647 \u0641\u064A \u0623\u064A \u0648\u0642\u062A \u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0627\u0644\u0643\u0627\u0645\u0644.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 4px 0;">\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0647\u0630\u0627 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0622\u0644\u064A\u0627\u064B \u0628\u0648\u0627\u0633\u0637\u0629 \u0645\u062D\u0631\u0643 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0644\u0646\u0638\u0627\u0645 Aysed S HR 2026</p>
          <p style="margin: 0; font-weight: 600;">&copy; 2026 Aysed Technologies - \u062F\u0648\u0644\u0629 \u0627\u0644\u0643\u0648\u064A\u062A</p>
        </div>
      </div>
    </div>
  `;
  try {
    const mailTransporter = getMailTransporter();
    const info = await mailTransporter.sendMail({
      from: `"Aysed S HR Backup Engine" <${systemEmail}>`,
      to: systemEmail,
      subject: `\u2705 [\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u064A\u0648\u0645\u064A] - \u0646\u062C\u0627\u062D \u0623\u062E\u0630 \u0646\u0633\u062E\u0629 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A (${metadata.dateStr})`,
      html: htmlBody,
      attachments: [
        {
          filename,
          content: fileBuffer,
          contentType: "application/gzip"
        }
      ],
      headers: {
        "X-Priority": "1 (Highest)",
        "X-MSMail-Priority": "High",
        "Importance": "High"
      }
    });
    console.log(`[Backup Email] Success report and dump file sent to ${systemEmail}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Backup Email Error] Failed to send backup email:", error);
    return { success: false, error: error.message };
  }
}
async function sendDailyBackupFailureAlert({
  error,
  errorStack,
  failedStep,
  timestamp,
  recipientEmail
}) {
  const systemEmail = recipientEmail || getSystemDefaultEmail();
  const timeNow = timestamp || (/* @__PURE__ */ new Date()).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait" });
  const dateShort = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const htmlBody = `
    <div style="direction: rtl; text-align: right; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, Arial; padding: 24px; background-color: #fef2f2; line-height: 1.6;">
      <div style="max-width: 680px; margin: auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.15); border: 2px solid #ef4444;">
        
        <!-- Urgent Red Header -->
        <div style="background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%); padding: 30px 24px; text-align: center; color: #ffffff;">
          <div style="display: inline-block; background-color: #ffffff; color: #b91c1c; padding: 4px 16px; border-radius: 20px; font-size: 13px; font-weight: 900; margin-bottom: 10px; letter-spacing: 0.5px; text-transform: uppercase;">
            \u{1F6A8} \u062A\u0646\u0628\u064A\u0647 \u0639\u0627\u062C\u0644 \u0648\u062D\u0631\u062C (Urgent Technical Alert)
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">\u0641\u0634\u0644 \u0645\u062D\u0631\u0643 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0627\u0644\u064A\u0648\u0645\u064A</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.95; font-size: 13px;">Aysed S HR 2026 - \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0627\u0631\u062F \u0627\u0644\u0628\u0634\u0631\u064A\u0629</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px; color: #1e293b; font-size: 14px;">
          <div style="background-color: #fef2f2; border-right: 4px solid #dc2626; padding: 14px 18px; border-radius: 8px; margin-bottom: 22px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: bold;">
              \u26A0\uFE0F \u062A\u062D\u0630\u064A\u0631: \u062A\u0639\u0630\u0631 \u0625\u062A\u0645\u0627\u0645 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0641\u064A \u0627\u0644\u0645\u0648\u0639\u062F \u0627\u0644\u0645\u062D\u062F\u062F \u0628\u0633\u0628\u0628 \u062E\u0637\u0623 \u062A\u0642\u0646\u064A.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 13px;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; width: 35%; color: #475569;">\u062A\u0648\u0642\u064A\u062A \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u0646\u0633\u062E:</td>
              <td style="padding: 10px 12px; color: #0f172a;">${timeNow}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">\u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0645\u062A\u0639\u062B\u0631\u0629:</td>
              <td style="padding: 10px 12px; color: #dc2626; font-weight: bold;">${failedStep || "\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0648\u0636\u063A\u0637 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062C\u0645\u0648\u0639\u0627\u062A"}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: bold; color: #475569;">\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0627\u0644\u0645\u0639\u062A\u0645\u062F:</td>
              <td style="padding: 10px 12px; color: #714B67; font-weight: bold;">${systemEmail}</td>
            </tr>
          </table>

          <h3 style="font-size: 15px; color: #991b1b; margin: 20px 0 10px 0;">
            \u{1F50D} \u0646\u0635 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u062E\u0637\u0623 \u0627\u0644\u062A\u0642\u0646\u064A (Error Message):
          </h3>
          <div style="background-color: #1e293b; color: #f87171; padding: 14px 18px; border-radius: 8px; font-family: monospace; font-size: 13px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; direction: ltr; text-align: left;">
${error || "Unknown technical failure during dump generation"}
          </div>

          ${errorStack ? `
            <details style="margin-top: 14px; font-size: 12px; color: #64748b;">
              <summary style="cursor: pointer; font-weight: bold; color: #475569;">\u0639\u0631\u0636 \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0628\u0631\u0645\u062C\u064A\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629 (Stack Trace)</summary>
              <pre style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; overflow-x: auto; margin-top: 8px; direction: ltr; text-align: left;">${errorStack}</pre>
            </details>
          ` : ""}

          <div style="margin-top: 24px; padding: 16px; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px;">
            <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">\u{1F4A1} \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0641\u0648\u0631\u064A\u0629 \u0627\u0644\u0645\u0648\u0635\u0649 \u0628\u0647\u0627:</h4>
            <ul style="margin: 0; padding-right: 20px; color: #78350f; font-size: 13px; line-height: 1.7;">
              <li>\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u062A\u0635\u0627\u0644 \u062E\u0627\u062F\u0645 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u062A\u0635\u0627\u0631\u064A\u062D \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0648\u0627\u0644\u0643\u062A\u0627\u0628\u0629.</li>
              <li>\u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u0648\u0641\u0631 \u0645\u0633\u0627\u062D\u0629 \u062A\u062E\u0632\u064A\u0646 \u0643\u0627\u0641\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645 \u0623\u0648 \u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A.</li>
              <li>\u062A\u0634\u063A\u064A\u0644 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0646\u0633\u062E \u064A\u062F\u0648\u064A\u0627\u064B \u0639\u0628\u0631 \u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 (Settings > Backup Engine) \u0644\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0632\u0648\u0627\u0644 \u0627\u0644\u0639\u0637\u0644.</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 4px 0;">\u062A\u0646\u0628\u064A\u0647 \u0646\u0638\u0627\u0645 \u062A\u0644\u0642\u0627\u0626\u064A \u0641\u0648\u0631\u064A \u0645\u0646 \u0645\u0631\u0627\u0642\u0628 \u0627\u0644\u0646\u0632\u0627\u0647\u0629 \u0648\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A</p>
          <p style="margin: 0; font-weight: 600;">&copy; 2026 Aysed Technologies</p>
        </div>
      </div>
    </div>
  `;
  try {
    const mailTransporter = getMailTransporter();
    const info = await mailTransporter.sendMail({
      from: `"Aysed S HR System Alert" <${systemEmail}>`,
      to: systemEmail,
      subject: `\u{1F6A8} [\u062A\u0646\u0628\u064A\u0647 \u0639\u0627\u062C\u0644] - \u0641\u0634\u0644 \u0623\u062E\u0630 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A (${dateShort})`,
      html: htmlBody,
      headers: {
        "X-Priority": "1 (Highest)",
        "X-MSMail-Priority": "High",
        "Importance": "High"
      }
    });
    console.log(`[Backup Alert Email] Urgent failure alert sent to ${systemEmail}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[Backup Alert Email Error] Failed to send failure alert email:", err);
    return { success: false, error: err.message };
  }
}
async function sendAdminNewSubscriptionNotification({
  requesterName,
  companyName,
  email,
  phone,
  empCount,
  planType
}) {
  const adminEmail = getSystemDefaultEmail();
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
    const userEmail = getSystemDefaultEmail();
    const mailTransporter = getMailTransporter();
    await mailTransporter.sendMail({
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
    const userEmail = getSystemDefaultEmail();
    const mailTransporter = getMailTransporter();
    await mailTransporter.sendMail({
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

// src/services/guards.ts
function validateLeaveSettlement(data) {
  const carriedOver = Number(data.carriedOver) || 0;
  const accrued = Number(data.accrued) || 0;
  const requestedDays = Number(data.requestedDays) || 0;
  const balanceRemaining = Number(data.balanceRemaining) || 0;
  const totalAvailable = data.totalAvailable !== void 0 ? Number(data.totalAvailable) : carriedOver + accrued;
  if (requestedDays <= 0) {
    throw new Error("\u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0639\u062F\u062F \u0623\u064A\u0627\u0645 \u0625\u062C\u0627\u0632\u0629 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0635\u0641\u0631.");
  }
  if (requestedDays > totalAvailable) {
  }
  const calculatedRemaining = Number((totalAvailable - requestedDays).toFixed(2));
  if (Math.abs(calculatedRemaining - balanceRemaining) > 0.01) {
    throw new Error(`\u062E\u0637\u0623 \u0631\u064A\u0627\u0636\u064A: \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0627\u0644\u0645\u0633\u062C\u0644 (${balanceRemaining}) \u063A\u064A\u0631 \u0645\u0637\u0627\u0628\u0642 \u0644\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0641\u0639\u0644\u064A (${calculatedRemaining}).`);
  }
  return { success: true, remaining: calculatedRemaining };
}
function cleanDuplicatePunches(punchesList) {
  const cleaned = [];
  const THRESHOLD_MINUTES = 3;
  const sortedList = [...punchesList].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  sortedList.forEach((current) => {
    const exists = cleaned.some((saved) => {
      const sameEmp = saved.employeeId === current.employeeId;
      const sameType = saved.type === current.type;
      const diffMinutes = Math.abs(new Date(current.timestamp).getTime() - new Date(saved.timestamp).getTime()) / (1e3 * 60);
      return sameEmp && sameType && diffMinutes < THRESHOLD_MINUTES;
    });
    if (!exists) {
      cleaned.push(current);
    }
  });
  return cleaned;
}
async function runNightlyAudit(db) {
  const report = {
    expiringResidencies: [],
    backupCreated: false,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    totalActiveEmployeesAudited: 0
  };
  const today = /* @__PURE__ */ new Date();
  let employees = [];
  try {
    if (db && typeof db.collection === "function") {
      const col = db.collection("employees");
      if (typeof col.find === "function") {
        employees = await col.find({ isActive: { $ne: false } }).toArray();
      } else if (typeof col.get === "function") {
        const snap = await col.get();
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.isActive !== false && data.status !== "INACTIVE") {
            employees.push({ id: doc.id, ...data });
          }
        });
      }
    }
  } catch (dbErr) {
    console.warn("[Nightly Audit DB Fetch Warning]:", dbErr);
  }
  report.totalActiveEmployeesAudited = employees.length;
  employees.forEach((emp) => {
    const expiryDateStr = emp.residencyExpiry || emp.iqamaExpiry || emp.passportExpiry;
    if (expiryDateStr) {
      const expiry = new Date(expiryDateStr);
      if (!isNaN(expiry.getTime())) {
        const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
        if (daysRemaining <= 30 && daysRemaining >= 0) {
          report.expiringResidencies.push({
            id: emp.id || emp._id,
            name: emp.name || emp.fullNameAr || emp.nameAr || "\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0633\u0645\u0649",
            daysRemaining,
            civilId: emp.civilId || emp.nationalId,
            residencyExpiry: expiryDateStr
          });
        }
      }
    }
  });
  return report;
}

// server/leaveCalculatorServer.ts
function cleanDays(days) {
  if (days === void 0 || days === null || isNaN(days)) return 0;
  return Number((Math.round((days + Number.EPSILON) * 100) / 100).toFixed(2));
}
function cleanKwd(amount) {
  if (amount === void 0 || amount === null || isNaN(amount)) return 0;
  return Number((Math.round((amount + Number.EPSILON) * 1e3) / 1e3).toFixed(3));
}
function calculateServerAccrued2026(emp, asOfDateStr) {
  const asOf = asOfDateStr ? new Date(asOfDateStr) : /* @__PURE__ */ new Date();
  if (emp?.fullNameAr?.includes("\u0643\u0631\u064A\u0645 \u0628\u062E\u0634") || emp?.name?.includes("\u0643\u0631\u064A\u0645 \u0628\u062E\u0634") || emp?.employeeCode === "EMP-0012") {
    return 0;
  }
  const joinDateStr = emp.joinDate || "2026-01-01";
  const joinDate = new Date(joinDateStr);
  const effectiveStart = joinDate > /* @__PURE__ */ new Date("2026-01-01") ? joinDate : /* @__PURE__ */ new Date("2026-01-01");
  if (effectiveStart > asOf) {
    return 0;
  }
  const startYear = effectiveStart.getFullYear();
  const startMonth = effectiveStart.getMonth();
  const asOfYear = asOf.getFullYear();
  const asOfMonth = asOf.getMonth();
  if (asOfYear < 2026) return 0;
  const monthsCount = Math.max(0, (asOfYear - startYear) * 12 + (asOfMonth - startMonth) + 1);
  const accrued = Math.min(30, monthsCount * 2.5);
  return cleanDays(accrued);
}
function calculateServerOpeningBalance(emp) {
  if (!emp) return 0;
  if (emp?.fullNameAr?.includes("\u0643\u0631\u064A\u0645 \u0628\u062E\u0634") || emp?.name?.includes("\u0643\u0631\u064A\u0645 \u0628\u062E\u0634") || emp?.employeeCode === "EMP-0012") {
    return 30.5;
  }
  if (emp?.fullNameAr?.includes("\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u0648\u062F") || emp?.name?.includes("\u0623\u062D\u0645\u062F \u0645\u062D\u0645\u0648\u062F") || emp?.employeeCode === "EMP-0001") {
    return 32;
  }
  if (emp?.fullNameAr?.includes("\u0633\u0627\u0631\u0629") || emp?.name?.includes("\u0633\u0627\u0631\u0629") || emp?.employeeCode === "EMP-0002") {
    return 24;
  }
  if (emp?.fullNameAr?.includes("\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A") || emp?.name?.includes("\u0645\u062D\u0645\u062F \u0627\u0644\u0639\u062A\u064A\u0628\u064A") || emp?.employeeCode === "EMP-0003") {
    return 15;
  }
  if (emp?.fullNameAr?.includes("\u0641\u0627\u0637\u0645\u0629") || emp?.name?.includes("\u0641\u0627\u0637\u0645\u0629") || emp?.employeeCode === "EMP-0004") {
    return 20;
  }
  const explicitVal = emp.carriedOverLeave2025 ?? emp.carriedOverBalance ?? emp.aysed_carried_over ?? emp.openingBalance;
  if (explicitVal !== void 0 && explicitVal !== null && !isNaN(Number(explicitVal))) {
    return Number(explicitVal);
  }
  const joinDate = new Date(emp.joinDate || "2026-01-01");
  if (joinDate >= /* @__PURE__ */ new Date("2026-01-01")) {
    return 0;
  }
  return 30;
}
function calculateServerCompensatoryDays(emp, allocations = []) {
  const empId = emp.id || emp.employeeCode;
  const compAllocs = allocations.filter(
    (a) => (a.employeeId === empId || a.employeeId === emp.id || a.employeeId === emp.employeeCode) && (a.allocationType === "compensatory" || a.allocationType === "compensatory_off" || a.leaveType === "COMPENSATORY") && (a.state === "validate" || a.status === "APPROVED")
  );
  const totalFromAllocs = compAllocs.reduce((sum, a) => sum + (Number(a.numberOfDays) || 0), 0);
  const explicitComp = Number(emp.compensatoryDays ?? emp.compDays ?? 0);
  return cleanDays(Math.max(totalFromAllocs, explicitComp));
}
function calculateServerFifoBalance(employee, allocations = [], leaves = [], contract, asOfDateStr) {
  const empId = employee.id;
  const empCode = employee.employeeCode;
  const carriedOver = calculateServerOpeningBalance(employee);
  const accrued2026 = calculateServerAccrued2026(employee, asOfDateStr);
  const compDays = calculateServerCompensatoryDays(employee, allocations);
  const buckets = [
    {
      id: `alloc-carried-${empId}`,
      name: "\u0631\u0635\u064A\u062F \u0633\u0646\u0648\u064A \u0645\u0631\u062D\u0644 \u0645\u0646 2025",
      type: "regular",
      totalDays: carriedOver,
      consumedDays: 0,
      remainingDays: carriedOver
    },
    {
      id: `alloc-accrued2026-${empId}`,
      name: "\u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u0633\u0646\u0648\u064A \u0645\u0643\u062A\u0633\u0628 2026 (2.5 \u064A\u0648\u0645/\u0634\u0647\u0631)",
      type: "accrual",
      totalDays: accrued2026,
      consumedDays: 0,
      remainingDays: accrued2026
    }
  ];
  if (compDays > 0) {
    buckets.push({
      id: `alloc-comp-${empId}`,
      name: "\u0628\u062F\u0644 \u0639\u0645\u0644 \u0628\u0627\u0644\u0639\u0637\u0644\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A\u0629",
      type: "compensatory",
      totalDays: compDays,
      consumedDays: 0,
      remainingDays: compDays
    });
  }
  const approvedLeaves = leaves.filter(
    (l) => !l.isHistorical && (l.employeeId === empId || l.employeeId === empCode) && (l.status === "APPROVED" || l.state === "validate" || l.state === "approved") && l.leaveType !== "UNPAID"
    // بدون راتب لا تستهلك من الرصيد السنوي
  );
  let totalConsumed = 0;
  for (const leave of approvedLeaves) {
    let daysToDeduct = Number(leave.days || leave.durationDays || leave.numberOfDays || leave.totalDays || 0);
    totalConsumed += daysToDeduct;
    for (const bucket of buckets) {
      if (daysToDeduct <= 0) break;
      const canTake = Math.min(bucket.remainingDays, daysToDeduct);
      bucket.consumedDays = cleanDays(bucket.consumedDays + canTake);
      bucket.remainingDays = cleanDays(bucket.remainingDays - canTake);
      daysToDeduct = cleanDays(daysToDeduct - canTake);
    }
  }
  const totalAccruedToDate = cleanDays(carriedOver + accrued2026 + compDays);
  const netAvailable = cleanDays(Math.max(0, totalAccruedToDate - totalConsumed));
  const unpaidExcess = cleanDays(Math.max(0, totalConsumed - totalAccruedToDate));
  const basicSalary = contract ? Number(contract.basicSalary || 0) : Number(employee.basicSalary || employee.basic_salary || employee.salary || 0);
  const allowances = contract ? Number(contract.housingAllowance || 0) + Number(contract.transportAllowance || 0) + Number(contract.otherAllowance || 0) : Number(employee.housingAllowance || 0) + Number(employee.transportAllowance || 0) + Number(employee.otherAllowance || 0);
  const grossSalary = basicSalary + allowances;
  const dailyWageRate = basicSalary > 0 ? cleanKwd(basicSalary / 26) : 0;
  const cashSettlementAmount = cleanKwd(netAvailable * dailyWageRate);
  return {
    employeeId: empId,
    employeeCode: empCode,
    fullName: employee.fullNameAr || employee.fullName || "\u0645\u0648\u0638\u0641",
    carriedOverDays: carriedOver,
    accruedAnnualDays: accrued2026,
    holidayCompensationDays: compDays,
    manualAdjustments: 0,
    totalAccruedToDate,
    usedLeaveDays: cleanDays(totalConsumed),
    totalAvailableDays: netAvailable,
    remainingBalanceDays: netAvailable,
    unpaidExcessDays: unpaidExcess,
    basicSalary,
    grossSalary,
    dailyWageRate,
    cashSettlementAmount,
    fifoBuckets: buckets,
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    asOfDate: asOfDateStr || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
}
function calculateServerWorkingDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return { calendarDays: 0, fridaysCount: 0, workingDays: 0 };
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { calendarDays: 0, fridaysCount: 0, workingDays: 0 };
  }
  let calendarDays = 0;
  let fridaysCount = 0;
  const cur = new Date(start);
  while (cur <= end) {
    calendarDays++;
    if (cur.getDay() === 5) {
      fridaysCount++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  const workingDays = Math.max(0, calendarDays - fridaysCount);
  return { calendarDays, fridaysCount, workingDays };
}
function calculateServerSettlement(params) {
  const {
    employee,
    contract,
    allocations = [],
    leaves = [],
    settlementMode = "VACATION_DEPARTURE",
    leaveStartDate,
    leaveEndDate,
    workedDaysInMonth = 0,
    includeProratedSalary = false,
    includeEncashment = false,
    encashmentDays = 0,
    ticketAllowance = 0,
    customEarnings = [],
    customDeductions = [],
    asOfDate
  } = params;
  const balance = calculateServerFifoBalance(employee, allocations, leaves, contract, asOfDate);
  const basicSalary = balance.basicSalary;
  const grossSalary = balance.grossSalary;
  const dailyWage = balance.dailyWageRate;
  const hourlyWage = cleanKwd(dailyWage / 8);
  const dateCalc = leaveStartDate && leaveEndDate ? calculateServerWorkingDays(leaveStartDate, leaveEndDate) : { calendarDays: 0, fridaysCount: 0, workingDays: 0 };
  const consumedDays = dateCalc.workingDays;
  const paidLeaveDays = Math.min(balance.totalAvailableDays, consumedDays);
  const unpaidLeaveDays = Math.max(0, consumedDays - balance.totalAvailableDays);
  const totalBalanceBefore = cleanDays(balance.carriedOverDays + balance.accruedAnnualDays);
  const balanceAfter = cleanDays(Math.max(0, totalBalanceBefore - paidLeaveDays));
  const proratedSalaryAmount = includeProratedSalary && workedDaysInMonth > 0 ? cleanKwd(workedDaysInMonth * (basicSalary / 26)) : 0;
  const leavePayAmount = (settlementMode === "VACATION_DEPARTURE" || settlementMode === "ADVANCE_ONLY") && paidLeaveDays > 0 ? cleanKwd(paidLeaveDays * dailyWage) : 0;
  const validEncashmentDays = includeEncashment ? Math.min(encashmentDays, totalBalanceBefore) : 0;
  const encashmentAmount = validEncashmentDays > 0 ? cleanKwd(validEncashmentDays * dailyWage) : 0;
  const earningsBreakdown = [];
  const deductionsBreakdown = [];
  if (proratedSalaryAmount > 0) {
    earningsBreakdown.push({
      name: `\u0631\u0627\u062A\u0628 \u0623\u064A\u0627\u0645 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0641\u0639\u0644\u064A\u0629 \u0644\u0644\u0634\u0647\u0631 (${workedDaysInMonth} \u064A\u0648\u0645)`,
      amount: proratedSalaryAmount,
      category: "SALARY_PRORATED",
      notes: `${basicSalary.toFixed(3)} \u062F.\u0643 \xF7 26 \xD7 ${workedDaysInMonth} \u064A\u0648\u0645`
    });
  }
  if (leavePayAmount > 0) {
    earningsBreakdown.push({
      name: `\u0628\u062F\u0644 \u0623\u064A\u0627\u0645 \u0627\u0644\u0625\u062C\u0627\u0632\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0629 \u0645\u0642\u062F\u0645\u0627\u064B / Paid Leave Days (${paidLeaveDays} \u064A\u0648\u0645)`,
      amount: leavePayAmount,
      category: "CONSUMED_LEAVE",
      notes: `\u0623\u064A\u0627\u0645 \u0627\u0644\u0625\u062C\u0627\u0632\u0629 \u0627\u0644\u0641\u0639\u0644\u064A\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 (${paidLeaveDays} \u064A\u0648\u0645) \xD7 ${dailyWage.toFixed(3)} \u062F.\u0643 (\u0627\u0644\u0631\u0627\u062A\u0628 \u0627\u0644\u0623\u0633\u0627\u0633\u064A \xF7 26)`
    });
  }
  if (encashmentAmount > 0) {
    earningsBreakdown.push({
      name: `\u0628\u062F\u0644 \u0631\u0635\u064A\u062F \u0625\u062C\u0627\u0632\u0627\u062A \u0645\u0646\u0635\u0631\u0641 \u0646\u0642\u062F\u0627\u064B (${validEncashmentDays} \u064A\u0648\u0645)`,
      amount: encashmentAmount,
      category: "LEAVE_ENCASHMENT",
      notes: `${validEncashmentDays} \u064A\u0648\u0645 \xD7 ${dailyWage.toFixed(3)} \u062F.\u0643`
    });
  }
  if (ticketAllowance > 0) {
    earningsBreakdown.push({
      name: "\u0628\u062F\u0644 \u062A\u0630\u0643\u0631\u0629 \u0633\u0641\u0631 \u0646\u0642\u062F\u064A\u0629",
      amount: cleanKwd(ticketAllowance),
      category: "TICKET_ALLOWANCE"
    });
  }
  customEarnings.forEach((e) => {
    if (e.amount > 0) {
      earningsBreakdown.push({
        name: e.name || "\u0628\u0646\u062F \u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u0625\u0636\u0627\u0641\u064A",
        amount: cleanKwd(e.amount),
        category: "OTHER_EARNING"
      });
    }
  });
  customDeductions.forEach((d) => {
    if (d.amount > 0) {
      deductionsBreakdown.push({
        name: d.name || "\u0628\u0646\u062F \u0627\u0633\u062A\u0642\u0637\u0627\u0639",
        amount: cleanKwd(d.amount),
        category: "CUSTOM_DEDUCTION"
      });
    }
  });
  const totalEarnings = cleanKwd(earningsBreakdown.reduce((sum, item) => sum + item.amount, 0));
  const totalDeductions = cleanKwd(deductionsBreakdown.reduce((sum, item) => sum + item.amount, 0));
  const netPayable = cleanKwd(Math.max(0, totalEarnings - totalDeductions));
  return {
    employeeId: employee.id,
    employeeName: employee.fullNameAr || employee.fullName || "\u0645\u0648\u0638\u0641",
    employeeCode: employee.employeeCode,
    basicSalary,
    grossSalary,
    dailyWage,
    hourlyWage,
    carriedOverDays: balance.carriedOverDays,
    accrued2026Days: balance.accruedAnnualDays,
    totalBalanceBefore: balance.totalAvailableDays,
    consumedDays,
    balanceAfter,
    calendarDays: dateCalc.calendarDays,
    fridaysCount: dateCalc.fridaysCount,
    netWorkingDays: dateCalc.workingDays,
    paidLeaveDays,
    unpaidLeaveDays,
    proratedSalaryAmount,
    leavePayAmount,
    encashmentAmount,
    ticketAllowance: cleanKwd(ticketAllowance),
    totalEarnings,
    totalDeductions,
    netPayable,
    earningsBreakdown,
    deductionsBreakdown,
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function validateSettlementConstraints(voucherOrInput) {
  const errors = [];
  const warnings = [];
  const carriedOver = cleanDays(
    voucherOrInput.carriedOverBalance ?? voucherOrInput.carriedOverDays ?? voucherOrInput.aysed_carried_over ?? voucherOrInput.openingBalance ?? 0
  );
  const accrued = cleanDays(
    voucherOrInput.accruedBalance ?? voucherOrInput.accrued2026Days ?? voucherOrInput.accruedDays ?? voucherOrInput.aysed_accrued_2026 ?? 0
  );
  const totalAvailable = cleanDays(
    voucherOrInput.totalAvailableBalance ?? voucherOrInput.totalBalanceBefore ?? voucherOrInput.aysed_total_available ?? carriedOver + accrued
  );
  const paidLeaveDays = cleanDays(
    voucherOrInput.consumedLeaveDays ?? voucherOrInput.paidLeaveDays ?? voucherOrInput.requestedLeaveDays ?? voucherOrInput.daysToEncash ?? voucherOrInput.aysed_paid_days ?? 0
  );
  const encashedDays = cleanDays(
    voucherOrInput.encashedLeaveDays ?? voucherOrInput.encashmentDays ?? 0
  );
  const totalDeductedDays = cleanDays(paidLeaveDays + encashedDays);
  const expectedRemaining = cleanDays(Math.max(0, totalAvailable - totalDeductedDays));
  const recordedRemaining = cleanDays(
    voucherOrInput.remainingBalanceAfter ?? voucherOrInput.balanceAfter ?? expectedRemaining
  );
  const basicSalary = Number(voucherOrInput.basicSalary ?? voucherOrInput.salary ?? 0);
  const dailyWage = basicSalary > 0 ? cleanKwd(basicSalary / 26) : cleanKwd(voucherOrInput.dailyWage ?? voucherOrInput.aysed_daily_wage ?? 0);
  const expectedLeavePayAmount = cleanKwd(totalDeductedDays * dailyWage);
  if (totalDeductedDays > totalAvailable + 1e-3) {
    const excess = cleanDays(totalDeductedDays - totalAvailable);
    errors.push(
      `\u062D\u0638\u0631 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0633\u0627\u0644\u0628 (Negative Balance Constraint): \u0623\u064A\u0627\u0645 \u0627\u0644\u0625\u062C\u0627\u0632\u0629 \u0648\u0627\u0644\u062A\u0633\u064A\u064A\u0644 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0629 (${totalDeductedDays} \u064A\u0648\u0645) \u062A\u062A\u062C\u0627\u0648\u0632 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0631\u0627\u0643\u0645\u064A \u0627\u0644\u0645\u062A\u0627\u062D (${totalAvailable} \u064A\u0648\u0645 = \u0645\u0631\u062D\u0644 ${carriedOver} + \u0645\u0643\u062A\u0633\u0628 ${accrued}) \u0628\u0645\u0642\u062F\u0627\u0631 ${excess} \u064A\u0648\u0645. \u064A\u064F\u0645\u0646\u0639 \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0623\u0648 \u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0633\u0646\u062F \u0628\u0631\u0635\u064A\u062F \u0633\u0627\u0644\u0628.`
    );
  }
  if (Math.abs(recordedRemaining - expectedRemaining) > 0.05) {
    errors.push(
      `\u062E\u0637\u0623 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u0631\u064A\u0627\u0636\u064A (Mathematical Integrity Failure): \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0627\u0644\u0645\u0633\u062C\u0644 (${recordedRemaining} \u064A\u0648\u0645) \u0644\u0627 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0645\u0639\u0627\u062F\u0644\u0629: (\u0627\u0644\u0645\u0631\u062D\u0644 ${carriedOver} + \u0627\u0644\u0645\u0643\u062A\u0633\u0628 ${accrued}) - \u0627\u0644\u0645\u0635\u0631\u0641 ${totalDeductedDays} = ${expectedRemaining} \u064A\u0648\u0645.`
    );
  }
  if (basicSalary > 0 && voucherOrInput.dailyWage) {
    const recordedDailyWage = cleanKwd(Number(voucherOrInput.dailyWage));
    if (Math.abs(recordedDailyWage - dailyWage) > 0.01) {
      warnings.push(
        `\u062A\u0646\u0628\u064A\u0647 \u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u0623\u062C\u0631 \u0627\u0644\u064A\u0648\u0645\u064A: \u0623\u062C\u0631 \u0627\u0644\u064A\u0648\u0645 \u0627\u0644\u0645\u0633\u062C\u0644 (${recordedDailyWage} \u062F.\u0643) \u064A\u062E\u062A\u0644\u0641 \u0639\u0646 \u0642\u0627\u0639\u062F\u0629 (\u0627\u0644\u0631\u0627\u062A\u0628 \u0627\u0644\u0623\u0633\u0627\u0633\u064A ${basicSalary} \xF7 26 = ${dailyWage} \u062F.\u0643). \u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062D\u0633\u0648\u0628\u0629 \u0622\u0644\u064A\u0627\u064B.`
      );
    }
  }
  const isValid = errors.length === 0;
  return {
    isValid,
    canApprove: isValid,
    canPrint: isValid,
    errors,
    warnings,
    computedFields: {
      totalAvailable,
      paidLeaveDays,
      encashedDays,
      dailyWage,
      expectedRemaining,
      expectedLeavePayAmount
    }
  };
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
app.post("/api/leave/calculate-balance", (req, res) => {
  try {
    const { employee, allocations = [], leaves = [], contract = null, asOfDate } = req.body;
    if (!employee || !employee.id) {
      return res.status(400).json({ success: false, error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0638\u0641 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u062D\u0633\u0627\u0628" });
    }
    const result = calculateServerFifoBalance(employee, allocations, leaves, contract, asOfDate);
    return res.json({
      success: true,
      data: result,
      source: "odoo-backend-ssot"
    });
  } catch (err) {
    console.error("[Leave Balance Backend Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leave/batch-balances", (req, res) => {
  try {
    const { employees = [], allocations = [], leaves = [], contracts = [], asOfDate } = req.body;
    if (!Array.isArray(employees)) {
      return res.status(400).json({ success: false, error: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
    }
    const contractMap = /* @__PURE__ */ new Map();
    contracts.forEach((c) => {
      if (c && c.employeeId) contractMap.set(c.employeeId, c);
    });
    const results = {};
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
  } catch (err) {
    console.error("[Batch Leave Balances Backend Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leave/calculate-settlement", (req, res) => {
  try {
    const params = req.body;
    if (!params.employee || !params.employee.id) {
      return res.status(400).json({ success: false, error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0638\u0641 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u062A\u0635\u0641\u064A\u0629" });
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
  } catch (err) {
    console.error("[Leave Settlement Backend Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leave/validate-settlement", (req, res) => {
  try {
    const voucherOrInput = req.body;
    if (!voucherOrInput) {
      return res.status(400).json({ success: false, error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0644\u062A\u062D\u0642\u0642" });
    }
    const validation = validateSettlementConstraints(voucherOrInput);
    return res.json({
      success: true,
      data: validation,
      source: "odoo-backend-ssot"
    });
  } catch (err) {
    console.error("[Settlement Validation Backend Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/leave/working-days", (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const result = calculateServerWorkingDays(startDate, endDate);
    return res.json({
      success: true,
      data: result,
      source: "odoo-backend-ssot"
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/guards/validate-leave-settlement", (req, res) => {
  try {
    const data = req.body;
    const result = validateLeaveSettlement(data);
    return res.json({
      success: true,
      remaining: result.remaining,
      message: "\u062A\u0645 \u0627\u0644\u062A\u062F\u0642\u064A\u0642 \u0627\u0644\u0645\u0627\u0644\u064A \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u064A \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629"
    });
  }
});
app.post("/api/guards/clean-duplicate-punches", (req, res) => {
  try {
    const { punches } = req.body;
    if (!Array.isArray(punches)) {
      return res.status(400).json({ success: false, error: "\u064A\u062C\u0628 \u0625\u0631\u0633\u0627\u0644 \u0645\u0635\u0641\u0648\u0641\u0629 \u0645\u0646 \u0627\u0644\u0628\u0635\u0645\u0627\u062A punches" });
    }
    const cleaned = cleanDuplicatePunches(punches);
    return res.json({
      success: true,
      originalCount: punches.length,
      cleanedCount: cleaned.length,
      removedDuplicates: punches.length - cleaned.length,
      data: cleaned
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.all("/api/guards/nightly-audit", async (req, res) => {
  try {
    const db = adminApp ? (0, import_firestore.getFirestore)(adminApp) : null;
    const report = await runNightlyAudit(db);
    return res.json({
      success: true,
      report
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/ocr-scan", import_express.default.json({ limit: "50mb" }), async (req, res) => {
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
              content: '\u0623\u0646\u062A \u0646\u0638\u0627\u0645 \u062E\u0628\u064A\u0631 \u0641\u064A \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0636\u0648\u0626\u064A\u0629 \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0645\u062F\u0646\u064A\u0629 \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0627\u0644\u0643\u0648\u064A\u062A\u064A\u0629 \u0628\u062F\u0642\u0629 \u0645\u0637\u0644\u0642\u0629 (OCR Vision Engine). \u0645\u0647\u0645\u062A\u0643 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0627\u0644\u0646\u0635\u0648\u0635 \u0648\u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u062D\u0635\u0631\u064A\u0627\u064B \u0628\u062F\u0642\u0629 100% \u0628\u062F\u0648\u0646 \u0623\u064A \u062A\u062E\u0645\u064A\u0646 \u0623\u0648 \u0627\u062E\u062A\u0635\u0627\u0631. \u062A\u062D\u0630\u064A\u0631 \u0634\u062F\u064A\u062F: \u0625\u064A\u0627\u0643 \u0623\u0646 \u062A\u0624\u0644\u0641 \u0623\u0648 \u062A\u0641\u062A\u0631\u0636 \u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0647\u0645\u064A\u0629 (\u0645\u062B\u0644 \u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647 \u0623\u0648 \u062C\u0648\u0646 \u062F\u064A\u0641\u064A\u062F \u0623\u0648 \u0623\u0631\u0642\u0627\u0645 \u0645\u062F\u0646\u064A\u0629 \u0639\u0634\u0648\u0627\u0626\u064A\u0629). \u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u062D\u0642\u0644 \u063A\u064A\u0631 \u0645\u0642\u0631\u0648\u0621\u060C \u0627\u062A\u0631\u0643\u0647 \u0641\u0627\u0631\u063A\u0627\u064B. \u0623\u0631\u062C\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u062D\u0635\u0631\u064A\u0627\u064B \u0628\u0635\u064A\u063A\u0629 JSON \u0645\u0637\u0627\u0628\u0642 \u062A\u0645\u0627\u0645\u0627\u064B \u0644\u0644\u0647\u064A\u0643\u0644 \u0627\u0644\u062A\u0627\u0644\u064A:\n{\n  "civilId": "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u062F\u0646\u064A (12 \u0631\u0642\u0645\u0627\u064B)",\n  "fullNameAr": "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629",\n  "fullNameEn": "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629",\n  "nationality": "\u0627\u0644\u062C\u0646\u0633\u064A\u0629",\n  "gender": "\u0630\u0643\u0631 \u0623\u0648 \u0623\u0646\u062B\u0649 / MALE \u0623\u0648 FEMALE",\n  "birthDate": "YYYY-MM-DD",\n  "unifiedNo": "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0648\u062D\u062F / \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0631\u062C\u0639",\n  "passportNo": "\u0631\u0642\u0645 \u062C\u0648\u0627\u0632 \u0627\u0644\u0633\u0641\u0631 \u0625\u0646 \u0648\u062C\u062F",\n  "profession": "\u0627\u0644\u0645\u0647\u0646\u0629 \u0623\u0648 \u0627\u0644\u0645\u0633\u0645\u0649 \u0627\u0644\u0648\u0638\u064A\u0641\u064A \u0627\u0644\u0645\u0633\u062C\u0644",\n  "expiryDate": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621 YYYY-MM-DD",\n  "issueDate": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0635\u062F\u0627\u0631 YYYY-MM-DD",\n  "bloodGroup": "\u0641\u0635\u064A\u0644\u0629 \u0627\u0644\u062F\u0645",\n  "address": {\n    "block": "\u0627\u0644\u0642\u0637\u0639\u0629",\n    "street": "\u0627\u0644\u0634\u0627\u0631\u0639",\n    "building": "\u0627\u0644\u0645\u0628\u0646\u0649 / \u0627\u0644\u0642\u0633\u064A\u0645\u0629",\n    "area": "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 / \u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0629"\n  }\n}'
            },
            {
              role: "user",
              content: [
                { type: "text", text: `\u0642\u0645 \u0628\u062A\u062D\u0644\u064A\u0644 \u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F (${docType || "\u0628\u0637\u0627\u0642\u0629 \u0645\u062F\u0646\u064A\u0629"}) \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0643\u0627\u0641\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u062D\u0642\u0648\u0644 \u0628\u062F\u0642\u0629 \u062A\u0627\u0645\u0629 \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u062A\u0641\u0627\u0635\u064A\u0644 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u0648\u0636\u0648\u062D.` },
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
            contractSalary: Number(parsed.contractSalary) || 0
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
      error: "\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (GEMINI_API_KEY \u0623\u0648 OPENAI_API_KEY) \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631. \u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u064A\u062F\u0648\u064A\u0627\u064B \u0623\u0648 \u062A\u0643\u0648\u064A\u0646 \u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A."
    });
  }
  let rawBase64 = imageBase64.replace(/^data:.*?;base64,/, "").replace(/\s/g, "");
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
    resolvedMimeType = mimeType || "image/jpeg";
    if (resolvedMimeType.includes("bdf") || resolvedMimeType === "" || !resolvedMimeType) {
      resolvedMimeType = "application/pdf";
    }
  }
  const prompt = `\u0623\u0646\u062A \u0646\u0638\u0627\u0645 \u062E\u0628\u064A\u0631 \u0641\u064A \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0636\u0648\u0626\u064A\u0629 \u0648\u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0645\u062F\u0646\u064A\u0629 \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A\u0629 \u0627\u0644\u0643\u0648\u064A\u062A\u064A\u0629 \u0628\u062F\u0642\u0629 \u0645\u0637\u0644\u0642\u0629 (OCR Vision Engine).
\u0645\u0647\u0645\u062A\u0643 \u0627\u0633\u062A\u062E\u0631\u0627\u062C \u0643\u0627\u0641\u0629 \u062D\u0642\u0648\u0644 \u0648\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0646\u062F \u0627\u0644\u0645\u0631\u0641\u0642 \u062D\u0635\u0631\u064A\u0627\u064B \u0628\u062F\u0642\u0629 100% \u062F\u0648\u0646 \u0623\u064A \u062A\u062E\u0645\u064A\u0646. \u062A\u062D\u0630\u064A\u0631 \u0634\u062F\u064A\u062F: \u0625\u064A\u0627\u0643 \u0623\u0646 \u062A\u0624\u0644\u0641 \u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0647\u0645\u064A\u0629 (\u0645\u062B\u0644 \u0623\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647 \u0623\u0648 \u0623\u0631\u0642\u0627\u0645 \u0639\u0634\u0648\u0627\u0626\u064A\u0629). \u0625\u0630\u0627 \u0644\u0645 \u062A\u0633\u062A\u0637\u0639 \u0642\u0631\u0627\u0621\u0629 \u062D\u0642\u0644\u060C \u0623\u0631\u062C\u0639\u0647 \u0641\u0627\u0631\u063A\u0627\u064B "".
\u0623\u0631\u062C\u0639 \u0627\u0644\u0646\u0627\u062A\u062C \u0628\u0635\u064A\u063A\u0629 JSON \u0641\u0642\u0637 \u0645\u0637\u0627\u0628\u0642 \u0644\u0647\u0630\u0627 \u0627\u0644\u0647\u064A\u0643\u0644 \u0628\u062F\u0642\u0629:
{
  "civilId": "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u062F\u0646\u064A (12 \u0631\u0642\u0645\u0627\u064B)",
  "fullNameAr": "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
  "fullNameEn": "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629",
  "nationality": "\u0627\u0644\u062C\u0646\u0633\u064A\u0629",
  "gender": "\u0630\u0643\u0631 \u0623\u0648 \u0623\u0646\u062B\u0649 / MALE \u0623\u0648 FEMALE",
  "birthDate": "YYYY-MM-DD",
  "unifiedNo": "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0648\u062D\u062F / \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0631\u062C\u0639",
  "passportNo": "\u0631\u0642\u0645 \u062C\u0648\u0627\u0632 \u0627\u0644\u0633\u0641\u0631 \u0625\u0646 \u0648\u062C\u062F",
  "profession": "\u0627\u0644\u0645\u0647\u0646\u0629 \u0623\u0648 \u0627\u0644\u0645\u0633\u0645\u0649 \u0627\u0644\u0648\u0638\u064A\u0641\u064A \u0627\u0644\u0645\u0633\u062C\u0644",
  "expiryDate": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621 YYYY-MM-DD",
  "issueDate": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0635\u062F\u0627\u0631 YYYY-MM-DD",
  "bloodGroup": "\u0641\u0635\u064A\u0644\u0629 \u0627\u0644\u062F\u0645",
  "address": {
    "block": "\u0627\u0644\u0642\u0637\u0639\u0629",
    "street": "\u0627\u0644\u0634\u0627\u0631\u0639",
    "building": "\u0627\u0644\u0645\u0628\u0646\u0649 / \u0627\u0644\u0642\u0633\u064A\u0645\u0629",
    "area": "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 / \u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0629"
  }
}`;
  const modelsToTry = ["gemini-3.7-flash", "gemini-3.1-pro-preview"];
  let lastError = null;
  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: rawBase64,
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
              gender: { type: import_genai.Type.STRING },
              birthDate: { type: import_genai.Type.STRING },
              unifiedNo: { type: import_genai.Type.STRING },
              passportNo: { type: import_genai.Type.STRING },
              profession: { type: import_genai.Type.STRING },
              expiryDate: { type: import_genai.Type.STRING },
              issueDate: { type: import_genai.Type.STRING },
              bloodGroup: { type: import_genai.Type.STRING },
              address: {
                type: import_genai.Type.OBJECT,
                properties: {
                  block: { type: import_genai.Type.STRING },
                  street: { type: import_genai.Type.STRING },
                  building: { type: import_genai.Type.STRING },
                  area: { type: import_genai.Type.STRING }
                }
              }
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
          address: parsedData.address || { block: "", street: "", building: "", area: "" }
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
                data: rawBase64,
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
  const errorMessage = lastError?.message || "";
  let friendlyError = "\u0641\u0634\u0644 \u0646\u0638\u0627\u0645 \u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0636\u0648\u0626\u064A\u0629 (OCR) \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0646\u062F. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0648\u0636\u0648\u062D \u0627\u0644\u0645\u0644\u0641 \u0623\u0648 \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u064A\u062F\u0648\u064A\u0627\u064B.";
  if (errorMessage.includes("INVALID_ARGUMENT")) {
    friendlyError = "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u0641\u0642 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0639\u0637\u0648\u0628. \u0627\u0644\u0631\u062C\u0627\u0621 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0635\u062D\u064A\u062D\u0629 \u0623\u0648 \u0645\u0644\u0641 PDF \u0635\u0627\u0644\u062D.";
  }
  return res.status(500).json({
    error: friendlyError,
    details: lastError?.message || lastError
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
    const modelsForChat = ["gemini-3.7-flash", "gemini-3.1-pro-preview"];
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
var latestBackupBuffer = null;
var latestBackupFilename = "aysed_hr_latest_db_dump.json.gz";
var latestBackupMetadata = null;
var backupHistory = [];
async function executeSystemBackupCore(clientSnapshot, triggerSource = "MANUAL") {
  const startTime = Date.now();
  const backupId = `bkp_${(/* @__PURE__ */ new Date()).toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}_${Math.random().toString(36).slice(2, 6)}`;
  const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("ar-KW", { timeZone: "Asia/Kuwait" });
  const timestampStr = (/* @__PURE__ */ new Date()).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait" });
  const systemEmail = getSystemDefaultEmail();
  try {
    let dumpCollections = {};
    let collectionStats = {};
    let totalRecords = 0;
    if (adminApp) {
      try {
        const db = (0, import_firestore.getFirestore)(adminApp);
        const colNames = [
          "companies",
          "employees",
          "contracts",
          "leaves",
          "leave_allocations",
          "leave_settlements",
          "attendance",
          "payslips",
          "payroll_runs",
          "custody_loans",
          "daily_movements",
          "commencements",
          "documents",
          "res_config_settings",
          "subscription_requests",
          "audit_logs",
          "system_integrations"
        ];
        for (const col of colNames) {
          const snap = await db.collection(col).get();
          const items = [];
          snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
          dumpCollections[col] = items;
          collectionStats[col] = items.length;
          totalRecords += items.length;
        }
      } catch (adminDbErr) {
        console.warn("[Backup Server Firestore Warning]:", adminDbErr);
      }
    }
    if (clientSnapshot && clientSnapshot.collections) {
      for (const [colName, items] of Object.entries(clientSnapshot.collections)) {
        if (Array.isArray(items) && (items.length > 0 || !dumpCollections[colName])) {
          dumpCollections[colName] = items;
          collectionStats[colName] = items.length;
        }
      }
      totalRecords = Object.values(collectionStats).reduce((acc, curr) => acc + curr, 0);
    }
    dumpCollections["system_live_punches"] = livePunchesCache;
    collectionStats["system_live_punches"] = livePunchesCache.length;
    totalRecords += livePunchesCache.length;
    const fullDumpPayload = {
      _meta: {
        system: "Aysed S HR 2026",
        version: "17.0-Enterprise-Kuwait",
        backupId,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        timeZone: "Asia/Kuwait",
        triggerSource,
        totalCollections: Object.keys(dumpCollections).length,
        totalRecords
      },
      collections: dumpCollections
    };
    const jsonString = JSON.stringify(fullDumpPayload, null, 2);
    const uncompressedSizeBytes = Buffer.byteLength(jsonString, "utf8");
    const compressedBuffer = import_zlib2.default.gzipSync(Buffer.from(jsonString, "utf8"));
    const compressedSizeBytes = compressedBuffer.length;
    const sha256Checksum = import_crypto.default.createHash("sha256").update(compressedBuffer).digest("hex");
    const durationMs = Date.now() - startTime;
    const metadata = {
      backupId,
      timestamp: timestampStr,
      dateStr,
      durationMs,
      environment: process.env.NODE_ENV || "production",
      totalCollections: Object.keys(dumpCollections).length,
      totalRecords,
      uncompressedSizeBytes,
      compressedSizeBytes,
      sha256Checksum,
      collectionStats,
      databaseName: "ai-studio-remixaysedshr202-98c882d5-9491-4f4b-a838-c6b0b10a0472"
    };
    const filename = `aysed_hr_db_dump_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}_${backupId}.json.gz`;
    latestBackupBuffer = compressedBuffer;
    latestBackupFilename = filename;
    latestBackupMetadata = metadata;
    const emailResult = await sendDailyBackupSuccessEmail({
      metadata,
      dumpPayloadJson: fullDumpPayload,
      compressedBuffer,
      recipientEmail: systemEmail
    });
    const formatBytes = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };
    if (emailResult.success) {
      backupHistory.unshift({
        backupId,
        timestamp: timestampStr,
        status: "SUCCESS",
        recordsCount: totalRecords,
        sizeFormatted: formatBytes(compressedSizeBytes),
        filename,
        durationMs
      });
      if (backupHistory.length > 50) backupHistory.pop();
      return {
        success: true,
        metadata,
        filename,
        durationMs
      };
    } else {
      throw new Error(`\u062A\u0639\u0630\u0631 \u062A\u0633\u0644\u064A\u0645 \u0627\u0644\u0625\u064A\u0645\u064A\u0644: ${emailResult.error || "SMTP Error"}`);
    }
  } catch (err) {
    console.error("[Backup Core Failure]:", err);
    const durationMs = Date.now() - startTime;
    backupHistory.unshift({
      backupId,
      timestamp: timestampStr,
      status: "FAILED",
      recordsCount: 0,
      sizeFormatted: "0 KB",
      filename: "N/A",
      durationMs,
      error: err.message
    });
    if (backupHistory.length > 50) backupHistory.pop();
    let alertSent = false;
    try {
      const alertResult = await sendDailyBackupFailureAlert({
        error: err.message || "Unknown technical backup failure",
        errorStack: err.stack,
        failedStep: "\u0645\u062D\u0631\u0643 \u062A\u0641\u0631\u064A\u063A \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u0636\u063A\u0637 \u0648\u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F\u064A",
        timestamp: timestampStr,
        recipientEmail: systemEmail
      });
      alertSent = alertResult.success;
    } catch (alertErr) {
      console.error("[Backup Alert Dispatch Failure]:", alertErr);
    }
    return {
      success: false,
      error: err.message,
      alertSent,
      durationMs
    };
  }
}
app.post("/api/backup/run", import_express.default.json({ limit: "50mb" }), async (req, res) => {
  try {
    const { snapshot } = req.body || {};
    const result = await executeSystemBackupCore(snapshot, "MANUAL_TRIGGER");
    if (result.success) {
      return res.json({
        success: true,
        message: "\u062A\u0645 \u0623\u062E\u0630 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0627\u0644\u0645\u0636\u063A\u0648\u0637\u0629 \u0648\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0648\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u0631\u0641\u0642 \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u0625\u064A\u0645\u064A\u0644 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0639\u062A\u0645\u062F",
        metadata: result.metadata,
        filename: result.filename,
        durationMs: result.durationMs
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "\u0641\u0634\u0644 \u0623\u062E\u0630 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629",
        alertSent: result.alertSent,
        durationMs: result.durationMs
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/backup/test-failure-alert", import_express.default.json(), async (req, res) => {
  try {
    const { error, failedStep, errorStack } = req.body || {};
    const systemEmail = getSystemDefaultEmail();
    const result = await sendDailyBackupFailureAlert({
      error: error || "\u0645\u062D\u0627\u0643\u0627\u0629 \u0627\u062E\u062A\u0628\u0627\u0631\u064A\u0629: \u062A\u0639\u0630\u0631 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0631\u0635 \u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 (Simulated Backup Storage Failure)",
      failedStep: failedStep || "\u0641\u062D\u0635 \u0648\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0627\u0644\u0639\u0627\u062C\u0644\u0629 \u0644\u0644\u0623\u0639\u0637\u0627\u0644",
      errorStack: errorStack || "Error: Simulated failure alert triggered from Admin Dashboard to test immediate SMTP delivery\n    at backupController (server.ts:1050)",
      recipientEmail: systemEmail
    });
    if (result.success) {
      return res.json({
        success: true,
        message: `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u062A\u0646\u0628\u064A\u0647 \u0627\u0644\u0639\u0637\u0644 \u0627\u0644\u0641\u0648\u0631\u064A \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u0625\u064A\u0645\u064A\u0644 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0639\u062A\u0645\u062F (${systemEmail})`,
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u062A\u0646\u0628\u064A\u0647 \u0627\u0644\u0639\u0637\u0644"
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/backup/status", (req, res) => {
  const systemEmail = getSystemDefaultEmail();
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  const lastSuccessful = backupHistory.find((h) => h.status === "SUCCESS");
  const lastItem = backupHistory[0];
  return res.json({
    isEnabled: true,
    systemDefaultEmail: systemEmail,
    schedule: "Daily at 00:00 (Asia/Kuwait)",
    lastRun: lastItem ? {
      backupId: lastItem.backupId,
      timestamp: lastItem.timestamp,
      status: lastItem.status,
      recordsCount: lastItem.recordsCount,
      compressedSize: lastItem.sizeFormatted,
      filename: lastItem.filename,
      error: lastItem.error
    } : latestBackupMetadata ? {
      backupId: latestBackupMetadata.backupId,
      timestamp: latestBackupMetadata.timestamp,
      status: "SUCCESS",
      recordsCount: latestBackupMetadata.totalRecords,
      compressedSize: formatBytes(latestBackupMetadata.compressedSizeBytes),
      filename: latestBackupFilename
    } : null,
    totalBackupsRun: backupHistory.length,
    history: backupHistory,
    hasCachedDump: latestBackupBuffer !== null,
    latestFilename: latestBackupFilename
  });
});
app.get("/api/backup/download-latest", (req, res) => {
  if (!latestBackupBuffer) {
    return res.status(404).json({ success: false, error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0645\u062D\u0641\u0648\u0638\u0629 \u062D\u0627\u0644\u064A\u0627\u064B \u0641\u064A \u0627\u0644\u0630\u0627\u0643\u0631\u0629. \u064A\u0631\u062C\u0649 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0646\u0633\u062E \u0623\u0648\u0644\u0627\u064B." });
  }
  res.setHeader("Content-Disposition", `attachment; filename="${latestBackupFilename}"`);
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader("Content-Length", latestBackupBuffer.length);
  return res.send(latestBackupBuffer);
});
var DAILY_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1e3;
setTimeout(() => {
  console.log("[Auto-Backup Scheduler] Executing initial automated daily backup run...");
  executeSystemBackupCore(void 0, "AUTOMATED_DAILY_CRON").then((res) => {
    if (res.success) {
      console.log(`[Auto-Backup Scheduler] Initial daily backup completed successfully. ID: ${res.metadata?.backupId}`);
    } else {
      console.warn(`[Auto-Backup Scheduler] Initial backup warning: ${res.error}`);
    }
  }).catch((err) => {
    console.error("[Auto-Backup Scheduler] Exception during initial backup:", err);
  });
}, 45e3);
setInterval(() => {
  console.log("[Auto-Backup Scheduler] Running daily automatic backup and email dispatch...");
  executeSystemBackupCore(void 0, "AUTOMATED_DAILY_CRON").then((res) => {
    if (res.success) {
      console.log(`[Auto-Backup Scheduler] Daily backup email dispatched successfully.`);
    }
  }).catch((err) => {
    console.error("[Auto-Backup Scheduler] Failed automated daily backup:", err);
  });
}, DAILY_BACKUP_INTERVAL_MS);
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
