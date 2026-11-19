import { Button, MenuItem, TextField, Typography } from '@mui/material'
import { ChevronLeftOutlined, ChevronRightOutlined } from '@mui/icons-material'
import styles from './Pagination.module.scss'

export default function Pagination({
  hasNext = false,
  hasPrev = false,
  onNext,
  onPrev,
  limit = 25,
  onLimitChange,
  count = 0,
  loading = false,
}) {
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.left}>
            <Typography variant="body2" color="text.secondary">
              Showing {count} {count === 1 ? 'record' : 'records'}
            </Typography>
          </div>

          <div className={styles.right}>
            <div className={styles.limitControl}>
              <Typography variant="body2" color="text.secondary">Rows per page:</Typography>
              <TextField
                select
                size="small"
                value={limit}
                onChange={e => onLimitChange?.(Number(e.target.value))}
                className={styles.limitSelect}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </TextField>
            </div>

            <div className={styles.navControls}>
              <Button
                size="small"
                variant="outlined"
                onClick={onPrev}
                disabled={!hasPrev || loading}
                startIcon={<ChevronLeftOutlined />}
              >
                Previous
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={onNext}
                disabled={!hasNext || loading}
                endIcon={<ChevronRightOutlined />}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
