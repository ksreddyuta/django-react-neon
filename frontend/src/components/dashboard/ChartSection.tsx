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

// Pollutant options with labels and units - updated to match API response
const POLLUTANT_OPTIONS = [
  { value: 'VOC', label: 'Volatile Organic Compounds', unit: 'ppb' },
  { value: 'O3', label: 'Ozone', unit: 'ppb' },
  { value: 'SO2', label: 'Sulfur Dioxide', unit: 'ppb' },
  { value: 'NO2', label: 'Nitrogen Dioxide', unit: 'ppb' },
];

// Define the props interface
interface ChartSectionProps {
  deviceId: string | null;
}

export const ChartSection: React.FC<ChartSectionProps> = ({ deviceId }) => {
  const [selectedPollutant, setSelectedPollutant] = useState('VOC');
  const { user } = useAuth();
  
  const { data, loading, error, hasMore, loadMore, changePollutant } = 
    useOptimizedDataFetch('/api/air-quality/', deviceId || '', selectedPollutant);

  // Get current pollutant info for labels
  const currentPollutant = useMemo(() => 
    POLLUTANT_OPTIONS.find(opt => opt.value === selectedPollutant) || 
    { value: selectedPollutant, label: selectedPollutant, unit: '' },
  [selectedPollutant]);

  // Download data as CSV
  const downloadCSV = async () => {
    if (!deviceId || !selectedPollutant) return;
    
    try {
      // Use the CSV export endpoint
      const response = await fetch(`http://localhost:8000/api/air-quality/${encodeURIComponent(deviceId)}/${encodeURIComponent(selectedPollutant)}/?format=csv`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      if (responseData.download_url) {
        // Create download link for the CSV file
        window.open(responseData.download_url, '_blank');
      } else if (responseData.message) {
        alert(responseData.message);
      }
    } catch (error) {
      console.error('Failed to download CSV:', error);
      alert('Failed to download CSV. Please try again.');
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      timestamp: new Date(item.timestamp).getTime(),
      value: item.value,
      timeLabel: new Date(item.timestamp).toLocaleString(),
    }));
  }, [data]);

  const handlePollutantChange = (event: any) => {
    const newPollutant = event.target.value;
    setSelectedPollutant(newPollutant);
    changePollutant(newPollutant);
  };

  if (!deviceId) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>Select a device to view data</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" component="h2">
          Air Quality Data for {deviceId.replace('aq_', '').replace('bat_', '')}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel id="pollutant-select-label">Pollutant</InputLabel>
            <Select
              labelId="pollutant-select-label"
              value={selectedPollutant}
              label="Pollutant"
              onChange={handlePollutantChange}
            >
              {POLLUTANT_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <Button 
              variant="outlined" 
              onClick={downloadCSV}
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
          No data available for the selected device and pollutant
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
                  value: currentPollutant.unit, 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10
                }}
              />
              <Tooltip 
                formatter={(value) => [`${value} ${currentPollutant.unit}`, currentPollutant.label]}
                labelFormatter={(value) => new Date(Number(value)).toLocaleString()}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                name={currentPollutant.label}
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