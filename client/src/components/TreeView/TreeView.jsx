import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AddCircleOutlineOutlined,
  AddOutlined,
  ChevronRightOutlined,
  DeleteOutlineOutlined,
  EditOutlined,
  ExpandMoreOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  InsertDriveFileOutlined,
  RefreshOutlined,
  SearchOutlined,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { createDocument, deleteDocument, getTreeNodes } from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import LoadingState from '../LoadingState/LoadingState'
import styles from './TreeView.module.scss'

export default function TreeView({ doctype, metadata }) {
  const navigate = useNavigate()
  const { activeCompanyId } = useCompany()

  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')

  // Expanded nodes map: nodeId -> boolean
  const [expanded, setExpanded] = useState({})
  // Children cache: nodeId -> Array of child nodes
  const [childrenMap, setChildrenMap] = useState({})
  const [loadingNode, setLoadingNode] = useState({})

  // Add child dialog state
  const [addDialog, setAddDialog] = useState({
    open: false,
    parentNode: null,
    name: '',
    title: '',
    isGroup: false,
    saving: false,
    error: '',
  })

  // Delete confirm dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    node: null,
    deleting: false,
    error: '',
  })

  const parentField = metadata?.treeParentField || `parent_${doctype.toLowerCase().replace(/\s+/g, '_')}`
  const groupField = metadata?.treeGroupField || 'is_group'
  const canCreate = (metadata?.actions || []).includes('create')
  const canDelete = (metadata?.actions || []).includes('delete')

  // Load root nodes
  const loadRootNodes = useCallback(async () => {
    if (!doctype || !activeCompanyId) return
    setLoading(true)
    setError('')
    try {
      const rootNodes = await getTreeNodes(doctype, null)
      setNodes(rootNodes || [])
      // Auto-expand root nodes that are groups
      const initialExpanded = {}
      for (const node of rootNodes || []) {
        if (node.is_group) {
          initialExpanded[node.id] = true
          // Fetch their children
          loadNodeChildren(node.id, node.name)
        }
      }
      setExpanded(initialExpanded)
    } catch (err) {
      setError(err.response?.data?.error?.message || `Failed to load ${doctype} tree`)
    } finally {
      setLoading(false)
    }
  }, [doctype, activeCompanyId])

  // Load children for a specific node
  const loadNodeChildren = async (nodeId, nodeName) => {
    setLoadingNode(prev => ({ ...prev, [nodeId]: true }))
    try {
      const children = await getTreeNodes(doctype, nodeName)
      setChildrenMap(prev => ({ ...prev, [nodeId]: children || [] }))
    } catch (err) {
      setError(err.response?.data?.error?.message || `Failed to load children for ${nodeName}`)
    } finally {
      setLoadingNode(prev => ({ ...prev, [nodeId]: false }))
    }
  }

  useEffect(() => {
    void loadRootNodes()
  }, [loadRootNodes])

  // Toggle expand / collapse
  const handleToggle = (node) => {
    const isCurrentlyExpanded = Boolean(expanded[node.id])
    const willExpand = !isCurrentlyExpanded

    setExpanded(prev => ({ ...prev, [node.id]: willExpand }))

    if (willExpand && (!childrenMap[node.id] || childrenMap[node.id].length === 0)) {
      loadNodeChildren(node.id, node.name)
    }
  }

  // Open add child dialog
  const handleOpenAddDialog = (parentNode = null) => {
    setAddDialog({
      open: true,
      parentNode,
      name: '',
      title: '',
      isGroup: false,
      saving: false,
      error: '',
    })
  }

  // Submit new node
  const handleSaveChild = async () => {
    if (!addDialog.name.trim()) {
      setAddDialog(prev => ({ ...prev, error: 'Name is required' }))
      return
    }

    setAddDialog(prev => ({ ...prev, saving: true, error: '' }))
    try {
      const payload = {
        name: addDialog.name.trim(),
        [groupField]: addDialog.isGroup ? 1 : 0,
      }

      // Add name/title field depending on DocType schema
      const nameField = metadata?.fields?.find(f => f.name.includes('_name'))?.name
      if (nameField) {
        payload[nameField] = addDialog.title || addDialog.name.trim()
      }

      if (addDialog.parentNode) {
        payload[parentField] = addDialog.parentNode.name
      }

      await createDocument(doctype, payload)
      setNotice(`Successfully created "${addDialog.name}".`)
      setAddDialog(prev => ({ ...prev, open: false }))

      // Refresh parent or root
      if (addDialog.parentNode) {
        await loadNodeChildren(addDialog.parentNode.id, addDialog.parentNode.name)
        setExpanded(prev => ({ ...prev, [addDialog.parentNode.id]: true }))
      } else {
        await loadRootNodes()
      }
    } catch (err) {
      setAddDialog(prev => ({
        ...prev,
        saving: false,
        error: err.response?.data?.error?.message || 'Failed to create tree node.',
      }))
    }
  }

  // Open delete dialog
  const handleOpenDeleteDialog = (node) => {
    setDeleteDialog({
      open: true,
      node,
      deleting: false,
      error: '',
    })
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    const { node } = deleteDialog
    if (!node) return

    setDeleteDialog(prev => ({ ...prev, deleting: true, error: '' }))
    try {
      await deleteDocument(doctype, node.id, node.version)
      setNotice(`Successfully deleted "${node.name}".`)
      setDeleteDialog(prev => ({ ...prev, open: false }))

      // Reload root or parent children
      if (node[parentField]) {
        // Find parent in nodes or children
        loadRootNodes()
      } else {
        loadRootNodes()
      }
    } catch (err) {
      setDeleteDialog(prev => ({
        ...prev,
        deleting: false,
        error: err.response?.data?.error?.message || 'Failed to delete node.',
      }))
    }
  }

  // Recursive node renderer
  const renderNode = (node, depth = 0) => {
    const isGroup = Boolean(node.is_group)
    const isExpanded = Boolean(expanded[node.id])
    const children = childrenMap[node.id] || []
    const isLoadingChildren = Boolean(loadingNode[node.id])

    // Filter check
    const matchesSearch = !search || node.name.toLowerCase().includes(search.toLowerCase())

    return (
      <Box key={node.id} className={styles.nodeBranch}>
        <ListItem
          disablePadding
          className={`${styles.nodeItem} ${matchesSearch && search ? styles.highlighted : ''}`}
          style={{ paddingLeft: `${depth * 24 + 8}px` }}
        >
          <div className={styles.nodeContent}>
            {isGroup ? (
              <IconButton
                size="small"
                onClick={() => handleToggle(node)}
                className={styles.expandButton}
                aria-label={isExpanded ? 'Collapse node' : 'Expand node'}
              >
                {isExpanded ? <ExpandMoreOutlined fontSize="small" /> : <ChevronRightOutlined fontSize="small" />}
              </IconButton>
            ) : (
              <span className={styles.leafSpacer} />
            )}

            <ListItemIcon className={styles.nodeIcon}>
              {isGroup ? (
                isExpanded ? (
                  <FolderOpenOutlined fontSize="small" color="primary" />
                ) : (
                  <FolderOutlined fontSize="small" color="primary" />
                )
              ) : (
                <InsertDriveFileOutlined fontSize="small" color="action" />
              )}
            </ListItemIcon>

            <ListItemText
              primary={
                <span className={styles.primaryText}>
                  <Typography variant="body2" component="span" className={isGroup ? styles.groupTitle : styles.leafTitle}>
                    {node.name}
                  </Typography>
                  {isGroup && (
                    <Chip
                      label="Group"
                      size="small"
                      variant="outlined"
                      color="primary"
                      className={styles.groupChip}
                    />
                  )}
                  {node.value && (
                    <Typography variant="caption" color="text.secondary" className={styles.nodeValue}>
                      {node.value}
                    </Typography>
                  )}
                </span>
              }
            />

            <div className={styles.nodeActions}>
              {isGroup && canCreate && (
                <Tooltip title="Add Child Node">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenAddDialog(node)}
                    aria-label={`Add child to ${node.name}`}
                  >
                    <AddCircleOutlineOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Edit Node">
                <IconButton
                  size="small"
                  onClick={() => navigate(`/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(node.id)}/edit`)}
                  aria-label={`Edit ${node.name}`}
                >
                  <EditOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              {canDelete && (
                <Tooltip title="Delete Node">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleOpenDeleteDialog(node)}
                    aria-label={`Delete ${node.name}`}
                  >
                    <DeleteOutlineOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          </div>
        </ListItem>

        {isGroup && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            {isLoadingChildren ? (
              <div className={styles.childrenLoading} style={{ paddingLeft: `${(depth + 1) * 24 + 16}px` }}>
                <Typography variant="caption" color="text.secondary">
                  Loading children…
                </Typography>
              </div>
            ) : children.length > 0 ? (
              <List disablePadding>
                {children.map(child => renderNode(child, depth + 1))}
              </List>
            ) : (
              <div className={styles.emptyChildren} style={{ paddingLeft: `${(depth + 1) * 24 + 16}px` }}>
                <Typography variant="caption" color="text.secondary">
                  (No children)
                </Typography>
              </div>
            )}
          </Collapse>
        )}
      </Box>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.toolbar}>
            <TextField
              size="small"
              placeholder={`Filter ${doctype} tree…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              className={styles.searchInput}
            />

            <div className={styles.toolActions}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshOutlined />}
                onClick={loadRootNodes}
              >
                Refresh
              </Button>
              {canCreate && (
                <Button
                  variant="contained"
                  size="small"
                  color="primary"
                  startIcon={<AddOutlined />}
                  onClick={() => handleOpenAddDialog(null)}
                >
                  New Root Node
                </Button>
              )}
            </div>
          </div>
        </div>

        {notice && (
          <Alert severity="success" onClose={() => setNotice('')} className={styles.alert}>
            {notice}
          </Alert>
        )}

        {error && (
          <Alert severity="error" onClose={() => setError('')} className={styles.alert}>
            {error}
          </Alert>
        )}

        <div className={styles.middlerow}>
          {loading ? (
            <LoadingState label={`Loading ${doctype} tree…`} />
          ) : nodes.length === 0 ? (
            <div className={styles.emptyTree}>
              <Typography variant="body2" color="text.secondary">
                No records found. Click &ldquo;New Root Node&rdquo; to build your hierarchy.
              </Typography>
            </div>
          ) : (
            <List className={styles.treeList} disablePadding>
              {nodes.map(node => renderNode(node, 0))}
            </List>
          )}
        </div>
      </div>

      {/* Add Child Dialog */}
      <Dialog
        open={addDialog.open}
        onClose={() => !addDialog.saving && setAddDialog(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {addDialog.parentNode ? `Add Child to "${addDialog.parentNode.name}"` : `New Root ${doctype}`}
        </DialogTitle>
        <DialogContent dividers>
          {addDialog.error && (
            <Alert severity="error" style={{ marginBottom: 16 }}>
              {addDialog.error}
            </Alert>
          )}
          <TextField
            autoFocus
            label="Name / Identifier"
            fullWidth
            required
            value={addDialog.name}
            onChange={e => setAddDialog(prev => ({ ...prev, name: e.target.value }))}
            margin="normal"
            disabled={addDialog.saving}
            placeholder={addDialog.parentNode ? `e.g. Sub-${addDialog.parentNode.name}` : `e.g. All ${doctype}s`}
          />
          <FormControlLabel
            control={
              <Switch
                checked={addDialog.isGroup}
                onChange={e => setAddDialog(prev => ({ ...prev, isGroup: e.target.checked }))}
                disabled={addDialog.saving}
                color="primary"
              />
            }
            label="Is Group (Allows sub-nodes)"
            style={{ marginTop: 12 }}
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Group nodes can contain children and cannot be selected as leaves in transactions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAddDialog(prev => ({ ...prev, open: false }))}
            disabled={addDialog.saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveChild}
            disabled={addDialog.saving || !addDialog.name.trim()}
          >
            {addDialog.saving ? 'Creating…' : 'Create Node'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => !deleteDialog.deleting && setDeleteDialog(prev => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Node</DialogTitle>
        <DialogContent dividers>
          {deleteDialog.error && (
            <Alert severity="error" style={{ marginBottom: 16 }}>
              {deleteDialog.error}
            </Alert>
          )}
          <Typography variant="body2">
            Are you sure you want to delete <strong>{deleteDialog.node?.name}</strong>?
          </Typography>
          {deleteDialog.node?.is_group ? (
            <Typography variant="caption" color="error" display="block" style={{ marginTop: 8 }}>
              Note: A group node cannot be deleted if it has child nodes or dependent references.
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog(prev => ({ ...prev, open: false }))}
            disabled={deleteDialog.deleting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleteDialog.deleting}
          >
            {deleteDialog.deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
