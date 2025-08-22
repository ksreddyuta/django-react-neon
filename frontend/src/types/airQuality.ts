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
  city: string;
  data: AirQualityData[];
}

export interface MapLocation {
  lat: number;
  lng: number;
  name: string;
  aqi: number;
  lastUpdated: string;
}