import { Alert, Button } from '@mui/material'
import styles from './ErrorState.module.scss'

export default function ErrorState({ message, retry }) {
  return <Alert severity="error" className={styles.container}
    action={retry && <Button color="inherit" onClick={retry}>Try again</Button>}>
    {message}
  </Alert>
}
