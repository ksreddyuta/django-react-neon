import React from 'react'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Divider
} from '@mui/material'
import { ThemeToggle } from '../ui/ThemeToggle'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ExitToApp as LogoutIcon } from '@mui/icons-material'

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const location = useLocation()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleMenuClose()
    logout()
    navigate('/')
  }

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
          Air Quality Dashboard
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
                disableElevation
              >
                Dashboard
              </Button>
              
              {/* User Profile Menu */}
              <IconButton
                onClick={handleMenuOpen}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1,
                }}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </Avatar>
              </IconButton>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  elevation: 3,
                  sx: {
                    mt: 1.5,
                    minWidth: 200,
                  }
                }}
              >
                <MenuItem disabled>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {user.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.role}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button 
                color="primary" 
                variant={location.pathname === '/signin' ? 'contained' : 'outlined'}
                component={Link} 
                to="/signin"
                size={isMobile ? 'small' : 'medium'}
                disableElevation
              >
                Sign In
              </Button>
              <Button 
                color="primary" 
                variant={location.pathname === '/signup' ? 'contained' : 'outlined'}
                component={Link} 
                to="/signup"
                size={isMobile ? 'small' : 'medium'}
                disableElevation
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