import React from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { Box, CssBaseline } from '@mui/material'
import { useThemeContext } from '../../context/ThemeContext'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { mode } = useThemeContext()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: mode === 'light' ? 'grey.50' : 'grey.900',
        color: 'text.primary',
      }}
    >
      <CssBaseline />
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      <Footer />
    </Box>
  )
}