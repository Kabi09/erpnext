import { Button, Paper, Stack, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import styles from './RouteMessage.module.scss'

export default function RouteMessage({ title, text }) {
  return <Paper variant="outlined" className={styles.container}>
    <Stack spacing={2} className={styles.content}>
      <Typography variant="h4" component="h1">{title}</Typography>
      <Typography color="text.secondary">{text}</Typography>
      <Button component={Link} to="/" variant="contained">Go to overview</Button>
    </Stack>
  </Paper>
}
