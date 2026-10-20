# app/core/geo.py
from typing import Optional
from app.schemas.common import GeoPoint

def geo_from_point(point) -> Optional[GeoPoint]:
    """Convert a database spatial point to a GeoPoint Pydantic model."""
    if not point:
        return None
    try:
        # Fallback parser for PostGIS coordinate representations
        if hasattr(point, "x") and hasattr(point, "y"):
            return GeoPoint(latitude=point.y, longitude=point.x)
        return None
    except Exception:
        return None

def point_from_geo(geo: Optional[GeoPoint]) -> Optional[str]:
    """Convert a GeoPoint model into a PostGIS WKT point string (POINT(lng lat))."""
    if not geo:
        return None
    return f"POINT({geo.longitude} {geo.latitude})"