import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  useTheme,
  type SelectChangeEvent,
} from '@mui/material';
import { ResponsiveLine } from '@nivo/line';
import type { AirQualityData, AirQualityResponse } from '../../types/airQuality';

// Pollutant options
const POLLUTANTS = [
  { id: 'pm25', label: 'PM2.5', color: 'hsl(0, 70%, 50%)' },
  { id: 'pm10', label: 'PM10', color: 'hsl(120, 70%, 50%)' },
  { id: 'no2', label: 'NO₂', color: 'hsl(240, 70%, 50%)' },
  { id: 'so2', label: 'SO₂', color: 'hsl(60, 70%, 50%)' },
  { id: 'o3', label: 'O₃', color: 'hsl(300, 70%, 50%)' },
  { id: 'co', label: 'CO', color: 'hsl(180, 70%, 50%)' },
];

// Time range options
const TIME_RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

export const ChartSection: React.FC = () => {
  const theme = useTheme();
  const [selectedPollutants, setSelectedPollutants] = useState<string[]>(['pm25', 'pm10']);
  const [timeRange, setTimeRange] = useState<number>(30);
  const [airQualityData, setAirQualityData] = useState<AirQualityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAirQualityData = async () => {
      try {
        setLoading(true);
        // In a real app, this would come from your API
        const mockData: AirQualityResponse = {
          city: 'Austin',
          data: Array.from({ length: timeRange }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (timeRange - i - 1));
            
            return {
              timestamp: date.toISOString(),
              pm25: Math.random() * 30 + 20,
              pm10: Math.random() * 40 + 30,
              no2: Math.random() * 20 + 10,
              so2: Math.random() * 5 + 2,
              o3: Math.random() * 25 + 15,
              co: Math.random() * 1 + 0.5,
            };
          }),
        };
        setAirQualityData(mockData);
      } catch (error) {
        console.error('Failed to fetch air quality data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAirQualityData();
  }, [timeRange]);

  // Format data for Nivo line chart
  const formatChartData = () => {
    if (!airQualityData) return [];

    return selectedPollutants.map(pollutantId => {
      const pollutantConfig = POLLUTANTS.find(p => p.id === pollutantId);
      
      return {
        id: pollutantConfig?.label || pollutantId,
        color: pollutantConfig?.color,
        data: airQualityData.data.map(item => ({
          x: new Date(item.timestamp).toLocaleDateString(),
          y: item[pollutantId as keyof AirQualityData] as number,
        })),
      };
    });
  };

  const handlePollutantChange = (event: SelectChangeEvent<string[]>) => {
  const value = event.target.value;
  setSelectedPollutants(typeof value === 'string' ? value.split(',') : value);
};
  if (loading) {
    return (
      <Paper sx={{ p: 3, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>Loading air quality data...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 400 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          Air Quality Trends
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(Number(e.target.value))}
            >
              {TIME_RANGES.map(range => (
                <MenuItem key={range.value} value={range.value}>{range.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Pollutants</InputLabel>
            <Select
              multiple
              value={selectedPollutants}
              label="Pollutants"
              onChange={handlePollutantChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const pollutant = POLLUTANTS.find(p => p.id === value);
                    return <Chip key={value} label={pollutant?.label || value} size="small" />;
                  })}
                </Box>
              )}
            >
              {POLLUTANTS.map((pollutant) => (
                <MenuItem key={pollutant.id} value={pollutant.id}>
                  {pollutant.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ height: 320 }}>
        <ResponsiveLine
          data={formatChartData()}
          margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
          xScale={{ type: 'point' }}
          yScale={{
            type: 'linear',
            min: 0,
            max: 'auto',
            stacked: false,
          }}
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 45,
            legend: 'Date',
            legendOffset: 40,
            legendPosition: 'middle',
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Concentration',
            legendOffset: -40,
            legendPosition: 'middle',
          }}
          colors={{ datum: 'color' }}
          pointSize={8}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          pointLabelYOffset={-12}
          useMesh={true}
          legends={[
            {
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 100,
              translateY: 0,
              itemsSpacing: 0,
              itemDirection: 'left-to-right',
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 12,
              symbolShape: 'circle',
            },
          ]}
          theme={{
            axis: {
              ticks: {
                text: {
                  fill: theme.palette.text.primary,
                },
              },
              legend: {
                text: {
                  fill: theme.palette.text.primary,
                },
              },
            },
            legends: {
              text: {
                fill: theme.palette.text.primary,
              },
            },
          }}
        />
      </Box>
    </Paper>
  );
};