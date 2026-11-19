import { CircularProgress, Stack, Typography } from '@mui/material'
import styles from './LoadingState.module.scss'

export default function LoadingState({ label = 'Loading…' }) {
  return <Stack className={styles.container} role="status" direction="row" spacing={2}>
    <CircularProgress aria-hidden="true" size={22} />
    <Typography>{label}</Typography>
  </Stack>
}
