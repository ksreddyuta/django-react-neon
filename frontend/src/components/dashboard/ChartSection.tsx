/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Button,
  Alert,
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useOptimizedDataFetch } from '../../hooks/useOptimizedDataFetch';
import { useAuth } from '../../hooks/useAuth';

// Metrics options with labels and units
const METRICS_OPTIONS = [
  { value: 'VOC', name: 'Volatile Organic Compounds', shortName: 'VOC', unit: 'ppb' },
  { value: 'O3', name: 'Ozone', shortName: 'O₃', unit: 'ppb' },
  { value: 'SO2', name: 'Sulfur Dioxide', shortName: 'SO₂', unit: 'ppb' },
  { value: 'NO2', name: 'Nitrogen Dioxide', shortName: 'NO₂', unit: 'ppb' },
  { value: 'PM2_5', name: 'PM2.5', shortName: 'PM₂.₅', unit: 'μg/m³' },
  { value: 'PM10', name: 'PM10', shortName: 'PM₁₀', unit: 'μg/m³' },
  { value: 'Humidity', name: 'Humidity', shortName: 'RH', unit: '%' },
  { value: 'Temperature', name: 'Temperature', shortName: 'Temp', unit: '°C' },
  { value: 'Noise', name: 'Noise', shortName: 'Noise', unit: 'dB' },
  { value: 'Illumination', name: 'Illumination', shortName: 'Light', unit: 'lux' },
];

// Define the props interface
interface ChartSectionProps {
  deviceIds: string[];
  pollutant: string;
  timeRange: string;
}

export const ChartSection: React.FC<ChartSectionProps> = ({ deviceIds, pollutant, timeRange }) => {
  const [selectedMetric, setSelectedMetric] = useState(pollutant);
  const { user } = useAuth();
  
  // Using the first device for demonstration - in a real app you might want to handle multiple devices
  const { data, loading, error, hasMore, loadMore, changeMetric } = 
    useOptimizedDataFetch(deviceIds[0] || '', selectedMetric, timeRange);

  // Get current metric info for labels
  const currentMetric = useMemo(() => 
    METRICS_OPTIONS.find(opt => opt.value === selectedMetric) || 
    { value: selectedMetric, name: selectedMetric, shortName: selectedMetric, unit: '' },
  [selectedMetric]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      timestamp: new Date(item.timestamp).getTime(),
      value: item.value,
      timeLabel: new Date(item.timestamp).toLocaleString(),
    }));
  }, [data]);

  const handleMetricChange = (event: any) => {
    const newMetric = event.target.value;
    setSelectedMetric(newMetric);
    changeMetric(newMetric);
  };

  if (deviceIds.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>Select devices on the map to view data</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h2">
          Air Quality Data for {deviceIds.length} {deviceIds.length === 1 ? 'Device' : 'Devices'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel id="metric-select-label">Metric</InputLabel>
            <Select
              labelId="metric-select-label"
              value={selectedMetric}
              label="Metric"
              onChange={handleMetricChange}
            >
              {METRICS_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  <Box>
                    <Typography variant="body2">{option.shortName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.name}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <Button 
              variant="outlined" 
              disabled={!data || data.length === 0}
            >
              Download CSV
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {chartData.length === 0 && !loading && (
        <Typography sx={{ mb: 2, textAlign: 'center' }}>
          No data available for the selected devices and metric
        </Typography>
      )}

      {chartData.length > 0 && (
        <Box sx={{ height: 400, mb: 3 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                type="number"
                domain={['dataMin', 'dataMax']}
                label={{ value: 'Time', position: 'insideBottomRight', offset: -5 }}
              />
              <YAxis 
                label={{ 
                  value: currentMetric.unit, 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10
                }}
              />
              <Tooltip 
                formatter={(value) => [`${value} ${currentMetric.unit}`, currentMetric.name]}
                labelFormatter={(value) => new Date(Number(value)).toLocaleString()}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                name={currentMetric.name}
                stroke="#8884d8" 
                dot={false}
                activeDot={{ r: 4 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {hasMore && !loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="outlined" onClick={loadMore}>
            Load More Data
          </Button>
        </Box>
      )}
    </Box>
  );
};