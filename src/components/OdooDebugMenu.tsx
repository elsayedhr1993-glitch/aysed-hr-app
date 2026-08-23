import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Eye, 
  Database, 
  FileCode, 
  CheckSquare, 
  PowerOff, 
  ShieldAlert, 
  Sparkles, 
  Layers, 
  X, 
  Copy, 
  Check, 
  Info,
  RefreshCw,
  Code2
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface OdooDebugMenuProps {
  currentModel?: string;
  currentViewType?: 'form' | 'list' | 'kanban';
  activeRecordId?: string;
  activeRecordName?: string;
  onToggleFieldInspector?: (active: boolean) => void;
  isInspectorActive?: boolean;
}

export const OdooDebugMenu: React.FC<OdooDebugMenuProps> = ({
  currentModel = 'hr.employee',
  currentViewType = 'kanban',
  activeRecordId,
  activeRecordName,
  onToggleFieldInspector,
  isInspectorActive = false,
}) => {
  const [isDebugActive, setIsDebugActive] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [showMetadataModal, setShowMetadataModal] = useState<boolean>(false);
  const [showEditViewModal, setShowEditViewModal] = useState<boolean>(false);
  const [showAccessRulesModal, setShowAccessRulesModal] = useState<boolean>(false);
  const [isSuperuser, setIsSuperuser] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sync debug state from URL and localStorage
  useEffect(() => {
    const checkDebug = () => {
      const params = new URLSearchParams(window.location.search);
      const debugParam = params.get('debug');
      const storedDebug = localStorage.getItem('odoo_debug_mode');
      const superuserStored = localStorage.getItem('odoo_superuser_mode');

      if (debugParam === '1' || debugParam === 'assets' || storedDebug === 'true') {
        setIsDebugActive(true);
      } else {
        setIsDebugActive(false);
      }

      if (superuserStored === 'true') {
        setIsSuperuser(true);
      }
    };

    checkDebug();
    window.addEventListener('popstate', checkDebug);
    return () => window.removeEventListener('popstate', checkDebug);
  }, []);

  // Enable Odoo Developer Mode
  const enableDebugMode = () => {
    localStorage.setItem('odoo_debug_mode', 'true');
    const url = new URL(window.location.href);
    url.searchParams.set('debug', '1');
    window.history.pushState({}, '', url.toString());
    setIsDebugActive(true);
    toast.success('تم تفعيل وضع مطور أودو (Odoo Developer Mode)', {
      icon: '🐞',
      style: { borderRadius: '10px', background: '#333', color: '#fff' },
    });
  };

  // Disable Odoo Developer Mode
  const disableDebugMode = () => {
    localStorage.removeItem('odoo_debug_mode');
    localStorage.removeItem('odoo_superuser_mode');
    if (onToggleFieldInspector) {
      onToggleFieldInspector(false);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('debug');
    window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
    setIsDebugActive(false);
    setIsMenuOpen(false);
    setIsSuperuser(false);
    toast.success('تم تعطيل وضع المطور والعودة للواجهة العادية', {
      icon: '✨',
    });
  };

  const handleToggleInspector = () => {
    const next = !isInspectorActive;
    if (onToggleFieldInspector) {
      onToggleFieldInspector(next);
    }
    setIsMenuOpen(false);
    if (next) {
      toast('تم تفعيل فاحص الحقول الفنية: حرك الماوس فوق أي حقل لعرض تفاصيله', {
        icon: '🔍',
        style: { background: '#1e293b', color: '#f8fafc' },
      });
    } else {
      toast('تم إيقاف فاحص الحقول الفنية', { icon: '⏹️' });
    }
  };

  const toggleSuperuser = () => {
    const next = !isSuperuser;
    setIsSuperuser(next);
    if (next) {
      localStorage.setItem('odoo_superuser_mode', 'true');
      toast.success('تم تفعيل وضع Superuser (Root / Bypass Rules)', { icon: '👑' });
    } else {
      localStorage.removeItem('odoo_superuser_mode');
      toast('تم إيقاف وضع Superuser', { icon: '🛡️' });
    }
    setIsMenuOpen(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    toast.success('تم النسخ إلى الحافظة');
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Sample XML view architecture based on currentModel and currentViewType
  const getArchitectureXML = () => {
    return `<?xml version="1.0" encoding="utf-8"?>
<odoo>
  <record id="view_${currentModel.replace('.', '_')}_${currentViewType}" model="ir.ui.view">
    <field name="name">${currentModel}.${currentViewType}</field>
    <field name="model">${currentModel}</field>
    <field name="arch" type="xml">
      <${currentViewType} string="${currentModel}">
        <header>
          <button name="action_submit" string="تقديم" type="object" class="btn-primary" />
          <field name="state" widget="statusbar" statusbar_visible="draft,active,confirmed" />
        </header>
        <sheet>
          <div class="oe_title">
            <h1 class="d-flex">
              <field name="name" placeholder="الاسم الكامل" required="1" />
            </h1>
          </div>
          <group>
            <group string="المعلومات الأساسية">
              <field name="civil_id" required="1" />
              <field name="job_id" widget="many2one" options="{'no_create': True}" />
              <field name="department_id" />
              <field name="company_id" groups="base.group_multi_company" />
            </group>
            <group string="بيانات العمل والتواصل">
              <field name="work_email" widget="email" />
              <field name="mobile_phone" widget="phone" />
              <field name="date_start" />
              <field name="wage" widget="monetary" />
            </group>
          </group>
        </sheet>
      </${currentViewType}>
    </field>
  </record>
</odoo>`;
  };

  return (
    <>
      <div className="relative inline-block text-right font-sans o_debug_manager" dir="rtl">
        {!isDebugActive ? (
          /* زر تفعيل وضع المطور في حال كان مغلقاً */
          <button
            onClick={enableDebugMode}
            className="o_debug_manager flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-purple-700/90 hover:bg-purple-800 rounded-md transition shadow-xs border border-purple-400/40 cursor-pointer"
            title="تفعيل وضع المطور (Odoo Debug Mode)"
          >
            <Bug className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden md:inline">وضع المطور</span>
          </button>) : (
          /* أيقونة حشرة المطور Odoo Enterprise Bug Icon */
          <div className="flex items-center gap-1.5 o_debug_manager">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-1.5 rounded-md transition-all border flex items-center gap-1 cursor-pointer ${
                isMenuOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-inner font-bold'
                  : isInspectorActive
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-300 animate-pulse'
                  : 'bg-amber-300/90 hover:bg-amber-400 text-slate-900 border-amber-400 shadow-xs'
              }`}
              title="أدوات مطور أودو (Open Odoo Developer Tools)"
            >
              <Bug className={`w-4 h-4 text-slate-950 ${isInspectorActive ? 'animate-bounce' : ''}`} />
              {isSuperuser && (
                <span className="text-[9px] bg-purple-900 text-amber-300 px-1 rounded font-mono font-black">
                  SU
                </span>)}
              {isInspectorActive && (
                <span className="text-[10px] bg-purple-950 text-white px-1.5 py-0.2 rounded-full font-bold">
                  فاحص الحقول
                </span>)}
            </button>

            {/* Odoo Enterprise Debug Menu Dropdown */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-800 text-xs animate-in fade-in zoom-in-95 font-sans">
                  {/* Header Badge */}
                  <div className="px-3 py-2 bg-slate-900 text-white rounded-t-xl border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Bug className="w-4 h-4 text-amber-400" />
                      <span>أدوات المطور (Odoo Debug)</span>
                    </div>
                    <span className="text-[10px] bg-purple-800 text-purple-200 px-2 py-0.5 rounded font-mono font-bold border border-purple-600">
                      {currentModel}
                    </span>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1 divide-y divide-slate-100">
                    {/* 1. Field Inspector Toggle */}
                    <button
                      onClick={handleToggleInspector}
                      className={`w-full text-right px-3 py-2.5 hover:bg-purple-50 flex items-center justify-between transition cursor-pointer ${
                        isInspectorActive ? 'bg-purple-50 text-purple-800 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-purple-600" />
                        <div>
                          <p className="font-semibold">
                            {isInspectorActive ? 'إيقاف فاحص الحقول' : 'فحص الحقول الفنية (View Fields)'}
                          </p>
                          <p className="text-[10px] text-slate-400">معاينة Technical Names والأنواع عند التحويم</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isInspectorActive ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isInspectorActive ? 'نشط ON' : 'معطل OFF'}
                      </span>
                    </button>

                    {/* 2. View Metadata */}
                    <button
                      onClick={() => {
                        setShowMetadataModal(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-right px-3 py-2.5 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 text-slate-700 transition cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-indigo-600" />
                      <div>
                        <p className="font-semibold">معلومات السجل (View Metadata)</p>
                        <p className="text-[10px] text-slate-400">XML ID, Model Table, Create/Write Info</p>
                      </div>
                    </button>

                    {/* 3. Edit View */}
                    <button
                      onClick={() => {
                        setShowEditViewModal(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-right px-3 py-2.5 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 text-slate-700 transition cursor-pointer"
                    >
                      <FileCode className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="font-semibold">تعديل طريقة العرض (Edit View: {currentViewType})</p>
                        <p className="text-[10px] text-slate-400">بنية XML Architecture لنموذج {currentModel}</p>
                      </div>
                    </button>

                    {/* 4. Access Rules */}
                    <button
                      onClick={() => {
                        setShowAccessRulesModal(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-right px-3 py-2.5 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 text-slate-700 transition cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                      <div>
                        <p className="font-semibold">قواعد السجلات والصلاحيات (Access Rules)</p>
                        <p className="text-[10px] text-slate-400">مصفوفة أذونات ir.model.access (CRUD)</p>
                      </div>
                    </button>

                    {/* 5. Superuser Mode */}
                    <button
                      onClick={toggleSuperuser}
                      className={`w-full text-right px-3 py-2.5 hover:bg-purple-50 flex items-center justify-between transition cursor-pointer ${
                        isSuperuser ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        <div>
                          <p className="font-semibold">وضع المشرف الخارق (Become Superuser)</p>
                          <p className="text-[10px] text-slate-400">تجاوز قواعد الأمان والقيود برتبة Root</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isSuperuser ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isSuperuser ? 'نشط 👑' : 'معطل'}
                      </span>
                    </button>
                  </div>

                  {/* Deactivate Developer Mode */}
                  <div className="border-t border-slate-100 mt-1 pt-1 bg-slate-50 rounded-b-xl">
                    <button
                      onClick={disableDebugMode}
                      className="w-full text-right px-3 py-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex items-center justify-between font-bold transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <PowerOff className="w-4 h-4 text-rose-600" />
                        <span>تعطيل وضع المطور (Deactivate Debug Mode)</span>
                      </div>
                      <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded">خروج</span>
                    </button>
                  </div>
                </div>
              </>)}
          </div>)}
      </div>

      {/* Modal 1: View Metadata Modal */}
      {showMetadataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Database className="w-4 h-4 text-amber-400" />
                <span>معلومات السجل الفنية (Odoo View Metadata)</span>
              </div>
              <button
                onClick={() => setShowMetadataModal(false)}
                className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">النموذج التقني (Model):</span>
                  <span className="font-mono font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                    {currentModel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">اسم الجدول (Database Table):</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {currentModel.replace('.', '_')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">معرف السجل (Database ID):</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {activeRecordId || 'record_101_prod'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">المعرف الخارجي (XML ID):</span>
                  <div className="flex items-center gap-1.5 font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <span>hr_enterprise.{currentModel.replace('.', '_')}_{activeRecordId || '01'}</span>
                    <button
                      onClick={() => handleCopy(`hr_enterprise.${currentModel.replace('.', '_')}_${activeRecordId || '01'}`, 'xmlid')}
                      className="p-0.5 hover:text-emerald-900"
                      title="نسخ"
                    >
                      {copiedText === 'xmlid' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-400 text-[11px]">أنشئ بواسطة (Created By):</div>
                  <div className="font-bold text-slate-800">Administrator (Sayed)</div>
                  <div className="text-[10px] text-slate-500 font-mono">2026-01-15 08:30:00 (UTC+3)</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-slate-400 text-[11px]">آخر تعديل بواسطة (Written By):</div>
                  <div className="font-bold text-slate-800">Administrator (Sayed)</div>
                  <div className="text-[10px] text-slate-500 font-mono">2026-08-14 12:10:45 (UTC+3)</div>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-relaxed">
                  هذا النموذج مرتبط بقاعدة بيانات PostgreSQL السحابية المتوافقة مع بنية Odoo Enterprise 18.0 مع عزل بيانات الشركات المتعددة (Multi-Company Domain Rules).
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowMetadataModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>)}

      {/* Modal 2: Edit View Architecture Modal */}
      {showEditViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" dir="rtl">
          <div className="bg-slate-950 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>تعديل واجهة العرض: {currentViewType} (Odoo View Architecture)</span>
              </div>
              <button
                onClick={() => setShowEditViewModal(false)}
                className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">View Name: <span className="font-mono text-emerald-400">{currentModel}.{currentViewType}</span></span>
                <span className="text-slate-400">Type: <span className="font-mono text-amber-300">{currentViewType}</span></span>
              </div>
              <button
                onClick={() => handleCopy(getArchitectureXML(), 'arch')}
                className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-white font-medium transition cursor-pointer"
              >
                {copiedText === 'arch' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>نسخ XML</span>
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-300 select-all">
              <pre className="text-emerald-300 whitespace-pre-wrap">{getArchitectureXML()}</pre>
            </div>

            <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Odoo Studio / Architecture Viewer (Active Model)</span>
              <button
                onClick={() => setShowEditViewModal(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>)}

      {/* Modal 3: Access Rights & Record Rules Modal */}
      {showAccessRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <span>قواعد الأمان والصلاحيات للموديل ({currentModel})</span>
              </div>
              <button
                onClick={() => setShowAccessRulesModal(false)}
                className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              <h5 className="font-bold text-slate-900 text-sm">أذونات مجموعات المستخدمين (ir.model.access)</h5>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">المجموعة (Group)</th>
                      <th className="p-2.5 text-center">قراءة (Read)</th>
                      <th className="p-2.5 text-center">كتابة (Write)</th>
                      <th className="p-2.5 text-center">إنشاء (Create)</th>
                      <th className="p-2.5 text-center">حذف (Unlink)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-bold text-slate-800">مدير عام الموارد البشرية (HR Manager)</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-medium text-slate-800">مسؤول شؤون الموظفين (HR Officer)</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-2.5 text-center text-rose-500 font-bold">✗</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-medium text-slate-800">موظف (Employee Portal User)</td>
                      <td className="p-2.5 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-2.5 text-center text-rose-500 font-bold">✗</td>
                      <td className="p-2.5 text-center text-rose-500 font-bold">✗</td>
                      <td className="p-2.5 text-center text-rose-500 font-bold">✗</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                <div className="font-bold text-purple-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>قواعد السجلات (ir.rule - Multi-Company Domain)</span>
                </div>
                <div className="font-mono text-[11px] bg-white p-2.5 rounded-lg border border-purple-100 text-purple-950">
                  ['|', ('company_id', '=', False), ('company_id', 'in', company_ids)]
                </div>
                <p className="text-[11px] text-purple-800">
                  تضمن هذه القاعدة عزل بيانات موظفي وعقود كل شركة عن باقي الشركات في بيئة السحابة المتعددة.
                </p>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowAccessRulesModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>)}
    </>);
};
