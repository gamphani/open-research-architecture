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
def get_all_clinical_sites(db: Session = Depends(get_db)):
    """
    Fetches all clinical sites, extracting raw longitude and latitude 
    natively from the PostGIS spatial point geometry.
    """
    # Use PostGIS ST_X and ST_Y to extract coordinates from the geometry column
    query_results = db.query(
        models.ClinicalSite,
        functions.ST_X(models.ClinicalSite.location).label("lon"),
        functions.ST_Y(models.ClinicalSite.location).label("lat")
    ).all()

    response_data = []
    for site, lon, lat in query_results:
        # Construct the response matching our Pydantic schema structure
        site_dict = site.__dict__
        site_dict["longitude"] = lon
        site_dict["latitude"] = lat
        response_data.append(site_dict)

    return response_data