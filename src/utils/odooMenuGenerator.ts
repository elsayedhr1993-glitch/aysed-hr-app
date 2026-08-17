export interface OdooMenuItemConfig {
  id: string;
  name: string;
  parent?: string;
  action?: string;
  webIcon?: string;
  sequence?: number;
}

export function generateOdooMenusXML(items: OdooMenuItemConfig[]): string {
  let xml = '<?xml version="1.0" encoding="utf-8"?>\n<odoo>\n';

  // Sort items by sequence if provided
  const sortedItems = [...items].sort((a, b) => (a.sequence || 10) - (b.sequence || 10));

  for (const item of sortedItems) {
    xml += `    <menuitem id="${item.id}"\n`;
    xml += `              name="${item.name}"\n`;
    if (item.parent) {
      xml += `              parent="${item.parent}"\n`;
    }
    if (item.webIcon) {
      xml += `              web_icon="${item.webIcon}"\n`;
    }
    if (item.action) {
      xml += `              action="${item.action}"\n`;
    }
    xml += `              sequence="${item.sequence || 10}"/>\n\n`;
  }

  xml += '</odoo>';
  return xml;
}

export const DEFAULT_ODOO_MENU_CONFIG: OdooMenuItemConfig[] = [
  {
    id: 'hr_system_root',
    name: 'نظام السيد HR',
    webIcon: 'aysed_hr,static/description/icon.png',
    sequence: 1
  },
  {
    id: 'menu_core_hr_category',
    name: 'شؤون الموظفين',
    parent: 'hr_system_root',
    sequence: 10
  },
  {
    id: 'menu_operations_category',
    name: 'العمليات اليومية والدوام',
    parent: 'hr_system_root',
    sequence: 20
  },
  {
    id: 'menu_finance_category',
    name: 'المالية والرواتب',
    parent: 'hr_system_root',
    sequence: 30
  },
  {
    id: 'menu_configuration_category',
    name: 'الإعدادات والتهيئة',
    parent: 'hr_system_root',
    sequence: 100
  },
  {
    id: 'menu_employees',
    name: 'الموظفون',
    parent: 'menu_core_hr_category',
    action: 'action_employees',
    sequence: 1
  },
  {
    id: 'menu_employee_contracts',
    name: 'عقود الموظفين',
    parent: 'menu_core_hr_category',
    action: 'action_employee_contracts',
    sequence: 2
  },
  {
    id: 'menu_attendance',
    name: 'الحضور والدوام',
    parent: 'menu_operations_category',
    action: 'action_attendance',
    sequence: 1
  },
  {
    id: 'menu_leave_management',
    name: 'إدارة الإجازات',
    parent: 'menu_operations_category',
    action: 'action_leave_management',
    sequence: 2
  },
  {
    id: 'menu_payroll',
    name: 'الرواتب وحماية الأجور',
    parent: 'menu_finance_category',
    action: 'action_payroll',
    sequence: 1
  },
  {
    id: 'menu_hr_settings',
    name: 'إعدادات النظام',
    parent: 'menu_configuration_category',
    action: 'action_hr_settings',
    sequence: 1
  }
];
