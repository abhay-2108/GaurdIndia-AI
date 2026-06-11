from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api.endpoints import router as api_router

# Initialize Database tables
Base.metadata.create_all(bind=engine)

# Seed default blacklisted devices
from app.database import SessionLocal
from app import models
db = SessionLocal()
try:
    if not db.query(models.ConsortiumBlacklistDevice).first():
        db.add(models.ConsortiumBlacklistDevice(
            webgl_hash="consortium_blacklisted_hash",
            reason="WebGL hardware signature linked to coordinated simulator farms in Pune."
        ))
        db.add(models.ConsortiumBlacklistDevice(
            webgl_hash="test_fraud_device_hash_999",
            reason="Device flagged by multiple lending apps for high-frequency OTP bursts."
        ))
        db.commit()
except Exception as e:
    print(f"Error seeding blacklist: {e}")
finally:
    db.close()


app = FastAPI(
    title="GuardIndia AI API",
    description="Multi-layered Real-Time Synthetic Identity Fraud Detection Platform",
    version="1.0.0"
)

# Set up CORS middleware for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to react dev domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount endpoints
app.include_router(api_router)

@app.get("/")
def read_root():
    return {
        "status": "ONLINE",
        "service": "GuardIndia AI Core",
        "version": "1.0.0",
        "description": "Multi-layered DPI & Transaction defense system against coordinated bust-outs."
    }
