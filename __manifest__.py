# -*- coding: utf-8 -*-
{
    'name': 'Aysed S HR 2026 - Ultra Dense Enterprise Theme & SaaS Security',
    'version': '17.0.1.0.0',
    'category': 'Themes/Backend',
    'summary': 'Compact & High-Density UI with Multi-Tenant SaaS Security for Aysed HRMS Kuwait',
    'depends': ['web', 'base', 'hr', 'hr_holidays', 'hr_payroll'],
    'data': [
        'data/ir_cron_data.xml',
        'data/hr_leave_type_data.xml',
        'views/hr_leave_allocation_views.xml',
        'views/res_company_views.xml',
        'odoo_menu.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'aysed_ui_theme/static/src/scss/aysed_enterprise_dense.scss',
            'static/src/css/aysed_tenant_cleanup.css',
        ],
    },
    'installable': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
