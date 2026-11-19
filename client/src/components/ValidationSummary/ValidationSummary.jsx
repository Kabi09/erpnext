import { Alert, AlertTitle, Box, Typography } from '@mui/material'
import styles from './ValidationSummary.module.scss'

export default function ValidationSummary({
  errors = {},
  generalError = '',
  fieldLabels = {},
  onFieldClick,
}) {
  const errorEntries = Object.entries(errors).filter(([_, msg]) => Boolean(msg))

  if (!generalError && errorEntries.length === 0) {
    return null
  }

  const formatPath = (path) => {
    if (fieldLabels[path]) return fieldLabels[path]
    // Clean up paths like fields.parameters.0.parameter -> Parameter #1 Parameter
    const childMatch = path.match(/(?:fields\.)?([a-zA-Z0-9_]+)\.(\d+)\.([a-zA-Z0-9_]+)/)
    if (childMatch) {
      const [_, tableName, rowIdx, colName] = childMatch
      const tableLabel = fieldLabels[tableName] || tableName
      const colLabel = fieldLabels[colName] || colName
      return `${tableLabel} row #${Number(rowIdx) + 1} (${colLabel})`
    }
    const clean = path.replace(/^fields\./, '')
    return fieldLabels[clean] || clean
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <Alert severity="error" className={styles.alert}>
            <AlertTitle>Submission Error</AlertTitle>
            {generalError && <Typography variant="body2" className={styles.generalText}>{generalError}</Typography>}
            {errorEntries.length > 0 && (
              <ul className={styles.errorList}>
                {errorEntries.map(([path, msg]) => (
                  <li key={path} className={styles.errorItem}>
                    <strong>{formatPath(path)}:</strong> {msg}
                  </li>
                ))}
              </ul>
            )}
          </Alert>
        </div>
      </div>
    </div>
  )
}
