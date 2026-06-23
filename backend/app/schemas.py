from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any

# 1. Base Schema for shared attributes
class ClinicalSiteBase(BaseModel):
    name: str
    facility_type: Optional[str] = None
    operating_status: Optional[str] = None
    maturity_score: Optional[int] = None
    has_emr: bool = False
    emr_vendor: Optional[str] = None
    supports_fhir: bool = False
    has_reliable_internet: bool = False

# 2. Schema used when returning site data via the API
class ClinicalSiteResponse(ClinicalSiteBase):
    site_id: UUID
    latitude: float
    longitude: float
    last_updated: datetime

    class Config:
        from_attributes = True

# 3. Schema for regional demographic data responses
class DemographicRegionResponse(BaseModel):
    region_id: UUID
    region_name: str
    country_code: str
    population_metrics: Optional[Dict[str, Any]] = None
    disease_incidence: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# 4. New Schema for the NLP Protocol Parsing Response
class ProtocolParseResponse(BaseModel):
    filename: str
    detected_indication: str
    target_sample_size: Optional[int] = None
    min_age: Optional[int] = None
    requires_emr: bool = False
    requires_fhir: bool = False
    suggested_health_zones: list[str] = []