/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Tabs,
  Tab,
  Alert,
} from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { MapSection } from "../components/dashboard/MapSection";
import { ChartSection } from "../components/dashboard/ChartSection";
import { airQualityService } from "../services/api";

// Tab panel component
function TabPanel(props: {
  [x: string]: any;
  children: any;
  value: any;
  index: any;
}) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`pollutant-tabpanel-${index}`}
      aria-labelledby={`pollutant-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Pollutant information
const POLLUTANT_INFO = [
  {
    id: 'VOC',
    name: 'Volatile Organic Compounds',
    shortName: 'VOC',
    unit: 'ppb',
    description: 'Organic chemicals that have a high vapor pressure at room temperature.',
    healthEffects: 'Eye, nose, and throat irritation; headaches; loss of coordination; nausea; damage to liver, kidney, and central nervous system.',
    safeLevel: 'Below 500 ppb'
  },
  {
    id: 'O3',
    name: 'Ozone',
    shortName: 'O₃',
    unit: 'ppb',
    description: 'A colorless gas that occurs both in the Earth\'s upper atmosphere and at ground level.',
    healthEffects: 'Coughing, throat irritation, worsening of asthma, bronchitis, and emphysema.',
    safeLevel: 'Below 70 ppb'
  },
  {
    id: 'SO2',
    name: 'Sulfur Dioxide',
    shortName: 'SO₂',
    unit: 'ppb',
    description: 'A toxic gas with a pungent, irritating smell.',
    healthEffects: 'Respiratory problems, including airway inflammation and bronchoconstriction.',
    safeLevel: 'Below 75 ppb'
  },
  {
    id: 'NO2',
    name: 'Nitrogen Dioxide',
    shortName: 'NO₂',
    unit: 'ppb',
    description: 'A reddish-brown gas with a sharp, biting odor.',
    healthEffects: 'Airway inflammation, increased asthma symptoms, respiratory infections.',
    safeLevel: 'Below 53 ppb'
  },
  {
    id: 'PM2_5',
    name: 'Fine Particulate Matter',
    shortName: 'PM₂.₅',
    unit: 'μg/m³',
    description: 'Fine inhalable particles, with diameters that are generally 2.5 micrometers and smaller.',
    healthEffects: 'Premature death in people with heart or lung disease, nonfatal heart attacks, irregular heartbeat, aggravated asthma, decreased lung function.',
    safeLevel: 'Below 12 μg/m³'
  },
  {
    id: 'PM10',
    name: 'Coarse Particulate Matter',
    shortName: 'PM₁₀',
    unit: 'μg/m³',
    description: 'Inhalable particles, with diameters that are generally 10 micrometers and smaller.',
    healthEffects: 'Aggravated asthma, respiratory symptoms such as coughing or difficulty breathing.',
    safeLevel: 'Below 54 μg/m³'
  }
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedPollutant, setSelectedPollutant] = useState(0);
  const [timeRange, setTimeRange] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('VOC');
  const [devices, setDevices] = useState<any[]>([]);
  const [, setDevicesLoading] = useState(true);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setDevicesLoading(true);
        const devicesData = await airQualityService.getDevices();
        setDevices(devicesData);
        
        // Set first device as default if none selected
        if (devicesData.length > 0 && selectedDevices.length === 0) {
          setSelectedDevices([devicesData[0].id]);
        }
      } catch (error) {
        console.error("Failed to fetch devices:", error);
      } finally {
        setDevicesLoading(false);
      }
    };

    fetchDevices();
  }, [selectedDevices.length]);

  const handlePollutantChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedPollutant(newValue);
    setSelectedMetric(POLLUTANT_INFO[newValue].id);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          Corpus Christi Air Quality Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.email}! Monitor air quality across Corpus Christi in
          real-time.
        </Typography>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={4}>
        {/* Left Column - Pollutant Information */}
        <Grid size={{xs:12, md:4, lg:3}}>
          <Paper sx={{ p: 3, position: "sticky", top: 20 }}>
            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Air Quality Metrics
            </Typography>

            <Tabs
              value={selectedPollutant}
              onChange={handlePollutantChange}
              orientation="vertical"
              variant="scrollable"
              sx={{ borderRight: 1, borderColor: 'divider', minHeight: 400 }}
            >
              {POLLUTANT_INFO.map((pollutant) => (
                <Tab 
                  key={pollutant.id}
                  label={
                    <Box sx={{ textAlign: 'left', width: '100%' }}>
                      <Typography variant="body2" fontWeight="medium">
                        {pollutant.shortName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pollutant.name}
                      </Typography>
                    </Box>
                  } 
                  sx={{ alignItems: 'flex-start', py: 1.5 }}
                />
              ))}
            </Tabs>
          </Paper>
        </Grid>

        {/* Right Column - Map, Charts, and Pollutant Details */}
        <Grid size={{xs:12, md:8, lg:9}} >
          <Grid container spacing={4}>
            {/* Pollutant Information Panel */}
            <Grid size={{xs:12}}>
              <Paper sx={{ p: 3 }}>
                {POLLUTANT_INFO.map((pollutant, index) => (
                  <TabPanel key={pollutant.id} value={selectedPollutant} index={index}>
                    <Typography variant="h6" gutterBottom>
                      {pollutant.name} ({pollutant.shortName})
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {pollutant.description}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Health Effects:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pollutant.healthEffects}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Safe Level:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pollutant.safeLevel}
                      </Typography>
                    </Box>
                  </TabPanel>
                ))}
              </Paper>
            </Grid>

            {/* Map Section */}
            <Grid size={{xs:12}}>
              <MapSection
                onDeviceSelect={setSelectedDevices}
                selectedDevices={selectedDevices}
              />
            </Grid>

            {/* Chart Section */}
            <Grid size={{xs:12}}>
              <ChartSection 
                deviceIds={selectedDevices} 
                pollutant={selectedMetric}
                timeRange={timeRange}
                onMetricChange={setSelectedMetric}
                onTimeRangeChange={setTimeRange}
                availableDevices={devices}
              />
            </Grid>

            {/* Quick Stats */}
            <Grid size={{xs:12}}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>UTA Research Project:</strong> This air quality monitoring system is part of a research initiative 
                  at the University of Texas at Arlington to study urban air quality patterns and their health impacts.
                </Typography>
              </Alert>
              
              <Grid container spacing={3}>
                <Grid size={{xs:12, sm:6, md:3}}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "success.light",
                      color: "success.contrastText",
                    }}
                  >
                    <Typography variant="h4" component="div" gutterBottom>
                      45
                    </Typography>
                    <Typography variant="body2">
                      Good Air Quality Days
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{xs:12, sm:6, md:3}}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "warning.light",
                      color: "warning.contrastText",
                    }}
                  >
                    <Typography variant="h4" component="div" gutterBottom>
                      12
                    </Typography>
                    <Typography variant="body2">
                      Moderate Air Quality Days
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{xs:12, sm:6, md:3}}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "error.light",
                      color: "error.contrastText",
                    }}
                  >
                    <Typography variant="h4" component="div" gutterBottom>
                      3
                    </Typography>
                    <Typography variant="body2">Unhealthy Days</Typography>
                  </Paper>
                </Grid>
                <Grid size={{xs:12, sm:6, md:3}} >
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: "center",
                      bgcolor: "info.light",
                      color: "info.contrastText",
                    }}
                  >
                    <Typography variant="h4" component="div" gutterBottom>
                      24
                    </Typography>
                    <Typography variant="body2">Monitoring Stations</Typography>
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