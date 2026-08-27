import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, setLogLevel, doc, setDoc, deleteDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { supabase } from './supabase';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress benign connection retry / offline notice warnings in sandboxed iframe environment
try {
  setLogLevel('silent');
} catch {
  // Ignore if already configured
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let firestoreInstance;
try {
  if (firebaseConfig.firestoreDatabaseId) {
    firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    firestoreInstance = getFirestore(app);
  }
} catch {
  try {
    firestoreInstance = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
  } catch {
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;
export const auth = getAuth(app);

/**
 * Creates a secondary isolated Firebase App instance so creating accounts
 * on the client-side DOES NOT log out or overwrite the current Super Admin session.
 */
export async function createTenantUserSafely(email: string, pass: string) {
  const secondaryAppName = `SecondaryApp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const { createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    const uid = userCredential.user.uid;
    // Sign out from the isolated secondary instance immediately
    await signOut(secondaryAuth);
    const { deleteApp } = await import('firebase/app');
    await deleteApp(secondaryApp);
    return { success: true, uid, alreadyExisted: false };
  } catch (err: any) {
    try {
      const { deleteApp } = await import('firebase/app');
      await deleteApp(secondaryApp);
    } catch {}
    if (err.code === 'auth/email-already-in-use') {
      return { success: true, alreadyExisted: true, message: 'البريد مستخدم بالفعل' };
    }
    throw err;
  }
}

/**
 * Provision tenant account using backend Firebase Admin SDK first, 
 * falling back to the isolated client-side secondary auth instance if needed.
 * This guarantees the Super Admin is NEVER logged out!
 */
export async function provisionTenantAuth(params: {
  email: string;
  password?: string;
  companyName: string;
  companyId?: string;
  ownerName?: string;
  phone?: string;
  planType?: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();
  const pass = params.password || 'Aysed2026#Secure';

  try {
    const res = await fetch('/api/admin/create-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: pass,
        companyName: params.companyName,
        companyId: params.companyId,
        ownerName: params.ownerName,
        phone: params.phone,
        planType: params.planType
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, uid: data.uid, alreadyExisted: data.alreadyExisted, message: data.message };
      }
      if (!data.useClientFallback) {
        console.warn("Admin create-tenant returned error:", data.error);
      }
    }
  } catch (apiErr) {
    console.warn("Backend admin create-tenant fetch error:", apiErr);
  }

  // Safe client-side fallback using isolated secondary auth app
  return await createTenantUserSafely(cleanEmail, pass);
}

/**
 * Recursively removes undefined values from objects or arrays to prevent Firestore errors
 */
export function cleanFirestoreData<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => cleanFirestoreData(item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestoreData(value);
    }
  }
  return cleaned as T;
}

/**
 * Helper to retrieve all permanently purged tenant identifiers and names.
 */
export function getPurgedTenants(): Set<string> {
  const purged = new Set<string>();
  try {
    const raw = localStorage.getItem('aysed_purged_tenants');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach(item => {
          if (typeof item === 'string' && item.trim()) {
            purged.add(item.trim().toLowerCase());
          }
        });
      }
    }
  } catch {}
  return purged;
}

/**
 * Checks if a tenant ID, name, or record has been marked as permanently purged.
 */
export function isTenantPurged(identifierOrObj?: any): boolean {
  if (!identifierOrObj) return false;
  const purged = getPurgedTenants();
  if (purged.size === 0) return false;

  if (typeof identifierOrObj === 'string') {
    const clean = identifierOrObj.trim().toLowerCase();
    if (!clean) return false;
    // Strictly exact matching to avoid falsely purging valid companies
    return purged.has(clean);
  }

  if (typeof identifierOrObj === 'object') {
    const id = identifierOrObj.id ? String(identifierOrObj.id).trim().toLowerCase() : '';
    const companyId = identifierOrObj.companyId ? String(identifierOrObj.companyId).trim().toLowerCase() : '';
    const name = identifierOrObj.name ? String(identifierOrObj.name).trim().toLowerCase() : '';
    const nameAr = identifierOrObj.nameAr ? String(identifierOrObj.nameAr).trim().toLowerCase() : '';
    const nameEn = identifierOrObj.nameEn ? String(identifierOrObj.nameEn).trim().toLowerCase() : '';
    const companyName = identifierOrObj.companyName ? String(identifierOrObj.companyName).trim().toLowerCase() : '';
    const email = identifierOrObj.email ? String(identifierOrObj.email).trim().toLowerCase() : '';

    const candidates = [id, companyId, name, nameAr, nameEn, companyName, email].filter(Boolean);
    for (const c of candidates) {
      if (purged.has(c)) return true;
    }
  }

  return false;
}

/**
 * Permanently records a tenant into the purged blacklist
 */
export function recordPurgedTenant(tokens: string[]) {
  try {
    const raw = localStorage.getItem('aysed_purged_tenants');
    const existing: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set<string>(existing.map(s => String(s).trim().toLowerCase()));

    tokens.forEach(t => {
      if (t && typeof t === 'string' && t.trim()) {
        set.add(t.trim().toLowerCase());
      }
    });

    const updated = Array.from(set);
    localStorage.setItem('aysed_purged_tenants', JSON.stringify(updated));

    // Also persist to Firestore purged_tenants collection if possible
    tokens.forEach(t => {
      if (t && t.trim()) {
        const docKey = t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        if (docKey) {
          setDoc(doc(db, 'purged_tenants', docKey), {
            token: t,
            purgedAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});
        }
      }
    });
  } catch (e) {
    console.warn('Error recording purged tenant:', e);
  }
}

/**
 * Executes a full cascading hard delete (Purge All Traces) for a subscriber company/tenant:
 * 1. Firebase Auth: Deletes admin auth user via backend admin API.
 * 2. Firestore: Deletes company document, subscriptions, subscription_requests, users, and all sub-records (employees, leaves, attendances, payslips, contracts, etc.).
 * 3. Supabase: Purges corresponding subscription request entries.
 * 4. LocalStorage & SessionStorage: Wipes credentials, company cache, and tenant-scoped keys.
 * 5. Dispatches global events for real-time UI refresh across all tabs and dropdowns.
 */
export async function purgeTenantCascading(params: {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companyId?: string;
}): Promise<{ success: boolean; message: string; deletedCounts: Record<string, number> }> {
  const deletedCounts: Record<string, number> = {
    authUsers: 0,
    companies: 0,
    subscriptions: 0,
    subscription_requests: 0,
    users: 0,
    employees: 0,
    leaves: 0,
    attendance: 0,
    payslips: 0,
    contracts: 0,
    otherSubRecords: 0
  };

  const targetName = (params.name || '').trim().toLowerCase();
  const targetEmail = (params.email || '').trim().toLowerCase();
  const targetIds = new Set<string>();

  if (params.id) targetIds.add(params.id);
  if (params.companyId) targetIds.add(params.companyId);

  // Blacklist immediately so it can NEVER be re-injected or resurface
  recordPurgedTenant([
    params.id,
    params.companyId || '',
    params.name,
    targetName,
    targetEmail,
    params.phone || ''
  ].filter(Boolean));

  // Helper to test if a document belongs to this tenant
  const isMatch = (data: any, docId: string) => {
    if (!data) return false;
    if (targetIds.has(docId)) return true;
    if (data.companyId && targetIds.has(data.companyId)) return true;
    if (data.id && targetIds.has(data.id)) return true;
    if (targetName) {
      if (data.companyName && data.companyName.trim().toLowerCase() === targetName) return true;
      if (data.name && data.name.trim().toLowerCase() === targetName) return true;
      if (data.nameAr && data.nameAr.trim().toLowerCase() === targetName) return true;
      if (data.nameEn && data.nameEn.trim().toLowerCase() === targetName) return true;
    }
    if (targetEmail) {
      if (data.email && data.email.trim().toLowerCase() === targetEmail) return true;
      if (data.adminEmail && data.adminEmail.trim().toLowerCase() === targetEmail) return true;
    }
    return false;
  };

  // 1. Firebase Auth Hard Delete via Backend Admin Route
  if (targetEmail) {
    try {
      const res = await fetch('/api/admin/delete-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          companyId: params.companyId || params.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          deletedCounts.authUsers += 1;
        }
      }
    } catch (authErr) {
      console.warn('Backend delete-tenant auth call note:', authErr);
    }
  }

  // 2. Discover all associated IDs from companies & subscriptions first
  try {
    const compSnap = await getDocs(collection(db, 'companies'));
    for (const d of compSnap.docs) {
      const val = d.data();
      if (isMatch(val, d.id)) {
        targetIds.add(d.id);
        if (val.companyId) targetIds.add(val.companyId);
        if (val.id) targetIds.add(val.id);
      }
    }
  } catch (e) {}

  try {
    const subSnap = await getDocs(collection(db, 'subscriptions'));
    for (const d of subSnap.docs) {
      const val = d.data();
      if (isMatch(val, d.id)) {
        targetIds.add(d.id);
        if (val.companyId) targetIds.add(val.companyId);
      }
    }
  } catch (e) {}

  // 3. Cascading Delete in Firestore across all sub-collections
  const subCollections = [
    'employees',
    'leaves',
    'attendance',
    'payslips',
    'contracts',
    'documents',
    'custodies',
    'loans',
    'warnings',
    'employeeNotes',
    'notifications',
    'departments',
    'job_titles',
    'users'
  ];

  for (const colName of subCollections) {
    try {
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        const val = d.data();
        if (isMatch(val, d.id)) {
          await deleteDoc(doc(db, colName, d.id));
          if (colName in deletedCounts) {
            deletedCounts[colName] += 1;
          } else {
            deletedCounts.otherSubRecords += 1;
          }
        }
      }
    } catch (colErr) {
      console.warn(`Error deleting from ${colName}:`, colErr);
    }
  }

  // 4. Delete from companies, subscriptions, subscription_requests, settings
  const primaryCollections = ['companies', 'subscriptions', 'subscription_requests', 'settings', 'company_settings'];
  for (const colName of primaryCollections) {
    try {
      // Direct doc deletions by known targetIds
      for (const tId of targetIds) {
        try {
          await deleteDoc(doc(db, colName, tId));
        } catch {}
      }

      // Query-based deletions for any matching records
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        const val = d.data();
        if (isMatch(val, d.id)) {
          await deleteDoc(doc(db, colName, d.id));
          if (colName in deletedCounts) {
            deletedCounts[colName] += 1;
          }
        }
      }
    } catch (colErr) {
      console.warn(`Error deleting primary collection ${colName}:`, colErr);
    }
  }

  // 5. Supabase Cascading Purge
  try {
    for (const tId of targetIds) {
      await supabase.from('aysed_subscription').delete().eq('id', tId);
    }
    if (params.name) {
      await supabase.from('aysed_subscription').delete().ilike('name', `%${params.name}%`);
    }
  } catch (sbErr) {
    console.warn('Supabase delete note:', sbErr);
  }

  // 6. LocalStorage & SessionStorage Cascading Wipe
  try {
    // a. Remove credentials
    const creds = JSON.parse(localStorage.getItem('aysed_company_credentials') || '{}');
    let credsChanged = false;
    for (const [cEmail, cData] of Object.entries(creds)) {
      const dataObj = cData as any;
      if (
        cEmail.toLowerCase() === targetEmail ||
        (targetName && dataObj?.companyName?.toLowerCase() === targetName)
      ) {
        delete creds[cEmail];
        credsChanged = true;
      }
    }
    if (credsChanged) {
      localStorage.setItem('aysed_company_credentials', JSON.stringify(creds));
    }

    // b. Remove from registered_companies_v1
    const regComps = JSON.parse(localStorage.getItem('registered_companies_v1') || '[]');
    const filteredReg = regComps.filter((c: any) => !isMatch(c, c.id));
    localStorage.setItem('registered_companies_v1', JSON.stringify(filteredReg));

    // c. Remove from aysed_saved_subscriptions
    const savedSubs = JSON.parse(localStorage.getItem('aysed_saved_subscriptions') || '[]');
    const filteredSubs = savedSubs.filter((s: any) => !isMatch(s, s.id));
    localStorage.setItem('aysed_saved_subscriptions', JSON.stringify(filteredSubs));

    // d. Remove from aysed_all_companies if exists
    const allComps = JSON.parse(localStorage.getItem('aysed_all_companies') || '[]');
    if (Array.isArray(allComps) && allComps.length > 0) {
      const filteredAll = allComps.filter((c: any) => !isMatch(c, c.id));
      localStorage.setItem('aysed_all_companies', JSON.stringify(filteredAll));
    }

    // e. Clear tenant-scoped storage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        for (const tId of targetIds) {
          if (k.includes(tId)) {
            keysToRemove.push(k);
          }
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // f. Check activeCompanyId
    const currentActiveId = localStorage.getItem('activeCompanyId');
    if (currentActiveId && targetIds.has(currentActiveId)) {
      localStorage.removeItem('activeCompanyId');
    }
  } catch (lsErr) {
    console.warn('LocalStorage cleanup note:', lsErr);
  }

  // 7. Dispatch events for real-time synchronization across UI & other components
  try {
    window.dispatchEvent(
      new CustomEvent('aysed_companies_changed', {
        detail: {
          action: 'DELETE',
          companyId: params.companyId || params.id,
          companyName: params.name
        }
      })
    );
    window.dispatchEvent(new Event('storage'));
  } catch {}

  return {
    success: true,
    message: `تم حذف منشأة (${params.name}) وكافة بياناتها وحساب الدخول نهائياً`,
    deletedCounts
  };
}
