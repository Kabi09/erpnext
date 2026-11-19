export const actions = ['read', 'create', 'update', 'delete']

// Reviewed overlays are independent of the generated reference catalog.
export const policies = [
  // Quality masters (existing verified)
  { name: 'Quality Inspection Parameter Group', status: 'Verified', resource: 'inspection-group', fields: ['group_name'] },
  { name: 'Quality Inspection Parameter', status: 'Verified', resource: 'inspection-parameter',
    fields: ['parameter', 'description', 'parameter_group'], fieldResource: { description: 'inspection-description' } },
  { name: 'Quality Feedback Template', status: 'Verified', resource: 'feedback-template', reviewedController: 'Unique parameter per template', fields: ['template', 'parameters'],
    children: { parameters: { fields: ['parameter'], uniqueBy: 'parameter', maxRows: 100 } } },

  // Base Common Masters
  { name: 'Country', scope: 'global', status: 'CRUD Enabled', resource: 'country',
    reviewedController: 'Standard country master and code validation',
    fields: ['country_name', 'code'] },
  { name: 'Currency', scope: 'global', status: 'CRUD Enabled', resource: 'currency',
    reviewedController: 'Standard currency master and fraction',
    fields: ['currency_name', 'symbol', 'fraction'] },
  { name: 'UOM', scope: 'company', status: 'CRUD Enabled', resource: 'uom',
    reviewedController: 'Standard unit of measure and whole number constraint',
    fields: ['uom_name', 'must_be_whole_number'] },
  { name: 'Brand', scope: 'company', status: 'CRUD Enabled', resource: 'brand',
    reviewedController: 'Brand master and description',
    fields: ['brand', 'description'] },
  { name: 'Item Attribute', scope: 'company', status: 'CRUD Enabled', resource: 'item-attribute',
    reviewedController: 'Item attribute specification',
    fields: ['attribute_name'] },
  { name: 'Workstation Type', scope: 'company', status: 'CRUD Enabled', resource: 'workstation-type',
    reviewedController: 'Workstation type classification and description',
    fields: ['workstation_type', 'description'] },
  { name: 'Designation', scope: 'company', status: 'CRUD Enabled', resource: 'designation',
    reviewedController: 'Employee and user designation master',
    fields: ['designation_name', 'description'] },
  { name: 'Industry Type', scope: 'company', status: 'CRUD Enabled', resource: 'industry-type',
    reviewedController: 'Industry classification master',
    fields: ['industry'] },
  { name: 'Market Segment', scope: 'company', status: 'CRUD Enabled', resource: 'market-segment',
    reviewedController: 'Market segment master',
    fields: ['market_segment'] },
  { name: 'Terms and Conditions', scope: 'company', status: 'CRUD Enabled', resource: 'terms-and-conditions',
    reviewedController: 'Standard business terms and conditions',
    fields: ['title', 'terms'] },
  { name: 'Price List', scope: 'company', status: 'CRUD Enabled', resource: 'price-list',
    reviewedController: 'Selling and buying price list with currency',
    fields: ['price_list_name', 'currency', 'buying', 'selling', 'enabled'] },

  // Tree Masters (Batch 5D)
  { name: 'Territory', scope: 'company', status: 'CRUD Enabled', resource: 'territory', tree: true,
    reviewedController: 'Territory tree hierarchy and parent validation',
    fields: ['territory_name', 'parent_territory', 'is_group'] },
  { name: 'Customer Group', scope: 'company', status: 'CRUD Enabled', resource: 'customer-group', tree: true,
    reviewedController: 'Customer group tree hierarchy and parent validation',
    fields: ['customer_group_name', 'parent_customer_group', 'is_group'] },
  { name: 'Supplier Group', scope: 'company', status: 'CRUD Enabled', resource: 'supplier-group', tree: true,
    reviewedController: 'Supplier group tree hierarchy and parent validation',
    fields: ['supplier_group_name', 'parent_supplier_group', 'is_group'] },
  { name: 'Item Group', scope: 'company', status: 'CRUD Enabled', resource: 'item-group', tree: true,
    reviewedController: 'Item group tree hierarchy and parent validation',
    fields: ['item_group_name', 'parent_item_group', 'is_group'] },
  { name: 'Sales Person', scope: 'company', status: 'CRUD Enabled', resource: 'sales-person', tree: true,
    reviewedController: 'Sales person organizational tree hierarchy',
    fields: ['sales_person_name', 'parent_sales_person', 'is_group', 'enabled'] },

  // Core Domain Masters
  { name: 'Item', scope: 'company', status: 'CRUD Enabled', resource: 'item',
    reviewedController: 'Item code, group, stock UOM, and inventory flags',
    fields: ['item_code', 'item_name', 'item_group', 'stock_uom', 'brand', 'description', 'disabled', 'is_sales_item'] },
  { name: 'Customer', scope: 'company', status: 'CRUD Enabled', resource: 'customer',
    reviewedController: 'Customer master, customer type, group, and currency',
    naming: { kind: 'field', field: 'customer_name' },
    fields: ['customer_name', 'customer_type', 'customer_group', 'territory', 'default_currency'] },
  { name: 'Supplier', scope: 'company', status: 'CRUD Enabled', resource: 'supplier',
    reviewedController: 'Supplier master, supplier type, group, and currency',
    naming: { kind: 'field', field: 'supplier_name' },
    fields: ['supplier_name', 'supplier_type', 'supplier_group', 'country', 'default_currency'] },
].map(policy => ({ scope: 'company', ...policy }))

export async function seedDocumentGrants(models, role, session) {
  const grants = policies.flatMap(policy => actions.map(action => ({ resource: policy.resource, action })))
  grants.push(...['read', 'update'].map(action => ({ resource: 'inspection-description', action })))
  const ids = []
  for (const grant of grants) {
    const row = await models.Permission.findOneAndUpdate(grant, { $setOnInsert: grant },
      { upsert: true, returnDocument: 'after', session })
    ids.push(row._id)
  }
  await models.Role.updateOne({ _id: role._id }, { $addToSet: { permissions: { $each: ids } } }, { session })
}
