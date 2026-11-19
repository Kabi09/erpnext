import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AssessmentOutlined,
  DownloadOutlined,
  FilterAltOutlined,
  PlayArrowOutlined,
  RefreshOutlined,
  SearchOutlined,
} from '@mui/icons-material'
import { useParams } from 'react-router-dom'
import { runReport } from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import LoadingState from '../../components/LoadingState/LoadingState'
import styles from './ReportViewer.module.scss'

export default function ReportViewer() {
  const { name: rawName } = useParams()
  const { activeCompany, activeCompanyId } = useCompany()
  const reportName = rawName ? decodeURIComponent(rawName) : ''

  const [loading, setLoading] = useState(true)
  const [reportResult, setReportResult] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const executeReport = useCallback(async () => {
    if (!reportName || !activeCompanyId) return
    setLoading(true)
    setError('')
    try {
      const filters = {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: search || undefined,
      }
      const result = await runReport(reportName, filters)
      setReportResult(result)
    } catch (err) {
      setError(err.response?.data?.error?.message || `Failed to run report "${reportName}".`)
    } finally {
      setLoading(false)
    }
  }, [reportName, activeCompanyId, fromDate, toDate, search])

  useEffect(() => {
    void executeReport()
  }, [executeReport])

  // Client-side CSV export
  const handleExportCSV = () => {
    if (!reportResult || !reportResult.rows || reportResult.rows.length === 0) return
    const columns = reportResult.columns || []
    const rows = reportResult.rows || []

    const headerLine = columns.map(c => `"${(c.label || c.field).replace(/"/g, '""')}"`).join(',')
    const dataLines = rows.map(r =>
      columns.map(c => `"${String(r[c.field] ?? '').replace(/"/g, '""')}"`).join(',')
    )

    const csvContent = [headerLine, ...dataLines].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${reportName.toLowerCase().replace(/\s+/g, '_')}_export.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter rows based on search input
  const filteredRows = (reportResult?.rows || []).filter(row => {
    if (!search) return true
    return Object.values(row).some(val =>
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.titleSection}>
            <div className={styles.headingGroup}>
              <Typography variant="h4" component="h1" className={styles.title}>
                {reportName}
              </Typography>
              {reportResult?.module && (
                <Chip label={reportResult.module} size="small" variant="outlined" color="primary" />
              )}
              {reportResult?.isPending ? (
                <Chip label="Phase 6 Domain Report" size="small" variant="outlined" color="warning" />
              ) : (
                <Chip label="Operational" size="small" variant="outlined" color="success" />
              )}
            </div>
            <Typography variant="body2" color="text.secondary">
              Company: {activeCompany?.name || 'Active Company'} • Ref: {reportResult?.refDocType || 'General'}
            </Typography>
          </div>

          <div className={styles.actionSection}>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlined />}
              onClick={handleExportCSV}
              disabled={loading || !reportResult?.rows?.length || reportResult?.isPending}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowOutlined />}
              onClick={executeReport}
              disabled={loading}
            >
              Run Report
            </Button>
          </div>
        </div>

        {error && (
          <Alert severity="error" onClose={() => setError('')} className={styles.alert}>
            {error}
          </Alert>
        )}

        {reportResult?.isPending && (
          <Alert severity="info" className={styles.alert}>
            <strong>Domain Posting Service Required:</strong> This report relies on transactions from the{' '}
            <em>{reportResult.requiredService || 'Phase 6 Domain Posting Engine'}</em>.
            In compliance with Phase 5 safety rules, mock transactions are prohibited.
          </Alert>
        )}

        <div className={styles.middlerow}>
          <div className={styles.filterBar}>
            <TextField
              size="small"
              placeholder="Search results…"
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

            <TextField
              size="small"
              type="date"
              label="From Date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className={styles.dateInput}
            />

            <TextField
              size="small"
              type="date"
              label="To Date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className={styles.dateInput}
            />

            <IconButton onClick={executeReport} title="Refresh Report">
              <RefreshOutlined />
            </IconButton>
          </div>

          {loading ? (
            <LoadingState label={`Running ${reportName}…`} />
          ) : (
            <TableContainer component={Paper} variant="outlined" className={styles.tableContainer}>
              <Table size="small" aria-label={`${reportName} table`}>
                <TableHead className={styles.tableHead}>
                  <TableRow>
                    {(reportResult?.columns || []).map(col => (
                      <TableCell
                        key={col.field}
                        style={{ minWidth: col.width || 120, fontWeight: 650 }}
                      >
                        {col.label || col.field}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={(reportResult?.columns || []).length || 1}
                        align="center"
                        className={styles.emptyCell}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No matching report records found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row, rIdx) => (
                      <TableRow key={row.id || rIdx} hover>
                        {(reportResult?.columns || []).map(col => (
                          <TableCell key={col.field}>
                            {row[col.field] ?? '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <div className={styles.bottomrow}>
            <Typography variant="caption" color="text.secondary">
              Total records: {filteredRows.length}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  )
}
