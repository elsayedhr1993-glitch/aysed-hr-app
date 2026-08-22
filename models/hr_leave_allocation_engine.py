# -*- coding: utf-8 -*-
"""
==============================================================================
Odoo Enterprise Style: Unified Leave Accrual & Allocation Engine (Kuwait Law)
==============================================================================
"""

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
from datetime import date
from dateutil.relativedelta import relativedelta


# 1. Leave Type Configuration
class HrLeaveType(models.Model):
    _inherit = 'hr.leave.type'

    is_annual = fields.Boolean(string="Is Annual Leave / إجازة سنوية", default=False)
    is_unpaid = fields.Boolean(string="Is Unpaid Leave / إجازة بدون راتب", default=False)


# 2. Leave Allocation Engine (Opening Balance & FIFO Tracking)
class HrLeaveAllocationCustom(models.Model):
    _name = 'hr.leave.allocation.custom'
    _description = 'Odoo Leave Allocation Record (FIFO Enabled)'
    _order = 'expiration_date asc, effective_date asc, id asc'

    name = fields.Char(string="Description / البيان", required=True)
    employee_id = fields.Many2one('hr.employee', string="Employee / الموظف", required=True, index=True)
    holiday_status_id = fields.Many2one('hr.leave.type', string="Leave Type / نوع الإجازة", required=True)
    allocation_type = fields.Selection([
        ('regular', 'Opening Balance / رصيد افتتاحي مرحل'),
        ('accrual', 'Monthly Accrual / استحقاق شهري آلي (2.5 يوم)')
    ], string="Allocation Type / نوع التخصيص", default='regular', required=True)

    number_of_days = fields.Float(string="Allocated Days / الأيام المخصصة", required=True, default=0.0)
    consumed_days = fields.Float(string="Consumed Days / الأيام المستهلكة", default=0.0, readonly=True)
    remaining_days = fields.Float(string="Remaining / المتبقي", compute="_compute_remaining_days", store=True)

    accrual_year = fields.Integer(string="Year Reference / السنة", default=lambda self: date.today().year)
    effective_date = fields.Date(string="Effective Date / تاريخ السريان", default=fields.Date.context_today)
    expiration_date = fields.Date(string="Valid Until / تاريخ الانتهاء")
    state = fields.Selection([
        ('draft', 'Draft / مسودة'),
        ('approved', 'Approved / معتمد'),
        ('expired', 'Expired / منتهي')
    ], default='approved', string="Status / الحالة")

    @api.depends('number_of_days', 'consumed_days')
    def _compute_remaining_days(self):
        for record in self:
            record.remaining_days = max(0.0, record.number_of_days - record.consumed_days)


# 3. Employee Leave Balance & Accrual Scheduler Logic
class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    last_accrual_date = fields.Date(string="Last Accrual Run Date / تاريخ آخر استحقاق آلي")
    
    leave_opening_balance = fields.Float(string="Opening Balance / الرصيد الافتتاحي", compute="_compute_leave_metrics")
    leave_accrued_current_year = fields.Float(string="Accrued (Current Year) / المكتسب للعام الحالي", compute="_compute_leave_metrics")
    leave_taken_paid = fields.Float(string="Taken (Paid) / المستهلك المدفوع", compute="_compute_leave_metrics")
    leave_taken_unpaid = fields.Float(string="Taken (Unpaid) / المستهلك غير المدفوع", compute="_compute_leave_metrics")
    leave_net_balance = fields.Float(string="Net Balance / الرصيد الصافي المتاح", compute="_compute_leave_metrics")

    def _compute_leave_metrics(self):
        current_year = date.today().year
        for emp in self:
            allocations = self.env['hr.leave.allocation.custom'].search([
                ('employee_id', '=', emp.id),
                ('state', '=', 'approved'),
                ('holiday_status_id.is_annual', '=', True)
            ])

            opening = sum(allocations.filtered(
                lambda a: a.allocation_type == 'regular' or a.accrual_year < current_year
            ).mapped('number_of_days'))

            accrued = sum(allocations.filtered(
                lambda a: a.allocation_type == 'accrual' and a.accrual_year == current_year
            ).mapped('number_of_days'))

            consumed = sum(allocations.mapped('consumed_days'))

            unpaid_leaves = self.env['hr.leave'].search([
                ('employee_id', '=', emp.id),
                ('state', '=', 'validate'),
                ('holiday_status_id.is_unpaid', '=', True)
            ])

            emp.leave_opening_balance = opening
            emp.leave_accrued_current_year = accrued
            emp.leave_taken_paid = consumed
            emp.leave_taken_unpaid = sum(unpaid_leaves.mapped('number_of_days'))
            emp.leave_net_balance = max(0.0, (opening + accrued) - consumed)

    @api.model
    def cron_monthly_leave_accrual(self):
        today = date.today()
        current_month_start = today.replace(day=1)
        annual_type = self.env['hr.leave.type'].search([('is_annual', '=', True)], limit=1)

        if not annual_type:
            return False

        active_employees = self.search([('active', '=', True)])
        processed_count = 0

        for emp in active_employees:
            if not emp.last_accrual_date or emp.last_accrual_date < current_month_start:
                self.env['hr.leave.allocation.custom'].create({
                    'name': f"استحقاق شهري {today.strftime('%m-%Y')} (2.5 يوم) - {emp.name}",
                    'employee_id': emp.id,
                    'holiday_status_id': annual_type.id,
                    'allocation_type': 'accrual',
                    'number_of_days': 2.5,
                    'accrual_year': today.year,
                    'effective_date': today,
                    'state': 'approved'
                })
                emp.last_accrual_date = today
                processed_count += 1

        return processed_count


# 4. Leave Request Execution (FIFO Consumption & Overdraft Handling)
class HrLeave(models.Model):
    _inherit = 'hr.leave'

    def action_validate(self):
        annual_type = self.env['hr.leave.type'].search([('is_annual', '=', True)], limit=1)
        unpaid_type = self.env['hr.leave.type'].search([('is_unpaid', '=', True)], limit=1)

        for leave in self:
            if leave.holiday_status_id == annual_type:
                allocations = self.env['hr.leave.allocation.custom'].search([
                    ('employee_id', '=', leave.employee_id.id),
                    ('holiday_status_id', '=', annual_type.id),
                    ('state', '=', 'approved'),
                    ('remaining_days', '>', 0)
                ], order='expiration_date asc, effective_date asc, id asc')

                total_available = sum(allocations.mapped('remaining_days'))
                requested_days = leave.number_of_days

                if requested_days > total_available:
                    paid_days = total_available
                    excess_unpaid_days = requested_days - total_available

                    if paid_days > 0:
                        self._consume_allocations_fifo(allocations, paid_days)
                        leave.number_of_days = paid_days

                    if excess_unpaid_days > 0 and unpaid_type:
                        self.env['hr.leave'].create({
                            'name': f"تجاوز رصيد غير مدفوع: {leave.name or ''}",
                            'employee_id': leave.employee_id.id,
                            'holiday_status_id': unpaid_type.id,
                            'request_date_from': leave.request_date_from,
                            'request_date_to': leave.request_date_to,
                            'number_of_days': excess_unpaid_days,
                            'state': 'validate'
                        })
                else:
                    self._consume_allocations_fifo(allocations, requested_days)

        return super(HrLeave, self).action_validate()

    def _consume_allocations_fifo(self, allocations, days_to_deduct):
        remaining_to_deduct = days_to_deduct
        for alloc in allocations:
            if remaining_to_deduct <= 0:
                break
            can_take = min(alloc.remaining_days, remaining_to_deduct)
            alloc.consumed_days += can_take
            remaining_to_deduct -= can_take
