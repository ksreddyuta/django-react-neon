export interface AirQualityData {
  timestamp: string;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  o3: number;
  co: number;
}

export interface AirQualityResponse {
  device: string;
  pollutant: string;
  data: {
    timestamp: string;
    value: number;
    site_name: string;
    pollutant: string;
  }[];
}

export interface MapLocation {
  lat: number;
  lng: number;
  name: string;
  aqi: number;
  lastUpdated: string;
  device?: string;
}

export interface Pollutant {
  id: string;
  name: string;
  unit: string;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  lastBatteryLevel: number;
  display_name: string;
}

export interface BatteryData {
  timestamp: string;
  value: number;
  site_name: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windspeed: number;
  winddirection: number;
  pressure: number;
  solar_radiation: number;
  timestamp: string;
  location: string;
}

export interface PollutantStats {
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface ExportFile {
  id: number;
  filename: string;
  file_path: string;
  file_type: string;
  device_id?: string;
  pollutant?: string;
  created_by: number;
  created_at: string;
  expires_at: string;
  size: number;
}