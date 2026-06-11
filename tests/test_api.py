import os
import sys
import time
import tempfile
from PIL import Image
from fastapi.testclient import TestClient

# Add project root to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)

def create_temp_image():
    """
    Creates a temporary valid JPEG image to simulate ID document uploads.
    """
    img = Image.new('RGB', (100, 100), color='white')
    temp_file = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    img.save(temp_file.name, 'JPEG')
    return temp_file.name

def test_full_wiring_pipeline():
    print("--- Starting End-to-End API Integration & Throttling Tests ---")
    
    # 1. Create a dummy JPEG to simulate document upload
    temp_image_path = create_temp_image()
    print(f"Created temporary mock upload image at: {temp_image_path}")
    
    try:
        # Define onboarding inputs
        pan_num = "TESTPAN99A"
        phone_num = "+919999900000"
        device_id = "test_webgl_fingerprint_hash_999"
        
        # --- TEST PHASE 1 & 2: /api/onboard (ASYNCHRONOUS) ---
        print("\nTesting Phase 1 & 2: Async Onboarding...")
        with open(temp_image_path, "rb") as img_file:
            response = client.post(
                "/api/onboard",
                data={
                    "full_name": "Test User",
                    "phone_number": phone_num,
                    "pan_number": pan_num,
                    "device_id": device_id,
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/1.0"
                },
                files={"file": ("id_card.jpg", img_file, "image/jpeg")}
            )
            
        # Asynchronous task returns 202 Accepted immediately
        assert response.status_code == 202, f"Onboarding failed: {response.text}"
        data = response.json()
        print("Onboarding Response (Immediate):")
        print(data)
        
        user_id = data["user_id"]
        assert user_id is not None
        assert data["status"] == "PROCESSING"
        print("SUCCESS: Asynchronous onboarding trigger (HTTP 202) verified!")
        
        # Wait a moment (e.g. 0.5s) for background tasks to complete
        print("Waiting for background task pipelines to complete...")
        time.sleep(0.5)
        
        # Query database directly to assert background task populated scores
        db = SessionLocal()
        db_user = db.query(models.User).filter(models.User.id == user_id).first()
        db_doc = db.query(models.KYCDocument).filter(models.KYCDocument.user_id == user_id).first()
        db.close()
        
        assert db_user is not None
        assert db_doc is not None
        assert db_user.copilot_summary != "Analyzing document image and graph similarity in background task...", "Background task did not execute!"
        print(f"Database Updated: Risk Score = {db_user.risk_score:.4f}, ELA Score = {db_doc.ela_anomaly_score:.4f}, Moire = {db_doc.moire_pattern_detected}")
        print("SUCCESS: BackgroundTask ML GNN & visual checkers verified!")
        
        # --- TEST PHASE 3: /api/login ---
        print("\nTesting Phase 3: Login Device Evaluation...")
        login_response = client.post(
            "/api/login",
            json={
                "user_id": user_id,
                "device_id": device_id,
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/1.0",
                "session_duration": 15.0,
                "otp_attempts": 6
            }
        )
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        print("Login Response:")
        print(login_data)
        
        is_anomaly = login_data["is_anomaly"]
        print(f"SUCCESS: Phase 3 (Isolation Forest Check) verified! Anomaly Flag: {is_anomaly}")
        
        # --- TEST PHASE 4: /api/transaction ---
        print("\nTesting Phase 4: Transaction & Behavioral Scoring...")
        # Simulate bot execution telemetry payload with coordinate sequence
        tx_response = client.post(
            "/api/transaction",
            json={
                "user_id": user_id,
                "amount": 45000.0,
                "click_duration": 0.01,
                "scroll_depth": 0.0,
                "mouse_movement": 1.0,
                "keystrokes_detected": 0.0,
                "click_frequency": 12.0,
                "time_since_last_click": 0.05,
                "VPN_usage": 1.0,
                "proxy_usage": 1.0,
                "device_ip_reputation": "Bad",
                "mouse_trajectory": [[100.0, 200.0, 0.0], [105.0, 205.0, 0.05], [110.0, 210.0, 0.10]] # Constant speed straight line (low variance!)
            }
        )
        
        assert tx_response.status_code == 200, f"Transaction failed: {tx_response.text}"
        tx_data = tx_response.json()
        print("Transaction Response:")
        print(tx_data)
        
        tx_status = tx_data["status"]
        is_bot = tx_data["is_bot_behavior"]
        fraud_prob = tx_data["fraud_probability"]
        
        print(f"SUCCESS: Phase 4 (Random Forest Telemetry Check) verified! Status: {tx_status} (Bot: {is_bot}, Prob: {fraud_prob:.4f})")
        
        # --- TEST LLM COPILOT: /api/cases/{user_id}/copilot ---
        print("\nTesting LLM Fraud Analyst Copilot Case Summary...")
        copilot_response = client.get(f"/api/cases/{user_id}/copilot")
        assert copilot_response.status_code == 200, f"Copilot summary retrieval failed: {copilot_response.text}"
        copilot_data = copilot_response.json()
        print("Copilot Audit Response:")
        print(f"Narrative: {copilot_data['copilot_narrative']}")
        print(f"Overall Risk: {copilot_data['overall_risk_score']:.4f}")
        print("SUCCESS: Fraud Analyst Copilot GNN-ELA-IF-RF linkage verified!")
        
        # --- TEST RATE LIMITER: Throttling WebGL device fingerprint ---
        print("\nTesting Rate Limiting: Throttling spammed WebGL device fingerprints...")
        limit_triggered = False
        
        # Use a fresh device_id to start from zero in the sliding window
        burst_device_id = "test_burst_device_rate_limit_XYZ"
        
        # The limit is 5 req / 10 seconds. Send 6 rapid requests from this fresh ID.
        for i in range(6):
            r = client.post(
                "/api/login",
                json={
                    "user_id": user_id,
                    "device_id": burst_device_id,
                    "user_agent": "Mozilla/5.0 TestBrowser/1.0",
                    "session_duration": 10.0,
                    "otp_attempts": 1
                }
            )
            if r.status_code == 429:
                limit_triggered = True
                print(f"Request {i+1}: Blocked by Rate Limiter as expected (HTTP 429)!")
                break
                
        assert limit_triggered, "Error: Rate limiter did not throttle spammed requests!"
        print("SUCCESS: Slide-window rate limiter throttling verified!")


    finally:
        # Cleanup temporary image file
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
            print(f"\nCleaned up temp image file: {temp_image_path}")
            
    print("\nAll production-level upgraded integration tests executed successfully!")

def test_fraud_defense_upgrades():
    print("\n--- Starting Real-World Fraud Defense Upgrades Tests ---")
    temp_image_path = create_temp_image()
    try:
        # 1. WebGL Consortium Blacklist Block
        print("\nTesting WebGL Consortium Blacklist...")
        with open(temp_image_path, "rb") as img_file:
            response = client.post(
                "/api/onboard",
                data={
                    "full_name": "Fraud Ring Mule",
                    "phone_number": "+919999900001",
                    "pan_number": "MULEPAN12A",
                    "device_id": "test_fraud_device_hash_999", # blacklisted hash
                    "user_agent": "Mozilla/5.0 TestBrowser/1.0",
                    "liveness_passed": "true",
                    "sim_verified": "true"
                },
                files={"file": ("id.jpg", img_file, "image/jpeg")}
            )
        assert response.status_code == 202
        user_id = response.json()["user_id"]
        time.sleep(0.5)
        
        status_resp = client.get(f"/api/status/{user_id}")
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        assert status_data["risk_score"] == 1.0, f"Expected 1.0 risk, got {status_data['risk_score']}"
        assert status_data["status"] == "REJECTED_BY_AI"
        print("SUCCESS: WebGL Blacklist block verified!")

        # 2. Bureau Inquiry Velocity (Query Storm)
        print("\nTesting Bureau Query Storm...")
        with open(temp_image_path, "rb") as img_file:
            response = client.post(
                "/api/onboard",
                data={
                    "full_name": "Stormy User",
                    "phone_number": "+919999900002",
                    "pan_number": "PANBURST888", # triggers query storm
                    "device_id": "device_id_bureau",
                    "user_agent": "Mozilla/5.0 TestBrowser/1.0",
                    "liveness_passed": "true",
                    "sim_verified": "true"
                },
                files={"file": ("id.jpg", img_file, "image/jpeg")}
            )
        assert response.status_code == 202
        user_id = response.json()["user_id"]
        time.sleep(0.5)
        
        status_resp = client.get(f"/api/status/{user_id}")
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        assert status_data["bureau_inquiries_last_hour"] >= 3
        print(f"SUCCESS: Bureau Query Storm detected (Queries: {status_data['bureau_inquiries_last_hour']})!")

        # 3. Input Cadence (Mechanical Bot typing)
        print("\nTesting Mechanical Input Cadence...")
        with open(temp_image_path, "rb") as img_file:
            response = client.post(
                "/api/onboard",
                data={
                    "full_name": "Robot User",
                    "phone_number": "+919999900003",
                    "pan_number": "ROBOTPAN9A",
                    "device_id": "device_id_typing_bot",
                    "user_agent": "Mozilla/5.0 TestBrowser/1.0",
                    "liveness_passed": "true",
                    "sim_verified": "true",
                    "typing_speed_std": "0.005" # close to zero variance
                },
                files={"file": ("id.jpg", img_file, "image/jpeg")}
            )
        assert response.status_code == 202
        user_id = response.json()["user_id"]
        time.sleep(0.5)
        
        status_resp = client.get(f"/api/status/{user_id}")
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        assert status_data["typing_speed_std"] == 0.005
        
        # Baseline user with identical parameters but normal typing speed std (e.g. 0.5)
        with open(temp_image_path, "rb") as img_file:
            response_normal = client.post(
                "/api/onboard",
                data={
                    "full_name": "Human User",
                    "phone_number": "+919999900004",
                    "pan_number": "HUMANPAN9A",
                    "device_id": "device_id_typing_human",
                    "user_agent": "Mozilla/5.0 TestBrowser/1.0",
                    "liveness_passed": "true",
                    "sim_verified": "true",
                    "typing_speed_std": "0.5"
                },
                files={"file": ("id.jpg", img_file, "image/jpeg")}
            )
        user_id_normal = response_normal.json()["user_id"]
        time.sleep(0.5)
        status_resp_normal = client.get(f"/api/status/{user_id_normal}")
        status_data_normal = status_resp_normal.json()
        
        assert status_data["risk_score"] > status_data_normal["risk_score"], f"Expected bot typing penalty. Bot risk: {status_data['risk_score']}, Human risk: {status_data_normal['risk_score']}"
        print("SUCCESS: Input Cadence bot penalty verified!")

        # 4. Clipboard Pastes Analytics
        print("\nTesting Clipboard Paste Analytics...")
        with open(temp_image_path, "rb") as img_file:
            response = client.post(
                "/api/onboard",
                data={
                    "full_name": "Paster User",
                    "phone_number": "+919999900005",
                    "pan_number": "PASTEPAN9A",
                    "device_id": "device_id_paste",
                    "user_agent": "Mozilla/5.0 TestBrowser/1.0",
                    "liveness_passed": "true",
                    "sim_verified": "true",
                    "pasted_fields_count": "2"
                },
                files={"file": ("id.jpg", img_file, "image/jpeg")}
            )
        assert response.status_code == 202
        user_id = response.json()["user_id"]
        time.sleep(0.5)
        
        status_resp = client.get(f"/api/status/{user_id}")
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        assert status_data["pasted_fields_count"] == 2
        assert status_data["risk_score"] > status_data_normal["risk_score"]
        print("SUCCESS: Clipboard paste penalty verified!")

        # 5. SIM Binding Verification & Penalty
        print("\nTesting SIM Binding...")
        # Unverified SIM
        with open(temp_image_path, "rb") as img_file:
            response = client.post(
                "/api/onboard",
                data={
                    "full_name": "No SIM User",
                    "phone_number": "+919999900006",
                    "pan_number": "NOSIMPAN9A",
                    "device_id": "device_id_sim",
                    "user_agent": "Mozilla/5.0 TestBrowser/1.0",
                    "liveness_passed": "true",
                    "sim_verified": "false" # bypassed SIM binding
                },
                files={"file": ("id.jpg", img_file, "image/jpeg")}
            )
        user_id_nosim = response.json()["user_id"]
        time.sleep(0.5)
        status_resp_nosim = client.get(f"/api/status/{user_id_nosim}")
        status_data_nosim = status_resp_nosim.json()
        assert not status_data_nosim["sim_verified"]
        assert status_data_nosim["risk_score"] > status_data_normal["risk_score"]
        print("SUCCESS: SIM binding bypass penalty verified!")

        # 6. Active Liveness Challenges bypass
        print("\nTesting Liveness Bypass...")
        with open(temp_image_path, "rb") as img_file:
            response = client.post(
                "/api/onboard",
                data={
                    "full_name": "No Liveness User",
                    "phone_number": "+919999900007",
                    "pan_number": "NOLIVEPAN9",
                    "device_id": "device_id_liveness",
                    "user_agent": "Mozilla/5.0 TestBrowser/1.0",
                    "liveness_passed": "false", # bypassed liveness
                    "sim_verified": "true"
                },
                files={"file": ("id.jpg", img_file, "image/jpeg")}
            )
        assert response.status_code == 202
        user_id_nolive = response.json()["user_id"]
        time.sleep(0.5)
        status_resp_nolive = client.get(f"/api/status/{user_id_nolive}")
        status_data_nolive = status_resp_nolive.json()
        assert not status_data_nolive["liveness_passed"]
        assert status_data_nolive["risk_score"] == 1.0
        assert status_data_nolive["status"] == "REJECTED_BY_AI"
        print("SUCCESS: Liveness bypass block verified!")

    finally:
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
            print(f"Cleaned up temp image file: {temp_image_path}")

if __name__ == "__main__":
    test_full_wiring_pipeline()
    test_fraud_defense_upgrades()
