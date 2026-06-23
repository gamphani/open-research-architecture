from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from geoalchemy2 import functions
from typing import List

from .database import get_db
from . import models, schemas

app = FastAPI(
    title="GeoNode Research Architecture API",
    description="Spatial AI engine for clinical trial and site feasibility assessment",
    version="1.0.0"
)

# Enable CORS so your React frontend can talk to the backend securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", tags=["System"])
def health_check():
    """Simple health check endpoint to verify backend availability."""
    return {"status": "healthy", "engine": "FastAPI + PostGIS"}


@app.get("/api/sites", response_model=List[schemas.ClinicalSiteResponse], tags=["Feasibility"])
def get_all_clinical_sites(min_maturity: int = 0, db: Session = Depends(get_db)):
    """
    Fetches clinical sites, extracting coordinates from PostGIS, with 
    an optional server-side digital maturity score filtration.
    """
    # 1. Initialize the baseline geospatial select query
    query = db.query(
        models.ClinicalSite,
        functions.ST_X(models.ClinicalSite.location).label("lon"),
        functions.ST_Y(models.ClinicalSite.location).label("lat")
    )

    # 2. Conditionally apply SQL filtering clauses based on query params
    if min_maturity > 0:
        query = query.filter(models.ClinicalSite.maturity_score >= min_maturity)

    query_results = query.all()

    response_data = []
    for site, lon, lat in query_results:
        site_dict = site.__dict__
        site_dict["longitude"] = lon
        site_dict["latitude"] = lat
        response_data.append(site_dict)

    return response_data