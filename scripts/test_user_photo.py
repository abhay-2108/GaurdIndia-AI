import os
import sys
from fastapi.testclient import TestClient

# Add project root to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)

def test_user_provided_photo():
    photo_path = "data/uploads/test photo.webp"
    
    if not os.path.exists(photo_path):
        print(f"Error: Test photo not found at {photo_path}")
        sys.exit(1)
        
    print(f"--- Running API Onboarding Test with Photo: {photo_path} ---")
    
    # We will onboard with a test PAN and Phone
    pan_num = "PANTEST007"
    phone_num = "+919000000007"
    
    # Check if this user exists in DB from previous tests and cleanup
    db = SessionLocal()
    existing_user = db.query(models.User).filter(models.User.pan_number == pan_num).first()
    if existing_user:
        db.query(models.KYCDocument).filter(models.KYCDocument.user_id == existing_user.id).delete()
        db.query(models.DeviceFingerprint).filter(models.DeviceFingerprint.user_id == existing_user.id).delete()
        db.query(models.Transaction).filter(models.Transaction.user_id == existing_user.id).delete()
        db.query(models.User).filter(models.User.id == existing_user.id).delete()
        db.commit()
    db.close()
    
    # Send request
    with open(photo_path, "rb") as img_file:
        response = client.post(
            "/api/onboard",
            data={
                "full_name": "Audited Identity",
                "phone_number": phone_num,
                "pan_number": pan_num,
                "device_id": "audited_webgl_device_777",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0"
            },
            files={"file": ("test_photo.webp", img_file, "image/webp")}
        )
        
    if response.status_code not in (200, 202):
        print(f"API Error: Onboarding failed with status code {response.status_code}")
        print(response.text)
        sys.exit(1)
        
    data = response.json()
    print("\n=== API ONBOARDING RESPONSE ===")
    print(f"User ID:           {data['user_id']}")
    print(f"Full Name:         {data['full_name']}")
    print(f"PAN Number:        {data['pan_number']}")
    print(f"Phone Number:      {data['phone_number']}")
    
    # Wait for the background task to complete
    import time
    print("\nWaiting for async background pipeline to finish processing the image and graph linkage...")
    time.sleep(1.0)
    
    # Query database to see results
    db = SessionLocal()
    db_user = db.query(models.User).filter(models.User.id == data['user_id']).first()
    db_doc = db.query(models.KYCDocument).filter(models.KYCDocument.user_id == data['user_id']).first()
    db.close()
    
    if db_user and db_doc:
        print(f"Graph Similarity:  {data.get('graph_similarity', 0.0):.4f} (Calculated Jaccard: {db_doc.liveness_passed})")
        print(f"ELA Anomaly Score: {db_doc.ela_anomaly_score:.4f}")
        print(f"Moiré Display Anomaly: {db_doc.moire_pattern_detected}")
        print(f"Liveness Passed:       {db_doc.liveness_passed}")
        print(f"Composite Risk Score:  {db_user.risk_score:.4f}")
        print(f"Onboarding Status:     {db_user.risk_score >= 0.70 and 'REJECTED_BY_AI' or 'ONBOARDED'}")
        print(f"Copilot Summary:       {db_user.copilot_summary[:150]}...")
    else:
        print("Error: User or Document records not found in database!")
    print("================================")
    
if __name__ == "__main__":
    test_user_provided_photo()
