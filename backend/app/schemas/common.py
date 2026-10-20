# app/schemas/common.py
from pydantic import BaseModel, Field

class GeoPoint(BaseModel):
    """Geospatial coordinate representation for PostGIS tracking."""
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")