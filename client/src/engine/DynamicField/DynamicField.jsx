import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import LinkedDocumentSelector from '../LinkedDocumentSelector/LinkedDocumentSelector'
import ChildTable from '../ChildTable/ChildTable'
import UnsupportedField from '../../components/UnsupportedField/UnsupportedField'
import styles from './DynamicField.module.scss'

export default function DynamicField({
  field,
  value,
  onChange,
  allValues = {},
  isEdit = false,
  formReadOnly = false,
  error = '',
  allErrors = {},
}) {
  if (!field || field.hidden) return null

  // Safe visibility condition evaluation (declarative JSON only, no eval/Function)
  if (field.visibleWhen) {
    const { field: targetField, equals } = field.visibleWhen
    if (targetField && equals !== undefined) {
      const targetVal = allValues[targetField]
      if (targetVal !== equals) return null
    }
  }

  // Field editability determination
  const isReadOnly = formReadOnly || field.readOnly || (isEdit && field.immutableAfterCreate)
  const isRequired = field.required && !isReadOnly

  // Helper text: prefer validation error, then field description
  const helperText = error || field.description || ''

  const handleChange = (e) => {
    if (isReadOnly) return
    onChange?.(e.target.value)
  }

  const handleCheckboxChange = (e) => {
    if (isReadOnly) return
    onChange?.(e.target.checked)
  }

  const type = field.type

  // Child table types
  if (type === 'Table' || type === 'Table MultiSelect') {
    return (
      <ChildTable
        field={field}
        value={value}
        onChange={onChange}
        readOnly={isReadOnly}
        errors={allErrors}
      />
    )
  }

  // Link types
  if (type === 'Link') {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <LinkedDocumentSelector
              doctype={field.target}
              value={value || ''}
              onChange={onChange}
              label={field.label || field.name}
              required={isRequired}
              readOnly={isReadOnly}
              error={Boolean(error)}
              helperText={helperText}
            />
          </div>
        </div>
      </div>
    )
  }

  // Dynamic Link
  if (type === 'Dynamic Link') {
    const selectorField = field.selector
    const selectedTarget = allValues[selectorField] || field.targets?.[0]
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <LinkedDocumentSelector
              doctype={selectedTarget}
              value={value || ''}
              onChange={onChange}
              label={field.label || field.name}
              required={isRequired}
              readOnly={isReadOnly || !selectedTarget}
              error={Boolean(error)}
              helperText={selectedTarget ? helperText : 'Select target type first'}
            />
          </div>
        </div>
      </div>
    )
  }

  // Boolean / Checkbox
  if (type === 'Check') {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <FormControl error={Boolean(error)} className={styles.formControl}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(value)}
                    onChange={handleCheckboxChange}
                    disabled={isReadOnly}
                    color="primary"
                  />
                }
                label={
                  <span>
                    {field.label || field.name}
                    {isRequired && <span className={styles.required}> *</span>}
                  </span>
                }
              />
              {helperText && <FormHelperText>{helperText}</FormHelperText>}
            </FormControl>
          </div>
        </div>
      </div>
    )
  }

  // Select / Enum
  if (type === 'Select') {
    const options = Array.isArray(field.options) ? field.options : []
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <TextField
              select
              size="small"
              label={field.label || field.name}
              value={value ?? ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required={isRequired}
              error={Boolean(error)}
              helperText={helperText}
              fullWidth
              slotProps={{ input: { readOnly: isReadOnly } }}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {options.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
          </div>
        </div>
      </div>
    )
  }

  // Multiline Text
  if (type === 'Long Text' || type === 'Text' || type === 'Text Editor') {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <TextField
              size="small"
              multiline
              rows={3}
              label={field.label || field.name}
              value={value ?? ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required={isRequired}
              error={Boolean(error)}
              helperText={helperText}
              fullWidth
              slotProps={{ input: { readOnly: isReadOnly } }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Numeric types: Int, Float, Currency, Percent
  if (type === 'Int' || type === 'Float' || type === 'Currency' || type === 'Percent') {
    const isInt = type === 'Int'
    const step = isInt ? '1' : 'any'
    const unitSymbol = type === 'Percent' ? '%' : ''
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <TextField
              size="small"
              type="number"
              label={field.label || field.name}
              value={value ?? ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required={isRequired}
              error={Boolean(error)}
              helperText={helperText}
              fullWidth
              slotProps={{
                htmlInput: { step },
                input: {
                  readOnly: isReadOnly,
                  endAdornment: unitSymbol ? (
                    <InputAdornment position="end">{unitSymbol}</InputAdornment>
                  ) : null,
                },
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Date, Datetime, Time
  if (type === 'Date' || type === 'Datetime' || type === 'Time') {
    const inputType = type === 'Date' ? 'date' : type === 'Datetime' ? 'datetime-local' : 'time'
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <TextField
              size="small"
              type={inputType}
              label={field.label || field.name}
              value={value ?? ''}
              onChange={handleChange}
              disabled={isReadOnly}
              required={isRequired}
              error={Boolean(error)}
              helperText={helperText}
              fullWidth
              slotProps={{
                inputLabel: { shrink: true },
                input: { readOnly: isReadOnly },
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // JSON
  if (type === 'JSON') {
    const displayVal = typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : (value ?? '')
    const handleJsonChange = (e) => {
      const raw = e.target.value
      try {
        const parsed = JSON.parse(raw)
        onChange?.(parsed)
      } catch {
        onChange?.(raw)
      }
    }
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <TextField
              size="small"
              multiline
              rows={4}
              label={field.label || field.name}
              value={displayVal}
              onChange={handleJsonChange}
              disabled={isReadOnly}
              required={isRequired}
              error={Boolean(error)}
              helperText={helperText || 'Valid JSON object or array'}
              fullWidth
              slotProps={{
                input: {
                  readOnly: isReadOnly,
                  style: { fontFamily: 'monospace', fontSize: '0.85rem' },
                },
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Standard string: Data, Small Text, Phone, Autocomplete, Read Only
  if (['Data', 'Small Text', 'Phone', 'Autocomplete', 'Read Only'].includes(type)) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <TextField
              size="small"
              label={field.label || field.name}
              value={value ?? ''}
              onChange={handleChange}
              disabled={isReadOnly || type === 'Read Only'}
              required={isRequired}
              error={Boolean(error)}
              helperText={helperText}
              fullWidth
              slotProps={{ input: { readOnly: isReadOnly || type === 'Read Only' } }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Fallback for unsupported field types
  return <UnsupportedField field={field} value={value} />
}
