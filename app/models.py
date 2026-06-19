from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    pan_number = Column(String, index=True)
    full_name = Column(String)
    phone_number = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    risk_score = Column(Float, default=0.0)
    copilot_summary = Column(String, nullable=True)
    
    # Real-world fraud detection indicators
    sim_verified = Column(Boolean, default=False)
    pasted_fields_count = Column(Integer, default=0)
    typing_speed_std = Column(Float, default=0.0)
    bureau_inquiries_last_hour = Column(Integer, default=0)

    kyc_documents = relationship("KYCDocument", back_populates="user")
    device_fingerprints = relationship("DeviceFingerprint", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")

class IdentityGraphEdge(Base):
    __tablename__ = "identity_graph_edges"

    id = Column(Integer, primary_key=True, index=True)
    source_node = Column(String, index=True)
    target_node = Column(String, index=True)
    link_type = Column(String)
    historical_weight = Column(Float)

class KYCDocument(Base):
    __tablename__ = "kyc_documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    document_type = Column(String)
    image_path = Column(String)
    ela_anomaly_score = Column(Float)
    moire_pattern_detected = Column(Boolean)
    liveness_passed = Column(Boolean)

    user = relationship("User", back_populates="kyc_documents")

class DeviceFingerprint(Base):
    __tablename__ = "device_fingerprints"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    webgl_hash = Column(String, index=True)
    user_agent = Column(String)
    login_time_delta = Column(Float)
    session_duration = Column(Float)
    isolation_forest_flag = Column(Boolean)
    login_timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="device_fingerprints")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    amount = Column(Float)
    status = Column(String)
    
    mouse_velocity_variance = Column(Float)
    click_hesitation_ms = Column(Integer)
    lstm_reconstruction_error = Column(Float)
    is_bot_behavior = Column(Boolean)

    user = relationship("User", back_populates="transactions")

class WebAuthnChallenge(Base):
    __tablename__ = "webauthn_challenges"

    id = Column(String, primary_key=True, default=generate_uuid)
    challenge = Column(String, index=True)
    user_name = Column(String) # Since user isn't created yet during onboarding
    created_at = Column(DateTime, default=datetime.utcnow)

class WebAuthnCredential(Base):
    __tablename__ = "webauthn_credentials"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    credential_id = Column(String, unique=True, index=True)
    public_key = Column(String) # Base64 encoded public key
    sign_count = Column(Integer, default=0)

    user = relationship("User")


class ConsortiumBlacklistDevice(Base):
    __tablename__ = "consortium_blacklist_devices"

    id = Column(String, primary_key=True, default=generate_uuid)
    webgl_hash = Column(String, unique=True, index=True)
    reason = Column(String, default="Associated with coordinated simulator farm onboarding")
    created_at = Column(DateTime, default=datetime.utcnow)

