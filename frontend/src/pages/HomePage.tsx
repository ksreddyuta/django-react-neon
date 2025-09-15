/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useThemeContext } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { airQualityService } from '../services/api';

// Fix for default markers
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Corpus Christi coordinates
const CORPUS_CHRISTI_CENTER: [number, number] = [27.8006, -97.3964];

// Custom marker icon
const createCustomIcon = (aqi: number) => {
  let color = "green";
  if (aqi > 100) color = "red";
  else if (aqi > 50) color = "orange";

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${aqi}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export const HomePage: React.FC = () => {
  const { mode } = useThemeContext();
  const { user } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch map locations
        const devices = await airQualityService.getDevices();
        
        // Generate mock locations based on devices
        const mockLocations = devices.map((device) => {
          const lat = CORPUS_CHRISTI_CENTER[0] + (Math.random() - 0.5) * 0.1;
          const lng = CORPUS_CHRISTI_CENTER[1] + (Math.random() - 0.5) * 0.1;
          
          return {
            lat,
            lng,
            name: device.display_name || device.name,
            aqi: Math.floor(Math.random() * 100) + 1,
            lastUpdated: new Date().toISOString(),
            device: device.id
          };
        });
        
        setLocations(mockLocations);
        
        // Mock stats data
        setStats({
          min: 12,
          max: 85,
          avg: 42,
          pollutant: 'PM2.5'
        });
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load air quality data');
        
        // Fallback data
        setLocations([
          {
            lat: 27.8006,
            lng: -97.3964,
            name: "Corpus Christi Downtown",
            aqi: 38,
            lastUpdated: new Date().toISOString(),
            device: "cc-downtown"
          }
        ]);
        
        setStats({
          min: 12,
          max: 85,
          avg: 42,
          pollutant: 'PM2.5'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Hero Section */}
      <Box
        sx={{
          textAlign: 'center',
          py: 10,
          background: mode === 'light'
            ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
            : 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
          borderRadius: 4,
          mb: 8,
          px: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            background: mode === 'light'
              ? 'linear-gradient(45deg, #2e7d32, #4caf50)'
              : 'linear-gradient(45deg, #a5d6a7, #c8e6c9)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Corpus Christi Air Quality Monitoring
        </Typography>
        <Typography
          variant="h5"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}
        >
          Real-time air quality data and analytics for Corpus Christi, Texas
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            component={Link}
            to={user ? "/dashboard" : "/signup"}
            variant="contained"
            size="large"
            sx={{ px: 4, py: 1.5, backgroundColor: '#2e7d32' }}
          >
            {user ? 'View Dashboard' : 'Get Started'}
          </Button>
          <Button
            component={Link}
            to="/public"
            variant="outlined"
            size="large"
            sx={{ px: 4, py: 1.5, borderColor: '#2e7d32', color: '#2e7d32' }}
          >
            Learn More
          </Button>
        </Box>
      </Box>

      {/* Air Quality Stats */}
      {stats && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" gutterBottom align="center" sx={{ fontWeight: 600 }}>
            Current Air Quality Overview
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{xs:12, sm:4}}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                <Typography variant="h4" component="div" gutterBottom>
                  {stats.min} µg/m³
                </Typography>
                <Typography variant="h6">
                  Minimum {stats.pollutant}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{xs:12, sm:4}}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
                <Typography variant="h4" component="div" gutterBottom>
                  {stats.avg} µg/m³
                </Typography>
                <Typography variant="h6">
                  Average {stats.pollutant}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{xs:12, sm:4}}>
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'error.light', color: 'white' }}>
                <Typography variant="h4" component="div" gutterBottom>
                  {stats.max} µg/m³
                </Typography>
                <Typography variant="h6">
                  Maximum {stats.pollutant}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Map Section */}
      <Box sx={{ mb: 10 }}>
        <Typography variant="h4" component="h2" gutterBottom align="center" sx={{ fontWeight: 600, mb: 4 }}>
          Corpus Christi Air Quality Map
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <Paper sx={{ p: 2, height: 400, borderRadius: 2 }}>
            <MapContainer
              center={CORPUS_CHRISTI_CENTER}
              zoom={11}
              style={{ height: '100%', width: '100%', borderRadius: 8 }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {locations.map((location, index) => (
                <Marker
                  key={index}
                  position={[location.lat, location.lng]}
                  icon={createCustomIcon(location.aqi)}
                >
                  <Popup>
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>
                        {location.name}
                      </Typography>
                      <Chip
                        label={`AQI: ${location.aqi}`}
                        color={
                          location.aqi <= 50
                            ? "success"
                            : location.aqi <= 100
                            ? "warning"
                            : "error"
                        }
                        size="small"
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Last updated: {new Date(location.lastUpdated).toLocaleString()}
                      </Typography>
                      {!user && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          Sign in to view detailed device information
                        </Typography>
                      )}
                    </Box>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Paper>
        )}
        
        {!user && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            Register or sign in to access detailed device information and historical data
          </Typography>
        )}
      </Box>

      {/* Features Section */}
      <Typography variant="h3" component="h2" align="center" sx={{ mb: 6, fontWeight: 600 }}>
        Monitoring Features
      </Typography>
      <Grid container spacing={4} sx={{ mb: 10 }}>
        <Grid size={{xs:12, md:4}}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="h3" gutterBottom>
                Real-time Data
              </Typography>
              <Typography color="text.secondary">
                Monitor air quality metrics in real-time with our advanced sensor network across Corpus Christi.
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to={user ? "/dashboard" : "/signup"} size="small">
                {user ? "View Data" : "Sign Up"}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{xs:12, md:4}}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="h3" gutterBottom>
                Historical Trends
              </Typography>
              <Typography color="text.secondary">
                Analyze historical data with interactive charts and customizable time ranges.
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to={user ? "/dashboard" : "/signup"} size="small">
                {user ? "View Trends" : "Sign Up"}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{xs:12, md:4}}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="h3" gutterBottom>
                Multi-Device Support
              </Typography>
              <Typography color="text.secondary">
                Compare data from multiple monitoring devices across different locations.
              </Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to={user ? "/dashboard" : "/signup"} size="small">
                {user ? "Compare Devices" : "Sign Up"}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Call to Action */}
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
          Ready to Monitor Air Quality?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
          Create an account to access detailed air quality data, analytics, and historical trends for Corpus Christi.
        </Typography>
        <Button
          component={Link}
          to="/signup"
          variant="contained"
          size="large"
          sx={{ px: 6, py: 1.5, backgroundColor: '#2e7d32' }}
        >
          Create Your Account
        </Button>
      </Box>
    </Container>
  );
};