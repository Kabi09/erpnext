import { useState } from 'react'
import { Button, CircularProgress, Stack } from '@mui/material'
import {
  ArrowBackOutlined,
  DeleteOutlined,
  EditOutlined,
  RefreshOutlined,
  SaveOutlined,
} from '@mui/icons-material'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import styles from './DocumentActions.module.scss'

export default function DocumentActions({
  mode = 'view', // 'view' | 'edit' | 'create'
  actions = [], // permitted actions from server
  saving = false,
  deleting = false,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onRefresh,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const canCreate = actions.includes('create')
  const canUpdate = actions.includes('update')
  const canDelete = actions.includes('delete')

  const handleDeleteConfirm = () => {
    setConfirmDelete(false)
    onDelete?.()
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {mode === 'create' && (
              <>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={onCancel}
                  disabled={saving}
                  startIcon={<ArrowBackOutlined />}
                  size="small"
                >
                  Cancel
                </Button>
                {canCreate && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={onSave}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlined />}
                    size="small"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                )}
              </>
            )}

            {mode === 'edit' && (
              <>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={onCancel}
                  disabled={saving}
                  size="small"
                >
                  Cancel
                </Button>
                {canUpdate && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={onSave}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlined />}
                    size="small"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                )}
              </>
            )}

            {mode === 'view' && (
              <>
                {onRefresh && (
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onRefresh}
                    startIcon={<RefreshOutlined />}
                    size="small"
                  >
                    Refresh
                  </Button>
                )}
                {canUpdate && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={onEdit}
                    startIcon={<EditOutlined />}
                    size="small"
                  >
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setConfirmDelete(true)}
                    disabled={deleting}
                    startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlined />}
                    size="small"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </Button>
                )}
              </>
            )}
          </Stack>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Document"
        message="Are you sure you want to permanently delete this document? This cannot be undone."
        confirmText="Delete"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
