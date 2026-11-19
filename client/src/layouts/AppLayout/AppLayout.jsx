import { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Breadcrumbs,
  Button,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import {
  AssessmentOutlined,
  BusinessOutlined,
  DashboardOutlined,
  DescriptionOutlined,
  FolderOutlined,
  LogoutOutlined,
  MenuOutlined,
  SearchOutlined,
} from '@mui/icons-material'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Brand from '../../components/Brand/Brand'
import GlobalSearch from '../../components/GlobalSearch/GlobalSearch'
import { useAuth } from '../../context/AuthContext/AuthContext'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import { errorMessage } from '../../services/api'
import { getDocTypes, getModules, getNavigationCatalog } from '../../services/documentApi'
import styles from './AppLayout.module.scss'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { companies, activeCompany, activeCompanyId, switchCompany } = useCompany()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const [drawer, setDrawer] = useState(false)
  const [profileAnchor, setProfileAnchor] = useState(null)
  const [companyAnchor, setCompanyAnchor] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')

  const [modules, setModules] = useState([])
  const [docTypes, setDocTypes] = useState([])
  const [navCatalog, setNavCatalog] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)

  // Global Ctrl+K / Cmd+K search listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Load readable modules, doctypes and navigation catalog
  useEffect(() => {
    if (!activeCompanyId) return
    Promise.all([getModules(), getDocTypes(), getNavigationCatalog()])
      .then(([mods, dts, catalog]) => {
        setModules(mods || [])
        setDocTypes(dts || [])
        setNavCatalog(catalog || null)
      })
      .catch(() => {
        setModules([])
        setDocTypes([])
        setNavCatalog(null)
      })
  }, [activeCompanyId])

  // Parse breadcrumbs from current location
  const getBreadcrumbs = () => {
    if (pathname === '/') return [{ label: 'Overview' }]
    if (pathname === '/unauthorized') return [{ label: 'Access denied' }]
    if (pathname === '/coverage' || pathname === '/app/coverage' || pathname === '/admin/coverage') {
      return [{ label: 'Implementation Coverage' }]
    }

    // Match /reports/:name or /app/reports/:name
    const repMatch = pathname.match(/^(?:\/app)?\/reports\/([^/]+)$/)
    if (repMatch) {
      return [{ to: '/reports', label: 'Reports' }, { label: decodeURIComponent(repMatch[1]) }]
    }

    // Match /pages/:name or /app/pages/:name
    const pageMatch = pathname.match(/^(?:\/app)?\/pages\/([^/]+)$/)
    if (pageMatch) {
      return [{ to: '/pages', label: 'Pages' }, { label: decodeURIComponent(pageMatch[1]) }]
    }

    // Match /documents/:doctype or /app/documents/:doctype
    const docMatch = pathname.match(/^(?:\/app)?\/documents\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/)
    if (docMatch) {
      const doctype = decodeURIComponent(docMatch[1])
      const second = docMatch[2] ? decodeURIComponent(docMatch[2]) : null
      const third = docMatch[3] ? decodeURIComponent(docMatch[3]) : null

      const crumbs = [
        { to: `/documents/${encodeURIComponent(doctype)}`, label: doctype },
      ]

      if (second === 'new') {
        crumbs.push({ label: `New ${doctype}` })
      } else if (second) {
        if (third === 'edit') {
          crumbs.push({ to: `/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(second)}`, label: second })
          crumbs.push({ label: 'Edit' })
        } else {
          crumbs.push({ label: second })
        }
      }
      return crumbs
    }

    // Match /workspaces/:module or /w/:module or /app/:module
    const wsMatch = pathname.match(/^(?:\/workspaces|\/w|\/app)\/([^/]+)$/)
    if (wsMatch) {
      const mod = decodeURIComponent(wsMatch[1])
      return [{ label: `${mod} Workspace` }]
    }

    return [{ label: 'Page not found' }]
  }

  const breadcrumbs = getBreadcrumbs()

  function navigation() {
    return (
      <>
        <div className={styles.brand}><Brand /></div>
        <List component="nav" aria-label="Workspace" className={styles.navigation}>
          <ListItemButton
            component={Link}
            to="/"
            selected={pathname === '/'}
            aria-current={pathname === '/' ? 'page' : undefined}
            onClick={() => setDrawer(false)}
          >
            <ListItemIcon className={styles.icon}><DashboardOutlined fontSize="small" /></ListItemIcon>
            <ListItemText primary="Overview" />
          </ListItemButton>

          {navCatalog?.canViewCoverage && (
            <ListItemButton
              component={Link}
              to="/coverage"
              selected={pathname === '/coverage'}
              aria-current={pathname === '/coverage' ? 'page' : undefined}
              onClick={() => setDrawer(false)}
              className={styles.coverageItem}
            >
              <ListItemIcon className={styles.icon}><AssessmentOutlined fontSize="small" color="primary" /></ListItemIcon>
              <ListItemText primary="Coverage Matrix" />
              <Chip label="Admin" size="small" color="primary" variant="outlined" className={styles.coverageChip} />
            </ListItemButton>
          )}

          {modules.map((mod) => {
            const modDocTypes = docTypes.filter(dt => dt.module === mod)
            const wsPath = `/workspaces/${encodeURIComponent(mod)}`
            return (
              <div key={mod}>
                <div className={styles.moduleHeader}>{mod}</div>
                <ListItemButton
                  component={Link}
                  to={wsPath}
                  selected={pathname === wsPath}
                  aria-current={pathname === wsPath ? 'page' : undefined}
                  onClick={() => setDrawer(false)}
                >
                  <ListItemIcon className={styles.icon}><FolderOutlined fontSize="small" /></ListItemIcon>
                  <ListItemText primary={`${mod} Workspace`} />
                </ListItemButton>

                {modDocTypes.map((dt) => {
                  const dtPath = `/documents/${encodeURIComponent(dt.name)}`
                  const isSelected = pathname.startsWith(dtPath)
                  return (
                    <ListItemButton
                      key={dt.name}
                      component={Link}
                      to={dtPath}
                      selected={isSelected}
                      aria-current={isSelected ? 'page' : undefined}
                      onClick={() => setDrawer(false)}
                      className={styles.subItem}
                    >
                      <ListItemIcon className={styles.icon}><DescriptionOutlined fontSize="small" /></ListItemIcon>
                      <ListItemText primary={dt.name} className={styles.subItemText} />
                    </ListItemButton>
                  )
                })}
              </div>
            )
          })}
        </List>
      </>
    )
  }

  async function handleLogout() {
    setProfileAnchor(null)
    setError('')
    setSigningOut(true)
    try {
      await logout()
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>{navigation()}</aside>
      <Drawer open={drawer} onClose={() => setDrawer(false)} slotProps={{ paper: { className: styles.drawer } }}>
        {navigation()}
      </Drawer>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <div className={styles.topLeft}>
            <IconButton
              className={styles.mobileToggle}
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
              aria-expanded={drawer}
            >
              <MenuOutlined />
            </IconButton>
            <Breadcrumbs aria-label="Breadcrumbs" className={styles.breadcrumbs}>
              <Link to="/">Workspace</Link>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1
                if (isLast || !crumb.to) {
                  return <Typography key={idx} color="text.primary">{crumb.label}</Typography>
                }
                return <Link key={idx} to={crumb.to}>{crumb.label}</Link>
              })}
            </Breadcrumbs>
          </div>

          <div className={styles.topRight}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSearchOpen(true)}
              className={styles.searchButton}
              aria-label="Search"
            >
              <SearchOutlined fontSize="small" />
              <span className={styles.searchText}>Search…</span>
              <kbd className={styles.searchKbd}>Ctrl+K</kbd>
            </Button>

            {activeCompany && (
              <>
                <Chip
                  icon={<BusinessOutlined />}
                  label={activeCompany.name}
                  size="small"
                  variant="outlined"
                  onClick={companies.length > 1 ? (e) => setCompanyAnchor(e.currentTarget) : undefined}
                  className={styles.companyChip}
                  aria-label={`Switch company: ${activeCompany.name}`}
                  aria-haspopup={companies.length > 1 ? 'true' : undefined}
                  clickable={companies.length > 1}
                />
                {companies.length > 1 && (
                  <Menu
                    anchorEl={companyAnchor}
                    open={Boolean(companyAnchor)}
                    onClose={() => setCompanyAnchor(null)}
                  >
                    {companies.map((c) => (
                      <MenuItem
                        key={c.id}
                        selected={c.id === activeCompanyId}
                        onClick={() => {
                          setCompanyAnchor(null)
                          switchCompany(c.id)
                          // If on document detail, navigate to list
                          if (pathname.includes('/documents/')) {
                            navigate('/')
                          }
                        }}
                      >
                        {c.name}
                      </MenuItem>
                    ))}
                  </Menu>
                )}
              </>
            )}

            <IconButton
              className={styles.profile}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={Boolean(profileAnchor)}
              onClick={event => setProfileAnchor(event.currentTarget)}
              disabled={signingOut}
            >
              <Avatar className={styles.avatar}>{(user.name || user.email).slice(0, 1).toUpperCase()}</Avatar>
            </IconButton>
            <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={() => setProfileAnchor(null)}>
              <li className={styles.identity}>
                <Typography className={styles.identityName}>{user.name}</Typography>
                <Typography color="text.secondary" variant="body2">{user.email}</Typography>
              </li>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogoutOutlined fontSize="small" /></ListItemIcon>Sign out
              </MenuItem>
            </Menu>
          </div>
        </header>

        <main className={styles.main} id="main-content">
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
          <Outlet />
        </main>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
