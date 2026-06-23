import uuid
from sqlalchemy import Boolean, Column, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
from .database import Base

class ClinicalSite(Base):
    __tablename__ = "clinical_sites"

    site_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    facility_type = Column(String(100))
    operating_status = Column(String(50))
    
    # PostGIS Point Geometry tracking (WGS 84 / EPSG:4326)
    location = Column(Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=False)
    
    # Digital Infrastructure Metrics
    maturity_score = Column(Integer)
    has_emr = Column(Boolean, default=False)
    emr_vendor = Column(String(100))
    supports_fhir = Column(Boolean, default=False)
    has_reliable_internet = Column(Boolean, default=False)
    
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DemographicRegion(Base):
    __tablename__ = "demographic_regions"

    region_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    region_name = Column(String(255), nullable=False)
    country_code = Column(String(3))
    
    # PostGIS MultiPolygon Geometry tracking regional boundaries
    boundary = Column(Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=True), nullable=False)
    
    # Flexible JSON store for population metrics & disease rates
    population_metrics = Column(JSONB)
    disease_incidence = Column(JSONB)
    
    data_source = Column(String(255))