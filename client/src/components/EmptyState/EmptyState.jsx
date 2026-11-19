import { Paper, Typography } from '@mui/material'
import styles from './EmptyState.module.scss'

export default function EmptyState({ title, message }) {
  return <Paper variant="outlined" className={styles.container}>
    <Typography component="h2" variant="h6">{title}</Typography>
    <Typography color="text.secondary">{message}</Typography>
  </Paper>
}
