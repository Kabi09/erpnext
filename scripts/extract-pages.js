function extractPages(definitions, repositories) {
  const declared = definitions.map(item => ({
    ...item,
    route: item.definition.route || item.definition.page_name || (item.kind === 'Page' ? item.name : null),
    routeConfidence: item.definition.route ? 'declared' : 'desk-identifier',
  }))
  const portal = new Map()
  for (const repository of repositories) {
    for (const source of repository.files) {
      const match = /\/www\/(.+?)\.(py|md|html)$/.exec(source)
      if (!match || /(?:^|\/)(?:_?tests?\/|test_|__init__\.)/.test(match[1] + '.')) continue
      const route = '/' + match[1].replace(/(^|\/)index$/, '').replace(/\/$/, '')
      const key = repository.app + ':' + route
      if (!portal.has(key)) portal.set(key, {
        id: key, app: repository.app, kind: 'Portal File Route', route,
        routeConfidence: 'inferred', sources: [], scope: 'shipped',
      })
      portal.get(key).sources.push(source)
    }
  }

  const hookRoutes = repositories.flatMap(repository => repository.evidence.flatMap(file =>
    file.signals.filter(signal => signal.kind === 'route-rule').map(signal => ({
      ...signal, app: repository.app, source: file.source,
    })),
  ))
  return { definitions: declared, portal: [...portal.values()], hookRoutes,
    navigation: definitions.filter(item => item.kind === 'Web Form').map(item => item.id) }
}

module.exports = { extractPages }
if (require.main === module) require('./extract-metadata').printGroup('pages')
