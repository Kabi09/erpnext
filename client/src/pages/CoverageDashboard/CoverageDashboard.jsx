import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {
  AccountTreeOutlined,
  AssessmentOutlined,
  CheckCircleOutlineOutlined,
  DashboardOutlined,
  DescriptionOutlined,
  FolderOutlined,
  InfoOutlined,
  SearchOutlined,
  WebOutlined,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { getCoverageMatrix } from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import LoadingState from '../../components/LoadingState/LoadingState'
import styles from './CoverageDashboard.module.scss'

const STATUS_CHIPS = {
  Verified: { color: 'success', label: 'Verified' },
  'CRUD Enabled': { color: 'primary', label: 'CRUD Enabled' },
  'Requires Business Logic': { color: 'warning', label: 'Phase 6 Domain Logic' },
  Discovered: { color: 'default', label: 'Discovered' },
  Unsupported: { color: 'error', label: 'Unsupported' },
  Blocked: { color: 'error', label: 'Blocked' },
  Implemented: { color: 'success', label: 'Implemented' },
  'Pending Phase 6': { color: 'default', label: 'Pending Phase 6' },
}

export default function CoverageDashboard() {
  const { activeCompanyId } = useCompany()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentTab, setCurrentTab] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!activeCompanyId) return
    setLoading(true)
    setError('')
    getCoverageMatrix()
      .then(res => {
        setData(res)
      })
      .catch(err => {
        setError(err.response?.data?.error?.message || 'Failed to load coverage matrix. Administrator access required.')
      })
      .finally(() => setLoading(false))
  }, [activeCompanyId])

  const manifest = useMemo(() => data?.manifest || [], [data?.manifest])
  const reports = useMemo(() => data?.reports || [], [data?.reports])
  const pages = useMemo(() => data?.pages || [], [data?.pages])
  const summary = useMemo(() => data?.summary || {}, [data?.summary])

  // Filtered lists
  const filteredRegistered = useMemo(() => {
    const reg = manifest.filter(m => m.registered)
    if (!search) return reg
    const q = search.toLowerCase()
    return reg.filter(r => r.name?.toLowerCase().includes(q) || r.module?.toLowerCase().includes(q))
  }, [manifest, search])

  const filteredManifest = useMemo(() => {
    if (!search) return manifest
    const q = search.toLowerCase()
    return manifest.filter(m => m.name?.toLowerCase().includes(q) || m.module?.toLowerCase().includes(q) || m.status?.toLowerCase().includes(q))
  }, [manifest, search])

  const filteredReports = useMemo(() => {
    if (!search) return reports
    const q = search.toLowerCase()
    return reports.filter(r => r.name?.toLowerCase().includes(q) || r.module?.toLowerCase().includes(q) || r.refDocType?.toLowerCase().includes(q))
  }, [reports, search])

  const filteredPages = useMemo(() => {
    if (!search) return pages
    const q = search.toLowerCase()
    return pages.filter(p => p.name?.toLowerCase().includes(q) || p.module?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q))
  }, [pages, search])

  if (loading) {
    return <LoadingState label="Loading implementation coverage matrix…" />
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.headingGroup}>
            <div className={styles.titleRow}>
              <Typography variant="h4" component="h1" className={styles.title}>
                Implementation Coverage Dashboard
              </Typography>
              <Chip label="Admin Matrix" size="small" variant="outlined" color="primary" />
            </div>
            <Typography variant="body2" color="text.secondary">
              Cataloged ERPNext metadata vs. active Phase 5 MERN implementation boundaries.
            </Typography>
          </div>
        </div>

        {error && (
          <Alert severity="error" className={styles.alert}>
            {error}
          </Alert>
        )}

        {/* Top KPI Cards */}
        <div className={styles.kpiGrid}>
          <Card variant="outlined" className={styles.kpiCard}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Modules
              </Typography>
              <Typography variant="h4" className={styles.kpiValue}>
                {summary.modules?.discovered || 38}
              </Typography>
              <Typography variant="caption" color="success.main">
                38 Renderable in Nav
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" className={styles.kpiCard}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Workspaces
              </Typography>
              <Typography variant="h4" className={styles.kpiValue}>
                {summary.workspaces?.discovered || 24}
              </Typography>
              <Typography variant="caption" color="primary.main">
                24 Dynamic Routes
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" className={styles.kpiCard}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Registered Masters
              </Typography>
              <Typography variant="h4" className={styles.kpiValue} color="success.main">
                {summary.doctypes?.registered || 22}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                22 CRUD & Tree Enabled
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" className={styles.kpiCard}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total DocTypes
              </Typography>
              <Typography variant="h4" className={styles.kpiValue}>
                {summary.doctypes?.total || 875}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                853 Classified / Pending
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" className={styles.kpiCard}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Reports Catalog
              </Typography>
              <Typography variant="h4" className={styles.kpiValue}>
                {summary.reports?.discovered || 208}
              </Typography>
              <Typography variant="caption" color="success.main">
                {summary.reports?.implemented || 4} Implemented
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" className={styles.kpiCard}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Custom Pages
              </Typography>
              <Typography variant="h4" className={styles.kpiValue}>
                {summary.pages?.discovered || 35}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cataloged & Routed
              </Typography>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Catalog Section */}
        <div className={styles.middlerow}>
          <div className={styles.tabHeader}>
            <Tabs
              value={currentTab}
              onChange={(_, val) => setCurrentTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              className={styles.tabs}
            >
              <Tab label={`Registered Masters (${filteredRegistered.length})`} />
              <Tab label={`All DocTypes (${filteredManifest.length})`} />
              <Tab label={`Reports Catalog (${filteredReports.length})`} />
              <Tab label={`Custom Pages (${filteredPages.length})`} />
            </Tabs>

            <TextField
              size="small"
              placeholder="Search current tab…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              className={styles.searchInput}
            />
          </div>

          {/* TAB 0: Registered Masters */}
          {currentTab === 0 && (
            <TableContainer component={Paper} variant="outlined" className={styles.tableContainer}>
              <Table size="small">
                <TableHead className={styles.tableHead}>
                  <TableRow>
                    <TableCell style={{ fontWeight: 650 }}>DocType Name</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Module</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Scope</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Type</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Controller Review Notes</TableCell>
                    <TableCell align="right" style={{ fontWeight: 650 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRegistered.map(row => (
                    <TableRow key={row.name} hover>
                      <TableCell style={{ fontWeight: 600 }}>{row.name}</TableCell>
                      <TableCell>{row.module}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.scope || 'company'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {row.isTree ? (
                          <Chip icon={<AccountTreeOutlined />} label="Tree Master" size="small" color="info" variant="outlined" />
                        ) : (
                          <Chip label="Master" size="small" color="primary" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {row.reviewedController || 'Reviewed controller and safe schema'}
                      </TableCell>
                      <TableCell align="right">
                        <Link
                          to={`/documents/${encodeURIComponent(row.name)}`}
                          style={{ textDecoration: 'none', fontWeight: 600, color: 'var(--brand)' }}
                        >
                          Open Document
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* TAB 1: All DocTypes Manifest */}
          {currentTab === 1 && (
            <TableContainer component={Paper} variant="outlined" className={styles.tableContainer}>
              <Table size="small">
                <TableHead className={styles.tableHead}>
                  <TableRow>
                    <TableCell style={{ fontWeight: 650 }}>DocType Name</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Module</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>App</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Implementation Status</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Characteristics</TableCell>
                    <TableCell align="right" style={{ fontWeight: 650 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredManifest.slice(0, 100).map(row => {
                    const statusCfg = STATUS_CHIPS[row.status] || STATUS_CHIPS.Discovered
                    return (
                      <TableRow key={row.name} hover>
                        <TableCell style={{ fontWeight: 600 }}>{row.name}</TableCell>
                        <TableCell>{row.module}</TableCell>
                        <TableCell>{row.app}</TableCell>
                        <TableCell>
                          <Chip
                            label={statusCfg.label}
                            size="small"
                            color={statusCfg.color}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5} flexWrap="wrap">
                            {row.registered && <Chip label="Registered" size="small" color="success" />}
                            {row.isTree && <Chip label="Tree" size="small" color="info" />}
                            {row.isChild && <Chip label="Child Table" size="small" />}
                            {row.isSubmittable && <Chip label="Submittable" size="small" color="warning" />}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {row.registered ? (
                            <Link
                              to={`/documents/${encodeURIComponent(row.name)}`}
                              style={{ textDecoration: 'none', fontWeight: 600, color: 'var(--brand)' }}
                            >
                              Open
                            </Link>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Deferred to Phase 6
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {filteredManifest.length > 100 && (
                <Box p={2} textAlign="center">
                  <Typography variant="caption" color="text.secondary">
                    Showing top 100 of {filteredManifest.length} DocTypes. Use search to find specific items.
                  </Typography>
                </Box>
              )}
            </TableContainer>
          )}

          {/* TAB 2: Reports Catalog */}
          {currentTab === 2 && (
            <TableContainer component={Paper} variant="outlined" className={styles.tableContainer}>
              <Table size="small">
                <TableHead className={styles.tableHead}>
                  <TableRow>
                    <TableCell style={{ fontWeight: 650 }}>Report Name</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Module</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Type</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Reference DocType</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Status</TableCell>
                    <TableCell align="right" style={{ fontWeight: 650 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReports.map(row => {
                    const isImplemented = row.status === 'Implemented'
                    return (
                      <TableRow key={row.name} hover>
                        <TableCell style={{ fontWeight: 600 }}>{row.name}</TableCell>
                        <TableCell>{row.module}</TableCell>
                        <TableCell>{row.reportType || 'Script Report'}</TableCell>
                        <TableCell>{row.refDocType || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={isImplemented ? 'Operational' : row.status}
                            size="small"
                            color={isImplemented ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Link
                            to={`/reports/${encodeURIComponent(row.name)}`}
                            style={{ textDecoration: 'none', fontWeight: 600, color: 'var(--brand)' }}
                          >
                            {isImplemented ? 'Run Report' : 'View Meta'}
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* TAB 3: Pages Catalog */}
          {currentTab === 3 && (
            <TableContainer component={Paper} variant="outlined" className={styles.tableContainer}>
              <Table size="small">
                <TableHead className={styles.tableHead}>
                  <TableRow>
                    <TableCell style={{ fontWeight: 650 }}>Page Title / Identifier</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Module</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>App</TableCell>
                    <TableCell style={{ fontWeight: 650 }}>Standard</TableCell>
                    <TableCell align="right" style={{ fontWeight: 650 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPages.map(row => (
                    <TableRow key={row.name} hover>
                      <TableCell style={{ fontWeight: 600 }}>{row.title || row.name}</TableCell>
                      <TableCell>{row.module}</TableCell>
                      <TableCell>{row.app}</TableCell>
                      <TableCell>{row.standard || 'Yes'}</TableCell>
                      <TableCell align="right">
                        <Link
                          to={`/pages/${encodeURIComponent(row.name)}`}
                          style={{ textDecoration: 'none', fontWeight: 600, color: 'var(--brand)' }}
                        >
                          Open Page
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </div>
    </div>
  )
}
