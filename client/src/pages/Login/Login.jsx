import { useState } from 'react'
import { Alert, Button, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material'
import { ArrowForward, Visibility, VisibilityOff } from '@mui/icons-material'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext/AuthContext'
import Brand from '../../components/Brand/Brand'
import { errorMessage } from '../../services/api'
import styles from './Login.module.scss'

export default function Login() {
  const { status, login } = useAuth()
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  if (status === 'authenticated') return <Navigate to={location.state?.from || '/'} replace />

  async function submit(event) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    setError('')
    setPending(true)
    try {
      await login({ email: data.get('email'), password: data.get('password') })
    } catch (failure) {
      setError(failure.response?.status === 401 ? 'The email or password is incorrect, or sign-in is unavailable.' : errorMessage(failure))
    } finally {
      setPending(false)
    }
  }

  return <main className={styles.container}>
    <aside className={styles.brandPanel}>
      <Brand />
      <div className={styles.art} aria-hidden="true"><span /><span /><span /><span /></div>
      <Typography className={styles.brandLine} component="p">Your company workspace</Typography>
    </aside>
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={submit}>
        <Stack spacing={2.5}>
          <div>
            <Typography variant="h3" component="h1" className={styles.title}>Sign in</Typography>
            <Typography color="text.secondary">Use your work account to access CRYO ERP.</Typography>
          </div>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField variant="outlined" label="Email address" name="email" type="email" autoComplete="username"
            required fullWidth slotProps={{ htmlInput: { maxLength: 254 } }} />
          <TextField variant="outlined" label="Password" name="password" type={visible ? 'text' : 'password'}
            autoComplete="current-password" required fullWidth slotProps={{
              htmlInput: { maxLength: 256 },
              input: { endAdornment: <InputAdornment position="end">
                <IconButton onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} edge="end">
                  {visible ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment> },
            }} />
          <Button variant="contained" type="submit" fullWidth size="large" loading={pending} endIcon={<ArrowForward />}>
            Sign in
          </Button>
        </Stack>
      </form>
    </div>
  </main>
}
