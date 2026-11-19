import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ErrorState from './components/ErrorState/ErrorState'
import LoadingState from './components/LoadingState/LoadingState'
import { useAuth } from './context/AuthContext/AuthContext'
import Unauthorized from './pages/Unauthorized/Unauthorized'
import NotFound from './pages/NotFound/NotFound'
import ProtectedRoute from './routes/ProtectedRoute/ProtectedRoute'

const AppLayout = lazy(() => import('./layouts/AppLayout/AppLayout'))
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'))
const Login = lazy(() => import('./pages/Login/Login'))

export default function App() {
  const { status, error, restore } = useAuth()
  if (status === 'loading') return <LoadingState label="Restoring your session…" />
  if (status === 'error') return <ErrorState message={error} retry={restore} />
  return <Suspense fallback={<LoadingState />}>
    <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Route>
    </Routes>
  </Suspense>
}
