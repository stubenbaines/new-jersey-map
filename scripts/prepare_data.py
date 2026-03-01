#!/usr/bin/env python3
"""Prepare normalized NJ map data for the frontend.

Inputs:
- data/raw/nj_municipalities.geojson
- data/raw/nj_counties.geojson

Output:
- public/data/nj-geometry.json
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_PATH = ROOT / "public" / "data" / "nj-geometry.json"

MUNICIPALITIES_PATH = RAW_DIR / "nj_municipalities.geojson"
COUNTIES_PATH = RAW_DIR / "nj_counties.geojson"

Point = Tuple[float, float]


def load_geojson(path: Path) -> Dict:
  with path.open("r", encoding="utf-8") as source_file:
    return json.load(source_file)


def iter_points(coords) -> Iterable[Point]:
  if isinstance(coords, list):
    if len(coords) == 2 and all(isinstance(value, (int, float)) for value in coords):
      yield float(coords[0]), float(coords[1])
      return

    for child in coords:
      yield from iter_points(child)


def geometry_label_point(geometry: Dict) -> Point:
  points = list(iter_points(geometry.get("coordinates", [])))
  if not points:
    return (0.0, 0.0)

  longitudes = [point[0] for point in points]
  latitudes = [point[1] for point in points]
  return ((min(longitudes) + max(longitudes)) / 2.0, (min(latitudes) + max(latitudes)) / 2.0)


def pick_municipality_id(properties: Dict) -> str:
  for key in ("COUNTY_MUN", "MUN_CODE", "SSN", "GNIS", "OBJECTID"):
    value = properties.get(key)
    if value is None:
      continue
    value_as_string = str(value).strip()
    if value_as_string:
      return value_as_string

  raise ValueError(f"Could not determine municipality id for properties={properties}")


def pick_county_id(properties: Dict) -> str:
  for key in ("FIPSSTCO", "FIPSCO", "CO", "COUNTY", "OBJECTID"):
    value = properties.get(key)
    if value is None:
      continue
    value_as_string = str(value).strip()
    if value_as_string:
      return value_as_string

  raise ValueError(f"Could not determine county id for properties={properties}")


def normalize_county_name(raw_value) -> str:
  if raw_value is None:
    return "Unknown County"

  return str(raw_value).replace(" County", "").strip().title()


def normalize_municipality_name(properties: Dict) -> str:
  for key in ("MUN_LABEL", "MUN", "NAME", "GNIS_NAME"):
    value = properties.get(key)
    if value is None:
      continue
    value_as_string = str(value).strip()
    if value_as_string:
      return value_as_string
  return "Unknown Municipality"


def normalize_county_name_from_municipality(properties: Dict) -> str:
  for key in ("COUNTY_LABEL", "COUNTY"):
    value = properties.get(key)
    if value is None:
      continue
    value_as_string = str(value).strip()
    if value_as_string:
      return normalize_county_name(value_as_string)
  return "Unknown County"


def prepare_data(municipalities_geojson: Dict, counties_geojson: Dict) -> Dict:
  municipalities_output: List[Dict] = []
  counties_output: List[Dict] = []

  for feature in municipalities_geojson.get("features", []):
    properties = feature.get("properties", {})
    geometry = feature.get("geometry")
    if geometry is None:
      continue

    municipalities_output.append(
      {
        "id": pick_municipality_id(properties),
        "name": normalize_municipality_name(properties),
        "county": normalize_county_name_from_municipality(properties),
        "type": str(properties.get("MUN_TYPE")).strip() if properties.get("MUN_TYPE") is not None else None,
        "geometry": geometry,
      }
    )

  for feature in counties_geojson.get("features", []):
    properties = feature.get("properties", {})
    geometry = feature.get("geometry")
    if geometry is None:
      continue

    counties_output.append(
      {
        "id": pick_county_id(properties),
        "name": normalize_county_name(properties.get("COUNTY_LABEL") or properties.get("COUNTY")),
        "labelPoint": geometry_label_point(geometry),
        "geometry": geometry,
      }
    )

  municipalities_output.sort(key=lambda municipality: (municipality["county"], municipality["name"]))
  counties_output.sort(key=lambda county: county["name"])

  return {
    "meta": {
      "generatedAt": datetime.now(timezone.utc).isoformat(),
      "municipalityCount": len(municipalities_output),
      "countyCount": len(counties_output),
    },
    "municipalities": municipalities_output,
    "counties": counties_output,
  }


def main() -> None:
  if not MUNICIPALITIES_PATH.exists() or not COUNTIES_PATH.exists():
    raise SystemExit(
      "Missing input files. Expected both data/raw/nj_municipalities.geojson and data/raw/nj_counties.geojson"
    )

  municipalities_geojson = load_geojson(MUNICIPALITIES_PATH)
  counties_geojson = load_geojson(COUNTIES_PATH)

  payload = prepare_data(municipalities_geojson, counties_geojson)

  OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
  with OUT_PATH.open("w", encoding="utf-8") as output_file:
    json.dump(payload, output_file, separators=(",", ":"))

  print(f"Wrote {OUT_PATH}")
  print(f"Municipalities: {payload['meta']['municipalityCount']}")
  print(f"Counties: {payload['meta']['countyCount']}")


if __name__ == "__main__":
  main()
