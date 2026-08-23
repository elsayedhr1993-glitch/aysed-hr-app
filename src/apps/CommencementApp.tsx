import React, { useState } from 'react';
import { 
  FileSignature, CheckCircle, Clock, Calendar, Building2, 
  User, Check, Plus, AlertTriangle, ShieldCheck, FolderArchive, 
  ArrowRight, X, FileText, ExternalLink, Printer, Code2, Copy,
  Briefcase, CheckSquare, Sparkles, Sliders, SunMedium, Moon,
  Timer, Layers, Shield, RefreshCw, Pencil, Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Employee, Contract, ShiftProfile, EmploymentCommencement, Company } from '../types';

interface CommencementAppProps {
  employees: Employee[];
  contracts: Contract[];
  shifts: ShiftProfile[];
  commencements: EmploymentCommencement[];
  activeCompany: Company;
  filterTab: string;
  onSaveCommencement: (comm: EmploymentCommencement) => void;
  onDeleteCommencement?: (id: string) => void;
  onUpdateEmployeeStatus: (employeeId: string, status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED') => void;
  onSaveEmployee?: (emp: Employee) => void;
  onSaveContract?: (contract: Contract) => void;
  onNavigateToApp?: (app: any) => void;
}

// Odoo Standard Working Calendars (resource.calendar)
export const STANDARD_WORKING_SCHEDULES = [
  {
    id: 'cal-std-8h-6d',
    name: 'الدوام الصباحي القياسي - 48 ساعة (08:00 ص - 04:00 م | السبت - الخميس)',
    shortName: 'صباحي قياسي 8 ساعات',
    workHoursType: 'STANDARD' as const,
    dailyHours: 8,
    weeklyHours: 48,
    workDays: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    timeRange: '08:00 - 16:00',
    typeBadge: 'دوام كامل (6 أيام)'
  },
  {
    id: 'cal-std-8h-5d',
    name: 'الدوام المكتبي 5 أيام - 40 ساعة (08:00 ص - 04:00 م | الأحد - الخميس)',
    shortName: 'مكتبي 5 أيام 40 ساعة',
    workHoursType: 'STANDARD' as const,
    dailyHours: 8,
    weeklyHours: 40,
    workDays: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    timeRange: '08:00 - 16:00',
    typeBadge: 'دوام كامل (5 أيام)'
  },
  {
    id: 'cal-eve-8h-6d',
    name: 'الدوام المسائي القياسي - 48 ساعة (04:00 م - 12:00 ص | السبت - الخميس)',
    shortName: 'مسائي 8 ساعات',
    workHoursType: 'STANDARD' as const,
    dailyHours: 8,
    weeklyHours: 48,
    workDays: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    timeRange: '16:00 - 00:00',
    typeBadge: 'دوام مسائي'
  },
  {
    id: 'cal-split-shifts',
    name: 'دوام الفترتين المقسم - 48 ساعة (09:00 ص - 01:00 م و 05:00 م - 09:00 م)',
    shortName: 'دوام فترتين مقسم',
    workHoursType: 'SHIFT' as const,
    dailyHours: 8,
    weeklyHours: 48,
    workDays: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    timeRange: '09:00-13:00 / 17:00-21:00',
    typeBadge: 'شفتين مقسم'
  },
  {
    id: 'cal-flexible-8h',
    name: 'الدوام المرن الذكي - 8 ساعات يومية (حضور مرن 07:30 - 09:30)',
    shortName: 'دوام مرن 8 ساعات',
    workHoursType: 'FLEXIBLE' as const,
    dailyHours: 8,
    weeklyHours: 48,
    workDays: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    timeRange: '07:30 - 17:30 (مرن 8س)',
    typeBadge: 'دوام مرن'
  },
  {
    id: 'cal-part-time-4h',
    name: 'الدوام الجزئي - 24 ساعة (09:00 ص - 01:00 م | السبت - الخميس)',
    shortName: 'دوام جزئي 4 ساعات',
    workHoursType: 'PART_TIME' as const,
    dailyHours: 4,
    weeklyHours: 24,
    workDays: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    timeRange: '09:00 - 13:00',
    typeBadge: 'دوام جزئي'
  }
];

export const CommencementApp: React.FC<CommencementAppProps> = ({
  employees,
  contracts,
  shifts,
  commencements,
  activeCompany,
  filterTab,
  onSaveCommencement,
  onUpdateEmployeeStatus,
  onSaveEmployee,
  onSaveContract,
  onNavigateToApp,
  onDeleteCommencement,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDevCodeModalOpen, setIsDevCodeModalOpen] = useState<boolean>(false);
  const [selectedCommForPrint, setSelectedCommForPrint] = useState<EmploymentCommencement | null>(null);
  const [selectedCommForView, setSelectedCommForView] = useState<EmploymentCommencement | null>(null);
  const [editingCommId, setEditingCommId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form Fields
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [actualJoiningDate, setActualJoiningDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [contractType, setContractType] = useState<'INDEFINITE' | 'FIXED_TERM'>('INDEFINITE');
  
  // Odoo Working Schedule fields
  const [resourceCalendarId, setResourceCalendarId] = useState<string>('cal-std-8h-6d');
  const [workingSchedule, setWorkingSchedule] = useState<string>(STANDARD_WORKING_SCHEDULES[0].name);
  const [workHoursType, setWorkHoursType] = useState<'STANDARD' | 'FLEXIBLE' | 'PART_TIME' | 'SHIFT' | 'CUSTOM'>('STANDARD');
  const [selectedShiftId, setSelectedShiftId] = useState<string>(shifts[0]?.id || 'shift-1');
  const [dailyHours, setDailyHours] = useState<number>(8);
  const [weeklyHours, setWeeklyHours] = useState<number>(48);
  const [workDays, setWorkDays] = useState<string[]>(['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']);
  const [customScheduleNote, setCustomScheduleNote] = useState<string>('');
  
  const [location, setLocation] = useState<string>('المقر الرئيسي - مدينة الكويت (الكويت)');
  const [notes, setNotes] = useState<string>('');

  const companyEmployees = (employees || []).filter(e => e.companyId === (activeCompany?.id || 'comp-1') && !e.isDeleted);
  const companyCommencements = (commencements || []).filter(c => c.companyId === (activeCompany?.id || 'comp-1'));

  const filteredCommencements = companyCommencements.filter(c => {
    if (filterTab === 'PENDING') return c.status === 'PENDING';
    if (filterTab === 'APPROVED') return c.status === 'APPROVED';
    return true;
  });

  // When opening modal for new commencement
  const handleOpenNew = () => {
    setEditingCommId(null);
    const defaultEmp = companyEmployees[0];
    const initialEmpId = defaultEmp?.id || '';
    setSelectedEmpId(initialEmpId);
    
    // Check if employee has contract or existing schedule
    const empContract = contracts.find(c => c.employeeId === initialEmpId);
    if (empContract) {
      setContractType(empContract.contractType || 'INDEFINITE');
    } else {
      setContractType('INDEFINITE');
    }

    setActualJoiningDate(new Date().toISOString().split('T')[0]);
    setResourceCalendarId('cal-std-8h-6d');
    setWorkingSchedule(STANDARD_WORKING_SCHEDULES[0].name);
    setWorkHoursType('STANDARD');
    setSelectedShiftId(shifts[0]?.id || 'shift-1');
    setDailyHours(8);
    setWeeklyHours(48);
    setWorkDays(['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']);
    setCustomScheduleNote('');
    setLocation(activeCompany?.nameAr ? `${activeCompany.nameAr} - المقر الرئيسي` : 'المقر الرئيسي - مدينة الكويت');
    setNotes('');
    setIsModalOpen(true);
  };

  // When opening modal to edit an existing commencement
  const handleOpenEdit = (comm: EmploymentCommencement) => {
    setEditingCommId(comm.id);
    setSelectedEmpId(comm.employeeId);
    setActualJoiningDate(comm.actualJoiningDate || new Date().toISOString().split('T')[0]);
    setContractType(comm.contractType || 'INDEFINITE');
    setResourceCalendarId(comm.resourceCalendarId || 'cal-std-8h-6d');
    setWorkingSchedule(comm.workingSchedule || STANDARD_WORKING_SCHEDULES[0].name);
    setWorkHoursType(comm.workHoursType || 'STANDARD');
    setSelectedShiftId(comm.shiftId || shifts[0]?.id || 'shift-1');
    setDailyHours(comm.dailyHours || 8);
    setWeeklyHours(comm.weeklyHours || 48);
    setWorkDays(comm.workDays || ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']);
    setCustomScheduleNote(comm.customScheduleNote || '');
    setLocation(comm.location || (activeCompany?.nameAr ? `${activeCompany.nameAr} - المقر الرئيسي` : 'المقر الرئيسي - مدينة الكويت'));
    setNotes(comm.notes || '');
    setIsModalOpen(true);
  };

  // When changing employee in modal
  const handleEmployeeChange = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find(e => e.id === empId);
    const empContract = contracts.find(c => c.employeeId === empId);
    if (empContract) {
      setContractType(empContract.contractType || 'INDEFINITE');
      if (empContract.resourceCalendarId) {
        setResourceCalendarId(empContract.resourceCalendarId);
      }
      if (empContract.workingSchedule) {
        setWorkingSchedule(empContract.workingSchedule);
      }
      if (empContract.workHoursType) {
        setWorkHoursType(empContract.workHoursType as any);
      }
    }
    if (emp?.joinDate) {
      setActualJoiningDate(emp.joinDate);
    }
  };

  // When selecting a predefined calendar schedule
  const handleScheduleSelect = (calId: string) => {
    setResourceCalendarId(calId);
    const foundPreset = STANDARD_WORKING_SCHEDULES.find(s => s.id === calId);
    if (foundPreset) {
      setWorkingSchedule(foundPreset.name);
      setWorkHoursType(foundPreset.workHoursType);
      setDailyHours(foundPreset.dailyHours);
      setWeeklyHours(foundPreset.weeklyHours);
      setWorkDays(foundPreset.workDays);
    } else {
      // It might be a custom company shift
      const foundShift = shifts.find(s => s.id === calId);
      if (foundShift) {
        setWorkingSchedule(`شفت مخصص: ${foundShift.name} (${foundShift.startTime} - ${foundShift.endTime})`);
        setSelectedShiftId(foundShift.id);
        setWorkHoursType('SHIFT');
      }
    }
  };

  const handleSaveCommencementForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      toast.error('يرجى اختيار الموظف أولاً');
      return;
    }

    const emp = employees.find(x => x.id === selectedEmpId);
    if (!emp) return;

    if (editingCommId) {
      // Edit mode: Find existing record and update it (HrVersion / Sayed admin override)
      const existingComm = companyCommencements.find(c => c.id === editingCommId);
      const isApproved = existingComm?.status === 'APPROVED';

      const updatedComm: EmploymentCommencement = {
        ...(existingComm || {}),
        id: editingCommId,
        employeeId: selectedEmpId,
        companyId: activeCompany?.id || 'comp-1',
        actualJoiningDate,
        contractType,
        shiftId: selectedShiftId,
        resourceCalendarId,
        workingSchedule,
        workHoursType,
        dailyHours,
        weeklyHours,
        workDays,
        customScheduleNote,
        departmentId: emp.departmentId || 'dept-1',
        location,
        status: existingComm?.status || 'PENDING',
        approvalDate: existingComm?.approvalDate || (isApproved ? new Date().toISOString().split('T')[0] : undefined),
        approvedBy: existingComm?.approvedBy || 'مدير الموارد البشرية (Odoo HR)',
        storageFolderUrl: existingComm?.storageFolderUrl || `supabase://storage/v1/bucket/employees/${selectedEmpId}/archive-vault`,
        notes,
      };

      onSaveCommencement(updatedComm);

      // If already approved, synchronize updates immediately to Employee Profile and Contract
      if (isApproved) {
        const updatedEmp: Employee = {
          ...emp,
          status: 'ACTIVE',
          joinDate: emp.joinDate || actualJoiningDate,
          resourceCalendarId,
          workingSchedule,
          workHoursType,
          shiftId: selectedShiftId,
          dailyWorkHours: dailyHours,
          weeklyWorkHours: weeklyHours,
        };
        if (onSaveEmployee) {
          onSaveEmployee(updatedEmp);
        }

        const empContract = contracts.find(c => c.employeeId === selectedEmpId);
        if (empContract && onSaveContract) {
          const updatedContract: Contract = {
            ...empContract,
            startDate: empContract.startDate || actualJoiningDate,
            contractType,
            resourceCalendarId,
            workingSchedule,
            workHoursType,
            shiftId: selectedShiftId,
            dailyWorkHours: dailyHours,
            workingHoursPerWeek: weeklyHours,
          };
          onSaveContract(updatedContract);
        }
        toast.success('تم تحديث وتعديل المباشرة ومزامنة جدول العمل والعقد تلقائياً (صلاحية مدير النظام Sayed)!');
      } else {
        toast.success('تم حفظ تعديلات نموذج مباشرة العمل بنجاح');
      }

      setIsModalOpen(false);
      setEditingCommId(null);
      return;
    }

    // New creation mode
    const newComm: EmploymentCommencement = {
      id: `comm-${Date.now()}`,
      employeeId: selectedEmpId,
      companyId: activeCompany?.id || 'comp-1',
      actualJoiningDate,
      contractType,
      shiftId: selectedShiftId,
      resourceCalendarId,
      workingSchedule,
      workHoursType,
      dailyHours,
      weeklyHours,
      workDays,
      customScheduleNote,
      departmentId: emp.departmentId || 'dept-1',
      location,
      approvedBy: 'مدير الموارد البشرية (Odoo HR)',
      approvalDate: new Date().toISOString().split('T')[0],
      storageFolderUrl: `supabase://storage/v1/bucket/employees/${selectedEmpId}/archive-vault`,
      status: 'PENDING',
      notes,
    };

    onSaveCommencement(newComm);
    toast.success('تم حفظ نموذج مباشرة العمل وإدراجه في قائمة المباشرات');
    setIsModalOpen(false);
  };

  const handleApprove = (comm: EmploymentCommencement) => {
    const updated: EmploymentCommencement = {
      ...comm,
      status: 'APPROVED',
      approvalDate: new Date().toISOString().split('T')[0],
    };
    onSaveCommencement(updated);

    // 1. Update employee status & link schedule
    const emp = employees.find(e => e.id === comm.employeeId);
    if (emp) {
      const updatedEmp: Employee = {
        ...emp,
        status: 'ACTIVE',
        joinDate: emp.joinDate || comm.actualJoiningDate,
        resourceCalendarId: comm.resourceCalendarId || 'cal-std-8h-6d',
        workingSchedule: comm.workingSchedule || 'الدوام الصباحي القياسي - 48 ساعة (08:00 - 16:00)',
        workHoursType: comm.workHoursType || 'STANDARD',
        shiftId: comm.shiftId || shifts[0]?.id || 'shift-1',
        dailyWorkHours: comm.dailyHours || 8,
        weeklyWorkHours: comm.weeklyHours || 48,
      };
      if (onSaveEmployee) {
        onSaveEmployee(updatedEmp);
      }
    }
    onUpdateEmployeeStatus(comm.employeeId, 'ACTIVE');

    // 2. Update or sync employee contract
    const empContract = contracts.find(c => c.employeeId === comm.employeeId);
    if (empContract && onSaveContract) {
      const updatedContract: Contract = {
        ...empContract,
        startDate: empContract.startDate || comm.actualJoiningDate,
        contractType: comm.contractType,
        resourceCalendarId: comm.resourceCalendarId || 'cal-std-8h-6d',
        workingSchedule: comm.workingSchedule || 'الدوام الصباحي القياسي - 48 ساعة (08:00 - 16:00)',
        workHoursType: comm.workHoursType || 'STANDARD',
        shiftId: comm.shiftId,
        dailyWorkHours: comm.dailyHours || 8,
        workingHoursPerWeek: comm.weeklyHours || 48,
      };
      onSaveContract(updatedContract);
    }

    toast.success(`تم اعتماد مباشرة العمل بنجاح وربط جدول العمل (${comm.workingSchedule || 'القياسي'}) بملف وعقد الموظف!`);
  };

  const handleCopyOdooCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ كود Odoo إلى الحافظة بنجاح');
  };

  const odooXmlCode = `<!-- تعديل واجهة مباشرة العمل لإضافة ساعات وجدول العمل (Odoo View Inheritance) -->
<record id="view_commencement_form_inherit" model="ir.ui.view">
    <field name="name">hr.commencement.form.inherit</field>
    <field name="model">hr.commencement</field> <!-- نموذج مباشرة العمل -->
    <field name="inherit_id" ref="hr_commencement.view_commencement_form"/>
    <field name="arch" type="xml">
        <xpath expr="//sheet/group" position="inside">
            <group string="تفاصيل الدوام وجدول العمل" name="working_schedule_group">
                <field name="resource_calendar_id" string="جدول ساعات العمل" 
                       options="{'no_create': True, 'no_open': False}"
                       placeholder="اختر جدول الموظف (صباحي، مسائي، 8 ساعات...)"/>
                <field name="work_hours_type" string="نوع الدوام" widget="radio"
                       options="{'horizontal': true}"/>
                <label for="daily_hours" string="ساعات الدوام المقررة"/>
                <div class="o_row">
                    <field name="daily_hours" class="oe_inline"/> ساعة يومياً | 
                    <field name="weekly_hours" class="oe_inline"/> ساعة أسبوعياً
                </div>
                <field name="custom_schedule_note" string="ملاحظات الدوام"
                       attrs="{'invisible': [('work_hours_type', '!=', 'custom')]}"/>
            </group>
        </xpath>
    </field>
</record>`;

  const odooPythonCode = `# -*- coding: utf-8 -*-
# كود تفعيل قابلية التعديل على سجلات مباشرة العمل وتحديث الموظف والعقد
from odoo import models, fields, api, _

# 1. كود تفعيل قابلية التعديل على سجلات مباشرة العمل لمدير النظام (Sayed / ID=2)
class HrVersion(models.Model):
    _inherit = 'hr.version'

    # جعل الحقول قابلة للتعديل حتى في حالة "التشغيل"
    def write(self, vals):
        # السماح لمدير النظام (Sayed) بالتعديل في أي وقت
        if self.env.user.id == 2:
            return super(HrVersion, self).sudo().write(vals)
        return super(HrVersion, self).write(vals)


# 2. نموذج مباشرة العمل المرتبط بالموظف والعقد ونظام البصمة في أودو
class HrCommencement(models.Model):
    _name = 'hr.commencement'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = 'Employment Commencement & Working Schedule'
    _order = 'actual_joining_date desc'

    employee_id = fields.Many2one('hr.employee', string='الموظف', required=True, tracking=True)
    company_id = fields.Many2one('res.company', string='الشركة', default=lambda self: self.env.company)
    actual_joining_date = fields.Date(string='تاريخ المباشرة الفعلي', required=True, default=fields.Date.context_today)
    contract_type = fields.Selection([
        ('INDEFINITE', 'عقد غير محدد المدة'),
        ('FIXED_TERM', 'عقد محدد المدة')
    ], string='نوع العقد', default='INDEFINITE', required=True)
    
    # تفاصيل الدوام وجدول العمل المرتبط بعقد وملف الموظف
    resource_calendar_id = fields.Many2one(
        'resource.calendar', 
        string='جدول ساعات العمل',
        default=lambda self: self.env.company.resource_calendar_id,
        help='جدول ساعات العمل المعتمد للموظف في نظام البصمة والأجور',
        required=True
    )
    work_hours_type = fields.Selection([
        ('STANDARD', 'دوام كامل قياسي (8 ساعات)'),
        ('FLEXIBLE', 'دوام مرن (Flexible Hours)'),
        ('PART_TIME', 'دوام جزئي (Part Time)'),
        ('SHIFT', 'نظام الشفتات والمناوبات (Rotational Shifts)'),
        ('CUSTOM', 'ساعات مخصصة (Custom Schedule)')
    ], string='نوع الدوام', default='STANDARD', required=True)
    
    daily_hours = fields.Float(string='الساعات اليومية', default=8.0)
    weekly_hours = fields.Float(string='الساعات الأسبوعية', default=48.0)
    custom_schedule_note = fields.Text(string='ملاحظات الدوام والساعات المخصصة')
    
    state = fields.Selection([
        ('draft', 'مسودة'),
        ('pending', 'بانتظار الاعتماد'),
        ('approved', 'معتمدة وفعالة')
    ], string='الحالة', default='pending', tracking=True)

    @api.onchange('employee_id')
    def _onchange_employee_id(self):
        if self.employee_id:
            if self.employee_id.resource_calendar_id:
                self.resource_calendar_id = self.employee_id.resource_calendar_id
            if self.employee_id.contract_id:
                self.contract_type = self.employee_id.contract_id.contract_type

    def action_approve_commencement(self):
        """اعتماد المباشرة وربط جدول العمل تلقائياً بملف الموظف وعقده"""
        for rec in self:
            rec.state = 'approved'
            # 1. تحديث ملف الموظف
            rec.employee_id.write({
                'active': True,
                'resource_calendar_id': rec.resource_calendar_id.id,
                'first_contract_date': rec.actual_joining_date,
            })
            # 2. تحديث عقد الموظف
            if rec.employee_id.contract_id:
                rec.employee_id.contract_id.write({
                    'resource_calendar_id': rec.resource_calendar_id.id,
                    'date_start': rec.actual_joining_date,
                })

    def write(self, vals):
        """السماح لمدير النظام (Sayed / User 2) بتعديل المباشرات المعتمدة ومزامنتها فورياً"""
        # السماح لمدير النظام بتجاوز قفل السجلات في حالة التشغيل
        if self.env.user.id == 2:
            res = super(HrCommencement, self).sudo().write(vals)
        else:
            res = super(HrCommencement, self).write(vals)
            
        for rec in self:
            if rec.state == 'approved':
                # مزامنة التعديلات مع ملف الموظف وعقده فوراً
                emp_vals = {}
                if 'resource_calendar_id' in vals:
                    emp_vals['resource_calendar_id'] = rec.resource_calendar_id.id
                if 'actual_joining_date' in vals:
                    emp_vals['first_contract_date'] = rec.actual_joining_date
                if emp_vals and rec.employee_id:
                    rec.employee_id.write(emp_vals)
                    
                if rec.employee_id.contract_id:
                    contract_vals = {}
                    if 'resource_calendar_id' in vals:
                        contract_vals['resource_calendar_id'] = rec.resource_calendar_id.id
                    if 'actual_joining_date' in vals:
                        contract_vals['date_start'] = rec.actual_joining_date
                    if contract_vals:
                        rec.employee_id.contract_id.write(contract_vals)
        return res`;

  return (
    <div className="p-6 bg-transparent min-h-[calc(100vh-3rem)] text-right" dir="rtl" id="commencement-app-root">
      
      {/* Header Bar (Odoo Enterprise Header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm" id="commencement-header-bar">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-[#714B67] text-white rounded-xl shadow-sm">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>مباشرة العمل (Employment Commencement)</span>
                  <span className="text-xs bg-[#714B67] text-white px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {filteredCommencements.length} نموذج
                  </span>
                </h1>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-700" />
                  <span>تعديل السجلات متاح لمدير النظام (Sayed / Super Admin)</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ربط وتعديل واعتماد مباشرة الموظف مع <strong className="text-[#714B67]">جدول العمل (Working Schedule)</strong>، نوع الدوام، وعقد العمل ونظام البصمة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsDevCodeModalOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 transition cursor-pointer"
            title="عرض كود Odoo View Inheritance و Python Model و HrVersion"
            id="btn-view-odoo-dev-code"
          >
            <Code2 className="w-4 h-4 text-purple-700" />
            <span>كود Odoo البرمجي (XML/Python)</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="bg-[#714B67] hover:bg-[#5f3e57] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-950/20 transition cursor-pointer"
            id="btn-create-commencement"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار نموذج مباشرة عمل جديد</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6" id="commencement-stats-grid">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">إجمالي النماذج</span>
            <span className="text-2xl font-black text-slate-900">{companyCommencements.length}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">سجلات المباشرة الموثقة</span>
          </div>
          <div className="p-3 bg-purple-50 text-[#714B67] rounded-xl"><FileText className="w-6 h-6" /></div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">معتمدة ومربوطة بالعقد</span>
            <span className="text-2xl font-black text-emerald-600">
              {companyCommencements.filter(c => c.status === 'APPROVED').length}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">مفعلة بجدول ساعات العمل</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">معلقة بانتظار الاعتماد</span>
            <span className="text-2xl font-black text-amber-600">
              {companyCommencements.filter(c => c.status === 'PENDING').length}
            </span>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">تحتاج توقيع الموارد البشرية</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock className="w-6 h-6" /></div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">جداول العمل المتاحة</span>
            <span className="text-2xl font-black text-indigo-600">
              {STANDARD_WORKING_SCHEDULES.length + shifts.length}
            </span>
            <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">جداول قياسية وشفتات مخصصة</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Timer className="w-6 h-6" /></div>
        </div>
      </div>

      {/* Commencements Table (Odoo Zebra Style) */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="commencement-table-card">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs text-slate-800">سجل نماذج مباشرة العمل وجداول الدوام</span>
            <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
              {filteredCommencements.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            تطبيق المادة القانونية وقواعد نظام أودو للموارد البشرية
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">الموظف / الرقم الوظيفي</th>
                <th className="p-3.5">تاريخ المباشرة الفعلي</th>
                <th className="p-3.5">جدول العمل (Working Schedule)</th>
                <th className="p-3.5">نوع الدوام</th>
                <th className="p-3.5">نوع العقد</th>
                <th className="p-3.5">القسم / الموقع</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات والطباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommencements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <FileSignature className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">لا توجد نماذج مباشرة عمل مسجلة حالياً</p>
                    <p className="text-[11px] text-slate-400 mt-1">اضغط على زر "إصدار نموذج مباشرة عمل جديد" لإعداد مباشرة موظف وربط جدول ساعات العمل</p>
                  </td>
                </tr>) : (
                filteredCommencements.map((comm, index) => {
                  const emp = employees.find(e => e.id === comm.employeeId);
                  const shift = shifts.find(s => s.id === comm.shiftId);
                  const schedPreset = STANDARD_WORKING_SCHEDULES.find(s => s.id === comm.resourceCalendarId);
                  const scheduleDisplayName = comm.workingSchedule || schedPreset?.shortName || shift?.name || 'الدوام الصباحي القياسي 8 ساعات';

                  return (
                    <tr key={comm.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-purple-50/30 transition`}>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={emp?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp?.fullNameAr || 'Emp')}&background=714B67&color=fff`} 
                            alt="" 
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs"
                          />
                          <div>
                            <div className="font-black text-slate-900">{emp?.fullNameAr || 'موظف غير محدد'}</div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <span className="font-bold text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                {emp?.employeeCode || 'EMP-000'}
                              </span>
                              <span>• {emp?.jobTitle || 'موظف'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-600" />
                          <span>{comm.actualJoiningDate}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-1 max-w-[240px]">
                          <div className="font-bold text-slate-800 text-[11px] truncate flex items-center gap-1" title={comm.workingSchedule || scheduleDisplayName}>
                            <Timer className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate">{scheduleDisplayName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                              {comm.dailyHours || 8}س يومياً
                            </span>
                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                              {comm.weeklyHours || 48}س أسبوعياً
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${
                          comm.workHoursType === 'STANDARD' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          comm.workHoursType === 'FLEXIBLE' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                          comm.workHoursType === 'PART_TIME' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          comm.workHoursType === 'SHIFT' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          <Sliders className="w-3 h-3" />
                          <span>
                            {comm.workHoursType === 'STANDARD' ? 'دوام كامل ثابت' :
                             comm.workHoursType === 'FLEXIBLE' ? 'دوام مرن' :
                             comm.workHoursType === 'PART_TIME' ? 'دوام جزئي' :
                             comm.workHoursType === 'SHIFT' ? 'مناوبات وشفتات' : 'ساعات مخصصة'}
                          </span>
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                          comm.contractType === 'INDEFINITE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          {comm.contractType === 'INDEFINITE' ? 'عقد غير محدد المدة' : 'عقد محدد المدة'}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600">
                        <div className="font-semibold text-slate-800">{emp?.department || 'الموارد البشرية'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{comm.location}</div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                          comm.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {comm.status === 'APPROVED' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Clock className="w-3.5 h-3.5 text-amber-700" />}
                          <span>{comm.status === 'APPROVED' ? 'معتمدة وفعالة' : 'معلقة بانتظار الاعتماد'}</span>
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {comm.status === 'PENDING' && (
                            <button
                              onClick={() => handleApprove(comm)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                              title="اعتماد المباشرة وتفعيل جدول العمل للموظف"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>اعتماد المباشرة</span>
                            </button>)}

                          <button
                            onClick={() => handleOpenEdit(comm)}
                            className="bg-purple-50 hover:bg-purple-100 text-[#714B67] hover:text-[#52354a] px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-purple-200 transition flex items-center gap-1 cursor-pointer"
                            title="تعديل نموذج المباشرة وساعات الدوام (متاح حتى في حالة التشغيل لمدير النظام Sayed)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>
                          {onDeleteCommencement && (
                            confirmDeleteId === comm.id ? (
                              <div className="flex items-center gap-1 bg-rose-100 p-1 rounded-lg border border-rose-300 animate-in fade-in">
                                <span className="text-[10px] text-rose-900 font-bold px-1">تأكيد الحذف؟</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteCommencement(comm.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer shadow-xs transition"
                                >
                                  نعم، احذف
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(null);
                                  }}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(comm.id)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                                title="حذف نموذج المباشرة"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            )
                          )}

                          <button
                            onClick={() => setSelectedCommForPrint(comm)}
                            className="bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                            title="طباعة نموذج المباشرة الرسمي"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#714B67]" />
                            <span>طباعة</span>
                          </button>

                          <button
                            onClick={() => setSelectedCommForView(comm)}
                            className="bg-slate-50 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            title="معاينة التفاصيل"
                          >
                            تفاصيل
                          </button>
                        </div>
                      </td>
                    </tr>);
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New/Edit Commencement Modal with Odoo "تفاصيل الدوام" & Working Schedule */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="new-commencement-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in duration-200 text-right" dir="rtl">
            <div className="bg-[#714B67] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5" />
                <h3 className="font-black text-sm">
                  {editingCommId ? 'تعديل نموذج مباشرة العمل وساعات الدوام' : 'نموذج مباشرة العمل الرسمية (Employment Commencement)'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingCommId && (
              <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 flex items-center gap-2 text-amber-900 text-xs">
                <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>صلاحية مدير النظام (Sayed):</strong> التعديل متاح ومفتوح لكافة الحقول وتتم مزامنة أي تغيير تلقائياً في ملف وعقد الموظف ونظام البصمة.
                </span>
              </div>)}

            <form onSubmit={handleSaveCommencementForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الموظف / المرشح المعين <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedEmpId || ''}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40"
                  required
                >
                  {companyEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullNameAr} ({emp.employeeCode} - {emp.jobTitle}) - الرقم المدني: {emp.civilId}
                    </option>))}
                </select>
              </div>

              {/* Joining Date and Contract Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تاريخ المباشرة الفعلي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={actualJoiningDate}
                    onChange={(e) => setActualJoiningDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نوع عقد العمل المعتمد <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={contractType || 'INDEFINITE'}
                    onChange={(e) => setContractType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40"
                  >
                    <option value="INDEFINITE">عقد غير محدد المدة (Indefinite Contract)</option>
                    <option value="FIXED_TERM">عقد محدد المدة (Fixed Term Contract)</option>
                  </select>
                </div>
              </div>

              {/* Odoo Section: تفاصيل الدوام وجدول العمل (Working Schedule) */}
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-4">
                <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                  <div className="flex items-center gap-2 text-[#714B67] font-black text-xs">
                    <Timer className="w-4 h-4" />
                    <span>تفاصيل الدوام وجدول العمل (Working Schedule & Hours)</span>
                  </div>
                  <span className="text-[10px] text-purple-700 font-mono bg-purple-100 px-2 py-0.5 rounded-full font-bold">
                    resource_calendar_id
                  </span>
                </div>

                {/* 1. Working Schedule Selection (resource_calendar_id) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    جدول ساعات العمل (Working Schedule) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={resourceCalendarId}
                    onChange={(e) => handleScheduleSelect(e.target.value)}
                    className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40 shadow-xs"
                    required
                  >
                    <optgroup label="جداول ساعات العمل القياسية (Odoo Resource Calendars)">
                      {STANDARD_WORKING_SCHEDULES.map(sched => (
                        <option key={sched.id} value={sched.id}>
                          {sched.name} [{sched.typeBadge}]
                        </option>))}
                    </optgroup>
                    {shifts.length > 0 && (
                      <optgroup label="شفتات الشركة المخصصة (Company Shift Profiles)">
                        {shifts.map(shift => (
                          <option key={shift.id} value={shift.id}>
                            شفت: {shift.name} ({shift.startTime} - {shift.endTime})
                          </option>))}
                      </optgroup>)}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    يرتبط هذا الجدول مباشرة بحسابات البصمة، ساعات العمل الإضافي، ومسير الرواتب.
                  </p>
                </div>

                {/* 2. Work Hours Type (Radio Widget widget="radio" as requested) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    نوع الدوام (Work Hours Type)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { type: 'STANDARD' as const, label: 'دوام كامل قياسي', desc: '8 ساعات يومياً (48س/أسبوعياً)' },
                      { type: 'FLEXIBLE' as const, label: 'دوام مرن', desc: 'ساعات حضور مرنة' },
                      { type: 'PART_TIME' as const, label: 'دوام جزئي', desc: '4 ساعات يومياً' },
                      { type: 'SHIFT' as const, label: 'مناوبات وشفتات', desc: 'شفتات دورية أو مقسمة' },
                      { type: 'CUSTOM' as const, label: 'ساعات مخصصة', desc: 'تحديد يدوي للساعات' },
                    ].map((item) => (
                      <label
                        key={item.type}
                        className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition ${
                          workHoursType === item.type 
                            ? 'bg-purple-100/90 border-[#714B67] text-purple-950 font-bold shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="work_hours_type"
                            value={item.type}
                            checked={workHoursType === item.type}
                            onChange={() => setWorkHoursType(item.type)}
                            className="text-[#714B67] focus:ring-[#714B67]"
                          />
                          <span className="text-xs">{item.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 pr-5 mt-0.5">{item.desc}</span>
                      </label>))}
                  </div>
                </div>

                {/* 3. Daily and Weekly Hours Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-purple-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      الساعات اليومية المقررة
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={dailyHours}
                        onChange={(e) => setDailyHours(Number(e.target.value) || 8)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                      />
                      <span className="text-[10px] text-slate-500 font-bold">ساعة</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      الساعات الأسبوعية
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="70"
                        value={weeklyHours}
                        onChange={(e) => setWeeklyHours(Number(e.target.value) || 48)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                      />
                      <span className="text-[10px] text-slate-500 font-bold">ساعة</span>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      نظام الأيام الأسبوعية
                    </label>
                    <div className="text-[11px] font-bold text-purple-900 bg-purple-50 px-2 py-1.5 rounded-lg border border-purple-200 text-center">
                      السبت - الخميس (6 أيام)
                    </div>
                  </div>
                </div>

                {workHoursType === 'CUSTOM' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تفاصيل الساعات المخصصة والاتفاق
                    </label>
                    <input
                      type="text"
                      value={customScheduleNote}
                      onChange={(e) => setCustomScheduleNote(e.target.value)}
                      placeholder="مثال: دوام 6 ساعات يومياً من الساعة 10:00 صباحاً حتى 04:00 مساءً"
                      className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40"
                    />
                  </div>)}

              </div>

              {/* Location & Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  موقع العمل / الفرع المباشر فيه <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40"
                  placeholder="المقر الرئيسي - مدينة الكويت"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات إضافية واعتمادات التسليم
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]/40 h-16 resize-none"
                  placeholder="ملاحظات حول تسليم العهد، تدريب الموظف، وأي اشتراطات خاصة..."
                />
              </div>

              {/* Automation Engine Note */}
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <div className="font-black flex items-center gap-1.5 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>محرك الأتمتة المدمج عند [اعتماد المباشرة]:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-emerald-800 pr-1 text-[10px]">
                  <li>تغيير حالة الموظف فوراً إلى (نشط - Active) وتحديث تاريخ بدء الخدمة.</li>
                  <li>ربط جدول ساعات العمل (<code className="font-mono bg-emerald-100 px-1 rounded">{workingSchedule}</code>) بملف وعقد الموظف مباشرة.</li>
                  <li>تفعيل استقبال وتسجيل بصمات الحضور والانصراف بناءً على الدوام المحدد.</li>
                  <li>إنشاء مجلد الأرشيف السحابي تلقائياً في Supabase Storage للموظف.</li>
                </ul>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-[#714B67] hover:bg-[#5f3e57] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCommId ? 'حفظ وتحديث نموذج المباشرة والدوام' : 'حفظ وإصدار نموذج المباشرة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>)}

      {/* Developer Odoo Code Viewer Modal (XML & Python) */}
      {isDevCodeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="dev-code-modal">
          <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-700 my-8 animate-in fade-in zoom-in duration-200 text-right" dir="rtl">
            <div className="bg-slate-800 p-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">
                  كود التطوير لنظام Odoo (XML View Inherit & Python Model)
                </h3>
              </div>
              <button 
                onClick={() => setIsDevCodeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-left font-mono text-xs" dir="ltr">
              
              {/* XML Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-right" dir="rtl">
                  <span className="font-bold text-purple-400 text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>1. تعديل واجهة مباشرة العمل لإضافة ساعات العمل (XML Form View Inherit):</span>
                  </span>
                  <button
                    onClick={() => handleCopyOdooCode(odooXmlCode)}
                    className="bg-purple-950/70 hover:bg-purple-900 text-purple-300 px-3 py-1 rounded-lg text-[11px] font-bold border border-purple-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ XML</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-emerald-400 overflow-x-auto text-xs leading-relaxed">
                  {odooXmlCode}
                </pre>
              </div>

              {/* Python Model Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-right" dir="rtl">
                  <span className="font-bold text-indigo-400 text-xs flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>2. كود بايثون للنموذج والربط مع الموظف والعقد (Python Model & Logic):</span>
                  </span>
                  <button
                    onClick={() => handleCopyOdooCode(odooPythonCode)}
                    className="bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 px-3 py-1 rounded-lg text-[11px] font-bold border border-indigo-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ Python</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sky-300 overflow-x-auto text-xs leading-relaxed">
                  {odooPythonCode}
                </pre>
              </div>

            </div>

            <div className="bg-slate-800 p-4 border-t border-slate-700 flex justify-between items-center text-right" dir="rtl">
              <span className="text-[11px] text-slate-400">
                💡 جاهز للتضمين المباشر في وحدة Odoo HR المخصصة الخاصة بك.
              </span>
              <button
                onClick={() => setIsDevCodeModalOpen(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>)}

      {/* Official Print/Preview Modal */}
      {selectedCommForPrint && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="print-commencement-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8 text-right animate-in fade-in zoom-in duration-200" dir="rtl">
            <div className="bg-[#714B67] text-white p-4 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                <h3 className="font-black text-sm">معاينة وطباعة محضر مباشرة العمل الرسمي</h3>
              </div>
              <button 
                onClick={() => setSelectedCommForPrint(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Document Sheet (Odoo Official Letterhead) */}
            <div className="p-8 space-y-6 text-slate-900 bg-white" id="printable-commencement-document">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{activeCompany?.nameAr || 'شركة Odoo HR الكويت'}</h2>
                  <p className="text-xs text-slate-600 mt-0.5">إدارة الموارد البشرية والشؤون الإدارية</p>
                  <p className="text-[10px] text-slate-500 font-mono">السجل التجاري: {activeCompany?.commercialRegNo || '12345678'}</p>
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800">التاريخ: {selectedCommForPrint.actualJoiningDate}</div>
                  <div className="text-[10px] text-slate-500 font-mono">المرجع: COMM-{selectedCommForPrint.id.slice(-6)}</div>
                  <span className="inline-block mt-1 bg-[#714B67] text-white text-[10px] px-2 py-0.5 rounded font-bold">
                    إقرار مباشرة عمل رسمي
                  </span>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center py-2">
                <h3 className="text-base font-black text-slate-900 underline underline-offset-8 decoration-2 decoration-[#714B67]">
                  إقرار واستلام مباشرة عمل الموظف
                </h3>
              </div>

              {/* Employee Details Box */}
              {(() => {
                const emp = employees.find(e => e.id === selectedCommForPrint.employeeId);
                const schedPreset = STANDARD_WORKING_SCHEDULES.find(s => s.id === selectedCommForPrint.resourceCalendarId);
                const schedName = selectedCommForPrint.workingSchedule || schedPreset?.name || 'الدوام الصباحي القياسي 8 ساعات';

                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div><strong>اسم الموظف:</strong> {emp?.fullNameAr}</div>
                        <div><strong>الرقم الوظيفي:</strong> <span className="font-mono">{emp?.employeeCode}</span></div>
                        <div><strong>الرقم المدني الكويتي:</strong> <span className="font-mono">{emp?.civilId}</span></div>
                        <div><strong>الجنسية:</strong> {emp?.nationality || 'كويتي'}</div>
                        <div><strong>المسمى الوظيفي:</strong> {emp?.jobTitle}</div>
                        <div><strong>القسم / الإدارة:</strong> {emp?.department}</div>
                        <div><strong>تاريخ المباشرة الفعلي:</strong> <span className="font-mono font-bold">{selectedCommForPrint.actualJoiningDate}</span></div>
                        <div><strong>نوع العقد:</strong> {selectedCommForPrint.contractType === 'INDEFINITE' ? 'عقد غير محدد المدة' : 'عقد محدد المدة'}</div>
                      </div>
                    </div>

                    {/* Working Schedule Group (تفاصيل الدوام) */}
                    <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 text-xs space-y-2">
                      <div className="font-bold text-[#714B67] text-xs border-b border-purple-200 pb-1 flex items-center gap-1.5">
                        <Timer className="w-4 h-4" />
                        <span>تفاصيل جدول ساعات العمل المقررة (Working Schedule):</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="col-span-2">
                          <strong>جدول العمل المعتمد:</strong> {schedName}
                        </div>
                        <div>
                          <strong>نوع الدوام:</strong> {
                            selectedCommForPrint.workHoursType === 'STANDARD' ? 'دوام كامل قياسي' :
                            selectedCommForPrint.workHoursType === 'FLEXIBLE' ? 'دوام مرن' :
                            selectedCommForPrint.workHoursType === 'PART_TIME' ? 'دوام جزئي' :
                            selectedCommForPrint.workHoursType === 'SHIFT' ? 'مناوبات وشفتات' : 'ساعات مخصصة'
                          }
                        </div>
                        <div>
                          <strong>الساعات اليومية:</strong> {selectedCommForPrint.dailyHours || 8} ساعات عمل يومياً
                        </div>
                        <div>
                          <strong>الساعات الأسبوعية:</strong> {selectedCommForPrint.weeklyHours || 48} ساعة أسبوعياً
                        </div>
                        <div>
                          <strong>موقع العمل:</strong> {selectedCommForPrint.location}
                        </div>
                      </div>
                    </div>

                    {/* Legal Declaration */}
                    <div className="text-[11px] leading-relaxed text-slate-700 border p-3 rounded-xl border-slate-200 bg-slate-50/50">
                      <p>
                        يقر الطرفان بأن الموظف المذكور أعلاه قد باشر مهام عمله رسمياً في التاريخ الموضح وفق جدول ساعات العمل المعتمد والشروط المنصوص عليها في عقد العمل المبرم وأحكام قانون العمل الكويتي رقم 6 لسنة 2010 والقرارات الوزارية المنفذة له.
                      </p>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                      <div>
                        <div className="font-bold mb-8">توقيع الموظف (المقر بالمباشرة)</div>
                        <div className="border-t border-slate-400 pt-2 font-mono text-[11px] text-slate-500">
                          {emp?.fullNameAr}
                        </div>
                      </div>
                      <div>
                        <div className="font-bold mb-8">مدير الموارد البشرية / المفوض بالتوقيع</div>
                        <div className="border-t border-slate-400 pt-2 font-mono text-[11px] text-slate-500">
                          ختم واعتماد الشركة الرسمي
                        </div>
                      </div>
                    </div>
                  </div>);
              })()}
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end gap-2 print:hidden">
              <button
                onClick={() => setSelectedCommForPrint(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="bg-[#714B67] hover:bg-[#5f3e57] text-white px-5 py-2 rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المستند الآن</span>
              </button>
            </div>
          </div>
        </div>)}

      {/* Details / View Modal */}
      {selectedCommForView && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="view-commencement-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8 text-right animate-in fade-in zoom-in duration-200" dir="rtl">
            <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-purple-300" />
                <span>بطاقة تفاصيل مباشرة العمل</span>
              </h3>
              <button 
                onClick={() => setSelectedCommForView(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {(() => {
                const emp = employees.find(e => e.id === selectedCommForView.employeeId);
                const schedPreset = STANDARD_WORKING_SCHEDULES.find(s => s.id === selectedCommForView.resourceCalendarId);
                const schedName = selectedCommForView.workingSchedule || schedPreset?.name || 'الدوام الصباحي القياسي 8 ساعات';

                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <img 
                        src={emp?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp?.fullNameAr || 'Emp')}&background=714B67&color=fff`} 
                        alt="" 
                        className="w-12 h-12 rounded-xl object-cover border border-slate-300"
                      />
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">{emp?.fullNameAr}</h4>
                        <p className="text-[11px] text-slate-500">{emp?.jobTitle} • {emp?.department}</p>
                        <p className="text-[10px] font-mono text-purple-700">{emp?.civilId}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">تاريخ المباشرة</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedCommForView.actualJoiningDate}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">نوع العقد</span>
                        <span className="font-bold text-slate-800">
                          {selectedCommForView.contractType === 'INDEFINITE' ? 'غير محدد المدة' : 'محدد المدة'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200 col-span-2">
                        <span className="text-[10px] text-purple-700 block font-bold">جدول ساعات العمل (resource_calendar_id)</span>
                        <span className="font-bold text-purple-950">{schedName}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">الساعات اليومية</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedCommForView.dailyHours || 8} ساعة/يومياً</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">الساعات الأسبوعية</span>
                        <span className="font-bold text-slate-800 font-mono">{selectedCommForView.weeklyHours || 48} ساعة/أسبوعياً</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">الموقع المعتمد</span>
                      <span className="font-bold text-slate-800">{selectedCommForView.location}</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">أرشيف Supabase Vault</span>
                      <span className="font-mono text-[10px] text-purple-700 break-all">{selectedCommForView.storageFolderUrl}</span>
                    </div>
                  </div>);
              })()}
            </div>

            <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedCommForView(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>)}

    </div>);
};
