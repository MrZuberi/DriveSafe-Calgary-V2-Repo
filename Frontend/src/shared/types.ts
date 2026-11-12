// response shapes from Backend/cleaners.py and routes.py

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Incident {
  id: string | null;
  roadway_name: string | null;
  description: string | null;
  details: string | null;
  start_dt: string | null;
  modified_dt: string | null;
  lanes_affected: string | null;
  severity: string | null;
  quadrant: string | null;
  coordinates: Coordinates;
}

export interface Camera {
  description: string | null;
  camera_location: string | null;
  quadrant: string | null;
  url: string | null;
  coordinates: Coordinates | null;
}

// /api/nearest-cameras adds the distance from the incident
export interface NearestCamera extends Camera {
  distance_km: number;
}

export interface ListResponse<T> {
  count: number;
  items: T[];
}

// /api/search also reports which engine answered
export interface SearchResponse extends ListResponse<Incident> {
  engine: string | null;
}

export type DateInput = string | number | Date | null | undefined;
