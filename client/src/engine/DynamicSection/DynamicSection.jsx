import { Divider, Typography } from '@mui/material'
import styles from './DynamicSection.module.scss'

export default function DynamicSection({
  title = '',
  description = '',
  children,
  columns = 1,
}) {
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {title && (
          <div className={styles.toprow}>
            <div className={styles.header}>
              <Typography variant="h6" className={styles.title}>
                {title}
              </Typography>
              {description && (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              )}
            </div>
            <Divider className={styles.divider} />
          </div>
        )}

        <div className={styles.middlerow}>
          <div className={columns > 1 ? styles.multiColumn : styles.singleColumn}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
