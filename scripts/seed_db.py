import os
import sys
import random
from faker import Faker

# Add project root to path so we can import app modules
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from app.database import engine, Base, SessionLocal
from app.models import User, IdentityGraphEdge, KYCDocument, DeviceFingerprint, Transaction

fake = Faker('en_IN')

# Ensure tables are created
Base.metadata.create_all(bind=engine)

def seed_database():
    session = SessionLocal()
    
    # Clean the database before seeding
    session.query(Transaction).delete()
    session.query(DeviceFingerprint).delete()
    session.query(KYCDocument).delete()
    session.query(IdentityGraphEdge).delete()
    session.query(User).delete()
    session.commit()

    print("Seeding Clean Users (70%)...")
    for _ in range(70):
        # 1. User
        user = User(
            pan_number=fake.pystr_format('?????####?').upper(),
            full_name=fake.name(),
            phone_number=fake.phone_number(),
            risk_score=random.uniform(0.0, 0.2)
        )
        session.add(user)
        session.commit()

        # 2. Graph Edge (Strong historic connection)
        edge = IdentityGraphEdge(
            source_node=f"PAN:{user.pan_number}",
            target_node=f"PHONE:{user.phone_number}",
            link_type="REGISTERED_WITH",
            historical_weight=random.uniform(0.7, 1.0)
        )
        session.add(edge)

        # 3. KYC Document (Clean)
        doc = KYCDocument(
            user_id=user.id,
            document_type="PAN_CARD",
            image_path=f"/dummy_uploads/clean_{user.id}.jpg",
            ela_anomaly_score=random.uniform(0.01, 0.15),
            moire_pattern_detected=False,
            liveness_passed=True
        )
        session.add(doc)

        # 4. Device Fingerprint (Unique per user)
        device = DeviceFingerprint(
            user_id=user.id,
            webgl_hash=fake.sha256(),
            user_agent=fake.user_agent(),
            login_time_delta=random.uniform(2.0, 24.0),
            session_duration=random.uniform(120.0, 600.0),
            isolation_forest_flag=False
        )
        session.add(device)

        # 5. Transaction (Organic human behavior)
        tx = Transaction(
            user_id=user.id,
            amount=random.uniform(1000, 50000),
            status="APPROVED",
            mouse_velocity_variance=random.uniform(15.0, 45.0),
            click_hesitation_ms=random.randint(400, 1500),
            lstm_reconstruction_error=random.uniform(0.05, 0.3),
            is_bot_behavior=False
        )
        session.add(tx)
        session.commit()

    print("Seeding Synthetic Fraud Ring (30%)...")
    # Fraud ring shares the exact same hardware hash (WebGL) and agent
    fraud_ring_webgl_hash = fake.sha256()
    fraud_ring_user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0"

    for _ in range(30):
        # 1. User (High risk, fake name but real looking PAN)
        user = User(
            pan_number=fake.pystr_format('?????####?').upper(),
            full_name=fake.name(),
            phone_number=fake.phone_number(),
            risk_score=random.uniform(0.8, 0.99)
        )
        session.add(user)
        session.commit()

        # 2. Graph Edge (Weak/No historic connection, brand new burner sim)
        edge = IdentityGraphEdge(
            source_node=f"PAN:{user.pan_number}",
            target_node=f"PHONE:{user.phone_number}",
            link_type="REGISTERED_WITH",
            historical_weight=random.uniform(0.0, 0.1)
        )
        session.add(edge)

        # 3. KYC Document (Photoshopped, Moiré detected, Failed liveness)
        doc = KYCDocument(
            user_id=user.id,
            document_type="PAN_CARD",
            image_path=f"/dummy_uploads/synthetic_{user.id}.jpg",
            ela_anomaly_score=random.uniform(0.85, 0.99), # High anomaly = tampered
            moire_pattern_detected=True, # Display screen photographed
            liveness_passed=False
        )
        session.add(doc)

        # 4. Device Fingerprint (Shared across all 30 fraud accounts)
        device = DeviceFingerprint(
            user_id=user.id,
            webgl_hash=fraud_ring_webgl_hash,
            user_agent=fraud_ring_user_agent,
            login_time_delta=random.uniform(0.1, 0.5), # Hyper-tight logins
            session_duration=random.uniform(10.0, 30.0), # Mechanical fast sessions
            isolation_forest_flag=True
        )
        session.add(device)

        # 5. Transaction (Mechanical bot bust-out behavior)
        tx = Transaction(
            user_id=user.id,
            amount=random.uniform(40000, 50000), # Maxing out credit limit
            status="BLOCKED_BY_AI",
            mouse_velocity_variance=random.uniform(0.0, 2.0), # Zero variance, perfectly straight lines
            click_hesitation_ms=random.randint(10, 50), # Instant mechanical clicks
            lstm_reconstruction_error=random.uniform(0.8, 1.5), # High error = LSTM didn't recognize it as human
            is_bot_behavior=True
        )
        session.add(tx)
        session.commit()

    print("Successfully seeded the database with 100 profiles!")
    session.close()

if __name__ == "__main__":
    seed_database()
