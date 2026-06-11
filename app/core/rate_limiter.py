import time
from fastapi import HTTPException, status, Form
from typing import Optional

# Global cache storing key -> list of float timestamps
_request_history = {}

def check_rate_limit(key: str, limit: int = 5, window_seconds: int = 10):
    """
    Evaluates a sliding-window rate limit check on a given key.
    
    If the key has exceeded the maximum number of requests in the specified
    time window, it raises a FastAPI 429 Too Many Requests exception.
    """
    if not key:
        return
        
    current_time = time.time()
    
    if key not in _request_history:
        _request_history[key] = [current_time]
        return
        
    # Filter out timestamps outside the sliding time window
    history = [t for t in _request_history[key] if current_time - t <= window_seconds]
    _request_history[key] = history
    
    if len(history) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Device hardware fingerprint is temporarily rate-limited."
        )
        
    _request_history[key].append(current_time)

# Dependency for Form-based onboarding endpoint
def rate_limit_onboard(device_id: str = Form(...)):
    check_rate_limit(device_id, limit=5, window_seconds=10)
    return device_id
