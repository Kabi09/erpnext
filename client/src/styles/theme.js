import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  typography: { fontFamily: 'var(--font)', button: { textTransform: 'none', fontWeight: 650 } },
  shape: { borderRadius: 10 },
  palette: {
    primary: { main: '#5036ae' },
    background: { default: '#f7f7fb', paper: '#fff' },
    text: { primary: '#222037', secondary: '#625e74' },
  },
})
