import axios from "axios";
import { API_BASE_URL } from "./config";
import type { Coordinates, Incident, ListResponse, NearestCamera, SearchResponse } from "./types";

// newest incidents, capped at `limit`
export function fetchIncidents(limit: number) {
  return axios.get<ListResponse<Incident>>(`${API_BASE_URL}/api/incidents?limit=${limit}`);
}

// fuzzy search across the past week, up to 50 hits
export function searchIncidents(q: string) {
  return axios.get<SearchResponse>(`${API_BASE_URL}/api/search`, { params: { q, limit: 50 } });
}

// 4 closest cameras to a {lat, lon}
export function fetchNearestCameras(coordinates: Coordinates) {
  return axios.get<ListResponse<NearestCamera>>(`${API_BASE_URL}/api/nearest-cameras`, { params: { lat: coordinates.lat, lon: coordinates.lon, limit: 4 } });
}
