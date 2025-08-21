import React from 'react'
import { Box, Typography } from '@mui/material'

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
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: 1200,
          mx: 'auto',
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
          © {new Date().getFullYear()} DJANGO-REACT-NEON. All rights reserved.
        </Typography>
      </Box>
    </Box>
  )
}

export default Footer