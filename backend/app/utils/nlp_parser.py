import re

def extract_protocol_metadata(text: str) -> dict:
    """
    Parses unstructured text from clinical protocols to extract key feasibility metrics
    using rule-based entity recognition and regex pattern compilation.
    """
    normalized_text = text.lower()

    # 1. Extract Disease Indication
    detected_indication = "Unknown / General Health"
    indications = {
        "hiv": ["hiv", "human immunodeficiency virus", "antiretroviral"],
        "diabetes": ["diabetes", "diabetic", "hba1c", "glycemic"],
        "hypertension": ["hypertension", "blood pressure", "hypertensive", "cardiovascular"]
    }
    
    for indication, keywords in indications.items():
        if any(keyword in normalized_text for keyword in keywords):
            detected_indication = indication.capitalize()
            break

    # 2. Extract Target Sample Size
    sample_size = None
    # Look for patterns like "sample size of 450", "enrolling 1200 participants", "n = 500"
    sample_patterns = [
        r"sample\s+size\s*(?:of|is)?\s*(\d+)",
        r"enroll\s*(?:ing|ment)?\s*(?:of)?\s*(\d+)",
        r"n\s*=\s*(\d+)"
    ]
    for pattern in sample_patterns:
        match = re.search(pattern, normalized_text)
        if match:
            sample_size = int(match.group(1))
            break

    # 3. Extract Minimum Age Requirements
    min_age = None
    age_patterns = [
        r"aged?\s*(\d+)\s*(?:years|yo)?\s*(?:or\s+older|and\s+above|>=\s*\d+)",
        r"inclusion\s+criteria:.*\s*(\d+)\s*(?:years\s+of\s+age)"
    ]
    for pattern in age_patterns:
        match = re.search(pattern, normalized_text)
        if match:
            min_age = int(match.group(1))
            break

    # 4. Check for advanced system requirements matching our PostGIS metrics
    requires_emr = any(term in normalized_text for term in ["emr", "electronic medical record", "electronic health record", "ehr"])
    requires_fhir = "fhir" in normalized_text or "fast healthcare interoperability" in normalized_text

    # 5. Smart Feasibility Mapping: Suggest Health Zones based on extracted disease patterns
    suggested_zones = []
    if detected_indication == "Hiv":
        # Direct epidemiological targeting based on our PostGIS zone database attributes
        suggested_zones = ["South West Zone", "South East Zone"]
    elif detected_indication == "Hypertension":
        suggested_zones = ["South West Zone", "South East Zone", "Central West Zone"]
    else:
        suggested_zones = ["Northern Zone", "Central East Zone"]

    return {
        "detected_indication": detected_indication,
        "target_sample_size": sample_size,
        "min_age": min_age,
        "requires_emr": requires_emr,
        "requires_fhir": requires_fhir,
        "suggested_health_zones": suggested_zones
    }