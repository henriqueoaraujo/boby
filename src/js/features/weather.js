import { state } from "../core/state.js";
import {
  deriveWeatherWarnings,
  getWeatherLabel
} from "../core/weatherRules.js";

const LOCATION_KEY = "boby:weather-location";
const WEATHER_CACHE_KEY = "boby:weather-cache";

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A previsão continua disponível na sessão mesmo sem espaço no cache.
  }
}

async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function announceWeather(data) {
  window.dispatchEvent(new CustomEvent("boby:weather-update", {
    detail: data
  }));
}

async function geocodeCity(name) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "pt");
  url.searchParams.set("format", "json");
  const response = await fetchWithTimeout(url);
  const result = (await response.json()).results?.[0];
  if (!response.ok || !result) throw new Error("Cidade não encontrada.");

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    city: [result.name, result.admin1].filter(Boolean).join(", ")
  };
}

function requestBrowserLocation() {
  if (!("geolocation" in navigator) || !navigator.onLine) return Promise.resolve(null);

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }),
      () => resolve(null),
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 30,
        timeout: 9000
      }
    );
  });
}

async function reverseGeocodeCoordinates({ latitude, longitude }) {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("localityLanguage", "pt");

  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error("Localização indisponível.");

  const result = await response.json();
  const cityParts = [
    result.city || result.locality || result.principalSubdivision,
    result.principalSubdivision
  ].filter(Boolean);

  return {
    latitude,
    longitude,
    city: [...new Set(cityParts)].join(", ") || "sua localização"
  };
}

async function fetchForecast(location) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", location.latitude);
  url.searchParams.set("longitude", location.longitude);
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set(
    "daily",
    "weather_code,precipitation_probability_max,wind_gusts_10m_max,temperature_2m_max,temperature_2m_min"
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error("Previsão indisponível.");
  const forecast = await response.json();
  const weatherCode = forecast.current.weather_code;
  const warnings = deriveWeatherWarnings({
    weatherCode: forecast.daily.weather_code?.[0] ?? weatherCode,
    precipitationProbability: forecast.daily.precipitation_probability_max?.[0],
    windGust: forecast.daily.wind_gusts_10m_max?.[0],
    maxTemperature: forecast.daily.temperature_2m_max?.[0],
    minTemperature: forecast.daily.temperature_2m_min?.[0]
  });

  return {
    city: location.city,
    temperature: forecast.current.temperature_2m,
    minTemperature: forecast.daily.temperature_2m_min?.[0],
    maxTemperature: forecast.daily.temperature_2m_max?.[0],
    weatherCode,
    condition: getWeatherLabel(weatherCode),
    warnings,
    updatedAt: Date.now()
  };
}

export async function updateWeatherForCurrentLocation() {
  const coordinates = await requestBrowserLocation();
  if (!coordinates) return null;

  try {
    const location = await reverseGeocodeCoordinates(coordinates);
    const data = await fetchForecast(location);
    saveJson(LOCATION_KEY, location);
    saveJson(WEATHER_CACHE_KEY, data);
    announceWeather(data);
    return data;
  } catch {
    return null;
  }
}

export async function updateWeatherForCity(cityName) {
  const name = String(cityName || "").trim();
  if (!name || !navigator.onLine) {
    const cached = readJson(WEATHER_CACHE_KEY);
    if (cached) announceWeather(cached);
    return cached;
  }

  try {
    const location = await geocodeCity(name);
    const data = await fetchForecast(location);
    saveJson(LOCATION_KEY, location);
    saveJson(WEATHER_CACHE_KEY, data);
    announceWeather(data);
    return data;
  } catch {
    const cached = readJson(WEATHER_CACHE_KEY);
    if (cached) announceWeather(cached);
    return cached;
  }
}

export async function initializeWeather() {
  const metadata = state.session.user?.user_metadata || {};
  const city = metadata.city || readJson(LOCATION_KEY)?.city || "";
  const cached = readJson(WEATHER_CACHE_KEY);

  if (cached) announceWeather(cached);
  const locationWeather = await updateWeatherForCurrentLocation();
  if (locationWeather) return locationWeather;
  if (city) return updateWeatherForCity(city);

  announceWeather(null);
  return null;
}
