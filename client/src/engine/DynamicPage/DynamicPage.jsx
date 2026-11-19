import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Breadcrumbs,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { ArrowBackOutlined } from '@mui/icons-material'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { createDocument, getDocTypeMetadata } from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import DynamicListView from '../DynamicListView/DynamicListView'
import DynamicDetailView from '../DynamicDetailView/DynamicDetailView'
import DynamicForm from '../DynamicForm/DynamicForm'
import LoadingState from '../../components/LoadingState/LoadingState'
import ErrorState from '../../components/ErrorState/ErrorState'
import styles from './DynamicPage.module.scss'

export default function DynamicPage() {
  const { doctype: rawDocType, id: rawId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { activeCompanyId } = useCompany()

  const doctype = rawDocType ? decodeURIComponent(rawDocType) : ''
  const id = rawId ? decodeURIComponent(rawId) : ''

  // Determine current route mode
  const isCreate = location.pathname.endsWith('/new')
  const isEdit = location.pathname.endsWith('/edit')
  const isDetail = Boolean(id) && !isCreate

  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  // Create form state
  const [createSaving, setCreateSaving] = useState(false)
  const [createErrors, setCreateErrors] = useState({})
  const [createGeneralError, setCreateGeneralError] = useState('')

  // Load DocType metadata
  const loadMetadata = useCallback(async () => {
    if (!doctype || !activeCompanyId) return
    setLoading(true)
    setError('')
    setNotFound(false)

    try {
      const data = await getDocTypeMetadata(doctype)
      setMetadata(data)
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true)
      } else {
        setError(err.response?.data?.error?.message || 'Could not load metadata for ' + doctype)
      }
    } finally {
      setLoading(false)
    }
  }, [doctype, activeCompanyId])

  useEffect(() => {
    void loadMetadata()
  }, [loadMetadata])

  // Handle document creation
  const handleCreateSubmit = async (fieldsPayload) => {
    setCreateSaving(true)
    setCreateErrors({})
    setCreateGeneralError('')

    try {
      const res = await createDocument(doctype, fieldsPayload)
      const newId = res.data?.id
      if (newId) {
        navigate(`/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(newId)}`)
      } else {
        navigate(`/documents/${encodeURIComponent(doctype)}`)
      }
    } catch (err) {
      const status = err.response?.status
      const errorData = err.response?.data?.error

      if (status === 422) {
        const mapped = {}
        const details = errorData?.details || []
        for (const d of details) {
          if (d.field) mapped[d.field] = d.message
        }
        setCreateErrors(mapped)
        setCreateGeneralError(errorData?.message || 'Validation error')
      } else if (status === 409) {
        setCreateGeneralError(errorData?.message || 'A document with this unique value already exists.')
      } else {
        setCreateGeneralError(errorData?.message || 'Failed to create document.')
      }
    } finally {
      setCreateSaving(false)
    }
  }

  if (loading) {
    return <LoadingState label={`Loading metadata for ${doctype}…`} />
  }

  if (notFound) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <Alert severity="warning" className={styles.notFoundAlert}>
              <Typography variant="h6">DocType Unavailable</Typography>
              <Typography variant="body2">
                '{doctype}' is not registered or not permitted for generic document operations.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArrowBackOutlined />}
                component={Link}
                to="/"
                sx={{ mt: 2 }}
              >
                Back to Dashboard
              </Button>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} retry={loadMetadata} />
  }

  // Check read permission
  const actions = metadata?.actions || []
  if (!actions.includes('read')) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <Alert severity="error">
              You do not have permission to view documents of type '{doctype}'.
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  // Create document view
  if (isCreate) {
    if (!actions.includes('create')) {
      return (
        <div className={styles.container}>
          <div className={styles.wrapper}>
            <div className={styles.toprow}>
              <Alert severity="warning">
                You do not have permission to create '{doctype}' documents.
              </Alert>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <Breadcrumbs aria-label="breadcrumb" className={styles.breadcrumbs}>
              <Link to="/" className={styles.breadcrumbLink}>Workspace</Link>
              <Link to={`/documents/${encodeURIComponent(doctype)}`} className={styles.breadcrumbLink}>
                {doctype}
              </Link>
              <Typography color="text.primary">New {doctype}</Typography>
            </Breadcrumbs>

            <div className={styles.createHeader}>
              <Typography variant="h4" component="h1" className={styles.title}>
                New {doctype}
              </Typography>
              <Chip label="Draft" color="info" size="small" variant="outlined" />
            </div>
          </div>

          <div className={styles.middlerow}>
            <DynamicForm
              metadata={metadata}
              isEdit={false}
              saving={createSaving}
              actions={actions}
              onSubmit={handleCreateSubmit}
              onCancel={() => navigate(`/documents/${encodeURIComponent(doctype)}`)}
              externalErrors={createErrors}
              externalGeneralError={createGeneralError}
            />
          </div>
        </div>
      </div>
    )
  }

  // Detail / Edit document view
  if (isDetail) {
    return (
      <DynamicDetailView
        doctype={doctype}
        id={id}
        metadata={metadata}
        initialMode={isEdit ? 'edit' : 'view'}
      />
    )
  }

  // List view
  return (
    <DynamicListView
      doctype={doctype}
      metadata={metadata}
    />
  )
}
