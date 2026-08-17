import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Smartphone, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  ExternalLink,
  Copy,
  Clock,
  Sparkles,
  Phone
} from 'lucide-react';
import { Employee, Company, EmployeeNotification, LeaveRequest, Payslip, WhatsAppGatewayConfig } from '../types';
import { 
  NotificationTemplateGenerators, 
  formatKuwaitPhone, 
  generateWhatsAppLink,
  sendLiveWhatsAppMessage
} from '../utils/notificationEngine';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { formatKWD } from '../utils/kuwaitLaw';
import toast from 'react-hot-toast';

interface QuickNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  employees?: Employee[];
  activeCompany: Company;
  initialTrigger?: 'HR_ACTION_REQUIRED' | 'MOH_RENEWAL' | 'RESIDENCY_RENEWAL' | 'CIVIL_ID_RENEWAL' | 'LEAVE_APPROVAL' | 'PAYROLL_SALARY' | 'DIRECT_MESSAGE';
  initialData?: {
    leave?: LeaveRequest;
    payslip?: Payslip;
    reason?: string;
    newExpiryDate?: string;
    docType?: 'MOH_LICENSE' | 'RESIDENCY' | 'CIVIL_ID';
  };
  onSendNotification?: (notification: EmployeeNotification) => void;
  onNotificationSent?: (notification: EmployeeNotification) => void;
}

export const QuickNotificationModal: React.FC<QuickNotificationModalProps> = ({
  isOpen,
  onClose,
  employee,
  employees = [],
  activeCompany,
  initialTrigger = 'HR_ACTION_REQUIRED',
  initialData,
  onSendNotification,
  onNotificationSent,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employee?.id || '');
  const currentEmp = (employees.find(e => e.id === selectedEmpId) || employee || employees[0]) as Employee | undefined;
  const [recipientPhone, setRecipientPhone] = useState<string>(currentEmp?.phone || '');
  const [triggerType, setTriggerType] = useState<'HR_ACTION_REQUIRED' | 'MOH_RENEWAL' | 'RESIDENCY_RENEWAL' | 'CIVIL_ID_RENEWAL' | 'LEAVE_APPROVAL' | 'PAYROLL_SALARY' | 'DIRECT_MESSAGE'>(initialTrigger);
  const [channel, setChannel] = useState<'WHATSAPP' | 'SMS' | 'SYSTEM_ALERT'>('WHATSAPP');
  
  // Custom inputs for parameters
  const [actionReason, setActionReason] = useState<string>(initialData?.reason || 'توقيع العقد الجديد واستلام الشارة الوظيفية');
  const [actionDeadline, setActionDeadline] = useState<string>('');
  const [actionLocation, setActionLocation] = useState<string>('مكتب الموارد البشرية - الدور 14');
  
  const [newExpiryDate, setNewExpiryDate] = useState<string>(initialData?.newExpiryDate || '2028-12-31');
  const [docType, setDocType] = useState<'MOH_LICENSE' | 'RESIDENCY' | 'CIVIL_ID'>(initialData?.docType || 'MOH_LICENSE');
  
  const [leaveStart, setLeaveStart] = useState<string>(initialData?.leave?.startDate || '2026-09-01');
  const [leaveEnd, setLeaveEnd] = useState<string>(initialData?.leave?.endDate || '2026-09-15');
  const [leaveDays, setLeaveDays] = useState<number>(initialData?.leave?.totalDays || 14);
  const [remainingDays, setRemainingDays] = useState<number>(16);
  const [returnWorkDate, setReturnWorkDate] = useState<string>('2026-09-16');
  
  const [salaryMonth, setSalaryMonth] = useState<string>(initialData?.payslip?.month || '2026-08');
  const [salaryNet, setSalaryNet] = useState<number>(initialData?.payslip?.netSalary || 850);
  
  const [customTitle, setCustomTitle] = useState<string>('إشعار إداري عاجل');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [editableMessage, setEditableMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (employee?.id) {
      setSelectedEmpId(employee.id);
      setRecipientPhone(employee.phone || '');
    }
  }, [employee]);

  useEffect(() => {
    if (selectedEmpId) {
      const emp = employees.find(e => e.id === selectedEmpId);
      if (emp) {
        setRecipientPhone(emp.phone || '');
      }
    }
  }, [selectedEmpId, employees]);

  useEffect(() => {
    if (initialTrigger) {
      setTriggerType(initialTrigger);
    }
  }, [initialTrigger]);

  // Re-generate template message whenever inputs or active employee change
  useEffect(() => {
    if (!currentEmp) return;

    const companyName = activeCompany?.nameAr || 'الشركة';

    if (triggerType === 'HR_ACTION_REQUIRED') {
      const res = NotificationTemplateGenerators.actionRequired({
        employee: currentEmp,
        reason: actionReason,
        deadline: actionDeadline,
        locationNote: actionLocation,
        companyNameAr: companyName,
      });
      setCustomTitle(res.title);
      setEditableMessage(res.message);
    } else if (triggerType === 'MOH_RENEWAL' || triggerType === 'RESIDENCY_RENEWAL' || triggerType === 'CIVIL_ID_RENEWAL') {
      const effectiveDocType = triggerType === 'MOH_RENEWAL' ? 'MOH_LICENSE' : triggerType === 'CIVIL_ID_RENEWAL' ? 'CIVIL_ID' : 'RESIDENCY';
      const res = NotificationTemplateGenerators.renewalSuccess({
        employee: currentEmp,
        docType: effectiveDocType,
        newExpiryDate: newExpiryDate,
        companyNameAr: companyName,
      });
      setCustomTitle(res.title);
      setEditableMessage(res.message);
    } else if (triggerType === 'LEAVE_APPROVAL') {
      const mockLeave: LeaveRequest = {
        id: 'lv-temp',
        employeeId: currentEmp.id,
        companyId: activeCompany?.id || 'comp-1',
        leaveType: 'ANNUAL',
        startDate: leaveStart,
        endDate: leaveEnd,
        totalDays: leaveDays,
        reason: 'إجازة سنوية',
        status: 'APPROVED',
        createdAt: new Date().toISOString()
      };
      const res = NotificationTemplateGenerators.leaveApproved({
        employee: currentEmp,
        leave: mockLeave,
        remainingDays: remainingDays,
        returnDate: returnWorkDate,
        companyNameAr: companyName,
      });
      setCustomTitle(res.title);
      setEditableMessage(res.message);
    } else if (triggerType === 'PAYROLL_SALARY') {
      const mockSlip: Payslip = {
        id: 'slip-temp',
        employeeId: currentEmp.id,
        companyId: activeCompany?.id || 'comp-1',
        month: salaryMonth,
        basicSalary: salaryNet,
        allowances: 0,
        grossSalary: salaryNet,
        latenessDeduction: 0,
        otherDeductions: 0,
        netSalary: salaryNet,
        paymentStatus: 'PAID'
      };
      const res = NotificationTemplateGenerators.salaryNotification({
        employee: currentEmp,
        payslip: mockSlip,
        month: salaryMonth,
        companyNameAr: companyName,
      });
      setCustomTitle(res.title);
      setEditableMessage(res.message);
    } else if (triggerType === 'DIRECT_MESSAGE') {
      if (!editableMessage || editableMessage.includes('عزيزي الموظف')) {
        const res = NotificationTemplateGenerators.directMessage({
          employee: currentEmp,
          title: customTitle,
          customBody: customMessage || 'يرجى مراجعة إدارة الموارد البشرية لتحديث بياناتكم.',
          companyNameAr: companyName,
        });
        setEditableMessage(res.message);
      }
    }
  }, [
    currentEmp, 
    triggerType, 
    actionReason, 
    actionDeadline, 
    actionLocation, 
    newExpiryDate, 
    leaveStart, 
    leaveEnd, 
    leaveDays, 
    remainingDays, 
    returnWorkDate, 
    salaryMonth, 
    salaryNet,
    customMessage,
    activeCompany
  ]);

  if (!isOpen) return null;

  const handleDirectWhatsApp = () => {
    if (!currentEmp) {
      toast.error('يرجى اختيار موظف');
      return;
    }

    const effectivePhone = recipientPhone || currentEmp.phone || '';
    const phone = formatKuwaitPhone(effectivePhone);
    if (!phone) {
      toast.error('يرجى إدخال رقم هاتف صالح للموظف (+965)');
      return;
    }

    const waUrl = generateWhatsAppLink(phone, editableMessage);
    
    // Create and record notification
    const notificationRecord: EmployeeNotification = {
      id: `notif-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      employeeId: currentEmp.id,
      employeeName: currentEmp.fullNameAr,
      recipientPhone: phone,
      channel: 'WHATSAPP',
      triggerType: triggerType,
      title: customTitle,
      message: editableMessage,
      sentAt: new Date().toISOString(),
      status: 'SENT',
      metadata: {
        expiryDate: newExpiryDate,
        leaveStartDate: leaveStart,
        leaveEndDate: leaveEnd,
        remainingLeaveDays: remainingDays,
        returnWorkDate: returnWorkDate,
        actionReason: actionReason,
        salaryMonth: salaryMonth,
        netSalary: salaryNet,
        bankName: currentEmp.bankName,
        iban: currentEmp.iban,
      }
    };

    if (typeof onNotificationSent === 'function') {
      onNotificationSent(notificationRecord);
    } else if (typeof onSendNotification === 'function') {
      onSendNotification(notificationRecord);
    }

    // Direct open
    window.open(waUrl, '_blank');
    toast.success(`تم فتح المحادثة المباشرة مع ${currentEmp.fullNameAr} على الواتساب!`);
    onClose();
  };

  const handleSend = async () => {
    if (!currentEmp) {
      toast.error('يرجى اختيار موظف');
      return;
    }

    const effectivePhone = recipientPhone || currentEmp.phone || '';
    const phone = formatKuwaitPhone(effectivePhone);
    if (!phone) {
      toast.error('يرجى إدخال رقم هاتف صالح للموظف (+965)');
      return;
    }

    setIsSending(true);
    setGatewayError(null);

    // If channel is WhatsApp, check for real gateway config and perform live API call
    let finalStatus: 'SENT' | 'DELIVERED' | 'FAILED' = 'SENT';

    if (channel === 'WHATSAPP') {
      const toastId = toast.loading(`جاري إرسال رسالة الواتساب إلى ${currentEmp.fullNameAr} عبر البوابة السحابية...`);
      const liveResult = await sendWhatsAppMessage(phone, editableMessage, activeCompany?.id);

      if (liveResult.sent) {
        finalStatus = 'DELIVERED';
        toast.success(`تم إرسال رسالة الواتساب بنجاح إلى ${currentEmp.fullNameAr} (${phone})!`, { id: toastId, duration: 5000 });
      } else {
        finalStatus = 'FAILED';
        setGatewayError(liveResult.message || 'تعذر الإرسال عبر البوابة السحابية');
        toast.error(`تعذر الإرسال التلقائي: ${liveResult.message}. يمكنك استخدام زر "إرسال مباشر عبر واتساب" لفتح المحادثة فوراً.`, { id: toastId, duration: 8000 });
        setIsSending(false);
        return; // Keep modal open so HR can click the direct WhatsApp send button
      }
    } else if (channel === 'SMS') {
      toast.success(`تم إرسال رسالة SMS عبر البوابة إلى ${phone}`);
    } else {
      toast.success(`تم حفظ الإشعار في نظام الموظف والتنبيهات الإدارية`);
    }

    const notificationRecord: EmployeeNotification = {
      id: `notif-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      employeeId: currentEmp.id,
      employeeName: currentEmp.fullNameAr,
      recipientPhone: phone,
      channel: channel,
      triggerType: triggerType,
      title: customTitle,
      message: editableMessage,
      sentAt: new Date().toISOString(),
      status: finalStatus,
      metadata: {
        expiryDate: newExpiryDate,
        leaveStartDate: leaveStart,
        leaveEndDate: leaveEnd,
        remainingLeaveDays: remainingDays,
        returnWorkDate: returnWorkDate,
        actionReason: actionReason,
        salaryMonth: salaryMonth,
        netSalary: salaryNet,
        bankName: currentEmp.bankName,
        iban: currentEmp.iban,
      }
    };

    if (typeof onNotificationSent === 'function') {
      onNotificationSent(notificationRecord);
    } else if (typeof onSendNotification === 'function') {
      onSendNotification(notificationRecord);
    }
    setIsSending(false);
    onClose();
  };

  const formattedPhone = formatKuwaitPhone(recipientPhone || currentEmp?.phone || '');
  const directWaUrl = generateWhatsAppLink(formattedPhone, editableMessage);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-[#714B67] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>محرك إشعارات الموظفين الذكي (WhatsApp / SMS)</span>
                <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-400/30">
                  +965 Kuwait
                </span>
              </h3>
              <p className="text-xs text-purple-200">
                إرسال تنبيهات فورية ومحفزات تلقائية معتمدة بنقرة زر
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Target Employee & Phone Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block font-bold text-slate-700 mb-1">الموظف المستلم</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white font-bold text-slate-800 outline-none"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullNameAr} - ({emp.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>رقم هاتف الموظف (واتساب / هاتف)</span>
                {formattedPhone && (
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">
                    جاهز للإرسال
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => {
                    setRecipientPhone(e.target.value);
                    setGatewayError(null);
                  }}
                  placeholder="مثال: 99881122 أو 96599881122"
                  className="w-full font-mono text-xs font-bold text-slate-800 outline-none bg-transparent dir-ltr text-right"
                />
              </div>
            </div>
          </div>

          {/* Gateway Warning / Direct WhatsApp Link Banner */}
          {gatewayError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>حالة البوابة السحابية: {gatewayError}</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                لم تصل الرسالة عبر البوابة التلقائية؟ يمكنك إرسالها فوراً وبشكل مضمون 100% بالنقر على الزر المباشر أدناه لفتح تطبيق الواتساب أو واتساب ويب مع نص الرسالة جاهزاً للإرسال بنقرة واحدة:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDirectWhatsApp}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>📲 فتح المحادثة وإرسالها عبر واتساب الآن</span>
                </button>
                <a
                  href={directWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg font-bold text-xs flex items-center gap-1 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح في نافذة جديدة</span>
                </a>
              </div>
            </div>
          )}

          {/* Triggers Category Selector */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">نوع الإشعار والمحفز (Automated Triggers)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTriggerType('HR_ACTION_REQUIRED')}
                className={`p-2.5 rounded-xl border text-right transition flex flex-col gap-1 ${
                  triggerType === 'HR_ACTION_REQUIRED' 
                    ? 'bg-purple-50 border-[#714B67] text-[#714B67] font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">مراجعة الإدارة 📌</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <span className="text-[10px] text-slate-500 font-normal">توقيع عقد، عهدة، فحص</span>
              </button>

              <button
                type="button"
                onClick={() => setTriggerType('MOH_RENEWAL')}
                className={`p-2.5 rounded-xl border text-right transition flex flex-col gap-1 ${
                  triggerType === 'MOH_RENEWAL' 
                    ? 'bg-purple-50 border-[#714B67] text-[#714B67] font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">تجديد ترخيص صحي 🩺</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className="text-[10px] text-slate-500 font-normal">وزارة الصحة (MOH)</span>
              </button>

              <button
                type="button"
                onClick={() => setTriggerType('RESIDENCY_RENEWAL')}
                className={`p-2.5 rounded-xl border text-right transition flex flex-col gap-1 ${
                  triggerType === 'RESIDENCY_RENEWAL' 
                    ? 'bg-purple-50 border-[#714B67] text-[#714B67] font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">تجديد الإقامة 🛂</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <span className="text-[10px] text-slate-500 font-normal">مادة 18 / القوى العاملة</span>
              </button>

              <button
                type="button"
                onClick={() => setTriggerType('LEAVE_APPROVAL')}
                className={`p-2.5 rounded-xl border text-right transition flex flex-col gap-1 ${
                  triggerType === 'LEAVE_APPROVAL' 
                    ? 'bg-purple-50 border-[#714B67] text-[#714B67] font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">اعتماد إجازة 🌴</span>
                  <Calendar className="w-3.5 h-3.5 text-teal-500" />
                </div>
                <span className="text-[10px] text-slate-500 font-normal">الرصيد وتاريخ العودة</span>
              </button>

              <button
                type="button"
                onClick={() => setTriggerType('PAYROLL_SALARY')}
                className={`p-2.5 rounded-xl border text-right transition flex flex-col gap-1 ${
                  triggerType === 'PAYROLL_SALARY' 
                    ? 'bg-purple-50 border-[#714B67] text-[#714B67] font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">كشف الراتب 💵</span>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-[10px] text-slate-500 font-normal">الصافي والحساب البنكي</span>
              </button>

              <button
                type="button"
                onClick={() => setTriggerType('DIRECT_MESSAGE')}
                className={`p-2.5 rounded-xl border text-right transition flex flex-col gap-1 ${
                  triggerType === 'DIRECT_MESSAGE' 
                    ? 'bg-purple-50 border-[#714B67] text-[#714B67] font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">رسالة مخصصة ✍️</span>
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="text-[10px] text-slate-500 font-normal">نص حر مباشر</span>
              </button>
            </div>
          </div>

          {/* Specific Parameters based on Trigger */}
          {triggerType === 'HR_ACTION_REQUIRED' && (
            <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 space-y-3">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>بيانات استدعاء مراجعة الإدارة (Action Required)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">السبب المطلوب للمراجعة</label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="مثال: توقيع ملحق عقد العمل وتسليم العهدة الطبية"
                    className="w-full border border-slate-300 rounded p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">أقصى موعد للمراجعة (اختياري)</label>
                  <input
                    type="date"
                    value={actionDeadline}
                    onChange={(e) => setActionDeadline(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">مكان المراجعة / المكتب</label>
                  <input
                    type="text"
                    value={actionLocation}
                    onChange={(e) => setActionLocation(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {(triggerType === 'MOH_RENEWAL' || triggerType === 'RESIDENCY_RENEWAL' || triggerType === 'CIVIL_ID_RENEWAL') && (
            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-3">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>بيانات وثيقة التجديد الحكومية</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نوع المعاملة المجددة</label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded p-2 bg-white font-bold"
                  >
                    <option value="MOH_RENEWAL">ترخيص وزارة الصحة (MOH License)</option>
                    <option value="RESIDENCY_RENEWAL">الإقامة الرسمية (PAM مادة 18)</option>
                    <option value="CIVIL_ID_RENEWAL">البطاقة المدنية (PACI)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاريخ الانتهاء الجديد المعتمد</label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 bg-white font-bold font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {triggerType === 'LEAVE_APPROVAL' && (
            <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200 space-y-3">
              <div className="font-bold text-teal-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>تفاصيل الإجازة ورصيد العودة</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">من تاريخ</label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">إلى تاريخ</label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">الرصيد المتبقي (أيام)</label>
                  <input
                    type="number"
                    value={remainingDays}
                    onChange={(e) => setRemainingDays(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">تاريخ المباشرة والعودة</label>
                  <input
                    type="date"
                    value={returnWorkDate}
                    onChange={(e) => setReturnWorkDate(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1.5 bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {triggerType === 'PAYROLL_SALARY' && (
            <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 space-y-3">
              <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                <span>بيانات مسير الرواتب المعتمد</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">شهر الراتب</label>
                  <input
                    type="month"
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 bg-white font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">صافي الراتب المحول (د.ك)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={salaryNet}
                    onChange={(e) => setSalaryNet(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded p-2 bg-white font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Delivery Channel Selector */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">قناة الإرسال المعتمدة (Delivery Channel)</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition ${
                  channel === 'WHATSAPP' 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>واتساب رسمي (WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('SMS')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition ${
                  channel === 'SMS' 
                    ? 'bg-blue-50 border-blue-500 text-blue-800 font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>رسالة نصية (SMS)</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('SYSTEM_ALERT')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition ${
                  channel === 'SYSTEM_ALERT' 
                    ? 'bg-purple-50 border-[#714B67] text-[#714B67] font-bold shadow-xs' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Bell className="w-4 h-4 text-[#714B67]" />
                <span>إشعار النظام (Internal)</span>
              </button>
            </div>
          </div>

          {/* Message Preview & Manual Editing */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#714B67]" />
                <span>معاينة نص الرسالة قبل الإرسال (يمكن التعديل يدوياً)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(editableMessage);
                  toast.success('تم نسخ نص الرسالة إلى الحافظة');
                }}
                className="text-xs text-[#714B67] hover:underline flex items-center gap-1 font-bold"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ النص</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={editableMessage}
              onChange={(e) => setEditableMessage(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 bg-slate-50 font-sans text-xs leading-relaxed text-slate-900 outline-none focus:bg-white focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>يتم توثيق كل رسالة تلقائياً في سجل الأرشيف والرقابة.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200 font-bold transition text-xs"
            >
              إلغاء
            </button>

            {channel === 'WHATSAPP' && (
              <button
                type="button"
                onClick={handleDirectWhatsApp}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md flex items-center gap-1.5 transition text-xs cursor-pointer"
                title="فتح محادثة الواتساب مباشرة مع الموظف وإرسال الرسالة فوراً"
              >
                <Smartphone className="w-4 h-4" />
                <span>إرسال عبر واتساب ويب/التطبيق (مباشر)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className={`px-4 py-2.5 rounded-xl text-white font-bold shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer text-xs ${
                channel === 'WHATSAPP' 
                  ? 'bg-[#714B67] hover:bg-[#5a3a52]' 
                  : channel === 'SMS'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-[#714B67] hover:bg-[#5a3a52]'
              }`}
            >
              {isSending ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>جاري الإرسال عبر البوابة...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {channel === 'WHATSAPP' ? 'إرسال عبر البوابة (API Live)' : channel === 'SMS' ? 'إرسال SMS' : 'إرسال الإشعار'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
