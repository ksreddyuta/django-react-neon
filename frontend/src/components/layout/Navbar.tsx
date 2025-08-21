import React from 'react'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  useTheme,
  useMediaQuery 
} from '@mui/material'
import { ThemeToggle } from '../ui/ThemeToggle'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const location = useLocation()

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{ 
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <Typography 
          variant="h5" 
          component={Link}
          to="/"
          sx={{ 
            flexGrow: 1,
            fontWeight: 700,
            background: theme.palette.mode === 'light' 
              ? 'linear-gradient(45deg, #2563eb, #8b5cf6)' 
              : 'linear-gradient(45deg, #3b82f6, #a78bfa)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            textDecoration: 'none',
          }}
        >
          DJANGO-REACT-NEON
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ThemeToggle />
          {user ? (
            <>
              <Button 
                color="primary" 
                variant={location.pathname === '/dashboard' ? 'contained' : 'outlined'}
                component={Link} 
                to="/dashboard"
                size={isMobile ? 'small' : 'medium'}
              >
                Dashboard
              </Button>
              <Button 
                color="primary" 
                variant="outlined"
                onClick={logout}
                size={isMobile ? 'small' : 'medium'}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button 
                color="primary" 
                variant={location.pathname === '/signin' ? 'contained' : 'outlined'}
                component={Link} 
                to="/signin"
                size={isMobile ? 'small' : 'medium'}
              >
                Sign In
              </Button>
              <Button 
                color="primary" 
                variant={location.pathname === '/signup' ? 'contained' : 'outlined'}
                component={Link} 
                to="/signup"
                size={isMobile ? 'small' : 'medium'}
              >
                Sign Up
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}