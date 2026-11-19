import { Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { BusinessOutlined } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext/AuthContext'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import EmptyState from '../../components/EmptyState/EmptyState'
import ErrorState from '../../components/ErrorState/ErrorState'
import LoadingState from '../../components/LoadingState/LoadingState'
import styles from './Dashboard.module.scss'

export default function Dashboard() {
  const { user } = useAuth()
  const {
    companies,
    activeCompanyId,
    switchCompany,
    isAccessLoading,
    accessData,
    accessError,
    isAccessDenied,
    refreshAccess,
  } = useCompany()

  return <section className={styles.container}>
    <div className={styles.toprow}>
      <div className={styles.topleft}>
        <Typography variant="h3" component="h1" className={styles.title}>Workspace overview</Typography>
        <Typography color="text.secondary">Signed in as {user.name}</Typography>
      </div>
      {activeCompanyId && <TextField select label="Company" size="small" value={activeCompanyId}
        className={styles.companyPicker} onChange={event => switchCompany(event.target.value)}>
        {companies.map(company => <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>)}
      </TextField>}
    </div>
    {!activeCompanyId && <EmptyState title="No companies assigned" message="Contact your administrator for company access." />}
    {activeCompanyId && isAccessLoading && !accessData && !accessError && <LoadingState label="Checking company access…" />}
    {accessError && <ErrorState message={accessError} retry={isAccessDenied ? undefined : refreshAccess} />}
    {accessData && <Paper variant="outlined" className={styles.company}>
      <Stack direction="row" spacing={2} className={styles.companyHeading}>
        <span className={styles.companyIcon}><BusinessOutlined /></span>
        <div className={styles.companyText}>
          <Typography component="h2" variant="h6">{accessData.name}</Typography>
          <Typography color="text.secondary" variant="body2">{accessData.code}</Typography>
        </div>
        <Chip className={styles.status} label="Access verified" color="success" size="small" variant="outlined" />
      </Stack>
    </Paper>}
  </section>
}
