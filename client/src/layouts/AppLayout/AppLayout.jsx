import { useState } from 'react'
import { Alert, Avatar, Breadcrumbs, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Menu, MenuItem, Typography } from '@mui/material'
import { DashboardOutlined, LogoutOutlined, MenuOutlined } from '@mui/icons-material'
import { Link, Outlet, useLocation } from 'react-router-dom'
import Brand from '../../components/Brand/Brand'
import { useAuth } from '../../context/AuthContext/AuthContext'
import { errorMessage } from '../../services/api'
import styles from './AppLayout.module.scss'

const nav = [{ to: '/', label: 'Overview', icon: DashboardOutlined }]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [drawer, setDrawer] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const current = nav.find(item => item.to === pathname)?.label ||
    (pathname === '/unauthorized' ? 'Access denied' : 'Page not found')

  function navigation() {
    return <>
      <div className={styles.brand}><Brand /></div>
      <List component="nav" aria-label="Workspace" className={styles.navigation}>
        {nav.map(({ to, label, icon: Icon }) => <ListItemButton key={to} component={Link} to={to}
          selected={pathname === to} aria-current={pathname === to ? 'page' : undefined} onClick={() => setDrawer(false)}>
          <ListItemIcon className={styles.icon}><Icon fontSize="small" /></ListItemIcon>
          <ListItemText primary={label} />
        </ListItemButton>)}
      </List>
    </>
  }

  async function handleLogout() {
    setAnchor(null)
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

  return <div className={styles.container}>
    <aside className={styles.sidebar}>{navigation()}</aside>
    <Drawer open={drawer} onClose={() => setDrawer(false)} slotProps={{ paper: { className: styles.drawer } }}>
      {navigation()}
    </Drawer>
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.topLeft}>
          <IconButton className={styles.mobileToggle} onClick={() => setDrawer(true)}
            aria-label="Open navigation" aria-expanded={drawer}><MenuOutlined /></IconButton>
          <Breadcrumbs aria-label="Breadcrumbs" className={styles.breadcrumbs}>
            <Link to="/">Workspace</Link>
            <Typography>{current}</Typography>
          </Breadcrumbs>
        </div>
        <IconButton className={styles.profile} aria-label="Account menu" aria-haspopup="menu"
          aria-expanded={Boolean(anchor)} onClick={event => setAnchor(event.currentTarget)} disabled={signingOut}>
          <Avatar className={styles.avatar}>{(user.name || user.email).slice(0, 1).toUpperCase()}</Avatar>
        </IconButton>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <li className={styles.identity}>
            <Typography className={styles.identityName}>{user.name}</Typography>
            <Typography color="text.secondary" variant="body2">{user.email}</Typography>
          </li>
          <MenuItem onClick={handleLogout}><ListItemIcon><LogoutOutlined fontSize="small" /></ListItemIcon>Sign out</MenuItem>
        </Menu>
      </header>
      <main className={styles.main} id="main-content">
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        <Outlet />
      </main>
    </div>
  </div>
}
