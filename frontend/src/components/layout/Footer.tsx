import React from 'react'
import { Box, Typography, Link } from '@mui/material'

export const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 1200,
          mx: 'auto',
          gap: 2,
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ 
            fontWeight: 500,
            fontSize: '0.875rem',
          }}
        >
          © {new Date().getFullYear()} University of Texas at Arlington - Air Quality Research Project
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Link
            href="#"
            variant="body2"
            color="text.secondary"
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            About
          </Link>
          <Link
            href="#"
            variant="body2"
            color="text.secondary"
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Privacy
          </Link>
          <Link
            href="#"
            variant="body2"
            color="text.secondary"
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Contact
          </Link>
        </Box>
      </Box>
    </Box>
  )
}

export default Footer