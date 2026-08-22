/**
 * Aysed HR 2026 Odoo Multi-Company Backend Engine & XML View Definitions
 * متوافق مع معمارية أودو القياسية وإدارة الشركات المتعددة (Multi-Company & SaaS Tenants)
 */

export interface OdooCompanyRecord {
  id: number | string;
  name: string;
  nameAr: string;
  nameEn: string;
  email: string;
  phone: string;
  commercialRegNo: string;
  logoUrl?: string;
}

/**
 * Python Method: enable_aysed_multi_company
 */
export function enableAysedMultiCompanyBackend(userId: number = 2, allCompanyIds: (number | string)[] = [1, 2, 3]): { company_ids: [number, number, number[]][]; company_id: number | string } {
  console.log(`[Odoo Backend] Executing enable_aysed_multi_company for user ID: ${userId}`);
  return {
    company_ids: [[6, 0, allCompanyIds.map(id => Number(id))]],
    company_id: 1
  };
}

/**
 * Python Method: action_aysed_login_to_tenant
 * def action_aysed_login_to_tenant(self, tenant_company_id):
 *     user_sayed = self.env['res.users'].browse(2)
 *     target_company = self.env['res.company'].browse(tenant_company_id)
 *     if target_company.exists():
 *         user_sayed.write({
 *             'company_ids': [(4, target_company.id)],
 *             'company_id': target_company.id
 *         })
 *         return {'type': 'ir.actions.client', 'tag': 'reload', 'params': {'menu_id': self.env.ref('hr.menu_hr_root').id}}
 */
export function actionAysedLoginToTenant(tenantCompanyId: number | string): { company_id: number | string; success: boolean } {
  console.log(`[Odoo Backend] action_aysed_login_to_tenant invoked for tenant: ${tenantCompanyId}`);
  return {
    company_id: tenantCompanyId,
    success: true
  };
}

/**
 * حساب رصيد الإجازات التراكمي طبقاً للمادة 70 من قانون العمل الكويتي (2.5 يوم شهرياً) بدءاً من تاريخ التعيين أو يناير 2026
 */
export function calculateAysedLeaveBalance(joinDateStr?: string): number {
  const startDate = joinDateStr ? new Date(joinDateStr) : new Date('2026-01-01');
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const months = diffDays / 30.4375;
  const accrued = Math.max(0, months * 2.5);
  return Number(accrued.toFixed(1));
}

/**
 * Odoo Kanban XML View Definition for Tenants / Companies
 * id: view_aysed_tenants_kanban
 * model: res.company
 */
export const AYSED_TENANTS_KANBAN_XML = `
<record id="view_aysed_tenants_kanban" model="ir.ui.view">
    <field name="name">aysed.tenants.kanban</field>
    <field name="model">res.company</field>
    <field name="arch" type="xml">
        <kanban class="o_kanban_mobile">
            <field name="name"/>
            <field name="email"/>
            <field name="phone"/>
            <templates>
                <t t-name="kanban-box">
                    <div class="oe_kanban_global_click shadow-sm border-0 p-3">
                        <div class="o_kanban_image">
                            <img t-att-src="kanban_image('res.company', 'logo', record.id.raw_value)" alt="Logo"/>
                        </div>
                        <div class="oe_kanban_details">
                            <strong class="o_kanban_record_title"><field name="name"/></strong>
                            <div class="text-muted small">هاتف: <field name="phone"/></div>
                            <!-- زر التبديل المباشر لإدارة المنشأة -->
                            <button name="action_aysed_login_to_tenant" 
                                    string="إدارة الشركة" 
                                    type="object" 
                                    class="btn btn-primary btn-sm mt-2"
                                    data-type="object"/>
                        </div>
                    </div>
                </t>
            </templates>
        </kanban>
    </field>
</record>
`;
