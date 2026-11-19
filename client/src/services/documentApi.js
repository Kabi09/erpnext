import { api } from './api'

function parseVersion(response) {
  const etag = response.headers?.etag || response.headers?.ETag
  if (etag) {
    const match = etag.match(/^"(\d+)"$/)
    if (match) return Number(match[1])
  }
  return response.data?.data?.version ?? null
}

export async function getModules() {
  const { data } = await api.get('/metadata/modules')
  return data.data
}

export async function getDocTypes() {
  const { data } = await api.get('/metadata/doctypes')
  return data.data
}

export async function getDocTypeMetadata(doctype) {
  const { data } = await api.get('/metadata/doctypes/' + encodeURIComponent(doctype))
  return data.data
}

export async function listDocuments(doctype, params = {}) {
  const cleanParams = {}
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val
    }
  }
  const { data } = await api.get('/documents/' + encodeURIComponent(doctype), { params: cleanParams })
  return data
}

export async function getDocument(doctype, id) {
  const response = await api.get('/documents/' + encodeURIComponent(doctype) + '/' + encodeURIComponent(id))
  return {
    data: response.data.data,
    meta: response.data.meta,
    version: parseVersion(response),
  }
}

export async function createDocument(doctype, fields) {
  const response = await api.post('/documents/' + encodeURIComponent(doctype), { fields })
  return {
    data: response.data.data,
    meta: response.data.meta,
    version: parseVersion(response),
  }
}

export async function updateDocument(doctype, id, fields, version) {
  const headers = {}
  if (version !== undefined && version !== null) {
    headers['If-Match'] = '"' + version + '"'
  }
  const response = await api.patch(
    '/documents/' + encodeURIComponent(doctype) + '/' + encodeURIComponent(id),
    { fields },
    { headers }
  )
  return {
    data: response.data.data,
    meta: response.data.meta,
    version: parseVersion(response),
  }
}

export async function deleteDocument(doctype, id, version) {
  const headers = {}
  if (version !== undefined && version !== null) {
    headers['If-Match'] = '"' + version + '"'
  }
  await api.delete('/documents/' + encodeURIComponent(doctype) + '/' + encodeURIComponent(id), { headers })
}

export async function getDocumentOptions(doctype, params = {}) {
  const cleanParams = {}
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = val
    }
  }
  const { data } = await api.get('/documents/' + encodeURIComponent(doctype) + '/options', { params: cleanParams })
  return data
}

export async function getDocumentRelations(doctype, id) {
  const { data } = await api.get('/documents/' + encodeURIComponent(doctype) + '/' + encodeURIComponent(id) + '/relations')
  return data.data
}
