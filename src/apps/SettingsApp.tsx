import React, { useState, useEffect } from 'react';
import { Company } from '../types';
import { 
  Building2, Save, Trash2, RefreshCw, ShieldCheck, Shield, Plus, Check, Edit2, 
  AlertTriangle, X, Eye, Palette, Sparkles, Play, Square, Database, Bug, PowerOff, 
  Sliders, Globe, MapPin, MessageSquare, QrCode, Key, Mail, Lock, Code2, Copy, 
  Coins, UserCheck, CheckCircle2, SlidersHorizontal, Settings, Clock
} from 'lucide-react';
import { SystemSettingsPage } from '../components/SystemSettingsPage';
import { SystemIntegrationsPage } from '../components/SystemIntegrationsPage';
import { db, cleanFirestoreData, auth } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';

interface SettingsAppProps {
  companies: Company[];
  activeCompany: Company;
  onSaveCompany: (comp: Company) => void;
  onAddCompany?: (comp: Company) => void;
  onDeleteCompany?: (compId: string) => void;
  onSelectCompany?: (comp: Company) => void;
  onPurgeSystemData?: () => void;
  onLoadDemoData?: () => void;
  bgTheme?: 'FOREST_VIDEO' | 'DIGITAL_NETWORK' | 'FLOWING_GRADIENT' | 'GEOMETRIC_WAVES' | 'STATIC';
  setBgTheme?: (theme: 'FOREST_VIDEO' | 'DIGITAL_NETWORK' | 'FLOWING_GRADIENT' | 'GEOMETRIC_WAVES' | 'STATIC') => void;
  motionEnabled?: boolean;
  setMotionEnabled?: (enabled: boolean) => void;
  initialSubTab?: 'AYSED_CONFIG' | 'COMPANY' | 'INTEGRATIONS' | 'SYSTEM_SECURITY' | 'APPEARANCE' | 'DEVELOPER_TOOLS';
}

export const SettingsApp: React.FC<SettingsAppProps> = ({
  companies,
  activeCompany,
  onSaveCompany,
  onAddCompany,
  onDeleteCompany,
  onSelectCompany,
  onPurgeSystemData,
  onLoadDemoData,
  bgTheme = 'FOREST_VIDEO',
  setBgTheme,
  motionEnabled = true,
  setMotionEnabled,
  initialSubTab = 'AYSED_CONFIG',
}) => {
  const [activeTab, setActiveTab] = useState<'AYSED_CONFIG' | 'COMPANY' | 'INTEGRATIONS' | 'SYSTEM_SECURITY' | 'APPEARANCE' | 'DEVELOPER_TOOLS'>(initialSubTab);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(activeCompany?.id || 'comp-1');
  const [isSeeding, setIsSeeding] = useState(false);

  // -------------------------------------------------------------
  // Res.Config.Settings (Aysed 2026 Settings State & Business Logic)
  // -------------------------------------------------------------
  const [authSignupUninvited, setAuthSignupUninvited] = useState<'b2b' | 'b2c'>('b2b'); // b2b: بدعوة (B2B), b2c: تسجيل حر (B2C)
  const [authSignupResetPassword, setAuthSignupResetPassword] = useState<boolean>(true); // استعادة كلمة السر
  const [moduleAuthOauth, setModuleAuthOauth] = useState<boolean>(true); // الدخول عبر جوجل/فيسبوك
  const [aysedTrialPeriod, setAysedTrialPeriod] = useState<number>(15); // فترة التجربة المجانية (أيام)
  const [companyCurrencyId, setCompanyCurrencyId] = useState<string>('KWD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('د.ك (KWD)');
  const [testResetEmail, setTestResetEmail] = useState<string>('elsayedhr1993@gmail.com');
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [codeModalTab, setCodeModalTab] = useState<'INIT_HOOK' | 'HR_HOLIDAYS' | 'PYTHON' | 'XML' | 'PARAMS'>('HR_HOLIDAYS');
  const [copiedInitHook, setCopiedInitHook] = useState<boolean>(false);
  const [copiedHrHolidays, setCopiedHrHolidays] = useState<boolean>(false);
  const [copiedPython, setCopiedPython] = useState<boolean>(false);
  const [copiedXml, setCopiedXml] = useState<boolean>(false);

  // Load Saved Res.Config.Settings & System Parameters
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'res_config_settings', 'aysed_hr_settings');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.auth_signup_uninvited) setAuthSignupUninvited(data.auth_signup_uninvited);
          if (data.auth_signup_reset_password !== undefined) setAuthSignupResetPassword(data.auth_signup_reset_password);
          if (data.module_auth_oauth !== undefined) setModuleAuthOauth(data.module_auth_oauth);
          if (data.aysed_trial_period !== undefined) setAysedTrialPeriod(Number(data.aysed_trial_period) || 15);
          if (data.company_currency_id) setCompanyCurrencyId(data.company_currency_id);
          if (data.currency_symbol) setCurrencySymbol(data.currency_symbol);
        }
      } catch (err) {
        console.error('Error fetching res.config.settings:', err);
      }
    };
    loadSettings();
  }, []);

  // -------------------------------------------------------------
  // Python Business Logic (set_values execution in React/Firestore)
  // -------------------------------------------------------------
  const handleSaveResConfigSettings = async () => {
    const loadingToast = toast.loading('جاري تنفيذ دالة set_values() وحفظ إعدادات Aysed 2026 في System Parameters...');
    try {
      // 1. Business Logic Rule from Python:
      // if self.auth_signup_uninvited == 'b2c':
      //     self.env['ir.config_parameter'].sudo().set_param('auth_signup.allow_uninvited', 'True')
      const allowUninvited = authSignupUninvited === 'b2c' ? 'True' : 'False';

      // 2. Save to res.config.settings model
      const docRef = doc(db, 'res_config_settings', 'aysed_hr_settings');
      await setDoc(docRef, cleanFirestoreData({
        auth_signup_uninvited: authSignupUninvited,
        auth_signup_reset_password: authSignupResetPassword,
        module_auth_oauth: moduleAuthOauth,
        aysed_trial_period: aysedTrialPeriod,
        company_currency_id: companyCurrencyId,
        currency_symbol: currencySymbol,
        updated_at: new Date().toISOString(),
        updated_by: 'elsayedhr1993@gmail.com'
      }), { merge: true });

      // 3. Save to ir.config_parameter (Odoo System Parameters Table)
      const paramRef = doc(db, 'ir_config_parameter', 'system_parameters');
      await setDoc(paramRef, cleanFirestoreData({
        'auth_signup.uninvited': authSignupUninvited,
        'auth_signup.reset_password': authSignupResetPassword ? 'True' : 'False',
        'auth_signup.allow_uninvited': allowUninvited,
        'module_auth_oauth': moduleAuthOauth ? 'True' : 'False',
        'aysed.trial_period': String(aysedTrialPeriod),
        'company.currency_id': companyCurrencyId,
        'currency.symbol': currencySymbol,
        'last_sync': new Date().toISOString()
      }), { merge: true });

      // Sync local storage keys for fast client-side reactivity
      localStorage.setItem('auth_signup.uninvited', authSignupUninvited);
      localStorage.setItem('auth_signup.reset_password', authSignupResetPassword ? 'true' : 'false');
      localStorage.setItem('auth_signup.allow_uninvited', allowUninvited === 'True' ? 'true' : 'false');
      localStorage.setItem('module_auth_oauth', moduleAuthOauth ? 'true' : 'false');
      localStorage.setItem('aysed.trial_period', String(aysedTrialPeriod));

      // Update current active company currency if matched
      if (editingCompany) {
        const updatedComp = { ...editingCompany, currency: companyCurrencyId };
        setEditingCompany(updatedComp);
        onSaveCompany(updatedComp);
      }

      toast.success('تم تنفيذ منطق الأعمال (Business Logic) وحفظ معلمات النظام (ir.config_parameter) بنجاح للأبد!', { id: loadingToast });
    } catch (error: any) {
      console.error(error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات: ' + (error?.message || 'خطأ غير معروف'), { id: loadingToast });
    }
  };

  const handleSendTestResetPassword = async () => {
    if (!testResetEmail) {
      toast.error('يرجى كتابة البريد الإلكتروني للمشترك أولاً');
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, testResetEmail);
      toast.success(`تم إرسال رابط "إعادة تعيين كلمة المرور" بنجاح إلى: ${testResetEmail}`, { duration: 5000 });
    } catch (err: any) {
      console.error(err);
      toast.error('فشل إرسال الرابط: ' + (err?.message || 'خطأ في خادم البريد'));
    } finally {
      setIsSendingReset(false);
    }
  };

  // -------------------------------------------------------------
  // Post-Init Hook Execution (Technical Initialization)
  // -------------------------------------------------------------
  const handleExecutePostInitHook = async () => {
    const loadingToast = toast.loading('جاري تنفيذ سكريبت التهيئة الفنية والسر الإلهي (_aysed_post_init_hook)...');
    try {
      // 1. Grant base.group_no_one (السوسنة & قائمة تقني) to user Sayed (ID: 2)
      const userRef = doc(db, 'res_users', 'elsayedhr1993');
      await setDoc(userRef, cleanFirestoreData({
        id: 2,
        email: 'elsayedhr1993@gmail.com',
        name: 'Elsayed (Super Admin & Owner)',
        groups_id: ['base.group_no_one', 'base.group_erp_manager', 'base.group_system'],
        tz: 'Asia/Kuwait',
        lang: 'ar_001',
        is_technical_admin: true,
        technical_superuser_initialized: true,
        updated_at: new Date().toISOString()
      }), { merge: true });

      // 2. Set default company currency to Kuwaiti Dinar (KWD)
      const paramRef = doc(db, 'ir_config_parameter', 'system_parameters');
      await setDoc(paramRef, cleanFirestoreData({
        'company.currency_id': 'KWD',
        'currency.symbol': 'د.ك (KWD)',
        'post_init_hook_executed': 'True',
        'base.group_no_one_active': 'True',
        'last_sync': new Date().toISOString()
      }), { merge: true });

      // 3. Activate Languages in res_lang (en_US & ar_001 with RTL)
      await setDoc(doc(db, 'res_lang', 'en_US'), cleanFirestoreData({
        id: 'en_US',
        name: 'English (US)',
        code: 'en_US',
        iso_code: 'en',
        direction: 'ltr',
        active: true,
        date_format: 'MM/DD/YYYY',
        time_format: 'HH:mm:ss',
        decimal_point: '.',
        thousands_sep: ',',
        updated_at: new Date().toISOString()
      }), { merge: true });

      await setDoc(doc(db, 'res_lang', 'ar_001'), cleanFirestoreData({
        id: 'ar_001',
        name: 'العربية (Arabic)',
        code: 'ar_001',
        iso_code: 'ar',
        direction: 'rtl',
        active: true,
        date_format: 'YYYY-MM-DD',
        time_format: 'HH:mm:ss',
        decimal_point: '.',
        thousands_sep: ',',
        updated_at: new Date().toISOString()
      }), { merge: true });

      // 4. Set Active Company currency to KWD
      setCompanyCurrencyId('KWD');
      setCurrencySymbol('د.ك (KWD)');
      if (editingCompany) {
        const updated = { ...editingCompany, currency: 'KWD' };
        setEditingCompany(updated);
        onSaveCompany(updated);
      }

      // 5. Force enable debug mode in local storage
      localStorage.setItem('odoo_debug_mode', 'true');
      localStorage.setItem('odoo_superuser_mode', 'true');
      localStorage.setItem('technical_features_active', 'true');
      localStorage.setItem('res_lang_code', 'ar_001');
      localStorage.setItem('res_lang_direction', 'rtl');

      toast.success('تم تنفيذ _aysed_post_init_hook بنجاح! تم تفعيل اللغتين (ar_001 و en_US)، وضع المطور، السوسنة، وقائمة تقني (base.group_no_one).', { id: loadingToast, duration: 6000 });

      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('debug', '1');
        window.history.pushState({}, '', url.toString());
        window.location.reload();
      }, 1200);
    } catch (error: any) {
      console.error(error);
      toast.error('حدث خطأ أثناء تنفيذ السكريبت: ' + (error?.message || 'خطأ غير معروف'), { id: loadingToast });
    }
  };

  // -------------------------------------------------------------
  // Odoo Original HR Holidays & Kuwait Accrual Plan Installation
  // -------------------------------------------------------------
  const handleInstallHrHolidaysModule = async () => {
    const loadingToast = toast.loading('جاري تثبيت موديول الإجازات القياسي hr_holidays وتهيئة خطة الاستحقاق الكويتية (30 يوم/سنة - 2.5 يوم شهرياً)...');
    try {
      // 1. Mark hr_holidays module as installed in database
      const moduleRef = doc(db, 'ir_module_module', 'hr_holidays');
      await setDoc(moduleRef, cleanFirestoreData({
        name: 'hr_holidays',
        shortdesc: 'Time Off (الإجازات الأصلية القياسية)',
        state: 'installed',
        installed_version: '17.0.1.0',
        author: 'Odoo S.A. / Aysed Kuwait Law',
        website: 'https://www.odoo.com/app/time-off',
        category: 'Human Resources/Time Off',
        installed_at: new Date().toISOString()
      }), { merge: true });

      // 2. Create Accrual Plan in hr.leave.accrual.plan
      const accrualPlanRef = doc(db, 'hr_leave_accrual_plan', 'kuwait_annual_30_days');
      await setDoc(accrualPlanRef, cleanFirestoreData({
        id: 'kuwait_annual_30_days',
        name: 'خطة الإجازة السنوية - الكويت (30 يوم)',
        active: true,
        company_id: activeCompany?.id || 'comp-1',
        frequency: 'monthly',
        added_value: 2.5,
        added_value_type: 'day',
        start_count: 1,
        start_type: 'day',
        level_ids: [{
          level: 1,
          start_count: 1,
          start_type: 'day',
          added_value: 2.5,
          added_value_type: 'day',
          frequency: 'monthly',
        }],
        created_at: new Date().toISOString()
      }), { merge: true });

      // 3. Link Accrual Plan to Annual Leave Type in hr.leave.type
      const leaveTypeRef = doc(db, 'hr_leave_type', 'annual_leave');
      await setDoc(leaveTypeRef, cleanFirestoreData({
        id: 'annual_leave',
        name: 'الإجازة السنوية (Annual Leave)',
        requires_allocation: 'yes',
        accrual_plan_id: 'kuwait_annual_30_days',
        request_unit: 'day',
        company_id: activeCompany?.id || 'comp-1',
        color_name: 'red',
        active: true,
        validity_start: '2026-01-01',
        validity_stop: '2026-12-31',
        updated_at: new Date().toISOString()
      }), { merge: true });

      // 4. Update system parameters
      const paramRef = doc(db, 'ir_config_parameter', 'system_parameters');
      await setDoc(paramRef, cleanFirestoreData({
        'hr_holidays.installed': 'True',
        'hr_holidays.accrual_plan_name': 'خطة الإجازة السنوية - الكويت (30 يوم)',
        'hr_holidays.monthly_accrual_rate': '2.5',
        'hr_holidays.annual_total_days': '30',
        'hr_holidays.requires_allocation': 'yes',
        'last_sync': new Date().toISOString()
      }), { merge: true });

      toast.success('تم تثبيت موديول hr_holidays وتهيئة خطة استحقاق الإجازات الكويتية (2.5 يوم شهرياً / 30 يوماً سنوياً) بنجاح تام!', { id: loadingToast, duration: 6000 });
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء تثبيت موديول الإجازات: ' + (err?.message || 'خطأ غير معروف'), { id: loadingToast });
    }
  };

  const odooHrHolidaysPython = `# -*- coding: utf-8 -*-
# =========================================================================
# خطة التحويل لـ "أودو الأصلي" (Standard Odoo hr_holidays Conversion Plan)
# تثبيت النظام القياسي لأودو لضمان الدقة القانونية في الكويت
# =========================================================================

# 1. أمر التثبيت البرمجي في أودو (Python):
# تثبيت موديول الإجازات الرسمي (hr_holidays)
leave_module = env['ir.module.module'].search([('name', '=', 'hr_holidays')])
if leave_module.state != 'installed':
    leave_module.button_immediate_install()

# 2. كود تهيئة "قواعد الإجازات الكويتية" (Accrual Plans):
# في أودو الأصلي، نقوم ببرمجة النظام ليحسب الإجازة تلقائياً
# (30 يوماً في السنة، بواقع 2.5 يوم كل شهر) كما يطلب قانون العمل الكويتي:

# إنشاء خطة استحقاق طبق الأصل من أودو (30 يوم/سنة)
accrual_plan = env['hr.leave.accrual.plan'].create({
    'name': 'خطة الإجازة السنوية - الكويت (30 يوم)',
    'level_ids': [(0, 0, {
        'start_count': 1,
        'start_type': 'day',
        'added_value': 2.5,
        'added_value_type': 'day',
        'frequency': 'monthly',
    })]
})

# 3. دالة حساب الرصيد التلقائي لعام 2026 (get_aysed_smart_leave_balance):
# تطبيق قاعدة المقارنة بين يناير 2026 وتاريخ المباشرة الأحدث:
from datetime import date
from dateutil.relativedelta import relativedelta

def get_aysed_smart_leave_balance(self, employee_id):
    # 1. التاريخ المرجعي لنظام Aysed (يناير 2026)
    aysed_base_date = date(2026, 1, 1)

    # 2. تاريخ تعيين الموظف الحقيقي
    hire_date = employee_id.date_start or aysed_base_date

    # 3. تحديد تاريخ البداية (الأحدث بينهما) لضمان عدم الظلم
    # إذا تعين في يونيو 2026، سيبدأ الحساب من يونيو
    # إذا تعين في 2025، سيبدأ الحساب من يناير 2026
    actual_start_date = max(hire_date, aysed_base_date)

    # 4. حساب الشهور المكتملة حتى تاريخ اليوم
    today = date.today()
    diff = relativedelta(today, actual_start_date)
    months_count = diff.years * 12 + diff.months

    # 5. الرصيد (2.5 يوم عن كل شهر)
    correct_balance = months_count * 2.5

    return correct_balance

def calculate_aysed_leave_balance(self):
    for employee in self.env['hr.employee'].search([]):
        balance = self.get_aysed_smart_leave_balance(employee)
        employee.write({
            'remaining_leaves': balance,
            'leave_calculation_start': max(employee.date_start or date(2026, 1, 1), date(2026, 1, 1))
        })

# 4. كود تحويل معاينة الإجازات إلى طباعة PDF رسمية (QWeb PDF Report Action):
def print_leave_statement_pdf(self):
    """
    تحويل معاينة كشف حساب إجازات الموظف إلى طباعة PDF رسمية
    Action Report: hr_holidays_aysed.action_report_leave_statement
    Report Type: qweb-pdf
    """
    return self.env.ref('hr_holidays_aysed.action_report_leave_statement').report_action(self, data=None, config=False)`;

  const odooPostInitHookPython = `# -*- coding: utf-8 -*-
# __init__.py / hooks.py
# Odoo Enterprise / Community - Aysed HR 2026
# كود "السر الإلهي" لأودو (Technical Initialization)
# يتم وضع هذا الكود في ملف __init__.py لضمان عمل "السوسنة" و "قائمة تقني" تلقائياً للمالك:

from odoo import api, SUPERUSER_ID

def _aysed_post_init_hook(cr, registry):
    env = api.Environment(cr, SUPERUSER_ID, {})
    # 1. تفعيل وضع المطور إجبارياً للمالك الأول (السوسنة & قائمة تقني)
    user_sayed = env['res.users'].browse(2)
    user_sayed.write({'groups_id': [(4, env.ref('base.group_no_one').id)]})

    # 2. ضبط العملة الافتراضية للدينار الكويتي
    kwd = env['res.currency'].search([('name', '=', 'KWD')])
    if kwd:
        env.company.currency_id = kwd.id`;

  const odooResConfigSettingsPython = `# -*- coding: utf-8 -*-
# models/res_config_settings.py
# Odoo Enterprise / Community - Aysed HR 2026
from odoo import models, fields, api

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    # ربط معلمات أودو الأصلية في ملف واحد
    auth_signup_uninvited = fields.Selection(
        selection=[('b2b', 'بدعوة (B2B)'), ('b2c', 'تسجيل حر (B2C)')],
        string='طريقة انضمام المشتركين',
        config_parameter='auth_signup.uninvited',
        default='b2b'
    )
    auth_signup_reset_password = fields.Boolean(
        string='استعادة كلمة السر',
        config_parameter='auth_signup.reset_password',
        default=True
    )
    module_auth_oauth = fields.Boolean(
        string="الدخول عبر جوجل/فيسبوك",
        help="تفعيل تسجيل الدخول بواسطة موفري الهوية الخارجية (Google OAuth2)"
    )

    # إعدادات خاصة بنظام Aysed 2026
    aysed_trial_period = fields.Integer(
        string='فترة التجربة المجانية (أيام)',
        config_parameter='aysed.trial_period',
        default=15
    )

    def set_values(self):
        super(ResConfigSettings, self).set_values()
        # كود إضافي لتنفيذ أوامر تقنية عند حفظ الإعدادات
        if self.auth_signup_uninvited == 'b2c':
            # تفعيل بوابة التسجيل تلقائياً
            self.env['ir.config_parameter'].sudo().set_param('auth_signup.allow_uninvited', 'True')
        else:
            self.env['ir.config_parameter'].sudo().set_param('auth_signup.allow_uninvited', 'False')`;

  const odooResConfigSettingsXml = `<!-- 1. تعريف واجهة الإعدادات الشاملة (XML - Settings Layout) في res.config.settings -->
<record id="res_config_settings_view_form_aysed" model="ir.ui.view">
    <field name="name">res.config.settings.view.form.aysed</field>
    <field name="model">res.config.settings</field>
    <field name="priority" eval="10"/>
    <field name="inherit_id" ref="base.res_config_settings_view_form"/>
    <field name="arch" type="xml">
        <xpath expr="//form" position="inside">
            <div class="app_settings_block" data-string="Aysed HR" string="إعدادات Aysed 2026" data-key="aysed_hr">

                <!-- قسم 1: إدارة الشركات والمشتركين -->
                <h2>إدارة المنظومة (SaaS &amp; Companies)</h2>
                <div class="row mt16 o_settings_container">
                    <div class="col-12 col-lg-6 o_setting_box">
                        <div class="o_setting_right_pane">
                            <label for="auth_signup_uninvited"/>
                            <field name="auth_signup_uninvited" widget="radio"/>
                            <div class="text-muted">تحديد نوع التسجيل (مفتوح للعموم أو بدعوة فقط)</div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-6 o_setting_box">
                        <div class="o_setting_right_pane">
                            <label for="aysed_trial_period"/>
                            <field name="aysed_trial_period"/>
                            <div class="text-muted">فترة التجربة المجانية للشركات المشتركة بالأيام</div>
                        </div>
                    </div>
                </div>

                <!-- قسم 2: إعدادات البريد والأمان -->
                <h2>الاتصالات والأمان (Email &amp; Security)</h2>
                <div class="row mt16 o_settings_container">
                    <div class="col-12 col-lg-6 o_setting_box">
                        <div class="o_setting_left_pane">
                            <field name="auth_signup_reset_password"/>
                        </div>
                        <div class="o_setting_right_pane">
                            <label for="auth_signup_reset_password"/>
                            <div class="text-muted">تفعيل رابط "نسيت كلمة المرور" للمشتركين</div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-6 o_setting_box">
                        <div class="o_setting_left_pane">
                            <field name="module_auth_oauth"/>
                        </div>
                        <div class="o_setting_right_pane">
                            <label for="module_auth_oauth"/>
                            <div class="text-muted">الدخول السحابي عبر جوجل / حسابات العمل (Google OAuth2)</div>
                        </div>
                    </div>
                </div>

                <!-- قسم 3: التوطين (الكويت) -->
                <h2>التوطين واللغات (Localization)</h2>
                <div class="row mt16 o_settings_container">
                    <div class="col-12 col-lg-6 o_setting_box">
                        <div class="o_setting_right_pane">
                            <label for="company_currency_id" string="عملة النظام الأساسية (د.ك)"/>
                            <field name="company_currency_id"/>
                        </div>
                    </div>
                </div>
            </div>
        </xpath>
    </field>
</record>

<!-- 2. تعريف تقرير كشف حساب الإجازات PDF (QWeb PDF Report Action & Template) -->
<record id="action_report_leave_statement" model="ir.actions.report">
    <field name="name">كشف حساب الإجازات (Leave Statement)</field>
    <field name="model">hr.employee</field>
    <field name="report_type">qweb-pdf</field>
    <field name="report_name">hr_holidays_aysed.report_leave_statement_document</field>
    <field name="report_file">hr_holidays_aysed.report_leave_statement_document</field>
    <field name="print_report_name">'كشف_إجازات_%s' % (object.name)</field>
    <field name="binding_model_id" ref="hr.model_hr_employee"/>
    <field name="binding_type">report</field>
</record>`;

  const copyToClipboard = (text: string, type: 'INIT_HOOK' | 'HR_HOLIDAYS' | 'PYTHON' | 'XML') => {
    navigator.clipboard.writeText(text);
    if (type === 'INIT_HOOK') {
      setCopiedInitHook(true);
      toast.success('تم نسخ كود السر الإلهي (__init__.py) إلى الحافظة!');
      setTimeout(() => setCopiedInitHook(false), 2000);
    } else if (type === 'HR_HOLIDAYS') {
      setCopiedHrHolidays(true);
      toast.success('تم نسخ كود تثبيت الإجازات وخطة الاستحقاق (hr_holidays) إلى الحافظة!');
      setTimeout(() => setCopiedHrHolidays(false), 2000);
    } else if (type === 'PYTHON') {
      setCopiedPython(true);
      toast.success('تم نسخ كود Python (Business Logic) إلى الحافظة!');
      setTimeout(() => setCopiedPython(false), 2000);
    } else {
      setCopiedXml(true);
      toast.success('تم نسخ كود Odoo Settings XML إلى الحافظة!');
      setTimeout(() => setCopiedXml(false), 2000);
    }
  };
  
  const currentEditingCompany = (companies || []).find(c => c?.id === selectedCompanyId) || activeCompany || { id: 'comp-1', nameAr: '', nameEn: '' } as Company;
  const [editingCompany, setEditingCompany] = useState<Company>(currentEditingCompany);

  // Sync selected company when companies list changes
  useEffect(() => {
    const existing = (companies || []).find(c => c?.id === selectedCompanyId);
    if (existing) {
      setEditingCompany(existing);
    } else if ((companies || []).length > 0 && companies[0]?.id) {
      setSelectedCompanyId(companies[0].id);
      setEditingCompany(companies[0]);
    }
  }, [companies, selectedCompanyId]);

  // Modal for adding new company
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCompData, setNewCompData] = useState<Partial<Company>>({
    nameAr: '',
    nameEn: '',
    commercialRegNo: '',
    civilIdCompany: '',
    wsiCode: '',
    bankName: 'بنك الكويت الوطني (NBK)',
    iban: 'KW',
  });

  // Modal for deleting company
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  // Purge / Demo confirmation modals state
  const [showPurgeModal, setShowPurgeModal] = useState<boolean>(false);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const confirmPurge = () => {
    if (onPurgeSystemData) {
      onPurgeSystemData();
    }
    setShowPurgeModal(false);
    setNotificationMsg('تم تطهير النظام بنجاح! أصبح النظام خالياً من البيانات التجريبية ومستعداً للاستخدام الإنتاجي الرسمي.');
  };

  const confirmDemo = () => {
    if (onLoadDemoData) {
      onLoadDemoData();
    }
    setShowDemoModal(false);
    setNotificationMsg('تم تحميل عينة البيانات التجريبية بنجاح للاختبار والتأكد من الميزات!');
  };

  // When switching selected company to edit
  const handleSelectCompanyToEdit = (comp: Company) => {
    setSelectedCompanyId(comp.id);
    setEditingCompany(comp);
  };

  const handleSave = () => {
    if (editingCompany) {
      onSaveCompany(editingCompany);
      alert(`تم حفظ بيانات الشركة [${editingCompany.nameAr || ''}] بنجاح!`);
    }
  };

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompData.nameAr?.trim()) {
      alert('يرجى إدخال اسم الشركة بالعربية.');
      return;
    }

    const newCompany: Company = {
      id: `comp-${Date.now()}`,
      nameAr: newCompData.nameAr.trim(),
      nameEn: newCompData.nameEn?.trim() || newCompData.nameAr.trim(),
      commercialRegNo: newCompData.commercialRegNo?.trim() || Math.floor(100000 + Math.random() * 900000).toString(),
      civilIdCompany: newCompData.civilIdCompany?.trim() || '700' + Math.floor(10000000 + Math.random() * 90000000),
      wsiCode: newCompData.wsiCode?.trim() || 'WSI-KW-' + Math.floor(10000 + Math.random() * 90000),
      bankName: newCompData.bankName?.trim() || 'بنك الكويت الوطني (NBK)',
      iban: newCompData.iban?.trim() || 'KW82NBOK00000000' + Math.floor(100000000000 + Math.random() * 900000000000),
      isPrimary: companies.length === 0,
    };

    if (onAddCompany) {
      onAddCompany(newCompany);
    } else {
      onSaveCompany(newCompany);
    }

    setShowAddModal(false);
    setSelectedCompanyId(newCompany.id);
    setEditingCompany(newCompany);
    setNewCompData({
      nameAr: '',
      nameEn: '',
      commercialRegNo: '',
      civilIdCompany: '',
      wsiCode: '',
      bankName: 'بنك الكويت الوطني (NBK)',
      iban: 'KW',
    });
    alert(`تمت إضافة الشركة الجديدة [${newCompany.nameAr}] بنجاح، وتفعيلها في النظام!`);
  };

  const confirmDeleteCompanyAction = () => {
    if (!companyToDelete) return;
    const compId = companyToDelete.id;
    const compName = companyToDelete?.nameAr || '';

    if (onDeleteCompany) {
      onDeleteCompany(compId);
    }

    const remainingCompanies = companies.filter(c => c.id !== compId);
    if (remainingCompanies.length > 0) {
      const nextComp = remainingCompanies[0];
      setSelectedCompanyId(nextComp.id);
      setEditingCompany(nextComp);
      if (onSelectCompany) {
        onSelectCompany(nextComp);
      }
    }

    setCompanyToDelete(null);
  };

  const handleSeedOdooData = async () => {
    const loadingToast = toast.loading('جاري تهيئة الأقسام والمسميات الوظيفية (Odoo XML)...');
    try {
      const medicalSectorRef = doc(db, 'departments', 'dep_medical_sector');
      await setDoc(medicalSectorRef, {
        name: 'القطاع الطبي (Medical Sector)'
      });

      const adminSectorRef = doc(db, 'departments', 'dep_admin_sector');
      await setDoc(adminSectorRef, {
        name: 'القطاع الإداري (Administrative Sector)'
      });

      const medicalJobs = [
        { id: 'job_doctor', titleName: 'طبيب ممارس (Medical Doctor)', departmentId: 'dep_medical_sector', departmentName: 'القطاع الطبي (Medical Sector)' },
        { id: 'job_nurse', titleName: 'ممرض / ممرضة (Nurse)', departmentId: 'dep_medical_sector', departmentName: 'القطاع الطبي (Medical Sector)' },
        { id: 'job_pharmacist', titleName: 'صيدلي (Pharmacist)', departmentId: 'dep_medical_sector', departmentName: 'القطاع الطبي (Medical Sector)' },
        { id: 'job_lab_tech', titleName: 'فني مختبر (Lab Technician)', departmentId: 'dep_medical_sector', departmentName: 'القطاع الطبي (Medical Sector)' }
      ];

      for (const job of medicalJobs) {
        await setDoc(doc(db, 'job_titles', job.id), cleanFirestoreData(job));
      }

      const adminJobs = [
        { id: 'job_hr_manager', titleName: 'مدير موارد بشرية (HR Manager)', departmentId: 'dep_admin_sector', departmentName: 'القطاع الإداري (Administrative Sector)' },
        { id: 'job_mandoob', titleName: 'مندوب علاقات عامة (Public Relations Officer - Mandoob)', departmentId: 'dep_admin_sector', departmentName: 'القطاع الإداري (Administrative Sector)' },
        { id: 'job_accountant', titleName: 'محاسب (Accountant)', departmentId: 'dep_admin_sector', departmentName: 'القطاع الإداري (Administrative Sector)' },
        { id: 'job_receptionist', titleName: 'موظف استقبال (Receptionist)', departmentId: 'dep_admin_sector', departmentName: 'القطاع الإداري (Administrative Sector)' }
      ];

      for (const job of adminJobs) {
        await setDoc(doc(db, 'job_titles', job.id), cleanFirestoreData(job));
      }

      toast.success('تمت التهيئة بنجاح! تم إنشاء الأقسام والمسميات الوظيفية.', { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء التهيئة.', { id: loadingToast });
    }
  };

  return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)] dir-rtl text-right">
      {/* Tab Selector */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('AYSED_CONFIG')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'AYSED_CONFIG'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4 text-purple-300" />
          <span>إعدادات Aysed 2026 (res.config.settings)</span>
        </button>

        <button
          onClick={() => setActiveTab('COMPANY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'COMPANY'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>إدارة الشركات والمؤسسات (Multi-Company)</span>
        </button>

        <button
          onClick={() => setActiveTab('INTEGRATIONS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'INTEGRATIONS'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-300" />
          <span>ربط الميزات الخارجية والـ API (Integrations)</span>
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM_SECURITY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'SYSTEM_SECURITY'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>الأمان وكلمات المرور والـ OTP</span>
        </button>

        <button
          onClick={() => setActiveTab('APPEARANCE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'APPEARANCE'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Palette className="w-4 h-4 text-amber-400" />
          <span>المظهر والخلفية المتحركة (Appearance)</span>
        </button>

        <button
          onClick={() => setActiveTab('DEVELOPER_TOOLS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'DEVELOPER_TOOLS'
              ? 'bg-[#714B67] text-white shadow'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>أدوات المطورين (Developer Tools)</span>
        </button>
      </div>

      {activeTab === 'AYSED_CONFIG' ? (
        /* ========================================================================= */
        /* TAB 1: AYSED 2026 RES.CONFIG.SETTINGS LAYOUT                              */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#714B67] to-[#55384d] flex items-center justify-center text-white shadow-md">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">إعدادات Aysed 2026 (res.config.settings)</h2>
                  <span className="bg-purple-100 text-[#714B67] font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">
                    res_config_settings_view_form_aysed
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  الواجهة الشاملة للخيارات الفنية والإدارية والبريد والتوطين المدمجة بنظام Odoo Settings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExecutePostInitHook}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer border border-amber-400"
                title="تنفيذ سكريبت التهيئة الفنية (تفعيل وضع المطور، السوسنة، قائمة تقني، وعملة الدينار الكويتي)"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>السر الإلهي (Post-Init Hook)</span>
              </button>

              <button
                onClick={() => setIsCodeModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition cursor-pointer"
                title="عرض ونسخ كود Odoo res.config.settings & __init__.py (Python & XML)"
              >
                <Code2 className="w-4 h-4 text-purple-700" />
                <span>كود المنظومة (Python &amp; XML)</span>
              </button>

              <button
                onClick={handleSaveResConfigSettings}
                className="bg-[#714B67] hover:bg-[#5b3c53] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتطبيق الإعدادات (set_values)</span>
              </button>
            </div>
          </div>

          {/* Odoo Style Settings Container (app_settings_block) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-8">
            
            {/* ------------------------------------------------------------- */}
            {/* SECTION 1: إدارة المنظومة (SaaS & Companies)                   */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#714B67]" />
                  <span>1. إدارة المنظومة والمشتركين (SaaS &amp; Companies)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  التحكم في نموذج تسجيل واشتراك الشركات الجديدة في نظام Aysed SaaS وفترة التجربة
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* auth_signup_uninvited widget="radio" */}
                <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#714B67]" />
                      <span>طريقة انضمام المشتركين (auth_signup_uninvited)</span>
                    </label>
                    <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                      config_param: auth_signup.uninvited
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">تحديد نموذج التسجيل والاشتراك للشركات والمستخدمين الجدد:</p>

                  <div className="space-y-2.5 pt-1">
                    <label className={`flex items-start gap-3 p-3 rounded-lg border transition cursor-pointer ${
                      authSignupUninvited === 'b2b' 
                        ? 'bg-purple-50/70 border-[#714B67] ring-1 ring-[#714B67]' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="auth_signup_uninvited"
                        value="b2b"
                        checked={authSignupUninvited === 'b2b'}
                        onChange={() => setAuthSignupUninvited('b2b')}
                        className="mt-0.5 text-[#714B67] focus:ring-[#714B67]"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <span>بدعوة فقط من الإدارة (B2B - On Invitation)</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">موصى به أمنياً</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          يقوم مشرف النظام أو مسؤول الموارد البشرية بإنشاء حسابات الشركات والموظفين وإرسال الدعوات الرسمية فقط.
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-lg border transition cursor-pointer ${
                      authSignupUninvited === 'b2c' 
                        ? 'bg-purple-50/70 border-[#714B67] ring-1 ring-[#714B67]' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="auth_signup_uninvited"
                        value="b2c"
                        checked={authSignupUninvited === 'b2c'}
                        onChange={() => setAuthSignupUninvited('b2c')}
                        className="mt-0.5 text-[#714B67] focus:ring-[#714B67]"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <span>تسجيل حر مفتوح للعموم (B2C - Free Sign Up)</span>
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded">Self-Service</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          تفعيل بوابة التسجيل التلقائي (auth_signup.allow_uninvited = True) لتمكين الزوار من تسجيل شركاتهم مباشرة.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* aysed_trial_period and Active Company Overview */}
                <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#714B67]" />
                        <span>فترة التجربة المجانية (aysed_trial_period)</span>
                      </label>
                      <span className="font-mono text-[10px] bg-purple-100 text-[#714B67] px-2 py-0.5 rounded font-bold">
                        config_param: aysed.trial_period
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">عدد أيام الفترة التجريبية الممنوحة للشركات الجديدة عند التسجيل:</p>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={aysedTrialPeriod}
                        onChange={(e) => setAysedTrialPeriod(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-32 bg-white border border-slate-300 rounded-lg p-2 font-mono text-center font-bold text-slate-900 text-sm outline-none focus:ring-1 focus:ring-[#714B67]"
                      />
                      <span className="text-xs font-bold text-slate-700">يوماً تجريبياً مجانياً (Days)</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">🏢 {activeCompany?.nameAr || 'الشركة الرئيسية'}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Active Tenant</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{activeCompany?.nameEn || 'Main Company'}</div>
                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100 font-mono">
                      <span>سجل: {activeCompany?.commercialRegNo || '-'}</span>
                      <span>WSI: {activeCompany?.wsiCode || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* SECTION 2: الاتصالات والأمان وOAuth (Email & Security)          */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>2. الاتصالات والأمان وتسجيل الدخول (Email, Security &amp; OAuth)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إعدادات استعادة الحسابات، تسجيل الدخول الموحد (Google OAuth)، واختبار الـ SMTP
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* auth_signup_reset_password & module_auth_oauth checkboxes */}
                <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-4">
                  <div className="space-y-3">
                    {/* Reset Password */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="auth_signup_reset_password"
                        checked={authSignupResetPassword}
                        onChange={(e) => setAuthSignupResetPassword(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#714B67] rounded border-slate-300 focus:ring-[#714B67] cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <label htmlFor="auth_signup_reset_password" className="font-bold text-xs text-slate-900 cursor-pointer flex items-center gap-2">
                          <span>استعادة كلمة السر (auth_signup_reset_password)</span>
                          <span className="font-mono text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">config_param</span>
                        </label>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          تفعيل رابط "نسيت كلمة المرور" في شاشة الدخول وإرسال روابط الاستعادة الآمنة.
                        </p>
                      </div>
                    </div>

                    {/* Google / OAuth */}
                    <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
                      <input
                        type="checkbox"
                        id="module_auth_oauth"
                        checked={moduleAuthOauth}
                        onChange={(e) => setModuleAuthOauth(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#714B67] rounded border-slate-300 focus:ring-[#714B67] cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <label htmlFor="module_auth_oauth" className="font-bold text-xs text-slate-900 cursor-pointer flex items-center gap-2">
                          <span>الدخول عبر جوجل/حسابات العمل (module_auth_oauth)</span>
                          <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1.5 py-0.5 rounded">OAuth 2.0</span>
                        </label>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          إتاحة تسجيل الدخول بنقرة واحدة بحسابات Google Workspace والبريد السحابي المعتمد.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#714B67] shrink-0" />
                    <span>تشفير متقدم وحماية متعددة المستويات متوافقة مع معايير Odoo Enterprise.</span>
                  </div>
                </div>

                {/* Email Reset Testing Box */}
                <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-[#714B67]" />
                      <span>اختبار إرسال رابط إعادة التعيين (Password Reset Test)</span>
                    </label>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                      Live SMTP/Auth
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">أدخل بريد المشترك للتأكد من وصول رابط إعادة التعيين فورياً:</p>

                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={testResetEmail}
                      onChange={(e) => setTestResetEmail(e.target.value)}
                      placeholder="e.g. user@company.com"
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono dir-ltr text-right outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                    <button
                      onClick={handleSendTestResetPassword}
                      disabled={isSendingReset || !authSignupResetPassword}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        authSignupResetPassword
                          ? 'bg-[#714B67] hover:bg-[#5b3c53] text-white shadow-sm'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isSendingReset ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                      <span>إرسال الرابط</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* SECTION 3: التوطين (الكويت) (Localization)                    */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#714B67]" />
                  <span>3. التوطين واللغات والعملة (Kuwait Localization &amp; Currency)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إعدادات العملة الرسمية المعتمدة في الرواتب، العقود، والتقارير المالية (د.ك - 3 خانات عشرية)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* company_currency_id */}
                <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span>عملة النظام الأساسية (company_currency_id)</span>
                    </label>
                    <span className="font-mono text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                      0.000 KWD
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <select
                      value={companyCurrencyId}
                      onChange={(e) => {
                        setCompanyCurrencyId(e.target.value);
                        if (e.target.value === 'KWD') setCurrencySymbol('د.ك (KWD)');
                        else if (e.target.value === 'USD') setCurrencySymbol('$ (USD)');
                        else if (e.target.value === 'SAR') setCurrencySymbol('ر.س (SAR)');
                        else if (e.target.value === 'AED') setCurrencySymbol('د.إ (AED)');
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="KWD">الدينار الكويتي - د.ك (Kuwaiti Dinar - KWD) [الافتراضي]</option>
                      <option value="SAR">الريال السعودي - ر.س (Saudi Riyal - SAR)</option>
                      <option value="AED">الدرهم الإماراتي - د.إ (UAE Dirham - AED)</option>
                      <option value="USD">الدولار الأمريكي - $ (US Dollar - USD)</option>
                    </select>

                    <p className="text-[11px] text-slate-500">
                      يتم تطبيق الدقة العشرية تلقائياً وفق قانون العمل الكويتي (3 أرقام بعد الفاصلة: 0.000 د.ك).
                    </p>
                  </div>
                </div>

                {/* res.lang Languages Activation Card (Odoo Python Script Executor) */}
                <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-sky-600" />
                      <span>إدارة وتفعيل لغات النظام (res.lang)</span>
                    </label>
                    <span className="font-mono text-[10px] bg-sky-100 text-sky-900 px-2 py-0.5 rounded font-bold">
                      ar_001 &amp; en_US
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5">
                      {/* Arabic ar_001 */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🇰🇼</span>
                          <div>
                            <p className="font-bold text-xs text-slate-800">العربية (Arabic)</p>
                            <p className="text-[10px] text-slate-400 font-mono">code: ar_001 | direction: rtl</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>نشط (Active &amp; RTL)</span>
                        </span>
                      </div>

                      {/* English en_US */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🇺🇸</span>
                          <div>
                            <p className="font-bold text-xs text-slate-800">English (US)</p>
                            <p className="text-[10px] text-slate-400 font-mono">code: en_US | direction: ltr</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>نشط (Active)</span>
                        </span>
                      </div>
                    </div>

                    {/* Quick Python Activation Run Button */}
                    <button
                      type="button"
                      onClick={async () => {
                        const loadingToast = toast.loading('جاري تنفيذ سكريبت تفعيل اللغتين (ar_001 & en_US) في قاعدة البيانات...');
                        try {
                          // 1. Activate English en_US
                          await setDoc(doc(db, 'res_lang', 'en_US'), cleanFirestoreData({
                            id: 'en_US',
                            name: 'English (US)',
                            code: 'en_US',
                            iso_code: 'en',
                            direction: 'ltr',
                            active: true,
                            date_format: 'MM/DD/YYYY',
                            time_format: 'HH:mm:ss',
                            decimal_point: '.',
                            thousands_sep: ',',
                            updated_at: new Date().toISOString()
                          }), { merge: true });

                          // 2. Activate Arabic ar_001 with direction rtl
                          await setDoc(doc(db, 'res_lang', 'ar_001'), cleanFirestoreData({
                            id: 'ar_001',
                            name: 'العربية (Arabic)',
                            code: 'ar_001',
                            iso_code: 'ar',
                            direction: 'rtl',
                            active: true,
                            date_format: 'YYYY-MM-DD',
                            time_format: 'HH:mm:ss',
                            decimal_point: '.',
                            thousands_sep: ',',
                            updated_at: new Date().toISOString()
                          }), { merge: true });

                          // 3. Update user preference & ir.config.parameter
                          await setDoc(doc(db, 'ir_config_parameter', 'languages'), cleanFirestoreData({
                            'active_languages': ['ar_001', 'en_US'],
                            'default_language': 'ar_001',
                            'default_direction': 'rtl',
                            'last_sync': new Date().toISOString()
                          }), { merge: true });

                          localStorage.setItem('res_lang_code', 'ar_001');
                          localStorage.setItem('res_lang_direction', 'rtl');

                          toast.success('تم تفعيل اللغتين (en_US و ar_001 مع RTL) وحفظ الإعدادات بنجاح!', { id: loadingToast });
                        } catch (err: any) {
                          console.error(err);
                          toast.error('حدث خطأ أثناء تفعيل اللغات: ' + (err?.message || 'خطأ غير معروف'), { id: loadingToast });
                        }
                      }}
                      className="w-full py-2 bg-[#714B67] hover:bg-[#5f3e56] text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>تأكيد تفعيل اللغتين بالـ Database (res.lang Commit)</span>
                    </button>
                  </div>
                </div>

                {/* Kuwait Law & Localization Badges */}
                <div className="col-span-1 md:col-span-2 bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-xs text-slate-900">حزمة القوانين والتوطين الكويتي المدمجة</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>المادة 51 و 53 (نهاية الخدمة)</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>معادلة التحقق المدني MOD 11</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>استحقاق الإجازات (2.5 يوم/شهر)</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>ملفات حماية الأجور (WSI Batch)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* SECTION 4: موديول الإجازات وقواعد الاستحقاق (Kuwait Accrual Plan) */}
            {/* ------------------------------------------------------------- */}
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    <span>4. موديول الإجازات الأصلي وقواعد الاستحقاق (hr_holidays &amp; Accrual Plan)</span>
                  </h3>
                  <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                    Odoo 17 Time Off 🌴
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  خطة التحويل لأودو الأصلي وتثبيت موديول الإجازات القياسي وقواعد الاستحقاق الكويتية (30 يوماً سنوياً - 2.5 يوم شهرياً)
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-purple-500/10 border-2 border-emerald-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>خطة الإجازة السنوية - الكويت (30 يوم / 2.5 يوم شهرياً)</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      تطبيق دقيق للمادة 70 من قانون العمل الكويتي: استحقاق 30 يوماً بالسنة مع تفعيل <code className="bg-white px-1.5 py-0.5 rounded font-mono text-emerald-800">requires_allocation = 'yes'</code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInstallHrHolidaysModule}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>تثبيت hr_holidays وتهيئة الخطة</span>
                    </button>

                    <button
                      onClick={() => {
                        setCodeModalTab('HR_HOLIDAYS');
                        setIsCodeModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Code2 className="w-4 h-4 text-[#714B67]" />
                      <span>كود Python</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-slate-500 text-[11px] block">الموديول القياسي (Module)</span>
                    <span className="font-mono font-bold text-slate-900 block text-xs">ir.module.module: hr_holidays</span>
                    <span className="text-[10px] text-emerald-600 font-semibold block">✓ جاهز للتثبيت الفوري</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-slate-500 text-[11px] block">دورية الإضافة (Frequency)</span>
                    <span className="font-mono font-bold text-slate-900 block text-xs">2.5 Day / Monthly</span>
                    <span className="text-[10px] text-slate-500 block">إضافة 2.5 يوم كل شهر تلقائياً</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-slate-500 text-[11px] block">الإجمالي السنوي (Annual Total)</span>
                    <span className="font-mono font-bold text-emerald-700 block text-xs">30.00 Days / Year</span>
                    <span className="text-[10px] text-slate-500 block">مطابق لقانون العمل الكويتي</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                منطق الأعمال (Business Logic) متصل بـ <strong>ir.config_parameter</strong> لحفظ كل اختيار للأبد.
              </div>
              <button
                onClick={handleSaveResConfigSettings}
                className="bg-[#714B67] hover:bg-[#5b3c53] text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتطبيق الإعدادات الفنية (set_values)</span>
              </button>
            </div>

          </div>

          {/* Code Viewer Modal (Python / XML / System Parameters) */}
          {isCodeModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-right dir-rtl flex flex-col max-h-[85vh]">
                <div className="bg-[#714B67] text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-purple-300" />
                    <h3 className="font-black text-sm">
                      هيكلية إعدادات Aysed 2026 (Python Business Logic &amp; XML Views)
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsCodeModalOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sub-tabs inside modal */}
                <div className="flex items-center gap-2 p-3 bg-slate-100 border-b border-slate-200 text-xs flex-wrap">
                  <button
                    onClick={() => setCodeModalTab('HR_HOLIDAYS')}
                    className={`px-4 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      codeModalTab === 'HR_HOLIDAYS'
                        ? 'bg-[#714B67] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>🌴 موديول الإجازات (hr_holidays &amp; Accrual)</span>
                    <span className="bg-emerald-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded">الكويت 30 يوم</span>
                  </button>

                  <button
                    onClick={() => setCodeModalTab('INIT_HOOK')}
                    className={`px-4 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      codeModalTab === 'INIT_HOOK'
                        ? 'bg-[#714B67] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>⚡ السر الإلهي (__init__.py)</span>
                    <span className="bg-amber-400 text-slate-900 text-[9px] font-black px-1.5 py-0.2 rounded">Hook</span>
                  </button>

                  <button
                    onClick={() => setCodeModalTab('PYTHON')}
                    className={`px-4 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      codeModalTab === 'PYTHON'
                        ? 'bg-[#714B67] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    🐍 منطق الأعمال (models/res_config_settings.py)
                  </button>

                  <button
                    onClick={() => setCodeModalTab('XML')}
                    className={`px-4 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      codeModalTab === 'XML'
                        ? 'bg-[#714B67] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    📄 واجهة الإعدادات (views/settings.xml)
                  </button>

                  <button
                    onClick={() => setCodeModalTab('PARAMS')}
                    className={`px-4 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      codeModalTab === 'PARAMS'
                        ? 'bg-[#714B67] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ⚙️ جدول معلمات النظام (ir.config_parameter)
                  </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {codeModalTab === 'HR_HOLIDAYS' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>كود تثبيت <strong>hr_holidays</strong> وتهيئة خطة استحقاق الإجازات الكويتية (30 يوم/سنة - 2.5 يوم/شهر):</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleInstallHrHolidaysModule}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>تثبيت وتهيئة الخطة الآن</span>
                          </button>
                          <button
                            onClick={() => copyToClipboard(odooHrHolidaysPython, 'HR_HOLIDAYS')}
                            className="bg-[#714B67] hover:bg-[#5b3c53] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            {copiedHrHolidays ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedHrHolidays ? 'تم النسخ!' : 'نسخ كود الإجازات Python'}</span>
                          </button>
                        </div>
                      </div>

                      <pre className="bg-slate-900 text-emerald-300 p-4 rounded-xl text-xs font-mono overflow-x-auto dir-ltr text-left leading-relaxed border border-slate-800">
                        {odooHrHolidaysPython}
                      </pre>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1 leading-relaxed">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>المعايير القانونية والفنية المطبقة (Kuwait Labor Law):</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 pr-2">
                          <li><strong>1. التثبيت القياسي (button_immediate_install):</strong> فحص حالة <code>hr_holidays</code> وتثبيته فورياً في جدول <code>ir_module_module</code>.</li>
                          <li><strong>2. خطة الاستحقاق الدقيقة (Accrual Plan):</strong> إضافة 2.5 يوم شهرياً (Monthly Frequency) لتبلغ 30 يوماً في السنة تلقائياً.</li>
                          <li><strong>3. ربط نوع الإجازة السنوية:</strong> إلزام تخصيص الرصيد (<code>requires_allocation = 'yes'</code>) وربطه بـ <code>accrual_plan_id</code>.</li>
                        </ul>
                      </div>
                    </div>
                  ) : codeModalTab === 'INIT_HOOK' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>كود <strong>_aysed_post_init_hook</strong> لتفعيل السوسنة وقائمة تقني تلقائياً للمالك الأول وضبط العملة للكويت:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleExecutePostInitHook}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>تشغيل السكريبت الآن</span>
                          </button>
                          <button
                            onClick={() => copyToClipboard(odooPostInitHookPython, 'INIT_HOOK')}
                            className="bg-[#714B67] hover:bg-[#5b3c53] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            {copiedInitHook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedInitHook ? 'تم النسخ!' : 'نسخ كود __init__.py'}</span>
                          </button>
                        </div>
                      </div>

                      <pre className="bg-slate-900 text-amber-300 p-4 rounded-xl text-xs font-mono overflow-x-auto dir-ltr text-left leading-relaxed border border-slate-800">
                        {odooPostInitHookPython}
                      </pre>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1 leading-relaxed">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>وظيفة السكريبت الفني في المنظومة:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 pr-2">
                          <li><strong>1. ترقية المالك (Sayed - ID: 2):</strong> منحه مجموعة <code className="text-[#714B67] font-bold">base.group_no_one</code> الخاصة بالقائمة التقنية والسوسنة وأدوات التصحيح بدون الحاجة للتفعيل اليدوي كل مرة.</li>
                          <li><strong>2. ضبط التوطين والعملة (KWD):</strong> ربط عملة النظام والشركة الافتراضية بالدينار الكويتي (0.000 د.ك) بـ 3 خانات عشرية.</li>
                        </ul>
                      </div>
                    </div>
                  ) : codeModalTab === 'PYTHON' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span>فئة <strong>ResConfigSettings</strong> الموروثة من <code>res.config.settings</code> مع تنفيذ <code>set_values()</code>:</span>
                        <button
                          onClick={() => copyToClipboard(odooResConfigSettingsPython, 'PYTHON')}
                          className="bg-[#714B67] hover:bg-[#5b3c53] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                        >
                          {copiedPython ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedPython ? 'تم النسخ!' : 'نسخ كود Python'}</span>
                        </button>
                      </div>

                      <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto dir-ltr text-left leading-relaxed border border-slate-800">
                        {odooResConfigSettingsPython}
                      </pre>
                    </div>
                  ) : codeModalTab === 'XML' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span>كود واجهة الإعدادات الشاملة المدمجة في <strong>res.config.settings</strong>:</span>
                        <button
                          onClick={() => copyToClipboard(odooResConfigSettingsXml, 'XML')}
                          className="bg-[#714B67] hover:bg-[#5b3c53] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                        >
                          {copiedXml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedXml ? 'تم النسخ!' : 'نسخ كود XML'}</span>
                        </button>
                      </div>

                      <pre className="bg-slate-900 text-sky-300 p-4 rounded-xl text-xs font-mono overflow-x-auto dir-ltr text-left leading-relaxed border border-slate-800">
                        {odooResConfigSettingsXml}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        معلمات النظام الحالية المسجلة في جدول <code>ir.config_parameter</code> (Database System Parameters):
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">مفتاح المعلمة (Key / Config Parameter)</th>
                              <th className="p-3">القيمة الحالية (Value)</th>
                              <th className="p-3">الحالة والوصف</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            <tr className="bg-white">
                              <td className="p-3 text-[#714B67] font-bold">auth_signup.uninvited</td>
                              <td className="p-3 font-bold">{authSignupUninvited}</td>
                              <td className="p-3 font-sans text-slate-600">{authSignupUninvited === 'b2b' ? 'بدعوة فقط من الإدارة' : 'تسجيل حر للعموم'}</td>
                            </tr>
                            <tr className="bg-slate-50/60">
                              <td className="p-3 text-[#714B67] font-bold">auth_signup.reset_password</td>
                              <td className="p-3 font-bold">{authSignupResetPassword ? 'True' : 'False'}</td>
                              <td className="p-3 font-sans text-slate-600">استعادة كلمة المرور عبر البريد</td>
                            </tr>
                            <tr className="bg-white">
                              <td className="p-3 text-[#714B67] font-bold">auth_signup.allow_uninvited</td>
                              <td className="p-3 font-bold">{authSignupUninvited === 'b2c' ? 'True' : 'False'}</td>
                              <td className="p-3 font-sans text-emerald-700 font-bold">تم ضبطها تلقائياً بواسطة set_values()</td>
                            </tr>
                            <tr className="bg-slate-50/60">
                              <td className="p-3 text-[#714B67] font-bold">module_auth_oauth</td>
                              <td className="p-3 font-bold">{moduleAuthOauth ? 'True' : 'False'}</td>
                              <td className="p-3 font-sans text-slate-600">تسجيل الدخول الموحد بـ Google</td>
                            </tr>
                            <tr className="bg-white">
                              <td className="p-3 text-[#714B67] font-bold">aysed.trial_period</td>
                              <td className="p-3 font-bold">{aysedTrialPeriod} days</td>
                              <td className="p-3 font-sans text-slate-600">فترة التجربة المجانية للشركات</td>
                            </tr>
                            <tr className="bg-slate-50/60">
                              <td className="p-3 text-[#714B67] font-bold">company.currency_id</td>
                              <td className="p-3 font-bold">{companyCurrencyId} ({currencySymbol})</td>
                              <td className="p-3 font-sans text-slate-600">عملة النظام الرسمية (قانون الكويت)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => setIsCodeModalOpen(false)}
                    className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      ) : activeTab === 'INTEGRATIONS' ? (
        <SystemIntegrationsPage activeCompany={activeCompany} />
      ) : activeTab === 'SYSTEM_SECURITY' ? (
        <SystemSettingsPage />
      ) : activeTab === 'APPEARANCE' ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
              <Palette className="w-5 h-5 text-[#714B67]" />
              <span>تخصيص المظهر والخلفيات الحية (Animated Backgrounds & Themes)</span>
            </h2>
            <p className="text-xs text-slate-500">
              اختر نمط الخلفية المتحركة المفضلة لديك (الشبكة الرقمية، التدرج المنساب، الأمواج الهندسية، أو الطبيعة) مع إمكانية إيقاف الحركة عند الحاجة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {[
              { id: 'FOREST_VIDEO', title: 'طبيعة الغابة والنهر الهادئ', desc: 'مشهد طبيعي حي وناعم مع انعكاسات ضوئية مريحة للعين', badge: 'فيديو حي' },
              { id: 'DIGITAL_NETWORK', title: 'الشبكة الرقمية (Digital Network)', desc: 'نقاط مضيئة وشبكة ذكية مترابطة تتحرك ببطء وانسجام', badge: 'تفاعلي' },
              { id: 'FLOWING_GRADIENT', title: 'التدرج المنساب (Aurora Gradient)', desc: 'تدرجات لونية هادئة ومنسابقة تمنح شعوراً بالدفء والاحترافية', badge: 'ألوان حية' },
              { id: 'GEOMETRIC_WAVES', title: 'الأمواج الهندسية (Geometric Waves)', desc: 'أمواج وخطوط هندسية منسابة بتصميم عالي الذوق', badge: 'أنيق' },
              { id: 'STATIC', title: 'خلفية داكنة ثابتة (Static Dark)', desc: 'خلفية صلبة ومرريحة للمهام المكثفة وسريعة الأداء', badge: 'ثابت' },
            ].map((theme) => {
              const isSelected = bgTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => setBgTheme && setBgTheme(theme.id as any)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#714B67] bg-purple-50/50 ring-2 ring-[#714B67]/20 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-[#714B67]/10 text-[#714B67] px-2 py-0.5 rounded font-mono">
                        {theme.badge}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#714B67]" />}
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">{theme.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{theme.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#714B67]">
                    <span>{isSelected ? 'الخلفية النشطة حالياً' : 'تفعيل هذا النمط'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-slate-200 flex items-center justify-between bg-slate-50/80 p-4 rounded-xl">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900">التحكم في حركة الخلفية (Motion Control)</h4>
              <p className="text-xs text-slate-500">تمكين أو تعطيل حركة الخلفية لتوفير استهلاك الطاقة أو حسب الرغبة الشخصية</p>
            </div>
            <button
              onClick={() => setMotionEnabled && setMotionEnabled(!motionEnabled)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                motionEnabled 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
                  : 'bg-slate-300 hover:bg-slate-400 text-slate-800'
              }`}
            >
              {motionEnabled ? <Play className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              <span>{motionEnabled ? 'الحركة مفعلة (نشط)' : 'الحركة متوقفة (ثابت)'}</span>
            </button>
          </div>
        </div>
      ) : activeTab === 'DEVELOPER_TOOLS' ? (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6 max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto text-purple-700 shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">أدوات المطورين ووضع التصحيح (Developer Mode)</h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              تتيح لك أدوات المطورين في نظام أودو تفعيل وضع التصحيح (Debug Mode) لعرض خصائص الحقول وأكواد البرمجة وتحليل الأداء الداخلي بكل سهولة.
            </p>
          </div>

          <div className="p-6 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-purple-800 bg-white px-4 py-2 rounded-xl shadow-2xs border border-purple-100 w-fit mx-auto">
              <span>رابط وضع المطور: /?debug=1 (أو النقر على أيقونة 🐞 في الهيدر)</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  localStorage.setItem('odoo_debug_mode', 'true');
                  const url = new URL(window.location.href);
                  url.searchParams.set('debug', '1');
                  window.history.pushState({}, '', url.toString());
                  window.location.reload();
                }}
                className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer text-xs"
              >
                <Bug className="w-4 h-4 text-amber-300" />
                <span>تفعيل وضع المطورين (Active Debug Mode)</span>
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem('odoo_debug_mode');
                  localStorage.removeItem('odoo_superuser_mode');
                  const url = new URL(window.location.href);
                  url.searchParams.delete('debug');
                  window.history.pushState({}, '', url.pathname);
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer text-xs"
              >
                <PowerOff className="w-4 h-4" />
                <span>تعطيل وضع المطور (Deactivate Debug)</span>
              </button>
            </div>
            <div className="pt-6 mt-6 border-t border-purple-200">
              <div className="bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-indigo-500/10 border-2 border-amber-300 rounded-2xl p-6 text-right space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                      <Sparkles className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        كود "السر الإلهي" لأودو (Technical Post-Init Hook)
                      </h3>
                      <p className="text-xs text-slate-600">
                        سكريبت <code className="font-mono bg-white px-1.5 py-0.5 rounded text-[#714B67] font-bold">_aysed_post_init_hook</code> في <code className="font-mono text-slate-800">__init__.py</code>
                      </p>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200">
                    Odoo Super Hook ⚡
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  يضمن عمل <strong>"السوسنة"</strong> و <strong>"قائمة تقني (base.group_no_one)"</strong> تلقائياً للمالك الأول (Sayed / ID: 2)، وضبط العملة الافتراضية للشركة والمنظومة إلى <strong>الدينار الكويتي (KWD)</strong>.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleExecutePostInitHook}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>تشغيل السر الإلهي الآن (_aysed_post_init_hook)</span>
                  </button>

                  <button
                    onClick={() => {
                      setCodeModalTab('INIT_HOOK');
                      setIsCodeModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Code2 className="w-4 h-4 text-[#714B67]" />
                    <span>معاينة ونسخ الكود الكامل</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-purple-200">
              <h3 className="text-lg font-bold text-purple-900 mb-2">الترقية البرمجية (Script Equivalent)</h3>
              <p className="text-xs text-purple-700 mb-4 max-w-md mx-auto">
                محاكاة أمر قاعدة البيانات لترقية المستخدم إلى مدير نظام كامل (ERP Manager) وتفعيل المنطقة الزمنية (Asia/Kuwait).
              </p>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, "res_users", "elsayedhr1993"), {
                      id: 2,
                      email: "elsayedhr1993@gmail.com",
                      groups_id: ["base.group_erp_manager", "base.group_system", "base.group_no_one"],
                      tz: "Asia/Kuwait",
                      upgradedAt: new Date().toISOString()
                    }, { merge: true });
                    toast.success("تم ترقية المستخدم لمدير نظام (ERP Manager) بنجاح!");  setTimeout(() => { window.location.href = "/?debug=1"; }, 1500);
                  } catch(e) {
                    console.error(e);
                    toast.error("حدث خطأ أثناء ترقية الصلاحيات");
                  }
                }}
                className="px-8 py-3 bg-[#714B67] hover:bg-[#5b3c53] text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>ترقية حساب Sayed (تنفيذ السكريبت)</span>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-purple-200">
               <h3 className="text-lg font-bold text-slate-800 mb-2">تهيئة البيانات الأساسية (XML Data Seeding)</h3>
               <p className="text-sm text-slate-600 mb-4">هذه الأداة تقوم بإدراج الأقسام والمسميات الوظيفية (القطاع الطبي والإداري) مباشرة إلى قاعدة البيانات.</p>
               <button
                 onClick={handleSeedOdooData}
                 className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
               >
                 <Database className="w-5 h-5" />
                 <span>تهيئة المسميات والأقسام (Odoo XML)</span>
               </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#714B67]" />
                <span>إدارة الشركات والسجل التجاري (SaaS Multi-Company)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                إضافة الشركات والمؤسسات التابعة وتحديد الشركة النشطة لتنقل البيانات المستقلة وفق قانون العمل الكويتي
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-bold px-5 py-2 rounded shadow flex items-center gap-2 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التغييرات</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded shadow flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة شركة جديدة +</span>
              </button>
            </div>
          </div>

          {/* LIST OF REGISTERED COMPANIES CARDS */}
          <div className="mb-6">
            <h3 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-1.5">
              <span>الشركات المسجلة بالنظام ({companies.length}):</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((comp) => {
                const isActive = comp?.id === activeCompany?.id;
                const isSelectedForEdit = comp?.id === editingCompany?.id;

                return (
                  <div
                    key={comp.id}
                    className={`bg-white p-4 rounded-xl border transition shadow-2xs space-y-3 relative ${
                      isSelectedForEdit 
                        ? 'border-[#714B67] ring-2 ring-[#714B67]/20' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">{comp?.nameAr || ''}</h4>
                        <p className="text-[11px] text-slate-500 dir-ltr text-right">{comp.nameEn}</p>
                      </div>

                      {isActive ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>الشركة النشطة</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectCompany && onSelectCompany(comp)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-300 transition"
                        >
                          تفعيل هذه الشركة
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1 font-mono text-slate-700">
                      <div>سجل تجاري: <strong className="text-slate-900">{comp.commercialRegNo}</strong></div>
                      <div>الرقم المدني: <strong className="text-slate-900">{comp.civilIdCompany}</strong></div>
                      <div>ملف الشؤون WSI: <strong className="text-slate-900">{comp.wsiCode}</strong></div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectCompany) {
                              onSelectCompany(comp);
                            }
                          }}
                          className={`text-[11px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-md transition cursor-pointer ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-[#714B67]/10 hover:bg-[#714B67] text-[#714B67] hover:text-white'
                          }`}
                          title="زر العين: التبديل والاطلاع على تطبيقات هذه الشركة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isActive ? 'معاينة التطبيقات' : 'دخول ومعاينة'}</span>
                        </button>

                        <button
                          onClick={() => handleSelectCompanyToEdit(comp)}
                          className={`text-[11px] font-bold flex items-center gap-1 ${
                            isSelectedForEdit ? 'text-[#714B67]' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{isSelectedForEdit ? 'تعديل' : 'تعديل'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setCompanyToDelete(comp);
                          }}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer hover:bg-rose-50 px-2 py-1 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Company Settings Card */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b flex items-center justify-between">
                <span>تعديل بيانات الشركة المحتارة: [{editingCompany?.nameAr || ''}]</span>
                <span className="text-[10px] bg-purple-100 text-[#714B67] font-mono px-2 py-0.5 rounded font-bold">
                  SaaS Multi-Company Editor
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الشركة بالعربية *</label>
                  <input
                    type="text"
                    value={editingCompany?.nameAr || ''}
                    onChange={(e) => setEditingCompany(prev => ({ ...(prev || {} as Company), nameAr: e.target.value }))}
                    className="w-full border border-slate-300 rounded p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الشركة بالإنجليزية (English Name)</label>
                  <input
                    type="text"
                    value={editingCompany?.nameEn || ''}
                    onChange={(e) => setEditingCompany(prev => ({ ...(prev || {} as Company), nameEn: e.target.value }))}
                    className="w-full border border-slate-300 rounded p-2 outline-none dir-ltr focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم السجل التجاري (Commercial Reg No)</label>
                  <input
                    type="text"
                    value={editingCompany.commercialRegNo || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, commercialRegNo: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 outline-none font-mono dir-ltr focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرقم المدني للشركة (Civil ID Company)</label>
                  <input
                    type="text"
                    value={editingCompany.civilIdCompany || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, civilIdCompany: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 outline-none font-mono dir-ltr focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رمز ملف حماية الأجور بوزارة الشؤون (WSI Code)</label>
                  <input
                    type="text"
                    value={editingCompany.wsiCode || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, wsiCode: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 outline-none font-mono dir-ltr focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم البنك الرئيسي للحساب</label>
                  <input
                    type="text"
                    value={editingCompany.bankName || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, bankName: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">رقم الآيبان البنكي الرئيسي (IBAN - 30 Chars)</label>
                  <input
                    type="text"
                    value={editingCompany.iban || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, iban: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 outline-none font-mono text-xs dir-ltr focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSave}
                  className="bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-bold px-6 py-2 rounded shadow transition flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ بيانات الشركة</span>
                </button>
              </div>
            </div>

            {/* System Sanitation & Production Controls */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#714B67]" />
                <span>تطهير البيانات والنشر الرسمى</span>
              </h3>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 text-slate-700">
                <p className="font-bold text-amber-900">حالة النظام: جاهز للنشر الإنتاجي 🚀</p>
                <p className="text-[11px] leading-relaxed">
                  يمكنك استخدام زر التطهير أدناه لمسح وإعادة تنظيف جميع البيانات التجريبية المخزنة للبدء بنظام رسمي نقي 100%.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setShowPurgeModal(true)}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تطهير ومسح كل البيانات التجريبية (System Purge)</span>
                </button>

                <button
                  onClick={() => setShowDemoModal(true)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-lg border border-slate-300 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                  <span>استرجاع عينة بيانات تجريبية للاختبار</span>
                </button>
              </div>

              <div className="border-t pt-3 text-[11px] text-slate-400 text-center">
                Aysed S HR 2026 Enterprise • Edition Kuwait v2.4
              </div>
            </div>
          </div>

          {/* MODAL: ADD NEW COMPANY */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 dir-rtl text-right">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <span>إضافة شركة جديدة للنظام (Add New Company)</span>
                  </h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateCompanySubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم الشركة بالعربية *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: شركة الخليج للتجارة العامة..."
                      value={newCompData.nameAr || ''}
                      onChange={(e) => setNewCompData({ ...newCompData, nameAr: e.target.value })}
                      className="w-full border border-slate-300 rounded p-2 text-slate-900 font-bold outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم الشركة بالإنجليزية (English Name)</label>
                    <input
                      type="text"
                      placeholder="e.g. Gulf General Trading W.L.L"
                      value={newCompData.nameEn || ''}
                      onChange={(e) => setNewCompData({ ...newCompData, nameEn: e.target.value })}
                      className="w-full border border-slate-300 rounded p-2 text-slate-900 outline-none dir-ltr focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">رقم السجل التجاري</label>
                      <input
                        type="text"
                        placeholder="1049281"
                        value={newCompData.commercialRegNo || ''}
                        onChange={(e) => setNewCompData({ ...newCompData, commercialRegNo: e.target.value })}
                        className="w-full border border-slate-300 rounded p-2 font-mono dir-ltr outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">الرقم المدني للشركة</label>
                      <input
                        type="text"
                        placeholder="7001928394"
                        value={newCompData.civilIdCompany || ''}
                        onChange={(e) => setNewCompData({ ...newCompData, civilIdCompany: e.target.value })}
                        className="w-full border border-slate-300 rounded p-2 font-mono dir-ltr outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">ملف الشؤون WSI</label>
                      <input
                        type="text"
                        placeholder="WSI-KW-88201"
                        value={newCompData.wsiCode || ''}
                        onChange={(e) => setNewCompData({ ...newCompData, wsiCode: e.target.value })}
                        className="w-full border border-slate-300 rounded p-2 font-mono dir-ltr outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">اسم البنك الرئيسي</label>
                      <input
                        type="text"
                        placeholder="بنك الكويت الوطني"
                        value={newCompData.bankName || ''}
                        onChange={(e) => setNewCompData({ ...newCompData, bankName: e.target.value })}
                        className="w-full border border-slate-300 rounded p-2 outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم الآيبان (IBAN)</label>
                    <input
                      type="text"
                      placeholder="KW82NBOK000000001928374820192"
                      value={newCompData.iban || ''}
                      onChange={(e) => setNewCompData({ ...newCompData, iban: e.target.value })}
                      className="w-full border border-slate-300 rounded p-2 font-mono dir-ltr text-xs outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة الشركة والتفعيل</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: DELETE COMPANY CONFIRMATION */}
          {companyToDelete && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 dir-rtl text-right">
                <div className="flex items-center gap-3 text-rose-600 pb-2 border-b">
                  <div className="p-2 bg-rose-100 rounded-full">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">تأكيد حذف الشركة</h3>
                    <p className="text-xs text-slate-500">عملية غير قابلة للاسترجاع</p>
                  </div>
                </div>

                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-xs space-y-2 text-rose-900">
                  <p>هل أنت أخصائيHR/مشرف وتؤكد حذف الشركة التالية نهائياً من النظام؟</p>
                  <div className="font-bold text-sm bg-white p-2 rounded border border-rose-200 text-slate-900">
                    🏢 {companyToDelete?.nameAr || ''}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    رقم السجل التجاري: <strong className="font-mono">{companyToDelete?.commercialRegNo || ''}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setCompanyToDelete(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg cursor-pointer"
                  >
                    تراجع / إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteCompanyAction}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، أكد حذف الشركة</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: PURGE SYSTEM DATA CONFIRMATION */}
          {showPurgeModal && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 dir-rtl text-right">
                <div className="flex items-center gap-3 text-rose-600 pb-2 border-b">
                  <div className="p-2 bg-rose-100 rounded-full">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">تطهير ومسح كل البيانات التجريبية</h3>
                    <p className="text-xs text-slate-500">System Purge for Production</p>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs space-y-2 text-amber-900">
                  <p className="font-bold">تحذير إنتاجي:</p>
                  <p>هل أنت متأكد من تطهير ومسح كافة البيانات التجريبية المخزنة (الموظفون، العقود، الرواتب، الإجازات، المستندات)؟ سيصبح النظام نظيفاً 100% وجاهزاً للنشر الرسمي للشركة.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowPurgeModal(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg cursor-pointer"
                  >
                    تراجع
                  </button>
                  <button
                    type="button"
                    onClick={confirmPurge}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، قم بتطهير النظام بالكامل</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: LOAD DEMO DATA CONFIRMATION */}
          {showDemoModal && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 dir-rtl text-right">
                <div className="flex items-center gap-3 text-indigo-600 pb-2 border-b">
                  <div className="p-2 bg-indigo-100 rounded-full">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">استرجاع عينة بيانات تجريبية</h3>
                    <p className="text-xs text-slate-500">Load Sample Data</p>
                  </div>
                </div>

                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200 text-xs space-y-2 text-indigo-900">
                  <p>هل ترغب في تحميل عينة بيانات تجريبية للاختبار والتأكد من الميزات (الموظفين، العقود النموذجية، الرواتب)؟</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowDemoModal(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={confirmDemo}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>نعم، حمل عينة البيانات</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATION TOAST MODAL */}
          {notificationMsg && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 dir-rtl text-right">
                <div className="flex items-center gap-3 text-emerald-600 pb-2 border-b">
                  <div className="p-2 bg-emerald-100 rounded-full">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">إشعار النظام</h3>
                    <p className="text-xs text-slate-500">System Notification</p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                  {notificationMsg}
                </p>

                <div className="flex items-center justify-end pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setNotificationMsg(null)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
                  >
                    حسناً، فهمت
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};



