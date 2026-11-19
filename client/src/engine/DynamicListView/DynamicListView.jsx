import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { AccountTreeOutlined, AddOutlined, TableRowsOutlined } from '@mui/icons-material'
import { Link, useNavigate } from 'react-router-dom'
import { listDocuments, deleteDocument } from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import FilterBar from '../../components/FilterBar/FilterBar'
import Pagination from '../../components/Pagination/Pagination'
import DynamicTable from '../DynamicTable/DynamicTable'
import LoadingState from '../../components/LoadingState/LoadingState'
import ErrorState from '../../components/ErrorState/ErrorState'
import TreeView from '../../components/TreeView/TreeView'
import styles from './DynamicListView.module.scss'

export default function DynamicListView({ doctype, metadata }) {
  const navigate = useNavigate()
  const { activeCompanyId } = useCompany()

  const isTree = Boolean(metadata?.tree)
  const [viewMode, setViewMode] = useState(isTree ? 'tree' : 'list')

  useEffect(() => {
    setViewMode(isTree ? 'tree' : 'list')
  }, [isTree])

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionNotice, setActionNotice] = useState('')

  // Pagination state
  const [cursor, setCursor] = useState(null)
  const [nextCursor, setNextCursor] = useState(null)
  const [cursorHistory, setCursorHistory] = useState([])
  const [limit, setLimit] = useState(25)

  // Sorting state
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Filter state
  const [filters, setFilters] = useState({})
  const [deletingId, setDeletingId] = useState(null)

  const actions = useMemo(() => metadata?.actions || [], [metadata?.actions])
  const canCreate = actions.includes('create')

  // Filterable fields (Data, Date, Select)
  const filterableFields = useMemo(() => {
    return (metadata?.fields || []).filter(f => ['Data', 'Date', 'Select'].includes(f.type))
  }, [metadata])

  // Load documents
  const loadData = useCallback(async (targetCursor = cursor) => {
    if (!doctype || !activeCompanyId) return
    setLoading(true)
    setError('')
    setActionNotice('')

    try {
      const sortParam = (sortOrder === 'desc' ? '-' : '') + sortField
      const params = {
        limit,
        cursor: targetCursor || undefined,
        sort: sortParam,
        search: filters.search || undefined,
        filter: filters.filter || undefined,
        value: filters.value || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      }

      const res = await listDocuments(doctype, params)
      setDocuments(res.data || [])
      setNextCursor(res.meta?.nextCursor || null)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load documents')
    } finally {
      setLoading(false)
    }
  }, [doctype, activeCompanyId, limit, cursor, sortField, sortOrder, filters])

  // Reload when query parameters change
  useEffect(() => {
    void loadData(cursor)
  }, [loadData, cursor])

  // Reset pagination on filter or sort change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setCursor(null)
    setCursorHistory([])
  }

  const handleSortChange = (field, order) => {
    setSortField(field)
    setSortOrder(order)
    setCursor(null)
    setCursorHistory([])
  }

  const handleNextPage = () => {
    if (nextCursor) {
      setCursorHistory(prev => [...prev, cursor])
      setCursor(nextCursor)
    }
  }

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prevCursor = cursorHistory[cursorHistory.length - 1]
      setCursorHistory(prev => prev.slice(0, -1))
      setCursor(prevCursor)
    }
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    setCursor(null)
    setCursorHistory([])
  }

  // Handle document deletion
  const handleDeleteRow = async (id, version) => {
    setDeletingId(id)
    try {
      await deleteDocument(doctype, id, version)
      setActionNotice('Document deleted successfully.')
      void loadData(cursor)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not delete document.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.titleSection}>
            <div className={styles.headingGroup}>
              <Typography variant="h4" component="h1" className={styles.title}>
                {doctype}
              </Typography>
              {metadata?.module && (
                <Chip label={metadata.module} size="small" variant="outlined" className={styles.moduleChip} />
              )}
            </div>
            <Typography variant="body2" color="text.secondary">
              Company-scoped records
            </Typography>
          </div>

          <div className={styles.actionSection}>
            {isTree && (
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                size="small"
                onChange={(_, next) => next && setViewMode(next)}
                aria-label="View mode"
                className={styles.viewToggle}
              >
                <ToggleButton value="tree" aria-label="Tree view">
                  <AccountTreeOutlined fontSize="small" sx={{ mr: 0.5 }} /> Tree
                </ToggleButton>
                <ToggleButton value="list" aria-label="List view">
                  <TableRowsOutlined fontSize="small" sx={{ mr: 0.5 }} /> List
                </ToggleButton>
              </ToggleButtonGroup>
            )}
            {canCreate && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddOutlined />}
                component={Link}
                to={`/documents/${encodeURIComponent(doctype)}/new`}
              >
                New {doctype}
              </Button>
            )}
          </div>
        </div>

        {actionNotice && (
          <Alert severity="success" onClose={() => setActionNotice('')} className={styles.noticeAlert}>
            {actionNotice}
          </Alert>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError('')} className={styles.noticeAlert}>
            {error}
          </Alert>
        )}

        {isTree && viewMode === 'tree' ? (
          <TreeView doctype={doctype} metadata={metadata} />
        ) : (
          <div className={styles.middlerow}>
            <FilterBar
              filterableFields={filterableFields}
              onFilterChange={handleFilterChange}
              onRefresh={() => loadData(cursor)}
              loading={loading}
            />

            {loading && documents.length === 0 ? (
              <LoadingState label={`Loading ${doctype} documents…`} />
            ) : (
              <>
                <DynamicTable
                  doctype={doctype}
                  metadata={metadata}
                  rows={documents}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSortChange={handleSortChange}
                  onDeleteRow={handleDeleteRow}
                  deletingId={deletingId}
                />

                <Pagination
                  hasNext={Boolean(nextCursor)}
                  hasPrev={cursorHistory.length > 0}
                  onNext={handleNextPage}
                  onPrev={handlePrevPage}
                  limit={limit}
                  onLimitChange={handleLimitChange}
                  count={documents.length}
                  loading={loading}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
