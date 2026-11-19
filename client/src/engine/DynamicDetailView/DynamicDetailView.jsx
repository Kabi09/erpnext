import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Breadcrumbs,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { ArrowBackOutlined, LinkOutlined } from '@mui/icons-material'
import { Link, useNavigate } from 'react-router-dom'
import {
  deleteDocument,
  getDocument,
  getDocumentRelations,
  updateDocument,
} from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import DynamicForm from '../DynamicForm/DynamicForm'
import DocumentActions from '../DocumentActions/DocumentActions'
import DocumentStatus from '../../components/DocumentStatus/DocumentStatus'
import DocumentTimeline from '../../components/DocumentTimeline/DocumentTimeline'
import ConflictDialog from '../../components/ConflictDialog/ConflictDialog'
import LoadingState from '../../components/LoadingState/LoadingState'
import ErrorState from '../../components/ErrorState/ErrorState'
import styles from './DynamicDetailView.module.scss'

export default function DynamicDetailView({
  doctype,
  id,
  metadata,
  initialMode = 'view', // 'view' | 'edit'
}) {
  const navigate = useNavigate()
  const { activeCompanyId } = useCompany()

  const [mode, setMode] = useState(initialMode)
  const [document, setDocument] = useState(null)
  const [version, setVersion] = useState(null)
  const [relations, setRelations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [successNotice, setSuccessNotice] = useState('')

  // Form error mapping
  const [formErrors, setFormErrors] = useState({})
  const [formGeneralError, setFormGeneralError] = useState('')

  // Conflict handling
  const [conflictOpen, setConflictOpen] = useState(false)
  const [staleServerVersion, setStaleServerVersion] = useState(null)
  const [conflictsList, setConflictsList] = useState([])

  const actions = useMemo(() => metadata?.actions || [], [metadata?.actions])

  // Sync mode with route prop if initialMode changes
  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  // Load document and its outgoing relations
  const loadDocument = useCallback(async () => {
    if (!doctype || !id || !activeCompanyId) return
    setLoading(true)
    setError('')
    try {
      const res = await getDocument(doctype, id)
      setDocument(res.data)
      setVersion(res.version ?? res.data.version)

      // Also fetch relations
      getDocumentRelations(doctype, id)
        .then(rel => setRelations(rel || []))
        .catch(() => setRelations([]))
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load document')
    } finally {
      setLoading(false)
    }
  }, [doctype, id, activeCompanyId])

  useEffect(() => {
    void loadDocument()
  }, [loadDocument])

  // Handle document update
  const handleUpdate = async (fieldsPayload) => {
    setSaving(true)
    setFormErrors({})
    setFormGeneralError('')
    setSuccessNotice('')

    try {
      const res = await updateDocument(doctype, id, fieldsPayload, version)
      setDocument(res.data)
      setVersion(res.version ?? res.data.version)
      setSuccessNotice('Document updated successfully.')
      setMode('view')
      navigate(`/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(id)}`, { replace: true })
    } catch (err) {
      const status = err.response?.status
      const errorData = err.response?.data?.error

      if (status === 412) {
        // Stale version conflict
        const sVersion = errorData?.details?.[0]?.currentVersion || (version + 1)
        setStaleServerVersion(sVersion)

        // Compare draft fields with current fields for user visibility
        const diffs = []
        for (const [key, val] of Object.entries(fieldsPayload)) {
          if (document?.fields?.[key] !== val) {
            diffs.push({
              field: key,
              label: metadata?.fields?.find(f => f.name === key)?.label || key,
              userValue: val,
              serverValue: document?.fields?.[key],
            })
          }
        }
        setConflictsList(diffs)
        setConflictOpen(true)
      } else if (status === 422) {
        // Validation error
        const mappedErrors = {}
        const details = errorData?.details || []
        for (const d of details) {
          if (d.field) mappedErrors[d.field] = d.message
        }
        setFormErrors(mappedErrors)
        setFormGeneralError(errorData?.message || 'Validation error')
      } else if (status === 409) {
        setFormGeneralError(errorData?.message || 'A conflict occurred with this document.')
      } else {
        setFormGeneralError(errorData?.message || 'Failed to update document.')
      }
    } finally {
      setSaving(false)
    }
  }

  // Handle conflict reload
  const handleConflictReload = async () => {
    setConflictOpen(false)
    await loadDocument()
    setSuccessNotice('Reloaded latest document from server.')
  }

  // Handle document deletion
  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await deleteDocument(doctype, id, version)
      navigate(`/documents/${encodeURIComponent(doctype)}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not delete document.')
      setDeleting(false)
    }
  }

  if (loading) {
    return <LoadingState label={`Loading ${doctype}…`} />
  }

  if (error && !document) {
    return <ErrorState message={error} retry={loadDocument} />
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.headerLeft}>
            <Breadcrumbs aria-label="breadcrumb" className={styles.breadcrumbs}>
              <Link to="/" className={styles.breadcrumbLink}>Workspace</Link>
              <Link to={`/documents/${encodeURIComponent(doctype)}`} className={styles.breadcrumbLink}>
                {doctype}
              </Link>
              <Typography color="text.primary">{document?.name || id}</Typography>
            </Breadcrumbs>

            <div className={styles.titleRow}>
              <Typography variant="h4" component="h1" className={styles.title}>
                {document?.name || id}
              </Typography>
              <DocumentStatus lifecycle={document?.lifecycle} version={version} />
            </div>
          </div>

          <div className={styles.headerRight}>
            <DocumentActions
              mode={mode}
              actions={actions}
              saving={saving}
              deleting={deleting}
              onSave={() => {
                window.document.getElementById('dynamic-document-form')?.requestSubmit()
              }}
              onCancel={() => {
                if (mode === 'edit') {
                  setMode('view')
                  navigate(`/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(id)}`, { replace: true })
                } else {
                  navigate(`/documents/${encodeURIComponent(doctype)}`)
                }
              }}
              onEdit={() => {
                setMode('edit')
                navigate(`/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(id)}/edit`, { replace: true })
              }}
              onDelete={handleDelete}
              onRefresh={loadDocument}
            />
          </div>
        </div>

        {successNotice && (
          <Alert severity="success" onClose={() => setSuccessNotice('')} className={styles.notice}>
            {successNotice}
          </Alert>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError('')} className={styles.notice}>
            {error}
          </Alert>
        )}

        <div className={styles.middlerow}>
          <div className={styles.contentGrid}>
            <div className={styles.mainColumn}>
              <DynamicForm
                metadata={metadata}
                initialData={document}
                isEdit={mode === 'edit'}
                readOnly={mode === 'view'}
                saving={saving}
                actions={actions}
                onSubmit={handleUpdate}
                onCancel={() => {
                  setMode('view')
                  navigate(`/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(id)}`, { replace: true })
                }}
                externalErrors={formErrors}
                externalGeneralError={formGeneralError}
                hideBottomActions={true}
              />
            </div>

            <div className={styles.sideColumn}>
              <DocumentTimeline document={document} />

              {relations.length > 0 && (
                <Paper variant="outlined" className={styles.relationsCard}>
                  <Typography variant="subtitle2" className={styles.relationsTitle}>
                    <LinkOutlined fontSize="small" /> Outgoing Links
                  </Typography>
                  <Stack spacing={1} className={styles.relationsList}>
                    {relations.map((rel, idx) => (
                      <div key={idx} className={styles.relationItem}>
                        <Typography variant="caption" color="text.secondary">
                          {rel.field} ({rel.type})
                        </Typography>
                        <Link
                          to={`/documents/${encodeURIComponent(rel.type)}/${encodeURIComponent(rel.id)}`}
                          className={styles.relationLink}
                        >
                          {rel.name || rel.id}
                        </Link>
                      </div>
                    ))}
                  </Stack>
                </Paper>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConflictDialog
        open={conflictOpen}
        currentVersion={staleServerVersion}
        conflicts={conflictsList}
        onReload={handleConflictReload}
        onCancel={() => setConflictOpen(false)}
        loading={loading}
      />
    </div>
  )
}
