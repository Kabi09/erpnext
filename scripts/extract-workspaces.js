function parseEmbedded(value, item, field, errors, expected) {
  if (value == null || value === '') return null
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (expected && !expected(parsed)) throw new Error('Unexpected decoded value')
    return parsed
  } catch (error) {
    errors.push({ source: item.source, record: item.name, field, reason: error.message })
    return null
  }
}

function extractWorkspaces(definitions, errors) {
  return definitions.map(item => ({
    ...item,
    blocks: parseEmbedded(item.definition.content, item, 'content', errors, Array.isArray),
    cards: (item.definition.links || []).filter(link => link.type === 'Card Break'),
    navigation: (item.definition.links || []).filter(link => link.link_to),
  }))
}

module.exports = { parseEmbedded, extractWorkspaces }
if (require.main === module) require('./extract-metadata').printGroup('workspaces')
