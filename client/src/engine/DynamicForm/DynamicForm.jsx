import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Paper } from '@mui/material'
import DynamicField from '../DynamicField/DynamicField'
import DynamicSection from '../DynamicSection/DynamicSection'
import DynamicTabs from '../DynamicTabs/DynamicTabs'
import ValidationSummary from '../../components/ValidationSummary/ValidationSummary'
import DocumentActions from '../DocumentActions/DocumentActions'
import styles from './DynamicForm.module.scss'

export default function DynamicForm({
  metadata,
  initialData = null,
  isEdit = false,
  readOnly = false,
  saving = false,
  onSubmit,
  onCancel,
  actions = [],
  externalErrors = {},
  externalGeneralError = '',
  hideBottomActions = false,
}) {
  const fields = useMemo(() => metadata?.fields || [], [metadata?.fields])
  const layout = useMemo(() => metadata?.layout || [], [metadata?.layout])

  // Compute field labels map for validation summary
  const fieldLabels = useMemo(() => {
    const map = {}
    for (const f of fields) {
      map[f.name] = f.label || f.name
      if (f.child?.fields) {
        for (const cf of f.child.fields) {
          map[cf.name] = cf.label || cf.name
        }
      }
    }
    return map
  }, [fields])

  // Initialize form values from initialData or field defaults
  const initializeValues = useCallback(() => {
    const vals = {}
    for (const f of fields) {
      if (initialData?.fields && initialData.fields[f.name] !== undefined) {
        vals[f.name] = initialData.fields[f.name]
      } else if (f.default !== undefined) {
        vals[f.name] = f.default
      } else if (f.type === 'Table' || f.type === 'Table MultiSelect') {
        vals[f.name] = []
      } else if (f.type === 'Check') {
        vals[f.name] = false
      } else {
        vals[f.name] = ''
      }
    }
    return vals
  }, [fields, initialData])

  const [values, setValues] = useState(initializeValues)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  // Sync when initialData changes
  useEffect(() => {
    setValues(initializeValues())
    setErrors({})
    setGeneralError('')
  }, [initializeValues])

  // Sync external errors from backend
  useEffect(() => {
    if (externalErrors && Object.keys(externalErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...externalErrors }))
    }
    if (externalGeneralError) {
      setGeneralError(externalGeneralError)
    }
  }, [externalErrors, externalGeneralError])

  const handleFieldChange = (fieldName, newVal) => {
    setValues(prev => ({ ...prev, [fieldName]: newVal }))
    // Clear error for that field when user changes it
    if (errors[fieldName]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[fieldName]
        delete next[`fields.${fieldName}`]
        return next
      })
    }
    if (generalError) setGeneralError('')
  }

  // Pre-submit validation
  const validate = () => {
    const newErrors = {}
    for (const f of fields) {
      if (f.required && !f.readOnly) {
        const val = values[f.name]
        if (val === undefined || val === null || val === '') {
          newErrors[f.name] = `${f.label || f.name} is required`
        }
      }
      // Child table validation
      if ((f.type === 'Table' || f.type === 'Table MultiSelect') && f.child?.fields) {
        const rows = values[f.name]
        if (Array.isArray(rows)) {
          rows.forEach((row, rowIdx) => {
            f.child.fields.forEach((cf) => {
              if (cf.required) {
                const cellVal = row[cf.name]
                if (cellVal === undefined || cellVal === null || cellVal === '') {
                  newErrors[`fields.${f.name}.${rowIdx}.${cf.name}`] = `${cf.label || cf.name} is required`
                }
              }
            })
          })
        }
      }
    }
    return newErrors
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (readOnly || saving) return

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setGeneralError('Please check the required fields before submitting.')
      return
    }

    setErrors({})
    setGeneralError('')

    // Prepare fields payload according to types
    const cleanedFields = {}
    for (const f of fields) {
      // Exclude immutable or read-only fields on edit
      if (isEdit && (f.immutableAfterCreate || f.readOnly)) {
        continue
      }

      const val = values[f.name]
      if (f.type === 'Table' || f.type === 'Table MultiSelect') {
        // Strip client keys for child rows
        if (Array.isArray(val)) {
          cleanedFields[f.name] = val.map(row => {
            const cleanRow = { ...row }
            delete cleanRow._clientKey
            return cleanRow
          })
        } else {
          cleanedFields[f.name] = []
        }
      } else if (f.type === 'Check') {
        cleanedFields[f.name] = Boolean(val)
      } else if (['Int', 'Float', 'Currency', 'Percent'].includes(f.type)) {
        if (val === '' || val === null || val === undefined) {
          cleanedFields[f.name] = null
        } else {
          cleanedFields[f.name] = f.type === 'Int' ? Number(val) : String(val)
        }
      } else if (val === '' || val === undefined) {
        cleanedFields[f.name] = null
      } else {
        cleanedFields[f.name] = val
      }
    }

    onSubmit?.(cleanedFields)
  }

  // Parse layout into tabs, sections, and fields
  const parsedLayout = useMemo(() => {
    const hasTabs = layout.some(item => item.type === 'Tab Break')
    const tabsList = []
    let currentTab = { label: 'Details', sections: [] }
    let currentSection = { title: '', description: '', columns: 1, fieldNames: [] }

    const flushSection = () => {
      if (currentSection.fieldNames.length > 0 || currentSection.title) {
        currentTab.sections.push(currentSection)
        currentSection = { title: '', description: '', columns: 1, fieldNames: [] }
      }
    }

    const flushTab = () => {
      flushSection()
      if (currentTab.sections.length > 0) {
        tabsList.push(currentTab)
        currentTab = { label: 'Details', sections: [] }
      }
    }

    for (const item of layout) {
      if (item.type === 'Tab Break') {
        flushTab()
        currentTab.label = item.label || 'Tab'
      } else if (item.type === 'Section Break') {
        flushSection()
        currentSection.title = item.label || ''
      } else if (item.type === 'Column Break') {
        currentSection.columns = Math.min((currentSection.columns || 1) + 1, 3)
      } else {
        // Field name
        currentSection.fieldNames.push(item.name)
      }
    }

    flushSection()
    if (currentTab.sections.length > 0) {
      tabsList.push(currentTab)
    }

    // Fallback: if layout was empty or no fields were captured, include all metadata fields
    if (tabsList.length === 0 && fields.length > 0) {
      tabsList.push({
        label: 'Details',
        sections: [{ title: '', description: '', columns: 1, fieldNames: fields.map(f => f.name) }],
      })
    }

    return { hasTabs, tabs: tabsList }
  }, [layout, fields])

  const renderSection = (section, secIdx) => {
    return (
      <DynamicSection
        key={secIdx}
        title={section.title}
        description={section.description}
        columns={section.columns}
      >
        {section.fieldNames.map((fieldName) => {
          const fieldSpec = fields.find(f => f.name === fieldName)
          if (!fieldSpec) return null
          const fieldError = errors[fieldName] || errors[`fields.${fieldName}`] || ''
          return (
            <DynamicField
              key={fieldName}
              field={fieldSpec}
              value={values[fieldName]}
              onChange={(newVal) => handleFieldChange(fieldName, newVal)}
              allValues={values}
              isEdit={isEdit}
              formReadOnly={readOnly}
              error={fieldError}
              allErrors={errors}
            />
          )
        })}
      </DynamicSection>
    )
  }

  return (
    <form id="dynamic-document-form" onSubmit={handleSubmit} noValidate className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <ValidationSummary
            errors={errors}
            generalError={generalError}
            fieldLabels={fieldLabels}
          />
        </div>

        <div className={styles.middlerow}>
          <Paper variant="outlined" className={styles.formPaper}>
            {parsedLayout.hasTabs ? (
              <DynamicTabs
                tabs={parsedLayout.tabs.map(tab => ({
                  label: tab.label,
                  content: tab.sections.map((sec, idx) => renderSection(sec, idx)),
                }))}
              />
            ) : (
              parsedLayout.tabs[0]?.sections.map((sec, idx) => renderSection(sec, idx))
            )}
          </Paper>
        </div>

        {!readOnly && !hideBottomActions && (
          <div className={styles.bottomrow}>
            <DocumentActions
              mode={isEdit ? 'edit' : 'create'}
              actions={actions}
              saving={saving}
              onSave={handleSubmit}
              onCancel={onCancel}
            />
          </div>
        )}
      </div>
    </form>
  )
}
