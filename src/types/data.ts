import type { GeoJsonProperties, Geometry } from 'geojson';

export interface MunicipalityRecord {
  id: string;
  name: string;
  county: string;
  type: string | null;
  geometry: Geometry;
  properties?: GeoJsonProperties;
}

export interface CountyRecord {
  id: string;
  name: string;
  labelPoint: [number, number];
  geometry: Geometry;
  properties?: GeoJsonProperties;
}

export interface NJGeometryData {
  meta: {
    generatedAt: string;
    municipalityCount: number;
    countyCount: number;
  };
  municipalities: MunicipalityRecord[];
  counties: CountyRecord[];
}
