import { useEffect, useRef, useState } from 'react'
import { Autocomplete, CircularProgress, TextField, Typography } from '@mui/material'
import { getDocumentOptions } from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import styles from './LinkedDocumentSelector.module.scss'

export default function LinkedDocumentSelector({
  doctype,
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  readOnly = false,
  error = false,
  helperText = '',
  placeholder = 'Select…',
}) {
  const { activeCompanyId } = useCompany()
  const [options, setOptions] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const debounceTimer = useRef(null)
  const currentRequest = useRef(null)

  // Fetch options whenever doctype or activeCompanyId changes, or when input changes (debounced)
  const fetchOptions = (searchQuery = '') => {
    if (!doctype || !activeCompanyId) return

    currentRequest.current?.abort()
    const controller = new AbortController()
    currentRequest.current = controller

    setLoading(true)
    setFetchError('')

    getDocumentOptions(doctype, { search: searchQuery || undefined, limit: 50 })
      .then((res) => {
        if (!controller.signal.aborted) {
          const list = res?.data || []
          setOptions(list)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setFetchError(err.response?.data?.error?.message || 'Could not load options')
          setLoading(false)
        }
      })
  }

  // Load initial options
  useEffect(() => {
    fetchOptions('')
    return () => {
      currentRequest.current?.abort()
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [doctype, activeCompanyId])

  // Handle typing with debounce
  const handleInputChange = (event, newInputValue, reason) => {
    setInputValue(newInputValue)
    if (reason === 'input') {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        fetchOptions(newInputValue)
      }, 300)
    } else if (reason === 'clear') {
      fetchOptions('')
    }
  }

  // Current selected option object
  const selectedOption = options.find(opt => opt.id === value) || (value ? { id: value, name: value } : null)

  const handleChange = (event, newValue) => {
    if (readOnly || disabled) return
    onChange?.(newValue ? newValue.id : '')
  }

  if (readOnly) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <TextField
              size="small"
              label={label}
              value={selectedOption?.name || '—'}
              disabled
              fullWidth
              slotProps={{ input: { readOnly: true } }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <Autocomplete
            size="small"
            value={selectedOption}
            onChange={handleChange}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            options={options}
            getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt?.name || opt?.id || '')}
            isOptionEqualToValue={(option, val) => option.id === val.id}
            loading={loading}
            disabled={disabled}
            noOptionsText={fetchError ? fetchError : 'No documents found'}
            fullWidth
            renderInput={(params) => {
              const inputSlot = params.slotProps?.input || params.InputProps || {}
              return (
                <TextField
                  {...params}
                  label={label}
                  required={required}
                  error={error || Boolean(fetchError)}
                  helperText={fetchError || helperText}
                  placeholder={placeholder}
                  slotProps={{
                    ...params.slotProps,
                    input: {
                      ...inputSlot,
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress color="inherit" size={18} /> : null}
                          {inputSlot.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )
            }}
          />
        </div>
      </div>
    </div>
  )
}
