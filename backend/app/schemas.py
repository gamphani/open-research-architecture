from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any

# Base Schema for shared attributes
class ClinicalSiteBase(BaseModel):
    name: str
    facility_type: Optional[str] = None
    operating_status: Optional[str] = None
    maturity_score: Optional[int] = None
    has_emr: bool = False
    emr_vendor: Optional[str] = None
    supports_fhir: bool = False
    has_reliable_internet: bool = False

# Schema used when returning data via the API
class ClinicalSiteResponse(ClinicalSiteBase):
    site_id: UUID
    latitude: float
    longitude: float
    last_updated: datetime

    class Config:
        # Tells Pydantic to read data even if it's an ORM object, not a dict
        from_attributes = True


# Schema for regional demographic data responses
class DemographicRegionResponse(BaseModel):
    region_id: UUID
    region_name: str
    country_code: str
    population_metrics: Optional[Dict[str, Any]] = None
    disease_incidence: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True