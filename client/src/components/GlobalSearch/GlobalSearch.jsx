import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Chip,
  Dialog,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import {
  AccountTreeOutlined,
  AssessmentOutlined,
  ClearOutlined,
  DescriptionOutlined,
  FolderOutlined,
  LayersOutlined,
  SearchOutlined,
  WebOutlined,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { getNavigationCatalog } from '../../services/documentApi'
import { useCompany } from '../../context/CompanyContext/CompanyContext'
import styles from './GlobalSearch.module.scss'

const TYPE_ICONS = {
  Module: FolderOutlined,
  Workspace: LayersOutlined,
  DocType: DescriptionOutlined,
  Report: AssessmentOutlined,
  Page: WebOutlined,
}

const BADGE_COLORS = {
  Verified: 'success',
  'CRUD Enabled': 'primary',
  Tree: 'info',
  'Child Table': 'default',
  'Requires Business Logic': 'warning',
  Discovered: 'default',
}

export default function GlobalSearch({ open, onClose }) {
  const navigate = useNavigate()
  const { activeCompanyId } = useCompany()
  const [searchIndex, setSearchIndex] = useState([])
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState('All')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  // Load navigation search index
  useEffect(() => {
    if (!activeCompanyId) return
    getNavigationCatalog()
      .then(catalog => {
        setSearchIndex(catalog?.searchIndex || [])
      })
      .catch(() => {
        setSearchIndex([])
      })
  }, [activeCompanyId])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Filter items based on query and selected category
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return searchIndex.filter(item => {
      if (activeType !== 'All' && item.type !== activeType) return false
      if (!q) return true
      return (
        item.title?.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.module?.toLowerCase().includes(q)
      )
    }).slice(0, 50)
  }, [searchIndex, query, activeType])

  // Reset selected index on filter/query change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, activeType])

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selectedItem = filteredItems[selectedIndex]
      if (selectedItem) {
        handleSelect(selectedItem)
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleSelect = (item) => {
    onClose()
    if (item.url) {
      navigate(item.url)
    }
  }

  const types = ['All', 'DocType', 'Workspace', 'Report', 'Page', 'Module']

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          className: styles.dialogPaper,
          onKeyDown: handleKeyDown,
        },
      }}
    >
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.toprow}>
            <TextField
              inputRef={inputRef}
              fullWidth
              variant="standard"
              placeholder="Search DocTypes, Workspaces, Reports, Modules… (Press Esc to close)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              slotProps={{
                input: {
                  disableUnderline: true,
                  className: styles.searchInput,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined className={styles.searchIcon} />
                    </InputAdornment>
                  ),
                  endAdornment: query ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setQuery('')} aria-label="Clear search">
                        <ClearOutlined fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
          </div>

          <div className={styles.filterRow}>
            {types.map(t => (
              <Chip
                key={t}
                label={t}
                size="small"
                clickable
                variant={activeType === t ? 'filled' : 'outlined'}
                color={activeType === t ? 'primary' : 'default'}
                onClick={() => setActiveType(t)}
                className={styles.typeChip}
              />
            ))}
          </div>

          <Divider />

          <div className={styles.middlerow}>
            {filteredItems.length === 0 ? (
              <div className={styles.emptyState}>
                <Typography variant="body2" color="text.secondary">
                  No matching items found for &ldquo;{query}&rdquo;
                </Typography>
              </div>
            ) : (
              <List className={styles.resultList} disablePadding>
                {filteredItems.map((item, idx) => {
                  const IconComponent = item.type === 'DocType' && item.badge === 'Tree'
                    ? AccountTreeOutlined
                    : TYPE_ICONS[item.type] || DescriptionOutlined
                  const isSelected = idx === selectedIndex
                  const badgeColor = BADGE_COLORS[item.badge] || 'default'

                  return (
                    <ListItemButton
                      key={`${item.type}-${item.title}-${idx}`}
                      selected={isSelected}
                      onClick={() => handleSelect(item)}
                      className={styles.resultItem}
                    >
                      <ListItemIcon className={styles.resultIcon}>
                        <IconComponent fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box component="span" className={styles.primaryText}>
                            <Typography component="span" variant="subtitle2" className={styles.itemTitle}>
                              {item.title}
                            </Typography>
                            {item.badge && (
                              <Chip
                                label={item.badge}
                                size="small"
                                color={badgeColor}
                                variant="outlined"
                                className={styles.itemBadge}
                              />
                            )}
                          </Box>
                        }
                        secondary={item.subtitle}
                        secondaryTypographyProps={{ variant: 'caption', className: styles.secondaryText }}
                      />
                    </ListItemButton>
                  )
                })}
              </List>
            )}
          </div>

          <div className={styles.bottomrow}>
            <Typography variant="caption" color="text.secondary">
              Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select, <kbd>Esc</kbd> to close
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {filteredItems.length} results
            </Typography>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
