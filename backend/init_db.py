from app.database import engine, Base
# Import models to ensure they are registered on Base metadata
from app.models import ClinicalSite, DemographicRegion

print("Initializing PostGIS database tables...")
Base.metadata.create_all(bind=engine)
print("Database schema successfully generated!")