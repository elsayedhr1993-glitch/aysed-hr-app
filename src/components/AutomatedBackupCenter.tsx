// src/components/AutomatedBackupCenter.tsx
import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Mail, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileArchive, 
  Zap, 
  Send,
  HardDrive,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  executeAutomatedDatabaseBackup, 
  triggerTestFailureAlert, 
  fetchBackupEngineStatus, 
  BackupEngineStatus, 
  BackupJobResult 
} from '../services/backupService';
import toast from 'react-hot-toast';

export const AutomatedBackupCenter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(false);
  const [statusData, setStatusData] = useState<BackupEngineStatus | null>(null);
  const [lastBackupResult, setLastBackupResult] = useState<BackupJobResult | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  const loadStatus = async () => {
    setFetchingStatus(true);
    try {
      const data = await fetchBackupEngineStatus();
      if (data) {
        setStatusData(data);
      }
    } catch (err) {
      console.warn('Failed to fetch status:', err);
    } finally {
      setFetchingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleRunBackupNow = async () => {
    setLoading(true);
    setCurrentStep('جاري قراءة واستخراج بيانات مجموعات النظام...');
    try {
      setTimeout(() => setCurrentStep('جاري ضغط ملف قاعدة البيانات (GZIP) واحتساب بصمة SHA-256...'), 800);
      setTimeout(() => setCurrentStep('جاري إرسال التقرير وملف الـ DB Dump المرفق إلى إيميل النظام...'), 1600);

      const result = await executeAutomatedDatabaseBackup();
      setLastBackupResult(result);

      if (result.success) {
        toast.success('تم أخذ النسخة الاحتياطية وإرسال ملف التفريغ المضغوط إلى إيميل النظام بنجاح!', { duration: 5000 });
        await loadStatus();
      } else {
        toast.error(`فشل النسخ الاحتياطي: ${result.error || 'خطأ غير معروف'}. تم إرسال تنبيه عاجل للإيميل.`, { duration: 6000 });
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const handleTestFailureAlert = async () => {
    setTestingAlert(true);
    try {
      const res = await triggerTestFailureAlert(
        'محاكاة اختبارية: تعذر الاتصال بقرص تخزين النسخ الاحتياطية (Simulated Database Storage IO Error)'
      );
      if (res.success) {
        toast.success('تم إرسال إيميل التنبيه العاجل بنجاح إلى إيميل النظام المعتمد!', { duration: 5000 });
        await loadStatus();
      } else {
        toast.error(`تعذر إرسال التنبيه: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل إرسال تنبيه الاختبار');
    } finally {
      setTestingAlert(false);
    }
  };

  const handleDownloadLatest = () => {
    window.location.href = '/api/backup/download-latest';
  };

  const systemEmail = statusData?.systemDefaultEmail || 'elsayedhr1993@gmail.com';

  return (
    <div className="space-y-6 text-slate-800" dir="rtl">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-l from-[#714B67] to-[#4c2d44] text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-purple-900/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              محرك النسخ الاحتياطي التلقائي اليومي (Enterprise Auto-Backup)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              إدارة النسخ الاحتياطي السحابي والإرسال التلقائي الصامت
            </h2>
            <p className="text-slate-200 text-sm leading-relaxed">
              يقوم النظام بأخذ نسخة احتياطية كاملة ومضغوطة (<span className="font-mono text-emerald-300 font-semibold">DB Dump File .json.gz</span>) يومياً وإرسالها آلياً وصامتاً من وإلى إيميل النظام المعتمد، مع إرسال تنبيه عاجل وفوري في حال تعذر أخذ النسخة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleRunBackupNow}
              disabled={loading}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري النسخ والضغط...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>أخذ نسخة فورية وإرسالها للإيميل</span>
                </>
              )}
            </button>

            <button
              onClick={loadStatus}
              disabled={fetchingStatus}
              title="تحديث البيانات"
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${fetchingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Step Tracker when running */}
        {loading && currentStep && (
          <div className="mt-6 p-4 rounded-xl bg-white/10 border border-white/20 flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-300 shrink-0" />
            <span className="text-sm font-medium text-emerald-100">{currentStep}</span>
          </div>
        )}
      </div>

      {/* Grid Specs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* System Email Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">إيميل النظام المعتمد</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#714B67] flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-sm font-bold text-slate-900 break-all bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
            {systemEmail}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            يتم إرسال تقرير النسخ ومرفق قاعدة البيانات من وإلى هذا الإيميل المعتمد بالمتغيرات البيئية (<code className="text-xs text-purple-700 font-semibold">SMTP_USER</code>).
          </p>
        </div>

        {/* Schedule & Automation Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">حالة الأتمتة اليومية</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <Check className="w-3.5 h-3.5" />
              نشط ويعمل آلياً
            </span>
            <span className="text-xs text-slate-500 font-medium">كل 24 ساعة (00:00 بتوقيت الكويت)</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            محرك الجدولة يعمل في خلفية الخادم بشكل صامت وتلقائي بدون الحاجة لأي تدخل يدوي.
          </p>
        </div>

        {/* Failure Alerts Shield */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">درع تنبيه الأعطال الفوري</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">تنبيه عاجل وفوري عند أي عطل</span>
            <button
              onClick={handleTestFailureAlert}
              disabled={testingAlert}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {testingAlert ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              <span>اختبار التنبيه</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            في حال تعذر النسخ لأي سبب تقني، يُرسل إشعار أحمر عالي الأولوية فوراً إلى نفس الإيميل لتدارك الأمر.
          </p>
        </div>
      </div>

      {/* Latest Run Details & Quick Download Card */}
      {statusData?.lastRun && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileArchive className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                آخر نسخة احتياطية ناجحة ({statusData.lastRun.timestamp})
              </h3>
            </div>

            <button
              onClick={handleDownloadLatest}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>تحميل ملف الـ Dump مضغوطاً (.json.gz)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block mb-1">معرف النسخة (Backup ID)</span>
              <span className="font-mono font-bold text-slate-800">{statusData.lastRun.backupId}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">إجمالي السجلات المحفوظة</span>
              <span className="font-bold text-slate-800 text-sm">{statusData.lastRun.recordsCount.toLocaleString('ar-KW')} سجل</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">حجم الملف المضغوط</span>
              <span className="font-bold text-emerald-700 text-sm">{statusData.lastRun.compressedSize}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">اسم الملف المرفق</span>
              <span className="font-mono text-slate-600 break-all">{statusData.lastRun.filename}</span>
            </div>
          </div>
        </div>
      )}

      {/* Backup History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#714B67]" />
            <h3 className="font-bold text-sm text-slate-900">سجل عمليات النسخ الاحتياطي والتنبيهات (Backup Audit Log)</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {statusData?.history?.length || 0} عمليات مسجلة
          </span>
        </div>

        {statusData?.history && statusData.history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">معرف النسخة</th>
                  <th className="p-3">توقيت العملية</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">السجلات</th>
                  <th className="p-3">حجم الملف</th>
                  <th className="p-3">المدة</th>
                  <th className="p-3 text-left">الملف المرفق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statusData.history.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono text-slate-700 font-semibold">{item.backupId}</td>
                    <td className="p-3 text-slate-600">{item.timestamp}</td>
                    <td className="p-3">
                      {item.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          ناجح وتم الإرسال
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          فشل (أُرسل تنبيه)
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{item.recordsCount.toLocaleString('ar-KW')}</td>
                    <td className="p-3 text-slate-600 font-mono">{item.sizeFormatted}</td>
                    <td className="p-3 text-slate-500">{(item.durationMs / 1000).toFixed(2)} ثانية</td>
                    <td className="p-3 text-left font-mono text-slate-600">{item.filename}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <HardDrive className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs">لم يتم تسجيل عمليات نسخ سابقة بعد. يمكنك تشغيل النسخ الفوري الآن بالضغط على الزر أعلاه.</p>
          </div>
        )}
      </div>
    </div>
  );
};
