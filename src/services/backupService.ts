// src/services/backupService.ts
/**
 * Automated System Database Backup & SMTP Notification Service
 * Aysed S HR 2026 - Kuwait Enterprise HRMS
 */

import { db, cleanFirestoreData } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { BackupMetadata } from './emailService';

export interface BackupJobResult {
  success: boolean;
  backupId?: string;
  timestamp?: string;
  metadata?: BackupMetadata;
  emailSent?: boolean;
  emailRecipient?: string;
  filename?: string;
  messageId?: string;
  error?: string;
  alertSent?: boolean;
  durationMs?: number;
}

export interface BackupEngineStatus {
  isEnabled: boolean;
  systemDefaultEmail: string;
  schedule: string;
  lastRun?: {
    backupId: string;
    timestamp: string;
    status: 'SUCCESS' | 'FAILED';
    recordsCount: number;
    compressedSize: string;
    filename: string;
    error?: string;
  };
  totalBackupsRun: number;
  history: Array<{
    backupId: string;
    timestamp: string;
    status: 'SUCCESS' | 'FAILED';
    recordsCount: number;
    sizeFormatted: string;
    filename: string;
    durationMs: number;
    error?: string;
  }>;
}

/**
 * Extracts a complete snapshot of all system collections directly from Firestore and client state
 */
export async function collectFullSystemDatabaseSnapshot(): Promise<{
  data: Record<string, any[]>;
  stats: Record<string, number>;
  totalRecords: number;
}> {
  const collectionsToBackup = [
    'companies',
    'employees',
    'contracts',
    'leaves',
    'leave_allocations',
    'leave_settlements',
    'attendance',
    'live_attendance',
    'payslips',
    'payroll_runs',
    'custody_loans',
    'daily_movements',
    'commencements',
    'documents',
    'res_config_settings',
    'subscription_requests',
    'audit_logs',
    'system_integrations'
  ];

  const dumpData: Record<string, any[]> = {};
  const stats: Record<string, number> = {};
  let totalRecords = 0;

  for (const colName of collectionsToBackup) {
    try {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      const docsList: any[] = [];
      snap.forEach((d) => {
        docsList.push({ id: d.id, ...cleanFirestoreData(d.data()) });
      });
      dumpData[colName] = docsList;
      stats[colName] = docsList.length;
      totalRecords += docsList.length;
    } catch (err) {
      console.warn(`[Backup Snapshot Warning] Could not read collection ${colName}:`, err);
      dumpData[colName] = [];
      stats[colName] = 0;
    }
  }

  // Also include system local storage meta if available
  try {
    const localKeys = ['app_current_company', 'app_theme', 'aysed_settings_cache'];
    const localData: Record<string, any> = {};
    for (const key of localKeys) {
      const val = localStorage.getItem(key);
      if (val) localData[key] = val;
    }
    dumpData['local_preferences'] = [localData];
    stats['local_preferences'] = 1;
    totalRecords += 1;
  } catch {
    // Ignore local storage read errors
  }

  return { data: dumpData, stats, totalRecords };
}

/**
 * Execute full backup job: collects snapshot, calls backend to compress DB dump,
 * and automatically dispatches the daily report + compressed attachment to the system default email.
 */
export async function executeAutomatedDatabaseBackup(customSnapshot?: any): Promise<BackupJobResult> {
  const startTime = Date.now();
  let snapshotPayload = customSnapshot;

  try {
    if (!snapshotPayload) {
      const clientSnapshot = await collectFullSystemDatabaseSnapshot();
      snapshotPayload = {
        collections: clientSnapshot.data,
        stats: clientSnapshot.stats,
        totalRecords: clientSnapshot.totalRecords,
      };
    }

    const response = await fetch('/api/backup/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snapshot: snapshotPayload,
        clientTimestamp: new Date().toISOString(),
      }),
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('[Backup Client Service Error]:', error);
    
    // Attempt to notify failure alert via backend if network allows
    try {
      await fetch('/api/backup/test-failure-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message || 'Client-side snapshot generation failure',
          failedStep: 'Client-side snapshot extraction & dispatch',
          errorStack: error.stack,
        }),
      });
    } catch {
      // Ignore secondary alert errors
    }

    return {
      success: false,
      error: error.message || 'فشل الاتصال بخادم النسخ الاحتياطي',
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Trigger an immediate test failure alert to verify that urgent failure notifications are received by the system default email.
 */
export async function triggerTestFailureAlert(customErrorMsg?: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/backup/test-failure-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: customErrorMsg || 'اختبار تجريبي: تعذر الاتصال بقرص تخزين النسخ الاحتياطي (Simulated Database Storage IO Error)',
        failedStep: 'محاكاة فحص أمان وتنبيه الأعطال البرمجية',
      }),
    });
    return await response.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch current backup engine status and historical jobs
 */
export async function fetchBackupEngineStatus(): Promise<BackupEngineStatus | null> {
  try {
    const res = await fetch('/api/backup/status');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('[Backup Status Fetch Warning]:', err);
  }
  return null;
}
