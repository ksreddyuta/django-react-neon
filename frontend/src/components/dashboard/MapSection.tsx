/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
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

// Fix for default markers in react-leaflet
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Corpus Christi coordinates
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

// Custom marker icon based on AQI
const createCustomIcon = (aqi: number, isSelected: boolean = false) => {
  let color = "green";
  if (aqi > 100) color = "red";
  else if (aqi > 50) color = "orange";

  const border = isSelected ? "3px solid #2196f3" : "2px solid white";
  const size = isSelected ? 24 : 20;

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: ${border}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${aqi}</div>`,
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2],
  });
};

// Define the props interface
interface MapSectionProps {
  onDeviceSelect: (deviceIds: string[]) => void;
  selectedDevices: string[];
}

export const MapSection: React.FC<MapSectionProps> = ({ onDeviceSelect, selectedDevices }) => {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

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
        const mockLocations: MapLocation[] = devices.map((device) => {
          // Create coordinates around Corpus Christi area
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
    const deviceIds = event.target.value;
    onDeviceSelect(deviceIds);
    
    // Center map on selected devices
    if (deviceIds.length > 0 && mapRef.current) {
      const selectedLocations = locations.filter(loc => deviceIds.includes(loc.device || ''));
      if (selectedLocations.length > 0) {
        const centerLat = selectedLocations.reduce((sum, loc) => sum + loc.lat, 0) / selectedLocations.length;
        const centerLng = selectedLocations.reduce((sum, loc) => sum + loc.lng, 0) / selectedLocations.length;
        mapRef.current.setView([centerLat, centerLng], 12);
      }
    }
  };

  const selectedLocations = selectedDevices.length > 0
    ? locations.filter(loc => selectedDevices.includes(loc.device || ''))
    : locations;

  const mapCenter = selectedLocations.length > 0
    ? [
        selectedLocations.reduce((sum, loc) => sum + loc.lat, 0) / selectedLocations.length,
        selectedLocations.reduce((sum, loc) => sum + loc.lng, 0) / selectedLocations.length
      ] as [number, number]
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
          Corpus Christi Air Quality Map
        </Typography>
        
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Devices</InputLabel>
            <Select
              multiple
              value={selectedDevices}
              label="Devices"
              onChange={handleDeviceChange}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={devices.find(d => d.id === value)?.display_name || value} size="small" />
                  ))}
                </Box>
              )}
            >
              {devices.map((device) => (
                <MenuItem key={device.id} value={device.id}>
                  {device.display_name || device.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
          zoom={selectedLocations.length > 0 ? 12 : 10}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          ref={mapRef}
        >
          <MapViewUpdater center={mapCenter} zoom={selectedLocations.length > 0 ? 12 : 10} />
          
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {locations.map((location, index) => {
            const isSelected = selectedDevices.includes(location.device || '');
            return (
              <Marker
                key={index}
                position={[location.lat, location.lng]}
                icon={createCustomIcon(location.aqi, isSelected)}
                eventHandlers={{
                  click: () => {
                    if (location.device) {
                      if (isSelected) {
                        onDeviceSelect(selectedDevices.filter(id => id !== location.device));
                      } else {
                        onDeviceSelect([...selectedDevices, location.device]);
                      }
                    }
                  }
                }}
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
            );
          })}
        </MapContainer>
      </Box>
    </Paper>
  );
};