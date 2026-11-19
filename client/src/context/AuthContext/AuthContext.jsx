import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, errorMessage, onSessionExpired, refreshAccess, signIn, signOut } from '../../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: 'loading', user: null })
  const restoreRequest = useRef(null)

  const restore = useCallback(async () => {
    restoreRequest.current?.abort()
    const controller = new AbortController()
    restoreRequest.current = controller
    setSession({ status: 'loading', user: null })
    try {
      await refreshAccess()
      const response = await api.get('/auth/me', { signal: controller.signal })
      if (!controller.signal.aborted) setSession({ status: 'authenticated', user: response.data.data })
    } catch (error) {
      if (controller.signal.aborted) return
      if (error.response?.status === 401) setSession({ status: 'anonymous', user: null })
      else setSession({ status: 'error', user: null, error: errorMessage(error) })
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => setSession({ status: 'anonymous', user: null }))
    void restore()
    return () => {
      unsubscribe()
      restoreRequest.current?.abort()
    }
  }, [restore])

  const login = useCallback(async credentials => {
    const user = await signIn(credentials)
    setSession({ status: 'authenticated', user })
  }, [])

  const logout = useCallback(async () => {
    await signOut()
    setSession({ status: 'anonymous', user: null })
  }, [])

  const value = useMemo(() => ({ ...session, login, logout, restore }), [session, login, logout, restore])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
