import { useEffect, useState } from 'react'
import { Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { BusinessOutlined } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext/AuthContext'
import { api, errorMessage } from '../../services/api'
import EmptyState from '../../components/EmptyState/EmptyState'
import ErrorState from '../../components/ErrorState/ErrorState'
import LoadingState from '../../components/LoadingState/LoadingState'
import styles from './Dashboard.module.scss'

export default function Dashboard() {
  const { user } = useAuth()
  const [selected, setSelected] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [access, setAccess] = useState(null)
  const companies = user.companies
  const companyId = companies.find(company => company.id === selected)?.id || companies[0]?.id

  useEffect(() => {
    if (!companyId) return
    const controller = new AbortController()
    api.get('/companies/' + companyId + '/access', { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setAccess({ companyId, attempt, company: data.data })
    }).catch(error => {
      if (!controller.signal.aborted) {
        setAccess({ companyId, attempt, denied: error.response?.status === 403, error: errorMessage(error) })
      }
    })
    return () => controller.abort()
  }, [companyId, attempt])

  const current = access?.companyId === companyId && access?.attempt === attempt ? access : null

  return <section className={styles.container}>
    <div className={styles.toprow}>
      <div className={styles.topleft}>
        <Typography variant="h3" component="h1" className={styles.title}>Workspace overview</Typography>
        <Typography color="text.secondary">Signed in as {user.name}</Typography>
      </div>
      {companyId && <TextField select label="Company" size="small" value={companyId}
        className={styles.companyPicker} onChange={event => setSelected(event.target.value)}>
        {companies.map(company => <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>)}
      </TextField>}
    </div>
    {!companyId && <EmptyState title="No companies assigned" message="Contact your administrator for company access." />}
    {companyId && !current && <LoadingState label="Checking company access…" />}
    {current?.error && <ErrorState message={current.denied ? 'Your role does not grant access to this company workspace.' : current.error}
      retry={current.denied ? undefined : () => setAttempt(attempt + 1)} />}
    {current?.company && <Paper variant="outlined" className={styles.company}>
      <Stack direction="row" spacing={2} className={styles.companyHeading}>
        <span className={styles.companyIcon}><BusinessOutlined /></span>
        <div className={styles.companyText}>
          <Typography component="h2" variant="h6">{current.company.name}</Typography>
          <Typography color="text.secondary" variant="body2">{current.company.code}</Typography>
        </div>
        <Chip className={styles.status} label="Access verified" color="success" size="small" variant="outlined" />
      </Stack>
    </Paper>}
  </section>
}
