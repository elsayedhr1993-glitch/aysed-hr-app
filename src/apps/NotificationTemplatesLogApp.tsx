import React, { useState } from 'react';
import { 
  Bell, 
  MessageSquare, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Filter, 
  Search, 
  Send, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  User, 
  Check, 
  Sparkles, 
  Copy, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { EmployeeNotification, Employee, Company, WhatsAppGatewayConfig } from '../types';
import { formatKuwaitPhone, generateWhatsAppLink, sendLiveWhatsAppMessage } from '../utils/notificationEngine';
import { sendWhatsAppMessage } from '../services/whatsappService';
import toast from 'react-hot-toast';

interface NotificationTemplatesLogAppProps {
  notifications: EmployeeNotification[];
  employees: Employee[];
  activeCompany: Company;
  onOpenQuickModal?: (empId?: string, trigger?: any) => void;
  onOpenManualSendModal?: (emp?: Employee | null) => void;
  onDeleteNotification?: (notifId: string) => void;
  onClearAllNotifications?: () => void;
}

export const NotificationTemplatesLogApp: React.FC<NotificationTemplatesLogAppProps> = ({
  notifications = [],
  employees = [],
  activeCompany,
  onOpenQuickModal,
  onOpenManualSendModal,
  onDeleteNotification,
  onClearAllNotifications,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'WHATSAPP' | 'SMS' | 'SYSTEM_ALERT'>('ALL');
  const [triggerFilter, setTriggerFilter] = useState<string>('ALL');
  const [selectedNotif, setSelectedNotif] = useState<EmployeeNotification | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleOpenModal = (empId?: string, trigger?: any) => {
    if (typeof onOpenQuickModal === 'function') {
      onOpenQuickModal(empId, trigger);
    } else if (typeof onOpenManualSendModal === 'function') {
      const emp = empId ? employees.find(e => e.id === empId) || null : null;
      onOpenManualSendModal(emp);
    }
  };

  const handleResendWhatsApp = async (notif: EmployeeNotification) => {
    setResendingId(notif.id);
    const toastId = toast.loading(`جاري إعادة إرسال رسالة الواتساب عبر البوابة السحابية إلى ${notif.employeeName}...`);
    
    const result = await sendWhatsAppMessage(notif.recipientPhone, notif.message, activeCompany?.id);

    if (result.sent) {
      toast.success(`تمت إعادة الإرسال بنجاح عبر بوابة الواتساب!`, { id: toastId });
    } else {
      toast.error(`فشل الإرسال التلقائي: ${result.message}. يمكنك النقر على زر فتح المحادثة مباشرة.`, { id: toastId, duration: 6000 });
      const waUrl = generateWhatsAppLink(notif.recipientPhone, notif.message);
      window.open(waUrl, '_blank');
    }
    setResendingId(null);
  };

  // Filter notifications for active company
  const companyNotifs = notifications.filter(n => n.companyId === (activeCompany?.id || 'comp-1'));

  const filteredNotifs = companyNotifs.filter(n => {
    const matchesSearch = 
      !searchTerm ||
      n.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.recipientPhone.includes(searchTerm) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesChannel = channelFilter === 'ALL' || n.channel === channelFilter;
    const matchesTrigger = triggerFilter === 'ALL' || n.triggerType === triggerFilter;

    return matchesSearch && matchesChannel && matchesTrigger;
  });

  // KPI stats
  const totalCount = companyNotifs.length;
  const whatsappCount = companyNotifs.filter(n => n.channel === 'WHATSAPP').length;
  const smsCount = companyNotifs.filter(n => n.channel === 'SMS').length;
  const actionRequiredCount = companyNotifs.filter(n => n.triggerType === 'HR_ACTION_REQUIRED').length;
  const renewalsCount = companyNotifs.filter(n => n.triggerType.includes('RENEWAL')).length;

  return (
    <div className="p-6 bg-slate-50 min-h-[calc(100vh-3rem)] space-y-6" dir="rtl">
      
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#714B67] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>محرك الإشعارات والرسائل التلقائية عبر الهاتف والواتساب</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>سجل وأرشيف إشعارات الموظفين (Notification Templates Log)</span>
            <span className="text-xs font-mono bg-purple-100 text-[#714B67] px-2.5 py-0.5 rounded-full border border-purple-200 font-bold">
              {totalCount} رسالة موثقة
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            متابعة الرسائل اللحظية المرسلة للموظفين (تجديد الإقامات، التراخيص الصحية، اعتماد الإجازات، استدعاء المراجعة، وكشوفات الرواتب) مع إمكانية إعادة الإرسال الفوري.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition"
          >
            <Send className="w-4 h-4" />
            <span>إرسال إشعار موظف جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#714B67] flex items-center justify-center font-bold">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">إجمالي الرسائل</div>
            <div className="text-lg font-black text-slate-900">{totalCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">رسائل الواتساب</div>
            <div className="text-lg font-black text-emerald-700">{whatsappCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">استدعاءات الإدارة</div>
            <div className="text-lg font-black text-amber-700">{actionRequiredCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">إشعارات التجديد</div>
            <div className="text-lg font-black text-blue-700">{renewalsCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث باسم الموظف، الهاتف (+965)، أو نص الرسالة..."
            className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50/50 focus:bg-white focus:border-[#714B67] transition"
          />
        </div>

        {/* Channel Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setChannelFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-bold transition ${
              channelFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل ({totalCount})
          </button>
          <button
            onClick={() => setChannelFilter('WHATSAPP')}
            className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1 ${
              channelFilter === 'WHATSAPP' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>واتساب</span>
          </button>
          <button
            onClick={() => setChannelFilter('SMS')}
            className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1 ${
              channelFilter === 'SMS' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>SMS</span>
          </button>
          <button
            onClick={() => setChannelFilter('SYSTEM_ALERT')}
            className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1 ${
              channelFilter === 'SYSTEM_ALERT' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>النظام</span>
          </button>
        </div>

        {/* Trigger Filter Dropdown */}
        <select
          value={triggerFilter}
          onChange={(e) => setTriggerFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 bg-white font-bold text-slate-700 outline-none"
        >
          <option value="ALL">جميع أنواع المحفزات</option>
          <option value="HR_ACTION_REQUIRED">استدعاء مراجعة الإدارة</option>
          <option value="MOH_RENEWAL">تجديد ترخيص وزارة الصحة</option>
          <option value="RESIDENCY_RENEWAL">تجديد الإقامة (مادة 18)</option>
          <option value="CIVIL_ID_RENEWAL">تجديد البطاقة المدنية</option>
          <option value="LEAVE_APPROVAL">اعتماد طلب الإجازة</option>
          <option value="PAYROLL_SALARY">كشف الراتب الشهري</option>
          <option value="DIRECT_MESSAGE">رسائل مباشرة</option>
        </select>
      </div>

      {/* Notifications Table List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">لا توجد سجلات رسائل مطابقة</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              يمكنك إرسال إشعار فوري لأي موظف عبر زر [إرسال إشعار موظف جديد] أو من داخل بطاقة الموظف.
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-bold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال أول إشعار الآن</span>
            </button>
          </div>) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#714B67] text-white font-bold">
                <tr>
                  <th className="p-3.5">الموظف المستلم</th>
                  <th className="p-3.5">الهاتف (+965)</th>
                  <th className="p-3.5">القناة</th>
                  <th className="p-3.5">المحفز / الموضوع</th>
                  <th className="p-3.5">معاينة نص الرسالة</th>
                  <th className="p-3.5">وقت وتاريخ الإرسال</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotifs.map((notif, index) => {
                  const isWhatsapp = notif.channel === 'WHATSAPP';
                  const isSMS = notif.channel === 'SMS';
                  const dateStr = new Date(notif.sentAt).toLocaleString('ar-KW', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr 
                      key={`${notif.id || 'notif'}-${index}`} 
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-purple-50/40 transition`}
                    >
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#714B67]/10 text-[#714B67] flex items-center justify-center font-bold text-xs">
                            {notif.employeeName.charAt(0)}
                          </div>
                          <span>{notif.employeeName}</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-700 dir-ltr text-right">
                        {notif.recipientPhone}
                      </td>

                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isWhatsapp 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isSMS 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {isWhatsapp ? <Smartphone className="w-3 h-3" /> : isSMS ? <MessageSquare className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                          <span>{isWhatsapp ? 'واتساب' : isSMS ? 'SMS' : 'نظام'}</span>
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{notif.title}</div>
                        <div className="text-[10px] text-slate-500">
                          {notif.triggerType === 'HR_ACTION_REQUIRED' ? '📌 استدعاء مراجعة الإدارة' :
                           notif.triggerType === 'MOH_RENEWAL' ? '🩺 تجديد ترخيص صحي' :
                           notif.triggerType === 'RESIDENCY_RENEWAL' ? '🛂 تجديد إقامة مادة 18' :
                           notif.triggerType === 'CIVIL_ID_RENEWAL' ? '🪪 تجديد بطاقة مدنية' :
                           notif.triggerType === 'LEAVE_APPROVAL' ? '🌴 اعتماد إجازة' :
                           notif.triggerType === 'PAYROLL_SALARY' ? '💵 كشف راتب شهري' : '✉️ رسالة مباشرة'}
                        </div>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div 
                          className="line-clamp-2 text-slate-600 cursor-pointer hover:text-[#714B67] transition"
                          onClick={() => setSelectedNotif(notif)}
                          title="انقر لقراءة النص كاملاً"
                        >
                          {notif.message}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ناجح (تم الإرسال)</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isWhatsapp && (
                            <>
                              <a
                                href={generateWhatsAppLink(notif.recipientPhone, notif.message)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="فتح المحادثة وإرسال الرسالة عبر واتساب ويب/التطبيق مباشرة"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleResendWhatsApp(notif)}
                                disabled={resendingId === notif.id}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
                                title="إعادة الإرسال عبر بوابة الواتساب السحابية (Cloud API)"
                              >
                                {resendingId === notif.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />) : (
                                  <Smartphone className="w-4 h-4" />)}
                              </button>
                            </>)}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(notif.message);
                              toast.success('تم نسخ نص الرسالة');
                            }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="نسخ النص"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {onDeleteNotification && (
                            <button
                              onClick={() => onDeleteNotification(notif.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="حذف من السجل"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>)}
                        </div>
                      </td>
                    </tr>);
                })}
              </tbody>
            </table>
          </div>)}
      </div>

      {/* Message Full View Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-[#714B67] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="font-bold text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-300" />
                <span>تفاصيل الإشعار المرسل</span>
              </div>
              <button onClick={() => setSelectedNotif(null)} className="text-purple-200 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">الموظف</span>
                  <strong className="text-slate-800">{selectedNotif.employeeName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">رقم الهاتف</span>
                  <strong className="text-slate-800 font-mono dir-ltr">{selectedNotif.recipientPhone}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">القناة</span>
                  <strong className="text-emerald-700">{selectedNotif.channel}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ الإرسال</span>
                  <span className="text-slate-700 font-mono">{new Date(selectedNotif.sentAt).toLocaleString('ar-KW')}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نص الرسالة المعتمد:</label>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans leading-relaxed text-slate-900 whitespace-pre-wrap">
                  {selectedNotif.message}
                </div>
              </div>
            </div>

            <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedNotif.message);
                  toast.success('تم نسخ النص بنجاح');
                }}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 flex items-center gap-1.5 text-xs transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ النص</span>
              </button>

              <button
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-1.5 bg-[#714B67] text-white rounded-lg font-bold text-xs hover:bg-[#5a3a52] transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>)}

    </div>);
};
