import { useMemo, useState } from 'react'
import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material'
import { DeleteOutlined, EditOutlined, VisibilityOutlined } from '@mui/icons-material'
import { Link } from 'react-router-dom'
import DocumentStatus from '../../components/DocumentStatus/DocumentStatus'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import styles from './DynamicTable.module.scss'

export default function DynamicTable({
  doctype,
  metadata,
  rows = [],
  sortField = 'createdAt',
  sortOrder = 'desc',
  onSortChange,
  onDeleteRow,
  deletingId = null,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null)

  const actions = useMemo(() => metadata?.actions || [], [metadata?.actions])
  const canUpdate = actions.includes('update')
  const canDelete = actions.includes('delete')

  // Compute table columns: list fields from metadata
  const columns = useMemo(() => {
    const fields = metadata?.fields || []
    let listFields = fields.filter(f => f.list && f.type !== 'Table')
    if (listFields.length === 0) {
      listFields = fields.filter(f => !['Table', 'Table MultiSelect', 'JSON'].includes(f.type)).slice(0, 3)
    }
    return listFields
  }, [metadata])

  const handleRequestSort = (property) => {
    const isAsc = sortField === property && sortOrder === 'asc'
    onSortChange?.(property, isAsc ? 'desc' : 'asc')
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDeleteRow?.(deleteTarget.id, deleteTarget.version)
      setDeleteTarget(null)
    }
  }

  const formatCellValue = (val, fieldSpec) => {
    if (val === undefined || val === null || val === '') return '—'
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    if (fieldSpec?.type === 'Date') {
      try { return new Date(val).toLocaleDateString() } catch { return String(val) }
    }
    if (fieldSpec?.type === 'Datetime') {
      try { return new Date(val).toLocaleString() } catch { return String(val) }
    }
    return String(val)
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.middlerow}>
          <TableContainer component={Paper} variant="outlined" className={styles.tableContainer}>
            <Table size="small" aria-label={`${doctype} list table`}>
              <TableHead>
                <TableRow>
                  <TableCell className={styles.nameHeader}>
                    <TableSortLabel
                      active={sortField === 'name'}
                      direction={sortField === 'name' ? sortOrder : 'asc'}
                      onClick={() => handleRequestSort('name')}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>

                  {columns.map((col) => (
                    <TableCell key={col.name}>
                      <TableSortLabel
                        active={sortField === col.name}
                        direction={sortField === col.name ? sortOrder : 'asc'}
                        onClick={() => handleRequestSort(col.name)}
                      >
                        {col.label || col.name}
                      </TableSortLabel>
                    </TableCell>
                  ))}

                  <TableCell className={styles.statusHeader}>
                    Status
                  </TableCell>

                  <TableCell className={styles.dateHeader}>
                    <TableSortLabel
                      active={sortField === 'createdAt'}
                      direction={sortField === 'createdAt' ? sortOrder : 'asc'}
                      onClick={() => handleRequestSort('createdAt')}
                    >
                      Created
                    </TableSortLabel>
                  </TableCell>

                  <TableCell align="right" className={styles.actionsHeader}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 4} align="center" className={styles.emptyCell}>
                      <Typography variant="body2" color="text.secondary">
                        No documents found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} hover className={styles.row}>
                      <TableCell className={styles.nameCell}>
                        <Link
                          to={`/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(row.id)}`}
                          className={styles.docLink}
                        >
                          {row.name || row.id}
                        </Link>
                      </TableCell>

                      {columns.map((col) => (
                        <TableCell key={col.name}>
                          {formatCellValue(row.fields?.[col.name], col)}
                        </TableCell>
                      ))}

                      <TableCell className={styles.statusCell}>
                        <DocumentStatus lifecycle={row.lifecycle} version={row.version} />
                      </TableCell>

                      <TableCell className={styles.dateCell}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                      </TableCell>

                      <TableCell align="right" className={styles.actionsCell}>
                        <Tooltip title="View document">
                          <IconButton
                            size="small"
                            component={Link}
                            to={`/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(row.id)}`}
                            aria-label={`View ${row.name}`}
                          >
                            <VisibilityOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {canUpdate && (
                          <Tooltip title="Edit document">
                            <IconButton
                              size="small"
                              component={Link}
                              to={`/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(row.id)}/edit`}
                              aria-label={`Edit ${row.name}`}
                            >
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}

                        {canDelete && (
                          <Tooltip title="Delete document">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteTarget(row)}
                              disabled={deletingId === row.id}
                              aria-label={`Delete ${row.name}`}
                            >
                              <DeleteOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="error"
        loading={Boolean(deletingId)}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
