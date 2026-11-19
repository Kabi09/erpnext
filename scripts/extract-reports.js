const { parseEmbedded } = require('./extract-workspaces')

function extractReports(definitions, repositories) {
  const bySource = new Map(repositories.flatMap(repo => repo.evidence).map(item => [item.source, item.signals]))
  return definitions.map(item => ({
    ...item,
    reportType: item.definition.report_type || null,
    referenceDocType: item.definition.ref_doctype || null,
    filters: item.definition.filters || [],
    columns: item.definition.columns || [],
    clientCandidates: item.companions.flatMap(source => (bySource.get(source) || [])
      .filter(signal => signal.kind === 'report-filter-block' || signal.kind === 'report-field-candidate')
      .map(signal => ({ source, ...signal }))),
    execution: item.companions.filter(file => !/\/(?:__init__|test_[^/]+)\.py$/.test(file)),
  }))
}

function extractDashboards(definitions, repositories, errors) {
  return {
    definitions: definitions.map(item => ({
      ...item,
      decodedFilters: Object.fromEntries(['filters_json', 'dynamic_filters_json'].filter(field => field in item.definition)
        .map(field => [field, parseEmbedded(item.definition[field], item, field, errors)])),
    })),
    doctypeControllers: repositories.flatMap(repository => repository.evidence
      .filter(file => file.signals.some(signal => signal.kind === 'doctype-dashboard-controller'))
      .map(file => ({ app: repository.app, source: file.source }))),
    dashboardSources: repositories.flatMap(repository => repository.evidence
      .filter(file => file.signals.some(signal => signal.kind === 'dashboard-source'))
      .map(file => ({ app: repository.app, source: file.source }))),
  }
}

module.exports = { extractReports, extractDashboards }
if (require.main === module) require('./extract-metadata').printGroup('reports')
