from pydantic import BaseModel, Field
from typing import Optional, List

# --- Phase 1 & 2: Onboarding ---
class UserOnboard(BaseModel):
    full_name: str = Field(..., example="Amit Sharma")
    phone_number: str = Field(..., example="+919876543210")
    pan_number: str = Field(..., example="ABCDE1234F")
    device_id: str = Field(..., example="webgl-hash-xyz-123")
    user_agent: str = Field(..., example="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

class UserOnboardResponse(BaseModel):
    user_id: str
    full_name: str
    phone_number: str
    pan_number: str
    ela_score: float
    graph_similarity: float
    risk_score: float
    status: str

# --- Phase 3: Login Device Evaluation ---
class UserLogin(BaseModel):
    user_id: str = Field(..., example="uuid-user-123")
    device_id: str = Field(..., example="webgl-hash-xyz-123")
    user_agent: str = Field(..., example="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    session_duration: float = Field(..., example=120.0) # Expected session duration in seconds
    otp_attempts: int = Field(default=1, example=1) # OTP/Login attempts

class UserLoginResponse(BaseModel):
    user_id: str
    device_id: str
    is_anomaly: bool
    anomaly_score: float
    status: str

# --- Phase 4: Transaction & Behavioral Scoring ---
class TransactionRequest(BaseModel):
    user_id: str = Field(..., example="uuid-user-123")
    amount: float = Field(..., example=25000.0)
    click_duration: float = Field(..., example=0.35) # Seconds mouse was held down
    scroll_depth: float = Field(..., example=750.0) # Pixels or scroll offset
    mouse_movement: float = Field(..., example=140.0) # Pixel coordinates traversed
    keystrokes_detected: float = Field(..., example=15.0) # Count of keystrokes
    click_frequency: float = Field(..., example=4.0) # Click counts in interaction window
    time_since_last_click: float = Field(..., example=3.2) # Seconds since last click
    VPN_usage: float = Field(..., example=0.0) # 0.0 or 1.0 (float representation)
    proxy_usage: float = Field(..., example=0.0) # 0.0 or 1.0
    device_ip_reputation: str = Field(default="Good", example="Good") # Good, Suspicious, Bad
    mouse_trajectory: Optional[List[List[float]]] = Field(default=None, example=[[100, 200, 0.0], [105, 202, 0.05], [110, 205, 0.1]])

class TransactionResponse(BaseModel):
    transaction_id: str
    user_id: str
    amount: float
    status: str # APPROVED, BLOCKED_BY_AI
    is_bot_behavior: bool
    fraud_probability: float

# --- LLM Copilot Analysis ---
class CopilotSummaryResponse(BaseModel):
    user_id: str
    full_name: str
    overall_risk_score: float
    phase1_jaccard: float
    phase2_ela: float
    phase3_anomaly: Optional[bool] = None
    phase4_probability: Optional[float] = None
    copilot_narrative: str
    
    # Real-world verification outputs
    sim_verified: Optional[bool] = None
    pasted_fields_count: Optional[int] = None
    typing_speed_std: Optional[float] = None
    bureau_inquiries_last_hour: Optional[int] = None

# --- Async Status Polling ---
class UserStatusResponse(BaseModel):
    user_id: str
    full_name: str
    pan_number: str
    phone_number: str
    risk_score: float
    ela_score: float
    graph_similarity: float
    moire_detected: bool
    liveness_passed: bool
    processing_complete: bool
    status: str  # PROCESSING, ONBOARDED, NEEDS_MANUAL_REVIEW, REJECTED_BY_AI
    copilot_summary: Optional[str] = None
    
    # Real-world verification outputs
    sim_verified: bool
    pasted_fields_count: int
    typing_speed_std: float
    bureau_inquiries_last_hour: int

# --- User Database Listing ---
class UserSummaryResponse(BaseModel):
    id: str
    full_name: str
    pan_number: str
    phone_number: str
    risk_score: float
    created_at: str

    class Config:
        orm_mode = True


# --- Operations & Consortium Blacklist ---
class ConsortiumBlacklistDeviceCreate(BaseModel):
    webgl_hash: str
    reason: Optional[str] = "Associated with coordinated simulator farm onboarding"

class ConsortiumBlacklistDeviceResponse(BaseModel):
    id: str
    webgl_hash: str
    reason: str
    created_at: str

    class Config:
        from_attributes = True

class CircuitBreakerStatus(BaseModel):
    name: str
    state: str
    failure_count: int
    recovery_time: int

