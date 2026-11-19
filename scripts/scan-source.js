const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const js = /\.(?:[cm]?[jt]sx?|vue)$/i
const code = /\.(?:py|[cm]?[jt]sx?|vue|sql|html|jinja2?|ya?ml|toml)$/i
const fixtureTypes = new Map([
  ['Workflow', 'workflows'], ['Workflow State', 'workflows'], ['Workflow Action Master', 'workflows'],
  ['Role', 'permissions'], ['Custom DocPerm', 'permissions'], ['Custom Permission Type', 'permissions'],
  ['Print Format', 'configuration'], ['Custom Field', 'configuration'], ['Property Setter', 'configuration'],
  ['Notification', 'configuration'], ['Desktop Icon', 'navigation'], ['Workspace Sidebar', 'navigation'],
  ['Sidebar', 'navigation'], ['Web Form', 'pages'], ['Website Route Meta', 'navigation'],
  ['Dashboard Chart Source', 'dashboards'], ['Dashboard Chart', 'dashboards'], ['Number Card', 'dashboards'],
  ['Dashboard', 'dashboards'], ['Report', 'reports'], ['Page', 'pages'], ['Workspace', 'workspaces'],
  ['Web Page', 'pages'], ['Web Template', 'configuration'], ['Website Theme', 'configuration'],
  ['Module Onboarding', 'navigation'], ['Onboarding Step', 'navigation'], ['Insights Workbook', 'configuration'],
  ['Permission Type', 'permissions'], ['DocPerm', 'permissions'], ['Client Script', 'configuration'],
  ['Server Script', 'configuration'], ['Assignment Rule', 'configuration'], ['Auto Repeat', 'configuration'],
  ['Webhook', 'configuration'], ['Financial Report Template', 'configuration'],
])
const definitionDirs = new Map([
  ['doctype', 'DocType'], ['workspace', 'Workspace'], ['page', 'Page'], ['report', 'Report'],
  ['dashboard', 'Dashboard'], ['dashboard_chart', 'Dashboard Chart'], ['number_card', 'Number Card'],
  ['dashboard_chart_source', 'Dashboard Chart Source'], ['role', 'Role'], ['workflow', 'Workflow'],
  ['sidebar', 'Sidebar'], ['workspace_sidebar', 'Workspace Sidebar'], ['desktop_icon', 'Desktop Icon'],
  ['web_form', 'Web Form'], ['web_template', 'Web Template'], ['web_page', 'Web Page'],
  ['website_theme', 'Website Theme'], ['notification', 'Notification'], ['print_format', 'Print Format'],
  ['module_onboarding', 'Module Onboarding'], ['onboarding_step', 'Onboarding Step'],
  ['insights_workbook', 'Insights Workbook'], ['financial_report_template', 'Financial Report Template'],
  ['permission_type', 'Permission Type'],
])
const hooksOfInterest = /^(?:app_.*|required_apps|fixtures|.*doctype.*|.*permission.*|.*whitelist.*|scheduler_events|doc_events|.*website.*|.*portal.*|.*notification.*|.*install.*|.*migrate.*|.*boot.*|workflow_methods|.*request.*|.*include.*|.*override.*|.*extend.*)$/
const lifecycle = /^(?:before_|after_|on_|validate|set_missing_values|autoname|run_|get_permission|has_permission|has_website_permission|submit$|cancel$|db_insert$|db_update$)/
const review = /^(?:validate|calculate|compute|check|make|update|repost|reserve|unreserve|post|reverse|process|create|get_status|set_status|apply|assign|approve|reject|enqueue|sync)(?:_|$)/
const integrations = /^(?:hrms|payments|webshop|insights|lending|wiki|erpnext|frappe)(?:\.|$)/i

function scanRepository(app) {
  const location = path.join(root, 'reference', app)
  const git = (...args) => execFileSync('git', ['--no-optional-locks', '-C', location, ...args], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  }).trimEnd()
  const branch = git('branch', '--show-current') || null
  const commit = git('rev-parse', 'HEAD')
  if (path.resolve(git('rev-parse', '--show-toplevel')) !== location) {
    throw new Error('Expected a separate reference repository at ' + location)
  }
  const dirty = Boolean(git('status', '--porcelain', '--untracked-files=normal'))
  const files = [...new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard')
    .split('\0').filter(Boolean))].sort()
  const source = relative => ['reference', app, relative].join('/')
  const modules = []
  const definitions = []
  const evidence = []
  const manifest = []
  const errors = []
  const jsonOther = []
  const extensions = {}
  const companion = new Map()
  let jsonRead = 0
  let documents = 0

  const moduleFile = app + '/modules.txt'
  const read = file => fs.readFileSync(path.join(location, file), 'utf8').replace(/^\uFEFF/, '')
  for (const [line, value] of read(moduleFile).split(/\r?\n/).entries()) {
    const name = value.trim()
    if (!name || name.startsWith('#')) continue
    const slug = name.toLowerCase().replace(/\W+/g, '_')
    const directory = app + '/' + slug
    const prefix = directory + '/'
    const subareas = [...new Set(files.filter(file => file.startsWith(prefix) && file.slice(prefix.length).includes('/'))
      .map(file => file.slice(prefix.length).split('/')[0]))].sort()
    modules.push({ id: app + ':' + name, app, name, slug, source: source(moduleFile), line: line + 1,
      directory: source(directory), subareas, status: 'metadata-only' })
  }

  for (const file of files) {
    const extension = path.posix.extname(file).toLowerCase() || '(none)'
    extensions[extension] = (extensions[extension] || 0) + 1
    const base = path.posix.basename(file, extension)
    const parts = file.split('/')
    try {
      if (!fs.lstatSync(path.join(location, file)).isFile()) {
        errors.push({ source: source(file), reason: 'Not a regular file. Entry was indexed without following it.' })
        continue
      }
      if (extension === '.json') {
        const data = JSON.parse(read(file))
        jsonRead++
        const dirType = parts.at(-2) === base ? definitionDirs.get(parts.at(-3)) : undefined
        const records = Array.isArray(data) ? data : [data]
        let recognized = 0
        for (const [index, record] of records.entries()) {
          const format = record?.doctype || dirType
          const customExport = !format && parts.at(-2) === 'custom' && record?.doctype === undefined &&
            (Array.isArray(record?.custom_fields) || Array.isArray(record?.property_setters))
          const group = customExport ? 'configuration' : format === 'DocType' ? 'doctypes' : fixtureTypes.get(format)
          if (!group) {
            if (dirType) throw new Error('Unexpected definition type ' + format + ' in ' + dirType + ' directory')
            continue
          }
          const name = record.name || record.title || record.label || record.page_name || record.report_name ||
            (customExport ? base : undefined)
          if (!name && !dirType) continue
          if (!name) throw new Error('A shipped ' + format + ' definition lacks a name')
          const module = record.module_name || record.module || modules.find(item => item.slug === parts[1])?.name || null
          const sample = parts.some(part => /^(?:_?tests?|test_fixtures?|fixtures_test|json_types|harness|samples?|examples?)$/.test(part)) ||
            /^(?:test_|sample_)/.test(base) || (parts.includes('fixtures') && Boolean(record.__unsaved || record.__islocal))
          definitions.push({
            id: source(file) + '#' + index, app, module, kind: format || 'Custom Export', name, source: source(file),
            index: Array.isArray(data) ? index : null, scope: sample ? 'sample' : 'shipped', group, definition: record,
          })
          recognized++
        }
        if (recognized) documents += recognized
        if (records.length !== recognized || !recognized) {
          jsonOther.push({ source: source(file), matchedRecords: recognized, totalRecords: records.length })
        }
      }
      if (code.test(file)) {
        const body = read(file)
        const hits = sourceSignals(file, body)
        if (hits.length) evidence.push({ source: source(file), signals: hits })
        const directory = path.posix.dirname(file)
        if (!companion.has(directory)) companion.set(directory, [])
        companion.get(directory).push(source(file))
      }
      if (/^(?:pyproject\.toml|package\.json)$/.test(parts.at(-1))) {
        manifest.push(file.endsWith('.json')
          ? nodeManifest(source(file), JSON.parse(read(file)))
          : pythonManifest(source(file), read(file)))
      }
    } catch (error) {
      errors.push({ source: source(file), reason: error.message })
    }
  }

  for (const item of definitions) {
    const directory = path.posix.dirname(item.source).split('/').slice(2).join('/')
    item.companions = companion.get(directory) || []
  }

  return {
    app, branch, commit, dirty, modules, definitions, evidence, manifest, errors, jsonOther,
    files: files.map(source), extensions, jsonRead, documents,
  }
}

function sourceSignals(file, body) {
  const signals = []
  const python = file.endsWith('.py')
  const frontend = js.test(file)
  const testFile = /(?:^|\/)(?:test[s]?\/|__tests__\/|test_)|[._](?:test|spec)\./.test(file)
  const isHooks = file.endsWith('/hooks.py')
  const isPortal = /(?:^|\/)www\//.test(file)
  const isReport = /(?:^|\/)report\//.test(file)
  if (testFile) signals.push({ line: 1, kind: 'test-file' })
  if (isPortal) signals.push({ line: 1, kind: 'portal-source' })
  if (/(?:^|\/)dashboard\//.test(file)) signals.push({ line: 1, kind: 'dashboard-source' })
  if (/_list\.[cm]?js$/.test(file)) signals.push({ line: 1, kind: 'list-controller' })
  if (/_dashboard\.py$/.test(file)) signals.push({ line: 1, kind: 'doctype-dashboard-controller' })
  if (/\/(?:config|fixtures)\//.test(file) || /(?:^|\/)(?:hooks\.py|patches\.txt|site_config\.|common_site_config\.)/.test(file)) {
    signals.push({ line: 1, kind: 'configuration-source' })
  }
  const lines = body.split(/\r?\n/)
  let hook = null
  let routeRule = null
  let whitelist = false
  for (const [index, line] of lines.entries()) {
    const add = (kind, name, value) => signals.push({ line: index + 1, kind, name, value })
    if (python) {
      const assignment = /^(?<name>\w+)\s*=(?!=)/.exec(line)?.groups.name
      if (isHooks && assignment) {
        hook = hooksOfInterest.test(assignment) ? assignment : null
        if (hook) add('hook', hook)
      }
      if (hook && !line.trimStart().startsWith('#')) {
        for (const match of line.matchAll(/["']((?:frappe|erpnext|hrms|payments|webshop|insights|lending)(?:\.[\w]+)+)["']/g)) {
          add('hook-target', hook, match[1])
        }
        if (['website_route_rules', 'standard_portal_menu_items', 'portal_menu_items', 'default_portal_home'].includes(hook)) {
          for (const match of line.matchAll(/["'](\/[^"' ]*?|\w[\w/-]*)["']/g)) add('portal-hook-value', hook, match[1])
        }
        if (hook === 'website_route_rules') {
          for (const match of line.matchAll(/["'](from_route|to_route)["']\s*:\s*["']([^"']+)["']/g)) {
            if (match[1] === 'from_route') routeRule = { line: index + 1, name: match[2] }
            if (match[1] === 'to_route' && routeRule) {
              signals.push({ kind: 'route-rule', ...routeRule, value: match[2] })
              routeRule = null
            }
          }
        }
      }
      if (/^\s*@(?:frappe\.)?whitelist\b/.test(line)) whitelist = true
      if (/^\s*Rule\(/.test(line) && /^frappe\/api\//.test(file)) {
        const apiRoute = /^\s*Rule\(\s*["']([^"']+)["']/.exec(line + '\n' + (lines[index + 1] || ''))
        if (apiRoute) add('api-route', apiRoute[1])
      }
      const method = /^\s*(?:async )?def (\w+)\s*\(/.exec(line)?.[1]
      if (method) {
        if (whitelist) add('whitelisted-method', method)
        whitelist = false
        if (testFile && method.startsWith('test_')) add('test-case', method)
        if (lifecycle.test(method)) add('lifecycle-method', method)
        else if (!testFile && review.test(method)) add('business-method', method)
        if (isPortal && /^get_context$|^get_list$|^get_web_pages_with_dynamic_routes$/.test(method)) add('portal-handler', method)
      } else if (whitelist && /^\s*(?:async )?(?:class|return|pass|import|from)\b/.test(line)) {
        whitelist = false
      }
      const importStatement = /^\s*(?:from\s+([\w.]+)\s+import\b|import\s+([\w., ]+))/.exec(line)
      if (importStatement) {
        const names = importStatement[1] ? [importStatement[1]] : importStatement[2].split(',').map(item => item.trim().split(/\s+/)[0])
        for (const name of names.filter(Boolean)) add(integrations.test(name) ? 'app-import' : 'python-import', name)
      }
      for (const match of line.matchAll(/["']((?:hrms|payments|webshop|insights|lending)(?:\.[\w-]+)*)["']/g)) {
        if (/\b(?:get_installed_apps|get_attr|import_module|installed_apps|app_name|app)\b/.test(line) || match[1].includes('.')) {
          add('external-app-reference', match[1])
        }
      }
      if (/\b(?:frappe\.)?(?:enqueue|enqueue_doc)\s*\(/.test(line)) add('background-call')
      if (/\b(?:frappe\.)?(?:throw|msgprint|safe_eval)\s*\(|^\s*(?:raise|assert)\b/.test(line)) add('validation-signal')
      if (/\.(?:submit|cancel|db_set|set_status)\s*\(/.test(line)) add('document-action-call')
    }
    if (frontend) {
      for (const match of line.matchAll(/(?:from\s*|import\s*(?:\(\s*)?|require\(\s*)["']([^"']+)["']/g)) add('frontend-import', match[1])
      for (const match of line.matchAll(/\bfrappe\.(ui\.form\.on|listview_settings|query_reports|set_route|call|xcall|require|views\.|router\.|pages\[)|\.(add_custom_button|add_action_item|add_menu_item|set_query|toggle_display|set_df_property|make_route)\s*\(/g)) {
        add('client-signal', match[1] || match[2])
      }
      const method = /\bmethod:\s*["']([\w.]+)["']|\b(?:frappe\.)?(?:xcall|call)\(\s*["']([\w.]+)["']/.exec(line)
      if (method) add('client-method-target', method[1] || method[2])
      const route = /\bfrappe\.set_route\(\s*["']([^"']+)["']/.exec(line)
      if (route) add('client-route-candidate', route[1])
      if (isReport) {
        const filterBlock = /(?:^|[^\w])["']?filters["']?\s*:\s*\[/.test(line)
        if (filterBlock) add('report-filter-block')
        const field = /(?:^|[^\w])["']?fieldname["']?\s*:\s*["']([\w.]+)["']/.exec(line)
        if (field) add('report-field-candidate', field[1])
      }
    }
    if (file.endsWith('.sql') && /\b(?:select|insert|alter|create|update)\b/i.test(line)) add('sql-statement')
  }
  return signals
}

function nodeManifest(source, json) {
  return { source, ecosystem: 'npm', name: json.name, engines: json.engines,
    dependencies: json.dependencies, devDependencies: json.devDependencies,
    peerDependencies: json.peerDependencies, optionalDependencies: json.optionalDependencies }
}

function pythonManifest(source, body) {
  let section = ''
  let inside = false
  const groups = {}
  for (const line of body.split(/\r?\n/)) {
    const heading = /^\[([^\]]+)\]/.exec(line)
    if (heading) {
      section = heading[1]
      inside = false
    }
    if (/^(?:dependencies|requires)\s*=\s*\[/.test(line.trim())) inside = true
    if (inside || section === 'tool.bench.frappe-dependencies') {
      const values = [...line.matchAll(/(?:^|[=,[\s])"([^"]+)"/g)].map(match => match[1])
      if (values.length) (groups[section] ||= []).push(...values.map(value => {
        const app = /^\s*([\w-]+)\s*=/.exec(line)?.[1]
        return section === 'tool.bench.frappe-dependencies' && app ? app + ' ' + value : value
      }))
    }
    if (/^[^\[]*\]/.test(line)) inside = false
  }
  return { source, ecosystem: 'python', groups }
}

function scanCli(app) {
  const repository = scanRepository(app)
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(repository, null, 2))
  } else {
    console.log(JSON.stringify({ app, branch: repository.branch, commit: repository.commit, dirty: repository.dirty,
      files: repository.files.length, parsedJson: repository.jsonRead, definitions: repository.documents,
      modules: repository.modules.length, evidenceFiles: repository.evidence.length, errors: repository.errors }, null, 2))
  }
  if (repository.errors.length) process.exitCode = 1
}

module.exports = { root, scanRepository, scanCli }
