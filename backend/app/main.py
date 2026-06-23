from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from geoalchemy2 import functions
from typing import List

from fastapi import UploadFile, File
from .utils.nlp_parser import extract_protocol_metadata


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

import json

@app.get("/api/zones", tags=["Feasibility"])
def get_health_zones(db: Session = Depends(get_db)):
    """
    Fetches all administrative health zones, converting PostGIS geometry 
    into a standardized GeoJSON FeatureCollection for the frontend map.
    """
    # Use ST_AsGeoJSON to let PostgreSQL handle the coordinate string conversion
    results = db.query(
        models.DemographicRegion.region_id,
        models.DemographicRegion.region_name,
        models.DemographicRegion.population_metrics,
        models.DemographicRegion.disease_incidence,
        functions.ST_AsGeoJSON(models.DemographicRegion.boundary).label("geojson")
    ).all()

    features = []
    for rid, name, metrics, incidence, geojson_str in results:
        feature = {
            "type": "Feature",
            "geometry": json.loads(geojson_str),
            "properties": {
                "zone_id": str(rid),
                "zone_name": name,
                "districts": metrics.get("districts", []),
                "hiv_rate": incidence.get("hiv", 0),
                "hypertension_rate": incidence.get("hypertension", 0)
            }
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features
    }

@app.post("/api/protocols/parse", response_model=schemas.ProtocolParseResponse, tags=["NLP Engine"])
async def parse_clinical_protocol(file: UploadFile = File(...)):
    """
    Accepts raw clinical protocol files (.txt, .md), extracts structured insights 
    via rule-based semantic NLP filters, and map metrics to regional database profiles.
    """
    # Restrict processing to basic unstructured files for the initial iteration
    if not file.filename.endswith(('.txt', '.md')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .txt or .md file.")

    try:
        # Asynchronously read the raw uploaded bytes and decode into textual strings
        contents = await file.read()
        protocol_text = contents.decode("utf-8")
        
        # Invoke our NLP parser module
        parsed_metadata = extract_protocol_metadata(protocol_text)
        
        # Merge structural document tags and return the validated response model
        return {
            "filename": file.filename,
            **parsed_metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal NLP Engine Exception: {str(e)}")
