/**
 * Report Registry and Execution Engine (Phase 5 - Batch 5E)
 *
 * Provides a structured catalog of all 208 reference reports, classifying
 * their implementation status and executing verified aggregation queries
 * against active MongoDB collections.
 */

import { HttpError } from '../utils/http.js'

export function buildReportRegistry(metadata, registry) {
  const reportsCatalog = metadata.catalogs.reports || []

  // Known reports that can execute real database queries against registered collections
  const implementedReports = new Map([
    ['Item Summary', {
      name: 'Item Summary',
      module: 'Stock',
      refDocType: 'Item',
      reportType: 'Query Report',
      description: 'Comprehensive item master listing with group, UOM, and brand details.',
      async execute({ models, company }) {
        const itemModel = models.get('Item')
        if (!itemModel) return { columns: [], rows: [] }

        const rows = await itemModel.find({ company }).sort({ 'fields.item_code': 1 }).lean()
        const columns = [
          { field: 'item_code', label: 'Item Code', type: 'Data', width: 180 },
          { field: 'item_name', label: 'Item Name', type: 'Data', width: 220 },
          { field: 'item_group', label: 'Item Group', type: 'Link', width: 160 },
          { field: 'stock_uom', label: 'Stock UOM', type: 'Link', width: 120 },
          { field: 'brand', label: 'Brand', type: 'Link', width: 140 },
          { field: 'is_sales_item', label: 'Is Sales Item', type: 'Check', width: 120 },
          { field: 'disabled', label: 'Disabled', type: 'Check', width: 100 },
        ]
        const data = rows.map(r => ({
          id: String(r._id),
          item_code: r.fields?.item_code || r.name,
          item_name: r.fields?.item_name || '',
          item_group: r.fields?.item_group || '',
          stock_uom: r.fields?.stock_uom || '',
          brand: r.fields?.brand || '',
          is_sales_item: r.fields?.is_sales_item ? 'Yes' : 'No',
          disabled: r.fields?.disabled ? 'Yes' : 'No',
        }))
        return { columns, rows: data, totalCount: data.length, status: 'Completed' }
      },
    }],

    ['Customer Summary', {
      name: 'Customer Summary',
      module: 'Selling',
      refDocType: 'Customer',
      reportType: 'Query Report',
      description: 'Customer master directory categorized by type, group, and territory.',
      async execute({ models, company }) {
        const customerModel = models.get('Customer')
        if (!customerModel) return { columns: [], rows: [] }

        const rows = await customerModel.find({ company }).sort({ 'fields.customer_name': 1 }).lean()
        const columns = [
          { field: 'customer_name', label: 'Customer Name', type: 'Data', width: 220 },
          { field: 'customer_type', label: 'Customer Type', type: 'Select', width: 140 },
          { field: 'customer_group', label: 'Customer Group', type: 'Link', width: 160 },
          { field: 'territory', label: 'Territory', type: 'Link', width: 160 },
          { field: 'default_currency', label: 'Currency', type: 'Link', width: 120 },
        ]
        const data = rows.map(r => ({
          id: String(r._id),
          customer_name: r.fields?.customer_name || r.name,
          customer_type: r.fields?.customer_type || 'Company',
          customer_group: r.fields?.customer_group || '',
          territory: r.fields?.territory || '',
          default_currency: r.fields?.default_currency || '',
        }))
        return { columns, rows: data, totalCount: data.length, status: 'Completed' }
      },
    }],

    ['Supplier Summary', {
      name: 'Supplier Summary',
      module: 'Buying',
      refDocType: 'Supplier',
      reportType: 'Query Report',
      description: 'Supplier directory organized by supplier group and country.',
      async execute({ models, company }) {
        const supplierModel = models.get('Supplier')
        if (!supplierModel) return { columns: [], rows: [] }

        const rows = await supplierModel.find({ company }).sort({ 'fields.supplier_name': 1 }).lean()
        const columns = [
          { field: 'supplier_name', label: 'Supplier Name', type: 'Data', width: 220 },
          { field: 'supplier_type', label: 'Supplier Type', type: 'Select', width: 140 },
          { field: 'supplier_group', label: 'Supplier Group', type: 'Link', width: 160 },
          { field: 'country', label: 'Country', type: 'Link', width: 140 },
          { field: 'default_currency', label: 'Currency', type: 'Link', width: 120 },
        ]
        const data = rows.map(r => ({
          id: String(r._id),
          supplier_name: r.fields?.supplier_name || r.name,
          supplier_type: r.fields?.supplier_type || 'Company',
          supplier_group: r.fields?.supplier_group || '',
          country: r.fields?.country || '',
          default_currency: r.fields?.default_currency || '',
        }))
        return { columns, rows: data, totalCount: data.length, status: 'Completed' }
      },
    }],

    ['Quality Inspection Summary', {
      name: 'Quality Inspection Summary',
      module: 'Quality Management',
      refDocType: 'Quality Inspection Parameter',
      reportType: 'Query Report',
      description: 'Quality inspection parameters and associated groups.',
      async execute({ models, company }) {
        const paramModel = models.get('Quality Inspection Parameter')
        if (!paramModel) return { columns: [], rows: [] }

        const rows = await paramModel.find({ company }).sort({ 'fields.parameter': 1 }).lean()
        const columns = [
          { field: 'parameter', label: 'Parameter', type: 'Data', width: 200 },
          { field: 'parameter_group', label: 'Parameter Group', type: 'Link', width: 200 },
          { field: 'description', label: 'Description', type: 'Text', width: 300 },
        ]
        const data = rows.map(r => ({
          id: String(r._id),
          parameter: r.fields?.parameter || r.name,
          parameter_group: r.fields?.parameter_group || '',
          description: r.fields?.description || '',
        }))
        return { columns, rows: data, totalCount: data.length, status: 'Completed' }
      },
    }],
  ])

  // Catalog all 208 reports
  const allReports = reportsCatalog.map(r => {
    const isImplemented = implementedReports.has(r.name)
    let status = 'Pending Phase 6'
    let requiredService = ''

    if (isImplemented) {
      status = 'Implemented'
    } else if (/general.ledger|balance.sheet|profit.and.loss|trial.balance|cash.flow/i.test(r.name)) {
      status = 'Requires General Ledger Service'
      requiredService = 'Phase 6 Financial Posting Engine'
    } else if (/stock.balance|stock.ledger|stock.analytics|inventory/i.test(r.name)) {
      status = 'Requires Stock Ledger Service'
      requiredService = 'Phase 6 Stock Ledger Valuation Service'
    } else if (/accounts.receivable|accounts.payable|billing/i.test(r.name)) {
      status = 'Requires AR/AP Subledger Service'
      requiredService = 'Phase 6 Payment Reconciliation Engine'
    } else if (/production|bom|work.order|operation/i.test(r.name)) {
      status = 'Requires Manufacturing Engine'
      requiredService = 'Phase 6 Production Posting Service'
    }

    return {
      name: r.name,
      label: r.definition?.report_name || r.name,
      module: r.module,
      app: r.app,
      reportType: r.reportType || r.definition?.report_type || 'Script Report',
      refDocType: r.referenceDocType || r.definition?.ref_doctype || '',
      status,
      requiredService,
      isImplemented,
    }
  })

  // Ensure all implemented handlers are present in the catalog
  for (const [name, impl] of implementedReports) {
    if (!allReports.some(r => r.name === name)) {
      allReports.unshift({
        name: impl.name,
        label: impl.name,
        module: impl.module,
        app: 'erpnext',
        reportType: impl.reportType || 'Query Report',
        refDocType: impl.refDocType || '',
        status: 'Implemented',
        requiredService: '',
        isImplemented: true,
      })
    }
  }

  async function runReport(name, { models, company, filters = {} }) {
    const handler = implementedReports.get(name)
    if (handler) {
      return handler.execute({ models, company, filters })
    }

    const reportDef = allReports.find(r => r.name === name)
    if (!reportDef) {
      throw new HttpError(404, 'REPORT_NOT_FOUND', `Report '${name}' was not found in the catalog.`)
    }

    return {
      name: reportDef.name,
      module: reportDef.module,
      refDocType: reportDef.refDocType,
      status: reportDef.status,
      requiredService: reportDef.requiredService || 'Transactional posting engine',
      columns: [
        { field: 'name', label: 'Document', type: 'Data', width: 200 },
        { field: 'status', label: 'Implementation Status', type: 'Data', width: 250 },
        { field: 'service', label: 'Required Domain Service', type: 'Data', width: 300 },
      ],
      rows: [
        {
          id: 'placeholder_1',
          name: reportDef.name,
          status: `${reportDef.status} (Scheduled for Phase 6)`,
          service: reportDef.requiredService || 'Phase 6 Domain Posting Engine',
        },
      ],
      totalCount: 0,
      isPending: true,
    }
  }

  return {
    reports: allReports,
    runReport,
  }
}
