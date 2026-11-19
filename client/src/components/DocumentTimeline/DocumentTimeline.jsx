import { Paper, Stack, Typography } from '@mui/material'
import { AccessTimeOutlined, PersonOutlined, UpdateOutlined } from '@mui/icons-material'
import styles from './DocumentTimeline.module.scss'

export default function DocumentTimeline({ document }) {
  if (!document) return null

  const formatDate = (iso) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <Paper variant="outlined" className={styles.card}>
          <div className={styles.toprow}>
            <Typography variant="subtitle2" className={styles.title}>Audit Information</Typography>
          </div>
          <div className={styles.middlerow}>
            <Stack spacing={1.5} className={styles.infoList}>
              <div className={styles.item}>
                <AccessTimeOutlined fontSize="small" className={styles.icon} />
                <div>
                  <Typography variant="caption" color="text.secondary">Created</Typography>
                  <Typography variant="body2">{formatDate(document.createdAt)}</Typography>
                </div>
              </div>

              <div className={styles.item}>
                <UpdateOutlined fontSize="small" className={styles.icon} />
                <div>
                  <Typography variant="caption" color="text.secondary">Last Modified</Typography>
                  <Typography variant="body2">{formatDate(document.updatedAt)}</Typography>
                </div>
              </div>

              {document.owner && (
                <div className={styles.item}>
                  <PersonOutlined fontSize="small" className={styles.icon} />
                  <div>
                    <Typography variant="caption" color="text.secondary">Owner</Typography>
                    <Typography variant="body2" className={styles.monoId}>{String(document.owner)}</Typography>
                  </div>
                </div>
              )}
            </Stack>
          </div>
        </Paper>
      </div>
    </div>
  )
}
