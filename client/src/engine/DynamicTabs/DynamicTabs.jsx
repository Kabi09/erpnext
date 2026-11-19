import { useState } from 'react'
import { Box, Tab, Tabs } from '@mui/material'
import styles from './DynamicTabs.module.scss'

export default function DynamicTabs({ tabs = [] }) {
  const [activeTab, setActiveTab] = useState(0)

  if (!tabs.length) return null

  const handleChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.toprow}>
          <Tabs
            value={activeTab}
            onChange={handleChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Form Tabs"
            className={styles.tabs}
          >
            {tabs.map((tab, idx) => (
              <Tab
                key={tab.label || idx}
                label={tab.label || `Tab ${idx + 1}`}
                id={`form-tab-${idx}`}
                aria-controls={`form-tabpanel-${idx}`}
                className={styles.tab}
              />
            ))}
          </Tabs>
        </div>

        <div className={styles.middlerow}>
          {tabs.map((tab, idx) => (
            <div
              key={tab.label || idx}
              role="tabpanel"
              hidden={activeTab !== idx}
              id={`form-tabpanel-${idx}`}
              aria-labelledby={`form-tab-${idx}`}
              className={styles.tabPanel}
            >
              {activeTab === idx && tab.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
