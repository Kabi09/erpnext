import { Box, Chip, Typography } from '@mui/material'
import { ExtensionOutlined } from '@mui/icons-material'
import styles from './UnsupportedField.module.scss'

export default function UnsupportedField({ field, value }) {
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <Typography variant="body2" className={styles.label}>
            {field?.label || field?.name}
          </Typography>
          <Chip label={`Unsupported (${field?.type})`} size="small" variant="outlined" color="warning" />
        </div>
        <div className={styles.middlerow}>
          <div className={styles.content}>
            <ExtensionOutlined fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              Field type '{field?.type}' is pending adapter review. Displaying read-only representation:
            </Typography>
            <Typography variant="body2" className={styles.value}>
              {value !== undefined && value !== null ? JSON.stringify(value) : '—'}
            </Typography>
          </div>
        </div>
      </div>
    </div>
  )
}
