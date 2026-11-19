import { DiamondOutlined } from '@mui/icons-material'
import styles from './Brand.module.scss'

export default function Brand() {
  return <span className={styles.container}>
    <span className={styles.mark}><DiamondOutlined aria-hidden="true" fontSize="small" /></span>
    <span>CRYO <span className={styles.suffix}>ERP</span></span>
  </span>
}
