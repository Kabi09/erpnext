const knownAbsentApps = ['hrms', 'payments', 'webshop', 'insights', 'lending']

function extractDependencies(repositories, doctypes, relationships, moduleEdges, navigationEdges) {
  const known = new Set(doctypes.map(item => item.name))
  const unresolvedApps = new Map()
  const localDependencies = new Map()
  const packageObservations = new Map()
  for (const repo of repositories) {
    for (const file of repo.evidence) {
      for (const signal of file.signals) {
        const value = signal.value || signal.name || ''
        const target = value.split('.')[0]
        if (knownAbsentApps.includes(target) &&
          ['app-import', 'external-app-reference', 'hook-target'].includes(signal.kind)) {
          const entries = unresolvedApps.get(target) || []
          entries.push({ app: repo.app, source: file.source, line: signal.line, kind: signal.kind, value })
          unresolvedApps.set(target, entries)
        }
        if (['app-import', 'hook-target'].includes(signal.kind) &&
          repositories.some(other => other.app === target) && target !== repo.app) {
          const key = repo.app + '->' + target
          localDependencies.set(key, (localDependencies.get(key) || 0) + 1)
        }
        if (['python-import', 'frontend-import'].includes(signal.kind) &&
          !value.startsWith('.') && !value.startsWith('/') && !value.startsWith('@/')) {
          const name = signal.kind === 'python-import' ? target :
            value.startsWith('@') ? value.split('/').slice(0, 2).join('/') : value.split('/')[0]
          const key = [repo.app, signal.kind, name].join(':')
          if (!packageObservations.has(key)) {
            packageObservations.set(key, { app: repo.app, kind: signal.kind, name,
              example: { source: file.source, line: signal.line }, occurrences: 0 })
          }
          packageObservations.get(key).occurrences++
        }
      }
    }
  }
  const flags = new Map(doctypes.map(item => [item.name, item.flags]))
  const unresolvedRelationships = relationships.filter(edge =>
    ['link', 'child-table', 'table-multiselect'].includes(edge.kind) && !known.has(edge.target))
  const inconsistentChildTargets = relationships.filter(edge =>
    ['child-table', 'table-multiselect'].includes(edge.kind) && known.has(edge.target) && !flags.get(edge.target)?.child)
  return {
    manifests: repositories.flatMap(repo => repo.manifest),
    localAppEdges: [...localDependencies].map(([edge, observations]) => ({ edge, observations })),
    moduleEdges,
    unresolvedApps: [...unresolvedApps].map(([app, evidence]) => ({ app, evidence,
      status: 'absent-from-reference-checkouts', requirement: 'conditional-or-integration-reference' })),
    unresolvedRelationships,
    inconsistentChildTargets,
    unresolvedNavigation: navigationEdges.filter(edge => edge.status === 'unresolved'),
    observedImportRoots: [...packageObservations.values()],
    notes: [
      'Manifest dependencies describe the upstream environment. They are not target dependencies.',
      'Import observations can include standard libraries, package namespaces, aliases and conditional imports.',
      'Unresolved apps are distinct, named app references from a bounded detector. Relationship and navigation findings are reported separately.',
    ],
  }
}

module.exports = { extractDependencies }
if (require.main === module) require('./extract-metadata').printGroup('dependencies')
