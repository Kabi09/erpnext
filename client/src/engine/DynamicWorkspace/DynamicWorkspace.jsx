import { useEffect, useState } from 'react'
import {
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import {
  FactCheckOutlined,
  GradingOutlined,
  Inventory2Outlined,
  PendingActionsOutlined,
  RuleFolderOutlined,
} from '@mui/icons-material'
import { Link, useParams } from 'react-router-dom'
import { getDocTypes, getModules } from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import LoadingState from '../../components/LoadingState/LoadingState'
import styles from './DynamicWorkspace.module.scss'

export default function DynamicWorkspace() {
  const { module: rawModule } = useParams()
  const { activeCompany, activeCompanyId } = useCompany()
  const moduleName = rawModule ? decodeURIComponent(rawModule) : 'Stock'

  const [availableDocTypes, setAvailableDocTypes] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeCompanyId) return
    setLoading(true)
    Promise.all([getModules(), getDocTypes()])
      .then(([mods, types]) => {
        setModules(mods || [])
        setAvailableDocTypes(types || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeCompanyId])

  if (loading) {
    return <LoadingState label="Loading workspace…" />
  }

  // Filter doctypes matching this module
  const moduleDocTypes = availableDocTypes.filter(d => d.module === moduleName)

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <div className={styles.heading}>
            <div className={styles.titleGroup}>
              <Typography variant="h4" component="h1" className={styles.title}>
                {moduleName} Workspace
              </Typography>
              <Chip label="Module" size="small" variant="outlined" color="primary" />
            </div>
            <Typography variant="body2" color="text.secondary">
              Managing operations for {activeCompany?.name || 'Workspace'}
            </Typography>
          </div>
        </div>

        <div className={styles.middlerow}>
          <div className={styles.sectionHeader}>
            <Typography variant="h6" className={styles.sectionTitle}>
              Verified Masters & Documents
            </Typography>
            <Divider className={styles.divider} />
          </div>

          <div className={styles.cardGrid}>
            {moduleDocTypes.length > 0 ? (
              moduleDocTypes.map(dt => (
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
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No verified DocTypes available in this module yet.
              </Typography>
            )}
          </div>

          <div className={styles.sectionHeader} style={{ marginTop: 32 }}>
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
                  <Chip label="Phase 5" size="small" variant="outlined" className={styles.pendingChip} />
                </div>
                <Typography variant="caption" color="text.secondary">
                  Domain controller and business logic required before generic registration.
                </Typography>
              </Paper>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
