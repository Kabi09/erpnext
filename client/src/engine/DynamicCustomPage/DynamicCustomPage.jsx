import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Typography,
} from '@mui/material'
import {
  InfoOutlined,
  LayersOutlined,
  WebOutlined,
} from '@mui/icons-material'
import { Link, useParams } from 'react-router-dom'
import { getPage } from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import LoadingState from '../../components/LoadingState/LoadingState'
import CoverageDashboard from '../../pages/CoverageDashboard/CoverageDashboard'
import styles from './DynamicCustomPage.module.scss'

export default function DynamicCustomPage() {
  const { name: rawName } = useParams()
  const { activeCompany, activeCompanyId } = useCompany()
  const pageName = rawName ? decodeURIComponent(rawName) : ''

  // Special case: coverage page
  if (pageName.toLowerCase() === 'coverage') {
    return <CoverageDashboard />
  }

  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pageName || !activeCompanyId) return
    setLoading(true)
    setError('')
    getPage(pageName)
      .then(res => {
        setPage(res)
      })
      .catch(err => {
        setError(err.response?.data?.error?.message || `Failed to load custom page "${pageName}".`)
      })
      .finally(() => setLoading(false))
  }, [pageName, activeCompanyId])

  if (loading) {
    return <LoadingState label={`Loading ${pageName} page…`} />
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.headingGroup}>
            <div className={styles.titleRow}>
              <Typography variant="h4" component="h1" className={styles.title}>
                {page?.title || pageName}
              </Typography>
              {page?.module && (
                <Chip label={page.module} size="small" variant="outlined" color="primary" />
              )}
              <Chip label={page?.status || 'Cataloged'} size="small" variant="outlined" />
            </div>
            <Typography variant="body2" color="text.secondary">
              Standard: {page?.standard || 'Yes'} • App: {page?.app || 'erpnext'} • Company: {activeCompany?.name || 'Active Company'}
            </Typography>
          </div>
        </div>

        {error && (
          <Alert severity="error" className={styles.alert}>
            {error}
          </Alert>
        )}

        <div className={styles.middlerow}>
          <Card variant="outlined" className={styles.infoCard}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <WebOutlined color="primary" />
                <Typography variant="h6">
                  Cataloged Custom Page
                </Typography>
              </Box>

              <Typography variant="body2" paragraph>
                The custom page <strong>&ldquo;{page?.title || pageName}&rdquo;</strong> is cataloged from ERPNext metadata.
              </Typography>

              <Typography variant="body2" color="text.secondary" paragraph>
                In standard ERPNext, custom pages are Frappe client JavaScript/HTML single-page applications
                (such as POS registers, interactive gantt charts, and specialized tool consoles).
                These custom UIs are scheduled for migration in Phase 7 (Custom Pages & Specialized Dashboards).
              </Typography>

              <Divider style={{ margin: '16px 0' }} />

              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="outlined"
                  component={Link}
                  to={`/workspaces/${encodeURIComponent(page?.module || 'Stock')}`}
                >
                  Return to {page?.module || 'Stock'} Workspace
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  component={Link}
                  to="/coverage"
                >
                  View Implementation Coverage
                </Button>
              </Box>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
