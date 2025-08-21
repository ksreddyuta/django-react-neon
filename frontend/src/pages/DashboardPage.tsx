// src/pages/DashboardPage.tsx
import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.email}! Here's what's happening with your account today.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <DashboardIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div">
                  12
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Projects
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div">
                  24
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Users
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <SecurityIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div">
                  99.9%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Uptime
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <NotificationsIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" component="div">
                  3
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Notifications
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              Recent Activity
            </Typography>
            <Box sx={{ mt: 2 }}>
              {[1, 2, 3].map((item) => (
                <Box
                  key={item}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    py: 2,
                    borderBottom: item < 3 ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 40, height: 40 }}>
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1">
                      <strong>User {item}</strong> performed an action
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      2 hours ago
                    </Typography>
                  </Box>
                  <Chip label="Completed" color="success" size="small" />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              User Profile
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 3 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.main',
                  mr: 2,
                  fontSize: '1.5rem',
                }}
              >
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography variant="h6">{user?.email}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.username || 'No username set'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography
                variant="body2"
                sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
              >
                <span>Status:</span>
                <Chip label="Active" color="success" size="small" />
              </Typography>
              <Typography
                variant="body2"
                sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
              >
                <span>Member since:</span>
                <span>Jan 15, 2024</span>
              </Typography>
              <Typography
                variant="body2"
                sx={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <span>Last login:</span>
                <span>Today</span>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
