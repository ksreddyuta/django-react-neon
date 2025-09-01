/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Button,
  Alert,
} from "@mui/material";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapLocation, Device } from "../../types/airQuality";
import { airQualityService } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

// Fix for default markers in react-leaflet
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Corpus Christi coordinates (new default)
const CORPUS_CHRISTI_CENTER: [number, number] = [27.8006, -97.3964];

// Custom hook to update map view
const MapViewUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({
  center,
  zoom,
}) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Topography tile layer
const TopographyTileLayer: React.FC = () => (
  <TileLayer
    url="https://{s}.tile.openttopomap.org/{z}/{x}/{y}.png"
    attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://openttopomap.org">OpenTopoMap</a>'
  />
);

// Standard tile layer
const StandardTileLayer: React.FC = () => (
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  />
);

// Custom marker icon based on AQI
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

// Define the props interface
interface MapSectionProps {
  onDeviceSelect: (deviceId: string) => void;
  selectedDevice: string | null;
}

export const MapSection: React.FC<MapSectionProps> = ({ onDeviceSelect, selectedDevice }) => {
  const [mapType, setMapType] = useState<"standard" | "topography">("standard");
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setDevicesLoading(true);
        const devicesData = await airQualityService.getDevices();
        setDevices(devicesData);
      } catch (error) {
        console.error("Failed to fetch devices:", error);
        setError("Failed to load devices");
      } finally {
        setDevicesLoading(false);
      }
    };

    fetchDevices();
  }, []);

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Generate mock map locations based on devices
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const mockLocations: MapLocation[] = devices.map((device, _index) => {
          // Create coordinates around Corpus Christi area
          const lat = CORPUS_CHRISTI_CENTER[0] + (Math.random() - 0.5) * 0.1;
          const lng = CORPUS_CHRISTI_CENTER[1] + (Math.random() - 0.5) * 0.1;
          
          return {
            lat,
            lng,
            name: device.display_name || device.name,
            aqi: Math.floor(Math.random() * 100) + 1, // Random AQI between 1-100
            lastUpdated: new Date().toISOString(),
            device: device.id
          };
        });
        
        setLocations(mockLocations);
      } catch (error) {
        console.error("Failed to fetch map data:", error);
        setError("Failed to load map data");
        // Fallback to Corpus Christi data if API fails
        setLocations([
          {
            lat: 27.8006,
            lng: -97.3964,
            name: "Corpus Christi Downtown",
            aqi: 38,
            lastUpdated: new Date().toISOString(),
            device: "aq_UTIS0001-VOC-V6_1"
          },
          {
            lat: 27.7609,
            lng: -97.4350,
            name: "Corpus Christi South",
            aqi: 42,
            lastUpdated: new Date().toISOString(),
            device: "aq_UTIS0001-VOC-V6_1"
          },
          {
            lat: 27.8500,
            lng: -97.1500,
            name: "Corpus Christi North",
            aqi: 35,
            lastUpdated: new Date().toISOString(),
            device: "aq_UTIS0001-VOC-V6_1"
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (devices.length > 0) {
      fetchMapData();
    }
  }, [devices]);

  const handleDeviceChange = (event: any) => {
    const deviceId = event.target.value;
    onDeviceSelect(deviceId);
  };

  const downloadAllDataCSV = async () => {
    try {
      // Use the first air quality device for export
      const airQualityDevices = devices.filter(d => d.type === 'air_quality');
      if (airQualityDevices.length === 0) {
        alert('No air quality devices available for export');
        return;
      }
      
      const deviceId = airQualityDevices[0].id;
      const pollutant = 'VOC';
      
      // Use the CSV export endpoint
      const response = await fetch(`http://localhost:8000/api/air-quality/${encodeURIComponent(deviceId)}/${encodeURIComponent(pollutant)}/?format=csv`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.download_url) {
        // Open the download URL in a new tab
        window.open(data.download_url, '_blank');
      } else if (data.message) {
        alert(data.message);
      }
    } catch (error) {
      console.error('Failed to download CSV:', error);
      alert('Failed to download CSV. Please try again.');
    }
  };

  const selectedLocation = selectedDevice 
    ? locations.find(loc => loc.device === selectedDevice)
    : null;

  const mapCenter = selectedLocation 
    ? [selectedLocation.lat, selectedLocation.lng] as [number, number]
    : CORPUS_CHRISTI_CENTER;

  if (loading || devicesLoading) {
    return (
      <Paper
        sx={{
          p: 3,
          height: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 400 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          Texas Air Quality Map
        </Typography>
        
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Device</InputLabel>
            <Select
              value={selectedDevice || ""}
              label="Device"
              onChange={handleDeviceChange}
            >
              {devices.map((device) => (
                <MenuItem key={device.id} value={device.id}>
                  {device.display_name || device.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Map Type</InputLabel>
            <Select
              value={mapType}
              label="Map Type"
              onChange={(e) =>
                setMapType(e.target.value as "standard" | "topography")
              }
            >
              <MenuItem value="standard">Standard</MenuItem>
              <MenuItem value="topography">Topography</MenuItem>
            </Select>
          </FormControl>

          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <Button 
              variant="outlined" 
              onClick={downloadAllDataCSV}
              size="small"
            >
              Export Sample Data
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ height: 320, borderRadius: 1, overflow: "hidden" }}>
        <MapContainer
          center={mapCenter}
          zoom={selectedLocation ? 12 : 10}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <MapViewUpdater center={mapCenter} zoom={selectedLocation ? 12 : 10} />
          {mapType === "topography" ? (
            <TopographyTileLayer />
          ) : (
            <StandardTileLayer />
          )}

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
                    Device: {location.device}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Last updated:{" "}
                    {new Date(location.lastUpdated).toLocaleString()}
                  </Typography>
                </Box>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Box>
    </Paper>
  );
};