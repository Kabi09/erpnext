import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material'
import {
  AccountTreeOutlined,
  AssessmentOutlined,
  CheckCircleOutlineOutlined,
  DescriptionOutlined,
  FactCheckOutlined,
  FolderOutlined,
  HelpOutlineOutlined,
  InfoOutlined,
  LayersOutlined,
  OpenInNewOutlined,
  PendingActionsOutlined,
  ReportProblemOutlined,
  WebOutlined,
} from '@mui/icons-material'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getDocTypes, getWorkspace } from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import LoadingState from '../../components/LoadingState/LoadingState'
import styles from './DynamicWorkspace.module.scss'

const STATUS_CHIPS = {
  Verified: { color: 'success', label: 'Verified' },
  'CRUD Enabled': { color: 'primary', label: 'CRUD Enabled' },
  'Requires Business Logic': { color: 'warning', label: 'Phase 6 Domain Logic' },
  Discovered: { color: 'default', label: 'Discovered' },
  Unsupported: { color: 'error', label: 'Unsupported' },
  Blocked: { color: 'error', label: 'Blocked' },
}

export default function DynamicWorkspace() {
  const { module: rawModule } = useParams()
  const { activeCompany, activeCompanyId } = useCompany()
  const navigate = useNavigate()
  const moduleName = rawModule ? decodeURIComponent(rawModule) : 'Stock'

  const [workspace, setWorkspace] = useState(null)
  const [registeredDocTypes, setRegisteredDocTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal info for unregistered / pending doctypes
  const [pendingDialog, setPendingDialog] = useState({
    open: false,
    item: null,
  })

  useEffect(() => {
    if (!activeCompanyId) return
    setLoading(true)
    setError('')
    Promise.all([
      getWorkspace(moduleName),
      getDocTypes(),
    ])
      .then(([ws, types]) => {
        setWorkspace(ws)
        setRegisteredDocTypes(types || [])
      })
      .catch(err => {
        setError(err.response?.data?.error?.message || `Failed to load workspace for "${moduleName}".`)
      })
      .finally(() => setLoading(false))
  }, [moduleName, activeCompanyId])

  if (loading) {
    return <LoadingState label={`Loading ${moduleName} workspace…`} />
  }

  const moduleDocTypes = registeredDocTypes.filter(d => d.module === moduleName)

  const handleItemClick = (item) => {
    // If registered or report or page, navigate directly
    if (item.registered || item.crudEnabled || item.type === 'Report' || item.type === 'Page') {
      navigate(item.url)
    } else {
      // Show pending explanation
      setPendingDialog({
        open: true,
        item,
      })
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.heading}>
            <div className={styles.titleGroup}>
              <Typography variant="h4" component="h1" className={styles.title}>
                {moduleName} Workspace
              </Typography>
              <Chip
                label={workspace?.module || moduleName}
                size="small"
                variant="outlined"
                color="primary"
                className={styles.moduleBadge}
              />
            </div>
            <Typography variant="body2" color="text.secondary">
              Managing operations for {activeCompany?.name || 'Workspace'}
            </Typography>
          </div>
        </div>

        {error && (
          <Alert severity="error" className={styles.alert}>
            {error}
          </Alert>
        )}

        <div className={styles.middlerow}>
          {/* Section: Verified Masters & Documents */}
          {moduleDocTypes.length > 0 && (
            <div className={styles.verifiedSection}>
              <div className={styles.sectionHeader}>
                <Typography variant="h6" className={styles.sectionTitle}>
                  Verified Masters & Documents
                </Typography>
                <Divider className={styles.divider} />
              </div>

              <div className={styles.cardGrid}>
                {moduleDocTypes.map(dt => (
                  <Card key={dt.name} variant="outlined" className={styles.doctypeCard}>
                    <CardActionArea component={Link} to={`/documents/${encodeURIComponent(dt.name)}`}>
                      <CardContent className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                          <div className={styles.cardIcon}>
                            <FactCheckOutlined color="primary" />
                          </div>
                          <Chip label="Verified" size="small" color="success" variant="outlined" />
                        </div>
                        <Typography variant="h6" component="h2" className={styles.docName}>
                          {dt.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" className={styles.docDesc}>
                          Access, view, create and manage {dt.name} records.
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Shortcuts section */}
          {workspace?.shortcuts && workspace.shortcuts.length > 0 && (
            <div className={styles.shortcutsSection}>
              <Typography variant="subtitle2" className={styles.subHeading}>
                Quick Shortcuts
              </Typography>
              <div className={styles.shortcutRow}>
                {workspace.shortcuts.map(s => {
                  return (
                    <Chip
                      key={s.label}
                      label={s.label}
                      icon={s.type === 'Report' ? <AssessmentOutlined /> : <DescriptionOutlined />}
                      clickable
                      onClick={() => handleItemClick(s)}
                      variant="outlined"
                      color={s.status === 'Verified' || s.status === 'CRUD Enabled' ? 'primary' : 'default'}
                      className={styles.shortcutChip}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Cards Grid: Documents & Navigation */}
          {workspace?.cards && workspace.cards.length > 0 && (
            <div className={styles.navSection}>
              <div className={styles.sectionHeader}>
                <Typography variant="h6" className={styles.sectionTitle}>
                  Documents & Navigation
                </Typography>
                <Divider className={styles.divider} />
              </div>

              <div className={styles.cardGrid}>
                {workspace.cards.map((card, cIdx) => (
                  <Card key={card.title + cIdx} variant="outlined" className={styles.sectionCard}>
                    <CardContent className={styles.cardContent}>
                      <Typography variant="subtitle1" component="h2" className={styles.cardTitle}>
                        {card.title}
                      </Typography>
                      <Divider className={styles.cardDivider} />
                      <List disablePadding className={styles.linkList}>
                        {card.links.map((link, lIdx) => {
                          const statusCfg = STATUS_CHIPS[link.status] || STATUS_CHIPS.Discovered
                          const isNavigable = link.registered || link.crudEnabled || link.type === 'Report' || link.type === 'Page'
                          const IconComp = link.type === 'Report' ? AssessmentOutlined : link.type === 'Page' ? WebOutlined : DescriptionOutlined

                          return (
                            <ListItemButton
                              key={link.target + lIdx}
                              onClick={() => handleItemClick(link)}
                              className={styles.linkItem}
                            >
                              <ListItemIcon className={styles.linkIcon}>
                                <IconComp fontSize="small" color={isNavigable ? 'primary' : 'action'} />
                              </ListItemIcon>
                              <ListItemText
                                primary={link.label}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  className: isNavigable ? styles.navigableText : styles.pendingText,
                                }}
                              />
                              <Chip
                                label={statusCfg.label}
                                size="small"
                                variant="outlined"
                                color={statusCfg.color}
                                className={styles.statusChip}
                              />
                            </ListItemButton>
                          )
                        })}
                      </List>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Section: Phase 5 Workspace Modules (Pending Registration) */}
          <div className={styles.pendingSection}>
            <div className={styles.sectionHeader}>
              <Typography variant="h6" className={styles.sectionTitle}>
                Phase 5 Workspace Modules (Pending Registration)
              </Typography>
              <Divider className={styles.divider} />
            </div>

            <div className={styles.pendingGrid}>
              {['Stock Entry', 'Purchase Receipt', 'Delivery Note', 'Stock Ledger', 'Item'].map((name) => (
                <Paper key={name} variant="outlined" className={styles.pendingCard}>
                  <div className={styles.pendingHeader}>
                    <PendingActionsOutlined color="action" fontSize="small" />
                    <Typography variant="subtitle2" className={styles.pendingName}>{name}</Typography>
                    <Chip label="Phase 6 Domain" size="small" variant="outlined" className={styles.pendingChip} />
                  </div>
                  <Typography variant="caption" color="text.secondary">
                    Transactional controller logic and posting ledger pipeline required before generic registration.
                  </Typography>
                </Paper>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending / Unregistered DocType Dialog */}
      <Dialog
        open={pendingDialog.open}
        onClose={() => setPendingDialog({ open: false, item: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className={styles.dialogTitle}>
          <ReportProblemOutlined color="warning" />
          <span>DocType Implementation Status</span>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" gutterBottom>
            {pendingDialog.item?.label || pendingDialog.item?.target}
          </Typography>
          <Box display="flex" gap={1} mb={2}>
            <Chip
              label={pendingDialog.item?.status || 'Discovered'}
              color={STATUS_CHIPS[pendingDialog.item?.status]?.color || 'default'}
              size="small"
            />
            <Chip label={pendingDialog.item?.type || 'DocType'} variant="outlined" size="small" />
          </Box>
          <Typography variant="body2" paragraph>
            This DocType is cataloged in the ERPNext metadata repository.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Under Phase 5 architectural safety rules, transactional models and submittable DocTypes
            (such as stock ledgers, GL entries, invoices, and complex transactional documents) require
            domain controller validation (Phase 6) before generic document CRUD is enabled.
          </Typography>
          <Alert severity="info" variant="outlined">
            Currently, 22 core masters are registered and operational in the system. Use the navigation
            sidebar or search (Ctrl+K) to access active masters.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDialog({ open: false, item: null })}>
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/coverage"
            onClick={() => setPendingDialog({ open: false, item: null })}
          >
            View Coverage Matrix
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
