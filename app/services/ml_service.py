import os
import time
import joblib
import numpy as np
import logging

logger = logging.getLogger("guardindia_ml_service")
logging.basicConfig(level=logging.INFO)

# Stateful Circuit Breaker class
class CircuitBreaker:
    def __init__(self, name: str, failure_threshold: int = 3, recovery_time_seconds: int = 15):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_time = recovery_time_seconds
        self.state = "CLOSED" # CLOSED, OPEN, HALF-OPEN
        self.failure_count = 0
        self.last_state_change = 0.0

    def record_success(self):
        if self.state != "CLOSED":
            logger.info(f"[{self.name} Circuit] Connection restored. Closing circuit.")
        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self):
        self.failure_count += 1
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            self.last_state_change = time.time()
            logger.warning(
                f"[{self.name} Circuit] TRIPPED to OPEN. Failure threshold reached. "
                f"Forcing local fallbacks for next {self.recovery_time}s."
            )

    def allow_request(self) -> bool:
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if time.time() - self.last_state_change > self.recovery_time:
                self.state = "HALF-OPEN"
                logger.info(f"[{self.name} Circuit] Cooldown expired. Testing connection (HALF-OPEN).")
                return True
            return False
        elif self.state == "HALF-OPEN":
            return True

# Initialize stateful circuit breakers for Phase 3 & 4
p3_breaker = CircuitBreaker("Layer 3 Isolation Forest")
p4_breaker = CircuitBreaker("Layer 4 Random Forest")

# File Paths (relative to project root)
P3_MODEL_PATH = "ml_core/device_fingerprint/isolation_forest_model.pkl"
P3_SCALER_PATH = "ml_core/device_fingerprint/scaler_p3.pkl"

P4_MODEL_PATH = "ml_core/behavioral_biometrics/behavioral_classifier.pkl"
P4_SCALER_PATH = "ml_core/behavioral_biometrics/scaler_p4.pkl"

# Initialize global cache for loaded models
_p3_model = None
_p3_scaler = None
_p4_model = None
_p4_scaler = None

def load_ml_models():
    """
    Safely loads serialized models and scalers into memory if not already cached.
    """
    global _p3_model, _p3_scaler, _p4_model, _p4_scaler
    
    # Load Phase 3 Isolation Forest
    if _p3_model is None or _p3_scaler is None:
        if os.path.exists(P3_MODEL_PATH) and os.path.exists(P3_SCALER_PATH):
            try:
                _p3_model = joblib.load(P3_MODEL_PATH)
                _p3_scaler = joblib.load(P3_SCALER_PATH)
                logger.info("Phase 3 (Isolation Forest) loaded successfully.")
            except Exception as e:
                logger.error(f"Error loading Phase 3 model/scaler: {e}")
        else:
            logger.warning("Phase 3 model or scaler files not found on disk. Dynamic check will fall back to rule-based.")

    # Load Phase 4 Random Forest Behavioral Classifier
    if _p4_model is None or _p4_scaler is None:
        if os.path.exists(P4_MODEL_PATH) and os.path.exists(P4_SCALER_PATH):
            try:
                _p4_model = joblib.load(P4_MODEL_PATH)
                _p4_scaler = joblib.load(P4_SCALER_PATH)
                logger.info("Phase 4 (Random Forest Classifier) loaded successfully.")
            except Exception as e:
                logger.error(f"Error loading Phase 4 model/scaler: {e}")
        else:
            logger.warning("Phase 4 model or scaler files not found on disk. Dynamic check will fall back to rule-based.")

def evaluate_phase3_device(time_delta_seconds: float, accounts_per_device: int, login_attempts: int, amount: float):
    """
    Runs the Isolation Forest anomaly detector.
    
    Returns:
        tuple: (is_anomaly [bool], decision_score [float])
    """
    global _p3_model, _p3_scaler
    
    # Check if Circuit Breaker allows requests
    if p3_breaker.allow_request():
        try:
            load_ml_models()
            if _p3_model is not None and _p3_scaler is not None:
                features = np.array([[time_delta_seconds, float(accounts_per_device), float(login_attempts), float(amount)]])
                scaled_features = _p3_scaler.transform(features)
                pred = _p3_model.predict(scaled_features)[0]
                score = _p3_model.decision_function(scaled_features)[0]
                
                is_anomaly = bool(pred == -1)
                p3_breaker.record_success()
                return is_anomaly, float(score)
        except Exception as e:
            logger.error(f"Error during Phase 3 model prediction: {e}")
            p3_breaker.record_failure()
            
    # --- Rule-based Fallback ---
    # Trigger anomaly if shared device count is high OR OTP attempts are high in a small delta
    logger.info("Phase 3 executing rule-based fallback evaluation.")
    score = 0.1
    is_anomaly = False
    
    if accounts_per_device >= 5:
        is_anomaly = True
        score = -0.15
    elif login_attempts >= 5 and time_delta_seconds < 60.0:
        is_anomaly = True
        score = -0.10
        
    return is_anomaly, score

def evaluate_phase4_behavior(
    click_duration: float, 
    scroll_depth: float, 
    mouse_movement: float, 
    keystrokes_detected: float, 
    click_frequency: float, 
    time_since_last_click: float, 
    VPN_usage: float, 
    proxy_usage: float, 
    device_ip_reputation: str
):
    """
    Runs the Random Forest behavioral classifier to predict bot behavior.
    
    Returns:
        tuple: (is_bot_behavior [bool], fraud_probability [float])
    """
    global _p4_model, _p4_scaler
    
    # Map reputation to score
    reputation_map = {"Good": 1.0, "Neutral": 0.0, "Suspicious": 0.0, "Bad": -1.0}
    rep_score = reputation_map.get(device_ip_reputation, 0.0)
    
    # Check if Circuit Breaker allows requests
    if p4_breaker.allow_request():
        try:
            load_ml_models()
            if _p4_model is not None and _p4_scaler is not None:
                features = np.array([[
                    click_duration, 
                    scroll_depth, 
                    mouse_movement, 
                    keystrokes_detected, 
                    click_frequency, 
                    time_since_last_click, 
                    VPN_usage, 
                    proxy_usage, 
                    rep_score
                ]])
                
                scaled_features = _p4_scaler.transform(features)
                prob_fraud = _p4_model.predict_proba(scaled_features)[0][1]
                pred_class = _p4_model.predict(scaled_features)[0]
                
                is_bot = bool(pred_class == 1 or prob_fraud >= 0.50)
                p4_breaker.record_success()
                return is_bot, float(prob_fraud)
        except Exception as e:
            logger.error(f"Error during Phase 4 model prediction: {e}")
            p4_breaker.record_failure()
            
    # --- Rule-based Fallback ---
    # Trigger bot behavior if mouse coordinates variance is zero OR click speeds are mechanical
    logger.info("Phase 4 executing rule-based fallback evaluation.")
    prob_fraud = 0.1
    is_bot = False
    
    if mouse_movement <= 5.0 and click_duration < 0.05:
        # Perfectly straight/no movement + instant click = script
        is_bot = True
        prob_fraud = 0.95
    elif VPN_usage == 1.0 and proxy_usage == 1.0 and rep_score == -1.0:
        # Heavy network obfuscation
        is_bot = True
        prob_fraud = 0.80
        
    return is_bot, prob_fraud

def calculate_trajectory_variance(trajectory: list) -> float:
    """
    Parses a list of coordinates [[x1, y1, t1], [x2, y2, t2], ...] and calculates
    the variance of the instantaneous movement velocities.
    
    A bot/automated script moves with absolute constant velocity (straight line), 
    producing a velocity variance close to 0. A human exhibits natural speed 
    deviations (acceleration, hesitation, deceleration), producing significant variance.
    """
    if not trajectory or len(trajectory) < 3:
        return 0.0
        
    velocities = []
    for i in range(len(trajectory) - 1):
        pt1 = trajectory[i]
        pt2 = trajectory[i+1]
        
        # Ensure points contain [x, y, t]
        if len(pt1) >= 3 and len(pt2) >= 3:
            x1, y1, t1 = pt1[0], pt1[1], pt1[2]
            x2, y2, t2 = pt2[0], pt2[1], pt2[2]
            
            t_delta = t2 - t1
            if t_delta > 0:
                distance = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
                velocity = distance / t_delta
                velocities.append(velocity)
                
    if len(velocities) < 2:
        return 0.0
        
    return float(np.var(velocities))
