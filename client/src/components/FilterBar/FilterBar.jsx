import { useState } from 'react'
import { Box, Button, IconButton, InputAdornment, MenuItem, TextField, Tooltip } from '@mui/material'
import { ClearOutlined, FilterAltOutlined, RefreshOutlined, SearchOutlined } from '@mui/icons-material'
import styles from './FilterBar.module.scss'

export default function FilterBar({ filterableFields = [], onFilterChange, onRefresh, loading = false }) {
  const [search, setSearch] = useState('')
  const [selectedField, setSelectedField] = useState('')
  const [fieldValue, setFieldValue] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const handleApply = (newSearch, newField, newVal, newFrom, newTo) => {
    onFilterChange?.({
      search: newSearch !== undefined ? newSearch : search,
      filter: (newField !== undefined ? newField : selectedField) || undefined,
      value: (newVal !== undefined ? newVal : fieldValue) || undefined,
      from: (newFrom !== undefined ? newFrom : fromDate) || undefined,
      to: (newTo !== undefined ? newTo : toDate) || undefined,
    })
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      handleApply()
    }
  }

  const handleClear = () => {
    setSearch('')
    setSelectedField('')
    setFieldValue('')
    setFromDate('')
    setToDate('')
    onFilterChange?.({ search: '', filter: undefined, value: undefined, from: undefined, to: undefined })
  }

  const hasFilters = Boolean(search || selectedField || fieldValue || fromDate || toDate)

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.searchSection}>
            <TextField
              size="small"
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchSubmit}
              onBlur={() => handleApply()}
              className={styles.searchInput}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setSearch(''); handleApply(''); }} aria-label="Clear search">
                        <ClearOutlined fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
          </div>

          <div className={styles.filterSection}>
            {filterableFields.length > 0 && (
              <>
                <TextField
                  select
                  size="small"
                  label="Filter by"
                  value={selectedField}
                  onChange={e => {
                    setSelectedField(e.target.value)
                    if (!e.target.value) {
                      setFieldValue('')
                      handleApply(undefined, '', '')
                    }
                  }}
                  className={styles.fieldPicker}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {filterableFields.map(f => (
                    <MenuItem key={f.name} value={f.name}>{f.label || f.name}</MenuItem>
                  ))}
                </TextField>

                {selectedField && (
                  <TextField
                    size="small"
                    placeholder="Filter value…"
                    value={fieldValue}
                    onChange={e => setFieldValue(e.target.value)}
                    onKeyDown={handleSearchSubmit}
                    onBlur={() => handleApply()}
                    className={styles.valueInput}
                  />
                )}
              </>
            )}

            <TextField
              size="small"
              label="From date"
              type="date"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); handleApply(undefined, undefined, undefined, e.target.value, undefined); }}
              slotProps={{ inputLabel: { shrink: true } }}
              className={styles.dateInput}
            />

            <TextField
              size="small"
              label="To date"
              type="date"
              value={toDate}
              onChange={e => { setToDate(e.target.value); handleApply(undefined, undefined, undefined, undefined, e.target.value); }}
              slotProps={{ inputLabel: { shrink: true } }}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.actionSection}>
            {hasFilters && (
              <Button size="small" variant="text" color="inherit" onClick={handleClear} startIcon={<ClearOutlined />}>
                Clear
              </Button>
            )}
            <Tooltip title="Refresh list">
              <span>
                <IconButton size="small" onClick={onRefresh} disabled={loading} aria-label="Refresh list">
                  <RefreshOutlined fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}
