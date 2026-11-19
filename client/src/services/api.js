import axios from 'axios'

const options = {
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  timeout: 12000,
}
const sessionApi = axios.create({ ...options, headers: { 'X-CRYO-Request': '1' } })
export const api = axios.create(options)
if (typeof window !== 'undefined') {
  window.__CRYO_API__ = api
}
let accessToken = null
let activeCompanyId = null
let refreshPending
const expiryListeners = new Set()
const companyListeners = new Set()

const withSessionLock = task => navigator.locks ? navigator.locks.request('cryo-erp-session', task) : task()

export function getActiveCompanyId() {
  return activeCompanyId
}

export function setActiveCompanyId(id) {
  if (activeCompanyId !== id) {
    activeCompanyId = id
    for (const listener of companyListeners) listener(id)
  }
}

export function onCompanyChanged(listener) {
  companyListeners.add(listener)
  return () => companyListeners.delete(listener)
}

export function onSessionExpired(listener) {
  expiryListeners.add(listener)
  return () => expiryListeners.delete(listener)
}

export function refreshAccess() {
  if (!refreshPending) {
    refreshPending = withSessionLock(async () => {
      const response = await sessionApi.post('/auth/refresh')
      accessToken = response.data.data.accessToken
      return accessToken
    }).catch(error => {
      if (error.response?.status === 401) {
        accessToken = null
        for (const listener of expiryListeners) listener()
      }
      throw error
    }).finally(() => { refreshPending = null })
  }
  return refreshPending
}

export function signIn(credentials) {
  return withSessionLock(async () => {
    const { data } = (await sessionApi.post('/auth/login', credentials)).data
    accessToken = data.accessToken
    return data.user
  })
}

export function signOut() {
  return withSessionLock(async () => {
    const headers = accessToken ? { Authorization: 'Bearer ' + accessToken } : undefined
    await sessionApi.post('/auth/logout', null, { headers })
    accessToken = null
    setActiveCompanyId(null)
  })
}

api.interceptors.request.use(config => {
  if (accessToken) config.headers.set('Authorization', 'Bearer ' + accessToken)
  const currentCompany = activeCompanyId || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cryo_active_company') : null)
  if (currentCompany && !config.headers.has('X-Company-Id')) {
    config.headers.set('X-Company-Id', currentCompany)
  }
  return config
})

api.interceptors.response.use(response => response, async error => {
  const original = error.config
  if (error.response?.status !== 401 || !original || original.retried || original.signal?.aborted) throw error
  original.retried = true
  const previous = original.headers.get('Authorization')
  const token = accessToken && previous !== 'Bearer ' + accessToken ? accessToken : await refreshAccess()
  original.headers.set('Authorization', 'Bearer ' + token)
  const currentCompany = activeCompanyId || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cryo_active_company') : null)
  if (currentCompany && !original.headers.has('X-Company-Id')) {
    original.headers.set('X-Company-Id', currentCompany)
  }
  return api.request(original)
})

export function errorMessage(error) {
  if (error.response?.data?.error?.message) return error.response.data.error.message
  if (!error.response) return 'The service could not be reached. Check your connection and try again.'
  return 'The request could not be completed. Try again.'
}

export function errorDetails(error) {
  return error.response?.data?.error?.details || []
}
