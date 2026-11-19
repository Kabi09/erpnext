import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { SyncProblemOutlined } from '@mui/icons-material'
import styles from './ConflictDialog.module.scss'

export default function ConflictDialog({
  open = false,
  currentVersion,
  conflicts = [],
  onReload,
  onCancel,
  loading = false,
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="sm" fullWidth>
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <DialogTitle className={styles.title}>
              <SyncProblemOutlined color="warning" className={styles.icon} />
              Version Conflict Detected
            </DialogTitle>
          </div>
          <div className={styles.middlerow}>
            <DialogContent className={styles.content}>
              <Alert severity="warning" className={styles.alert}>
                This document was modified by another user or session while you were editing it.
                {currentVersion ? ` (Server is currently on version ${currentVersion})` : ''}
                <br />
                To prevent overwriting changes, your update was paused. Please reload the latest version to review changes.
              </Alert>

              {conflicts.length > 0 && (
                <div className={styles.diffSection}>
                  <Typography variant="subtitle2" className={styles.diffHeading}>
                    Conflicting Fields:
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" className={styles.diffTable}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Field</strong></TableCell>
                          <TableCell><strong>Your Draft</strong></TableCell>
                          <TableCell><strong>Server Value</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {conflicts.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.label || item.field}</TableCell>
                            <TableCell className={styles.userVal}>{String(item.userValue ?? '—')}</TableCell>
                            <TableCell className={styles.serverVal}>{String(item.serverValue ?? '—')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              )}
            </DialogContent>
          </div>
          <div className={styles.bottomrow}>
            <DialogActions className={styles.actions}>
              <Button onClick={onCancel} disabled={loading} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={onReload}
                disabled={loading}
                variant="contained"
                color="primary"
                autoFocus
              >
                {loading ? 'Reloading…' : 'Reload Latest Version'}
              </Button>
            </DialogActions>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
