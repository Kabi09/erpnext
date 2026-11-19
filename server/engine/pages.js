/**
 * Custom Page Registry (Phase 5 - Batch 5E)
 *
 * Classifies all 35 reference custom page definitions, distinguishing between
 * implemented administrative pages and pending specialized services.
 */

export function buildPageRegistry(metadata) {
  const pagesCatalog = metadata.catalogs.pages?.definitions || []

  // Catalog of all custom pages
  const pages = pagesCatalog.map(p => {
    let status = 'Pending Phase 6'
    let category = 'Desk Page'
    let requiredCapabilities = 'Specialized client-side component'

    if (p.name === 'coverage' || p.name === 'system-coverage') {
      status = 'Implemented'
      category = 'Administration'
      requiredCapabilities = 'System Manager Role'
    } else if (/pos|point-of-sale/i.test(p.name)) {
      status = 'Requires POS Terminal Engine'
      requiredCapabilities = 'Offline storage, receipt printing, payment gateway'
    } else if (/bom-comparison|production-plan|visual-plant|shop-floor/i.test(p.name)) {
      status = 'Requires Manufacturing Visualizer'
      requiredCapabilities = 'Gantt scheduler, routing sequence, work order dispatch'
    } else if (/permission-manager/i.test(p.name)) {
      status = 'Requires RBAC Matrix Tool'
      requiredCapabilities = 'Dynamic permission grant matrix'
    } else if (/background_jobs/i.test(p.name)) {
      status = 'Requires Background Job Queue'
      requiredCapabilities = 'BullMQ / Redis worker monitor'
    }

    return {
      name: p.name,
      title: p.definition?.title || p.name,
      module: p.module,
      app: p.app,
      category,
      status,
      requiredCapabilities,
      isImplemented: status === 'Implemented',
    }
  })

  // Add the CRYO Implementation Coverage Dashboard as an implemented page
  if (!pages.some(p => p.name === 'coverage')) {
    pages.unshift({
      name: 'coverage',
      title: 'Implementation Coverage Matrix',
      module: 'Setup',
      app: 'erpnext',
      category: 'Administration',
      status: 'Implemented',
      requiredCapabilities: 'System Manager Role',
      isImplemented: true,
    })
  }

  return {
    pages,
    getPage(name) {
      return pages.find(p => p.name === name) || null
    },
  }
}
