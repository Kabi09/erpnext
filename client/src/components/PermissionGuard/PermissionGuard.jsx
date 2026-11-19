import { Alert } from '@mui/material'
import styles from './PermissionGuard.module.scss'

export default function PermissionGuard({
  actions = [],
  required,
  children,
  fallback = null,
  showNotice = false,
}) {
  const reqList = Array.isArray(required) ? required : [required]
  const isAllowed = reqList.every(action => actions.includes(action))

  if (isAllowed) {
    return children
  }

  if (fallback) {
    return fallback
  }

  if (showNotice) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <Alert severity="warning">
              You do not have permission to perform this action ({reqList.join(', ')}).
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return null
}
