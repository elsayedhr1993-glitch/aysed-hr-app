import React, { useState } from 'react';
import { AutomationRule, Company } from '../types';
import { Zap, Plus, CheckCircle, Power, Bell, Shield, ArrowLeft } from 'lucide-react';

interface AutomationAppProps {
  automationRules: AutomationRule[];
  activeCompany: Company;
  onToggleRule: (ruleId: string) => void;
  onAddRule: (rule: AutomationRule) => void;
}

export const AutomationApp: React.FC<AutomationAppProps> = ({
  automationRules,
  activeCompany,
  onToggleRule,
  onAddRule,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    companyId: activeCompany?.id || 'comp-1',
    trigger: 'CIVIL_ID_EXPIRING',
    triggerDaysBefore: 30,
    action: 'SEND_NOTIFICATION',
    actionTarget: 'إدارة الموارد البشرية والعلاقات العامة',
    active: true,
  });

  const companyRules = (automationRules || []).filter(r => r.companyId === (activeCompany?.id || 'comp-1'));

  const handleSave = () => {
    if (!newRule.name) {
      alert('يرجى كتابة اسم القاعدة');
      return;
    }

    const rule: AutomationRule = {
      id: `auto-${Date.now()}`,
      companyId: activeCompany?.id || 'comp-1',
      name: newRule.name,
      trigger: newRule.trigger || 'CIVIL_ID_EXPIRING',
      triggerDaysBefore: newRule.triggerDaysBefore || 30,
      action: newRule.action || 'SEND_NOTIFICATION',
      actionTarget: newRule.actionTarget || 'HR Department',
      active: true,
      executionCount: 0,
    };

    onAddRule(rule);
    setShowAddModal(false);
  };

  return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            <span>محرك الأتمتة وسير العمل (Odoo Studio Automations)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إنشاء قواعد التنبيه التلقائي قبل انتهاء البطاقات المدنية، والجوازات، والتصاريح، وتفعيل الاعتمادات الذكية
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded shadow flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء قاعدة أتمتة جديدة</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-4 max-w-4xl">
        {companyRules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white rounded-xl border p-5 shadow-sm transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              rule.active ? 'border-orange-200 hover:border-orange-300' : 'border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-start space-x-3 space-x-reverse">
              <div className={`p-3 rounded-lg text-white font-bold shrink-0 ${rule.active ? 'bg-orange-600' : 'bg-slate-400'}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{rule.name}</h3>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                    المحفز: {rule.trigger === 'CIVIL_ID_EXPIRING' ? 'انتهاء البطاقة المدنية' : rule.trigger}
                  </span>
                  <span className="bg-orange-50 text-orange-800 px-2 py-0.5 rounded font-semibold">
                    الإجراء: {rule.action}
                  </span>
                  <span className="text-slate-400 font-mono">
                    تم التنفيذ: {rule.executionCount} مرة
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onToggleRule(rule.id)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                  rule.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{rule.active ? 'مفعلة' : 'معطلة'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-200 text-xs">
            <h3 className="font-extrabold text-slate-900 text-base mb-4 pb-2 border-b">إضافة قاعدة أتمتة جيدة</h3>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم القاعدة</label>
                <input
                  type="text"
                  placeholder="مثال: تنبيه تجديد التأمين الصحي قبل 15 يوم"
                  value={newRule.name || ''}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المحفز التلقائي (Trigger)</label>
                <select
                  value={newRule.trigger || 'CIVIL_ID_EXPIRING'}
                  onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value as any })}
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                >
                  <option value="CIVIL_ID_EXPIRING">عند اقتراب انتهاء البطاقة المدنية الكويتي</option>
                  <option value="LEAVE_SUBMITTED">عند تقديم طلب إجازة جديد</option>
                  <option value="CANDIDATE_HIRED">عند تعيين مرشح جديد</option>
                  <option value="EOS_CALCULATED">عند إجراء حساب نهاية خدمة</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">التنبيه قبل (بالأيام)</label>
                <input
                  type="number"
                  value={newRule.triggerDaysBefore || 30}
                  onChange={(e) => setNewRule({ ...newRule, triggerDaysBefore: parseInt(e.target.value, 10) })}
                  className="w-full border border-slate-300 rounded p-2 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الإجراء المنفذ (Action)</label>
                <select
                  value={newRule.action || 'SEND_NOTIFICATION'}
                  onChange={(e) => setNewRule({ ...newRule, action: e.target.value as any })}
                  className="w-full border border-slate-300 rounded p-2 outline-none"
                >
                  <option value="SEND_NOTIFICATION">إرسال تنبيه في النظام والبريد</option>
                  <option value="REQUIRE_APPROVAL">طلب اعتماد المدير المباشر</option>
                  <option value="GENERATE_PAYSLIP_DRAFT">إنشاء مسودة عقد عمل تلقائياً</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowAddModal(false)} className="bg-slate-200 text-slate-800 px-4 py-2 rounded font-bold">إلغاء</button>
              <button onClick={handleSave} className="bg-orange-600 text-white px-5 py-2 rounded font-bold shadow">إنشاء القاعدة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
