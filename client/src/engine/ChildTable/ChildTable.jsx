import { useState } from 'react'
import {
  Box,
  Button,
  IconButton,
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
  AddOutlined,
  ArrowDownwardOutlined,
  ArrowUpwardOutlined,
  DeleteOutlined,
} from '@mui/icons-material'
import LinkedDocumentSelector from '../LinkedDocumentSelector/LinkedDocumentSelector'
import styles from './ChildTable.module.scss'

export default function ChildTable({
  field,
  value = [],
  onChange,
  readOnly = false,
  disabled = false,
  errors = {},
}) {
  const childDescriptor = field?.child || {}
  const childFields = childDescriptor.fields || []
  const maxRows = childDescriptor.maxRows || 100

  // Rows is array of row objects
  const rows = Array.isArray(value) ? value : []

  const handleAddRow = () => {
    if (readOnly || disabled || rows.length >= maxRows) return
    const newRow = { _clientKey: 'new_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) }
    for (const f of childFields) {
      newRow[f.name] = f.default !== undefined ? f.default : ''
    }
    onChange?.([...rows, newRow])
  }

  const handleRemoveRow = (index) => {
    if (readOnly || disabled) return
    const updated = [...rows]
    updated.splice(index, 1)
    onChange?.(updated)
  }

  const handleMoveUp = (index) => {
    if (readOnly || disabled || index === 0) return
    const updated = [...rows]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    onChange?.(updated)
  }

  const handleMoveDown = (index) => {
    if (readOnly || disabled || index >= rows.length - 1) return
    const updated = [...rows]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    onChange?.(updated)
  }

  const handleCellChange = (index, fieldName, newVal) => {
    if (readOnly || disabled) return
    const updated = [...rows]
    updated[index] = { ...updated[index], [fieldName]: newVal }
    onChange?.(updated)
  }

  const getCellError = (index, fieldName) => {
    // Errors can be:
    // fields.<parent>.<index>.<field> or <parent>.<index>.<field> or <index>.<field>
    const parentName = field.name
    const p1 = `fields.${parentName}.${index}.${fieldName}`
    const p2 = `${parentName}.${index}.${fieldName}`
    const p3 = `${index}.${fieldName}`
    return errors[p1] || errors[p2] || errors[p3] || ''
  }

  const renderCellInput = (row, index, col) => {
    const cellVal = row[col.name] ?? ''
    const cellError = getCellError(index, col.name)
    const isColReadOnly = readOnly || col.readOnly

    if (readOnly) {
      return (
        <Typography variant="body2" className={styles.readOnlyCell}>
          {String(cellVal) || '—'}
        </Typography>
      )
    }

    if (col.type === 'Link') {
      return (
        <LinkedDocumentSelector
          doctype={col.target}
          value={cellVal}
          onChange={(val) => handleCellChange(index, col.name, val)}
          readOnly={isColReadOnly}
          disabled={disabled}
          error={Boolean(cellError)}
          helperText={cellError}
        />
      )
    }

    return (
      <TextField
        size="small"
        value={cellVal}
        onChange={(e) => handleCellChange(index, col.name, e.target.value)}
        disabled={disabled}
        error={Boolean(cellError)}
        helperText={cellError}
        placeholder={col.label || col.name}
        fullWidth
        slotProps={{ input: { readOnly: isColReadOnly } }}
      />
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.header}>
            <Typography variant="subtitle2" className={styles.tableTitle}>
              {field.label || field.name}
              {field.required && <span className={styles.required}> *</span>}
              <Typography component="span" variant="caption" color="text.secondary" className={styles.countBadge}>
                ({rows.length} {rows.length === 1 ? 'row' : 'rows'}{maxRows ? ` / max ${maxRows}` : ''})
              </Typography>
            </Typography>

            {!readOnly && !disabled && rows.length < maxRows && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<AddOutlined />}
                onClick={handleAddRow}
              >
                Add Row
              </Button>
            )}
          </div>
        </div>

        <div className={styles.middlerow}>
          <TableContainer component={Paper} variant="outlined" className={styles.tableContainer}>
            <Table size="small" aria-label={field.label || field.name}>
              <TableHead>
                <TableRow>
                  <TableCell className={styles.indexCol}>#</TableCell>
                  {childFields.map((col) => (
                    <TableCell key={col.name}>
                      {col.label || col.name}
                      {col.required && <span className={styles.required}> *</span>}
                    </TableCell>
                  ))}
                  {!readOnly && <TableCell align="right" className={styles.actionsCol}>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={childFields.length + (readOnly ? 1 : 2)} align="center" className={styles.emptyRow}>
                      <Typography variant="body2" color="text.secondary">
                        No rows added yet.{!readOnly && ' Click "Add Row" to add items.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => {
                    const rowKey = row.rowId || row._clientKey || `row_${idx}`
                    return (
                      <TableRow key={rowKey} className={styles.bodyRow}>
                        <TableCell className={styles.indexCol}>{idx + 1}</TableCell>
                        {childFields.map((col) => (
                          <TableCell key={col.name} className={styles.cell}>
                            {renderCellInput(row, idx, col)}
                          </TableCell>
                        ))}
                        {!readOnly && (
                          <TableCell align="right" className={styles.actionsCol}>
                            <Tooltip title="Move up">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMoveUp(idx)}
                                  disabled={idx === 0 || disabled}
                                  aria-label="Move row up"
                                >
                                  <ArrowUpwardOutlined fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Move down">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMoveDown(idx)}
                                  disabled={idx >= rows.length - 1 || disabled}
                                  aria-label="Move row down"
                                >
                                  <ArrowDownwardOutlined fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Remove row">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveRow(idx)}
                                  disabled={disabled}
                                  aria-label="Remove row"
                                >
                                  <DeleteOutlined fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </div>
    </div>
  )
}
