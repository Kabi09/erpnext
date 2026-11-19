import { Chip, Stack } from '@mui/material'
import styles from './DocumentStatus.module.scss'

export default function DocumentStatus({
  lifecycle = 'Draft',
  version,
  isNew = false,
}) {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'submitted':
        return 'success'
      case 'cancelled':
        return 'error'
      case 'draft':
      default:
        return 'info'
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {isNew ? (
              <Chip label="New Draft" color="primary" size="small" variant="filled" />
            ) : (
              <Chip
                label={lifecycle || 'Draft'}
                color={getStatusColor(lifecycle)}
                size="small"
                variant="outlined"
              />
            )}
            {version !== undefined && version !== null && (
              <Chip
                label={`v${version}`}
                size="small"
                variant="outlined"
                className={styles.versionChip}
              />
            )}
          </Stack>
        </div>
      </div>
    </div>
  )
}
