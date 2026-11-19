import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../AuthContext/AuthContext'
import { api, errorMessage, setActiveCompanyId as setApiCompanyId } from '../../services/api'

const CompanyContext = createContext(null)

const STORAGE_KEY = 'cryo_active_company'

export function CompanyProvider({ children }) {
  const { user } = useAuth()
  const companies = useMemo(() => user?.companies || [], [user?.companies])

  const [selectedId, setSelectedId] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY) || ''
  })
  const [accessState, setAccessState] = useState({ loading: false, data: null, error: '', denied: false })

  // Determine active company ID: prioritize user selection if valid in user.companies, otherwise fallback to first
  const activeCompany = useMemo(() => {
    if (!companies.length) return null
    const matched = companies.find(c => c.id === selectedId)
    return matched || companies[0]
  }, [companies, selectedId])

  const activeCompanyId = activeCompany?.id || null

  // Synchronously sync API client company ID
  if (activeCompanyId) {
    setApiCompanyId(activeCompanyId)
  }

  // Keep API client header and sessionStorage in sync
  useEffect(() => {
    if (activeCompanyId) {
      setApiCompanyId(activeCompanyId)
      sessionStorage.setItem(STORAGE_KEY, activeCompanyId)
    } else {
      setApiCompanyId(null)
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [activeCompanyId])

  const checkAccess = useCallback(async (companyId) => {
    if (!companyId) {
      setAccessState({ loading: false, data: null, error: '', denied: false })
      return
    }
    setAccessState(prev => ({ ...prev, loading: true, error: '', denied: false }))
    const controller = new AbortController()
    try {
      const response = await api.get('/companies/' + companyId + '/access', { signal: controller.signal })
      setAccessState({ loading: false, data: response.data.data, error: '', denied: false })
    } catch (err) {
      if (controller.signal.aborted) return
      const denied = err.response?.status === 403
      setAccessState({
        loading: false,
        data: null,
        error: denied ? 'Your role does not grant access to this company workspace.' : errorMessage(err),
        denied,
      })
    }
  }, [])

  useEffect(() => {
    if (activeCompanyId) {
      void checkAccess(activeCompanyId)
    }
  }, [activeCompanyId, checkAccess])

  const switchCompany = useCallback((companyId) => {
    setSelectedId(companyId)
  }, [])

  const value = useMemo(() => ({
    companies,
    activeCompany,
    activeCompanyId,
    switchCompany,
    isAccessLoading: accessState.loading,
    accessData: accessState.data,
    accessError: accessState.error,
    isAccessDenied: accessState.denied,
    refreshAccess: () => checkAccess(activeCompanyId),
  }), [companies, activeCompany, activeCompanyId, switchCompany, accessState, checkAccess])

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}
