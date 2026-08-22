# -*- coding: utf-8 -*-
from odoo import models, fields, api

class ResCompanyAysed(models.Model):
    _inherit = 'res.company'

    @api.model
    def search_read(self, domain=None, fields=None, offset=0, limit=None, order=None):
        # تقييد استرجاع البيانات: المشترك يرى منشأته الخاصة فقط
        if self.env.user.id != 2 and not self.env.user.has_group('base.group_system'):
            domain = [('id', '=', self.env.company.id)]
        return super(ResCompanyAysed, self).search_read(
            domain=domain, fields=fields, offset=offset, limit=limit, order=order
        )
