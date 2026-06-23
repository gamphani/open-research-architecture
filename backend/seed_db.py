import random
from app.database import SessionLocal, engine, Base
from app.models import ClinicalSite, DemographicRegion

def seed_database():
    db = SessionLocal()
    print("Connecting to database to clear old data...")
    
    # 1. Clear existing tables to ensure clean state (Idempotency)
    db.query(ClinicalSite).delete()
    db.query(DemographicRegion).delete()
    db.commit()

    print("Inserting mock demographic regions (MultiPolygons)...")
    
    # 2. Add Mock Demographic Regions
    # We use explicit WKT bounding boxes for regional polygons
    region_alpha = DemographicRegion(
        region_name="Capital District Health Zone",
        country_code="MWI",
        boundary="MULTIPOLYGON(((33.5 -14.2, 34.0 -14.2, 34.0 -13.7, 33.5 -13.7, 33.5 -14.2)))",
        population_metrics={"total_population": 750000, "urban_percentage": 65},
        disease_incidence={"diabetes": 6.2, "hypertension": 14.8, "hiv": 8.1},
        data_source="2026 National Health Survey Simulation"
    )

    region_beta = DemographicRegion(
        region_name="Northern Border Catchment",
        country_code="MWI",
        boundary="MULTIPOLYGON(((33.0 -13.5, 33.5 -13.5, 33.5 -13.0, 33.0 -13.0, 33.0 -13.5)))",
        population_metrics={"total_population": 320000, "urban_percentage": 20},
        disease_incidence={"diabetes": 2.4, "hypertension": 9.1, "hiv": 4.3},
        data_source="2026 National Health Survey Simulation"
    )

    db.add(region_alpha)
    db.add(region_beta)
    db.commit()

    print("Inserting mock clinical facilities (Points)...")

    # 3. Add Mock Clinical Facilities
    # Some points fall inside Region Alpha, some inside Region Beta, and one outside both.
    sites = [
        ClinicalSite(
            name="Capital Central Hospital",
            facility_type="Tertiary Referral",
            operating_status="Operational",
            location="POINT(33.78 -13.95)",  # Inside Region Alpha
            maturity_score=85,
            has_emr=True,
            emr_vendor="OpenMRS",
            supports_fhir=True,
            has_reliable_internet=True
        ),
        ClinicalSite(
            name="Area 25 Community Health Centre",
            facility_type="Primary Health Clinic",
            operating_status="Operational",
            location="POINT(33.65 -13.82)",  # Inside Region Alpha
            maturity_score=62,
            has_emr=True,
            emr_vendor="Custom EMR",
            supports_fhir=False,
            has_reliable_internet=True
        ),
        ClinicalSite(
            name="St. Gabriel Rural Hospital",
            facility_type="Secondary Care",
            operating_status="Operational",
            location="POINT(33.15 -13.22)",  # Inside Region Beta
            maturity_score=45,
            has_emr=False,
            emr_vendor=None,
            supports_fhir=False,
            has_reliable_internet=False
        ),
        ClinicalSite(
            name="Chitipa Outpost Clinic",
            facility_type="Dispensary",
            operating_status="Under Maintenance",
            location="POINT(33.42 -13.11)",  # Inside Region Beta
            maturity_score=20,
            has_emr=False,
            emr_vendor=None,
            supports_fhir=False,
            has_reliable_internet=False
        ),
        ClinicalSite(
            name="Off-Grid Remote Research Post",
            facility_type="Mobile Clinic",
            operating_status="Operational",
            location="POINT(35.50 -12.10)",  # Outside both mock regions
            maturity_score=75,
            has_emr=True,
            emr_vendor="DirectData",
            supports_fhir=True,
            has_reliable_internet=False
        )
    ]

    db.add_all(sites)
    db.commit()
    db.close()
    
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()