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
import { useMultiDeviceDataFetch } from '../../hooks/useMultiDeviceDataFetch';
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

// Colors for different device lines
const LINE_COLORS = ['#8884d8', '#82ca9d', '#ff7300', '#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00'];

// Define the props interface
interface ChartSectionProps {
  deviceIds: string[];
  pollutant: string;
  timeRange: string;
  onMetricChange: (metric: string) => void;
  onTimeRangeChange: (timeRange: string) => void;
  availableDevices: any[];
}

export const ChartSection: React.FC<ChartSectionProps> = ({ 
  deviceIds, 
  pollutant, 
  timeRange, 
  onMetricChange, 
  onTimeRangeChange,
  availableDevices 
}) => {
  const [selectedMetric, setSelectedMetric] = useState(pollutant);
  const { user } = useAuth();
  
  const { data, loading, error, changeMetric } = useMultiDeviceDataFetch(deviceIds, selectedMetric, timeRange);

  // Get current metric info for labels
  const currentMetric = useMemo(() => 
    METRICS_OPTIONS.find(opt => opt.value === selectedMetric) || 
    { value: selectedMetric, name: selectedMetric, shortName: selectedMetric, unit: '' },
  [selectedMetric]);

  // Prepare chart data - combine all device data by timestamp
  const chartData = useMemo(() => {
    if (!data || Object.keys(data).length === 0) return [];
    
    // Get all timestamps from all devices
    const allTimestamps = new Set();
    Object.values(data).forEach(deviceData => {
      deviceData.forEach((item: any) => {
        // Filter out invalid timestamps
        if (item.timestamp && !isNaN(new Date(item.timestamp).getTime())) {
          allTimestamps.add(new Date(item.timestamp).getTime());
        }
      });
    });
    
    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a: any, b: any) => a - b);
    
    // Create data points for each timestamp
    const result = sortedTimestamps.map(timestamp => {
      const dataPoint: any = {
        timestamp,
        timeLabel: new Date(Number(timestamp)).toLocaleString(),
      };
      
      // Add values for each device at this timestamp
      Object.entries(data).forEach(([deviceId, deviceData]) => {
        const deviceName = availableDevices.find(d => d.id === deviceId)?.display_name || deviceId;
        const matchingItem = deviceData.find((item: any) => 
          item.timestamp && new Date(item.timestamp).getTime() === timestamp
        );
        
        if (matchingItem && matchingItem.value !== undefined && matchingItem.value !== null) {
          // Ensure value is a number and filter out extreme values
          const numValue = Number(matchingItem.value);
          if (!isNaN(numValue) && Math.abs(numValue) < 1e10) { // Filter out extreme values
            dataPoint[deviceName] = numValue;
          }
        }
      });
      
      return dataPoint;
    });
    
    return result.filter(point => {
      // Filter out points with no valid data
      return Object.keys(point).some(key => 
        key !== 'timestamp' && key !== 'timeLabel' && point[key] !== undefined
      );
    });
  }, [data, availableDevices]);

  const handleMetricChange = (event: any) => {
    const newMetric = event.target.value;
    setSelectedMetric(newMetric);
    changeMetric(newMetric);
    onMetricChange(newMetric);
  };

  const handleTimeRangeChange = (event: any) => {
    onTimeRangeChange(event.target.value);
  };

  // Find min and max values across all devices for Y-axis scaling
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 10];
    
    let min = Infinity;
    let max = -Infinity;
    let hasValidData = false;
    
    chartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'timestamp' && key !== 'timeLabel' && point[key] !== undefined) {
          const numValue = Number(point[key]);
          if (!isNaN(numValue)) {
            min = Math.min(min, numValue);
            max = Math.max(max, numValue);
            hasValidData = true;
          }
        }
      });
    });
    
    if (!hasValidData) return [0, 10];
    
    // Handle cases where min and max are the same
    if (min === max) {
      min = min - 1;
      max = max + 1;
    }
    
    // Add some padding to the domain
    const padding = (max - min) * 0.1;
    return [Math.max(min - padding, 0), max + padding]; // Ensure minimum is not negative if possible
  }, [chartData]);

  // Format X-axis ticks based on time range
  const formatXAxisTick = (value: number) => {
    const date = new Date(value);
    
    if (timeRange === 'day') {
      // For 24 hours, show hours:minutes with AM/PM
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } else {
      // For longer ranges, show month/day
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Format tooltip date based on time range
  const formatTooltipDate = (value: number) => {
    const date = new Date(value);
    
    if (timeRange === 'day') {
      return date.toLocaleString([], { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  if (deviceIds.length === 0) {
    return (
      <Box sx={{ 
        p: 3, 
        textAlign: 'center', 
        color: 'text.secondary',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <Typography variant="h6" gutterBottom>
          No Devices Selected
        </Typography>
        <Typography variant="body2">
          Please select one or more devices from the map to view data
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h2">
          Air Quality Data for Selected Devices
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel id="time-range-select-label">Time Range</InputLabel>
            <Select
              labelId="time-range-select-label"
              value={timeRange}
              label="Time Range"
              onChange={handleTimeRangeChange}
            >
              <MenuItem value="day">Last 24 Hours</MenuItem>
              <MenuItem value="week">Last 7 Days</MenuItem>
              <MenuItem value="month">Last 30 Days</MenuItem>
            </Select>
          </FormControl>
          
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
              disabled={!chartData || chartData.length === 0}
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
                top: 20,
                right: 30,
                left: 20,
                bottom: 80, // Increased bottom margin for X-axis label
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatXAxisTick}
                type="number"
                domain={['dataMin', 'dataMax']}
                tick={{ 
                  fontWeight: 'bold', 
                  fontSize: 12,
                  fill: '#000' // Black text for X-axis ticks
                }}
                label={{ 
                  value: timeRange === 'day' ? 'Time of Day' : 'Date', 
                  position: 'insideBottom', 
                  offset: -60, // Increased offset for more space
                  fontWeight: 'bold',
                  fontSize: 14,
                  fill: '#000' // Black text for X-axis label
                }}
                angle={-45}
                textAnchor="end"
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ 
                  fontWeight: 'bold', 
                  fontSize: 12,
                  fill: '#000' // Black text for Y-axis ticks
                }}
                domain={yAxisDomain}
                tickFormatter={(value) => {
                  // Format numbers to avoid scientific notation for reasonable values
                  if (Math.abs(value) > 10000 || (Math.abs(value) < 0.001 && value !== 0)) {
                    return value.toExponential(2);
                  }
                  return Number(value.toFixed(4));
                }}
                label={{ 
                  value: currentMetric.unit, 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10,
                  style: { 
                    fontWeight: 'bold', 
                    fontSize: 14,
                    fill: '#000' // Black text for Y-axis label
                  }
                }}
                width={80}
              />
              <Tooltip 
                formatter={(value, name) => {
                  const numValue = Number(value);
                  return [
                    `${Math.abs(numValue) > 10000 || (Math.abs(numValue) < 0.001 && numValue !== 0) 
                      ? numValue.toExponential(2) 
                      : numValue.toFixed(4)} ${currentMetric.unit}`, 
                    name
                  ];
                }}
                labelFormatter={formatTooltipDate}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ paddingBottom: '10px' }}
              />
              {deviceIds.map((deviceId, index) => {
                const deviceName = availableDevices.find(d => d.id === deviceId)?.display_name || deviceId;
                return (
                  <Line 
                    key={deviceId}
                    type="monotone" 
                    dataKey={deviceName}
                    name={deviceName}
                    stroke={LINE_COLORS[index % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }} 
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};