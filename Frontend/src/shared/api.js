import axios from "axios";
import { API_BASE_URL } from "./config";

// newest incidents, capped at `limit`
export function fetchIncidents(limit) {
  return axios.get(`${API_BASE_URL}/api/incidents?limit=${limit}`);
}

// fuzzy search across the past week, up to 50 hits
export function searchIncidents(q) {
  return axios.get(`${API_BASE_URL}/api/search`, { params: { q, limit: 50 } });
}

// 4 closest cameras to a {lat, lon}
export function fetchNearestCameras(coordinates) {
  return axios.get(`${API_BASE_URL}/api/nearest-cameras`, { params: { lat: coordinates.lat, lon: coordinates.lon, limit: 4 } });
}
