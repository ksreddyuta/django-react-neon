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
import type { MapLocation } from "../../types/airQuality";

// Fix for default markers in react-leaflet
//delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => void })._getIconUrl= undefined;


L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Austin coordinates
const AUSTIN_CENTER: [number, number] = [30.2672, -97.7431];

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

// Topography tile layer (no duplicate url spread)
const TopographyTileLayer: React.FC = () => (
  <TileLayer
    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
    attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  />
);

// Standard tile layer (no duplicate url spread)
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

export const MapSection: React.FC = () => {
  const [mapType, setMapType] = useState<"standard" | "topography">("standard");
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        // In a real app, this would come from your API
        const mockLocations: MapLocation[] = [
          {
            lat: 30.2672,
            lng: -97.7431,
            name: "Austin Downtown",
            aqi: 45,
            lastUpdated: new Date().toISOString(),
          },
          {
            lat: 30.2302,
            lng: -97.8143,
            name: "Austin South",
            aqi: 52,
            lastUpdated: new Date().toISOString(),
          },
          {
            lat: 27.8006,
            lng: -97.3964,
            name: "Corpus Christi",
            aqi: 38,
            lastUpdated: new Date().toISOString(),
          },
          {
            lat: 30.4229,
            lng: -97.7545,
            name: "Austin North",
            aqi: 48,
            lastUpdated: new Date().toISOString(),
          },
        ];
        setLocations(mockLocations);
      } catch (error) {
        console.error("Failed to fetch map data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, []);

  if (loading) {
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
        <Typography>Loading map data...</Typography>
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
        }}
      >
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          Texas Air Quality Map
        </Typography>
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
      </Box>

      <Box sx={{ height: 320, borderRadius: 1, overflow: "hidden" }}>
        <MapContainer
          center={AUSTIN_CENTER}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <MapViewUpdater center={AUSTIN_CENTER} zoom={7} />
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
