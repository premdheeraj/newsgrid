export type WeatherLocation = {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type WeatherSnapshot = {
  location: WeatherLocation;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  precipitation: number;
  weatherCode: number;
  high: number;
  low: number;
  sunrise: string;
  sunset: string;
  updatedAt: string;
};

const DEFAULT_LOCATION: WeatherLocation = {
  id: 1273294,
  name: 'New Delhi',
  admin1: 'Delhi',
  country: 'India',
  latitude: 28.63576,
  longitude: 77.22445,
  timezone: 'Asia/Kolkata',
};

export { DEFAULT_LOCATION };

export async function searchLocations(query: string, signal?: AbortSignal): Promise<WeatherLocation[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];
  const params = new URLSearchParams({ name: clean, count: '6', language: 'en', format: 'json' });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  if (!response.ok) throw new Error('Location search is temporarily unavailable');
  const payload = (await response.json()) as { results?: WeatherLocation[] };
  return payload.results ?? [];
}

export async function fetchWeather(location: WeatherLocation, signal?: AbortSignal): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m',
    daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '1',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!response.ok) throw new Error('Weather service is temporarily unavailable');
  const payload = (await response.json()) as {
    current: {
      temperature_2m: number;
      relative_humidity_2m: number;
      apparent_temperature: number;
      precipitation: number;
      weather_code: number;
      cloud_cover: number;
      wind_speed_10m: number;
      wind_direction_10m: number;
      time: string;
    };
    daily: {
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      sunrise: string[];
      sunset: string[];
    };
  };
  return {
    location,
    temperature: payload.current.temperature_2m,
    apparentTemperature: payload.current.apparent_temperature,
    humidity: payload.current.relative_humidity_2m,
    windSpeed: payload.current.wind_speed_10m,
    windDirection: payload.current.wind_direction_10m,
    cloudCover: payload.current.cloud_cover,
    precipitation: payload.current.precipitation,
    weatherCode: payload.current.weather_code,
    high: payload.daily.temperature_2m_max[0],
    low: payload.daily.temperature_2m_min[0],
    sunrise: payload.daily.sunrise[0],
    sunset: payload.daily.sunset[0],
    updatedAt: payload.current.time,
  };
}

export function weatherDetails(code: number) {
  if (code === 0) return { label: 'Clear sky', mark: 'SUN' };
  if (code <= 3) return { label: 'Partly cloudy', mark: 'CLOUD' };
  if (code <= 48) return { label: 'Mist or fog', mark: 'MIST' };
  if (code <= 57) return { label: 'Light drizzle', mark: 'RAIN' };
  if (code <= 67) return { label: 'Rainfall', mark: 'RAIN' };
  if (code <= 77) return { label: 'Snowfall', mark: 'SNOW' };
  if (code <= 82) return { label: 'Rain showers', mark: 'RAIN' };
  if (code <= 86) return { label: 'Snow showers', mark: 'SNOW' };
  return { label: 'Thunderstorms', mark: 'STORM' };
}

export function compassDirection(degrees: number) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(degrees / 45) % 8];
}
