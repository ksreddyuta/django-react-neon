// src/pages/PublicContentPage.tsx
import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Lock as LockIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useThemeContext } from '../context/ThemeContext';

export const PublicContentPage: React.FC = () => {
  const { mode } = useThemeContext();

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            background:
              mode === 'light'
                ? 'linear-gradient(45deg, #2563eb, #8b5cf6)'
                : 'linear-gradient(45deg, #3b82f6, #a78bfa)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
          }}
        >
          Explore Our Features
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ maxWidth: 700, mx: 'auto' }}
        >
          Discover how our platform can help you streamline your workflow and
          improve productivity.
        </Typography>
      </Box>

      {/* Features */}
      <Grid container spacing={6} sx={{ mb: 8 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SpeedIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }}>
                  High Performance
                </Typography>
              </Box>
              <Typography variant="body1" paragraph>
                Our platform is built with performance in mind, ensuring fast
                response times even under heavy load.
              </Typography>
              <List>
                {[
                  'Fast database queries',
                  'Optimized API endpoints',
                  'Efficient caching',
                ].map((item) => (
                  <ListItem key={item} disableGutters>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SecurityIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }}>
                  Security First
                </Typography>
              </Box>
              <Typography variant="body1" paragraph>
                We prioritize security with industry-standard practices to keep
                your data safe.
              </Typography>
              <List>
                {[
                  'JWT authentication',
                  'Password hashing',
                  'Role-based access control',
                ].map((item) => (
                  <ListItem key={item} disableGutters>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Call to Action */}
      <Box
        sx={{
          textAlign: 'center',
          py: 6,
          px: 4,
          background:
            mode === 'light'
              ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
              : 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          borderRadius: 4,
        }}
      >
        <LockIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
        <Typography
          variant="h4"
          component="h2"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          Ready to Access All Features?
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
        >
          Sign in to your account to unlock the full potential of our platform.
        </Typography>
        <Button
          component={Link}
          to="/signin"
          variant="contained"
          size="large"
          sx={{ px: 6, py: 1.5 }}
        >
          Sign In Now
        </Button>
      </Box>

      {/* Additional Information */}
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography
          variant="h5"
          component="h3"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          Still have questions?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Contact our support team for more information about our platform.
        </Typography>
        <Button variant="outlined" size="large">
          Contact Support
        </Button>
      </Box>
    </Container>
  );
};
