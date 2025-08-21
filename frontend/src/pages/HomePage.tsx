// src/pages/HomePage.tsx
import React from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import Grid from '@mui/material/Grid'; // ✅ MUI v7 Grid2
import { Link } from 'react-router-dom';
import { useThemeContext } from '../context/ThemeContext';

export const HomePage: React.FC = () => {
  const { mode } = useThemeContext();

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Hero Section */}
      <Box
        sx={{
          textAlign: 'center',
          py: 10,
          background: mode === 'light'
            ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
            : 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          borderRadius: 4,
          mb: 8,
          px: 4,
        }}
      >
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            background: mode === 'light'
              ? 'linear-gradient(45deg, #2563eb, #8b5cf6)'
              : 'linear-gradient(45deg, #3b82f6, #a78bfa)',
            backgroundClip: 'text',
            color: 'transparent', // ✅ instead of textFillColor
          }}
        >
          Welcome to DJANGO-REACT-NEON
        </Typography>
        <Typography
          variant="h5"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
        >
          A modern full-stack application built with Django, React, and Neon PostgreSQL
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            component={Link}
            to="/signup"
            variant="contained"
            size="large"
            sx={{ px: 4, py: 1.5 }}
          >
            Get Started
          </Button>
          <Button
            component={Link}
            to="/public"
            variant="outlined"
            size="large"
            sx={{ px: 4, py: 1.5 }}
          >
            Explore Features
          </Button>
        </Box>
      </Box>

      {/* Features Section */}
      <Typography
        variant="h3"
        component="h2"
        align="center"
        sx={{ mb: 6, fontWeight: 600 }}
      >
        Why Choose Our Platform?
      </Typography>
      <Grid container spacing={4} sx={{ mb: 10 }}>
        <Grid  size = {{xs:12, md:4}}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="h3" gutterBottom>
                Secure Authentication
              </Typography>
              <Typography color="text.secondary">
                JWT-based authentication with Django REST Framework and secure password hashing.
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to="/signin" size="small">
                Sign In
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid  size = {{xs:12, md:4}}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="h3" gutterBottom>
                Modern UI/UX
              </Typography>
              <Typography color="text.secondary">
                Built with Material-UI and React for a responsive and accessible user experience.
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to="/public" size="small">
                Learn More
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid  size = {{xs:12, md:4}}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="h3" gutterBottom>
                Scalable Backend
              </Typography>
              <Typography color="text.secondary">
                Powered by Django and Neon PostgreSQL for high performance and scalability.
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to="/signup" size="small">
                Get Started
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Call to Action */}
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography
          variant="h4"
          component="h2"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          Ready to Get Started?
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
        >
          Join thousands of users who are already using our platform to streamline their workflows.
        </Typography>
        <Button
          component={Link}
          to="/signup"
          variant="contained"
          size="large"
          sx={{ px: 6, py: 1.5 }}
        >
          Create Your Account
        </Button>
      </Box>
    </Container>
  );
};
