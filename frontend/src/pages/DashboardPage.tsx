import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { MapSection } from '../components/dashboard/MapSection';
import { ChartSection } from '../components/dashboard/ChartSection';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  
  console.log('DashboardPage rendering, user:', user); // Debug log

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Air Quality Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.email}! Monitor air quality across Texas in real-time.
        </Typography>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={4}>
        {/* Left Column - User Details */}
        <Grid size={{xs:12, md:4, lg:3}}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20, height: 'fit-content' }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              User Profile
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  mb: 2,
                  fontSize: '2rem',
                }}
              >
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="h6" align="center">
                {user?.email}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center">
                {user?.username || 'Air Quality Analyst'}
              </Typography>
              <Chip label="Premium Account" color="primary" size="small" sx={{ mt: 1 }} />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <EmailIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Email" secondary={user?.email} />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PersonIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Member Since" secondary="January 15, 2024" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <LocationIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Location" secondary="Texas, USA" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CalendarIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Last Login" secondary="Today, 10:30 AM" />
              </ListItem>
            </List>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                Dashboard Usage
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Data Points:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  12,456
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Stations Monitored:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  24
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column - Map and Charts */}
        <Grid size={{xs:12, md:8, lg:9}}>
          <Grid container spacing={4}>
            {/* Map Section */}
            <Grid size={{xs: 12}}>
              <MapSection />
            </Grid>

            {/* Chart Section */}
            <Grid size={{xs: 12}}>
              <ChartSection />
            </Grid>

            {/* Quick Stats */}
            <Grid size={{xs: 12}}>
              <Grid container spacing={3}>
                <Grid size={{xs:12, sm:6, md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="h4" component="div" gutterBottom>
                      45
                    </Typography>
                    <Typography variant="body2">
                      Good Air Quality Days
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{xs:12, sm:6, md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                    <Typography variant="h4" component="div" gutterBottom>
                      12
                    </Typography>
                    <Typography variant="body2">
                      Moderate Air Quality Days
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{xs:12, sm:6, md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography variant="h4" component="div" gutterBottom>
                      3
                    </Typography>
                    <Typography variant="body2">
                      Unhealthy Days
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{xs:12, sm:6, md:3}}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                    <Typography variant="h4" component="div" gutterBottom>
                      24
                    </Typography>
                    <Typography variant="body2">
                      Monitoring Stations
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};