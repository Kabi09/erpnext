import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import styles from './ConfirmDialog.module.scss'

export default function ConfirmDialog({
  open = false,
  title = 'Confirm action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'primary',
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <DialogTitle className={styles.title}>{title}</DialogTitle>
          </div>
          <div className={styles.middlerow}>
            <DialogContent className={styles.content}>
              <DialogContentText>{message}</DialogContentText>
            </DialogContent>
          </div>
          <div className={styles.bottomrow}>
            <DialogActions className={styles.actions}>
              <Button onClick={onClose} disabled={loading} color="inherit">
                {cancelText}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={loading}
                color={confirmColor}
                variant="contained"
                autoFocus
              >
                {loading ? 'Processing…' : confirmText}
              </Button>
            </DialogActions>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
