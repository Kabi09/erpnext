import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ErrorState from './components/ErrorState/ErrorState'
import LoadingState from './components/LoadingState/LoadingState'
import { useAuth } from './context/AuthContext/AuthContext'
import { CompanyProvider } from './context/CompanyContext/CompanyContext'
import Unauthorized from './pages/Unauthorized/Unauthorized'
import NotFound from './pages/NotFound/NotFound'
import ProtectedRoute from './routes/ProtectedRoute/ProtectedRoute'

const AppLayout = lazy(() => import('./layouts/AppLayout/AppLayout'))
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'))
const Login = lazy(() => import('./pages/Login/Login'))
const DynamicPage = lazy(() => import('./engine/DynamicPage/DynamicPage'))
const DynamicWorkspace = lazy(() => import('./engine/DynamicWorkspace/DynamicWorkspace'))
const ReportViewer = lazy(() => import('./engine/ReportViewer/ReportViewer'))
const DynamicCustomPage = lazy(() => import('./engine/DynamicCustomPage/DynamicCustomPage'))
const CoverageDashboard = lazy(() => import('./pages/CoverageDashboard/CoverageDashboard'))

export default function App() {
  const { status, error, restore } = useAuth()
  if (status === 'loading') return <LoadingState label="Restoring your session…" />
  if (status === 'error') return <ErrorState message={error} retry={restore} />
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<CompanyProvider><AppLayout /></CompanyProvider>}>
            <Route index element={<Dashboard />} />

            {/* Document Routes */}
            <Route path="/documents/:doctype" element={<DynamicPage />} />
            <Route path="/documents/:doctype/new" element={<DynamicPage />} />
            <Route path="/documents/:doctype/:id" element={<DynamicPage />} />
            <Route path="/documents/:doctype/:id/edit" element={<DynamicPage />} />

            {/* Workspace Routes */}
            <Route path="/workspaces/:module" element={<DynamicWorkspace />} />
            <Route path="/w/:module" element={<DynamicWorkspace />} />

            {/* Report Routes */}
            <Route path="/reports/:name" element={<ReportViewer />} />
            <Route path="/app/reports/:name" element={<ReportViewer />} />

            {/* Custom Page Routes */}
            <Route path="/pages/:name" element={<DynamicCustomPage />} />
            <Route path="/app/pages/:name" element={<DynamicCustomPage />} />

            {/* Implementation Coverage Matrix */}
            <Route path="/coverage" element={<CoverageDashboard />} />
            <Route path="/app/coverage" element={<CoverageDashboard />} />
            <Route path="/admin/coverage" element={<CoverageDashboard />} />

            {/* App-prefixed route aliases */}
            <Route path="/app/:module" element={<DynamicWorkspace />} />
            <Route path="/app/documents/:doctype" element={<DynamicPage />} />
            <Route path="/app/documents/:doctype/new" element={<DynamicPage />} />
            <Route path="/app/documents/:doctype/:id" element={<DynamicPage />} />
            <Route path="/app/documents/:doctype/:id/edit" element={<DynamicPage />} />

            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
