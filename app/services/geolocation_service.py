"""
Geolocation Service: Location-based fraud detection
Supports Feature 5: Geolocation & IP Reputation Integration
"""
import logging
import socket
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app import models
import math

logger = logging.getLogger("guardindia_geolocation_service")

# IP Reputation cache (in production, use external API like MaxMind/IP2Location)
IP_REPUTATION_CACHE = {}

# Simple IP to Location mapping (demonstration)
MOCK_IP_LOCATIONS = {
    "203.0.113": {"city": "Mumbai", "state": "Maharashtra", "country": "IN", "lat": 19.0760, "lng": 72.8777},
    "198.51.100": {"city": "Bangalore", "state": "Karnataka", "country": "IN", "lat": 12.9716, "lng": 77.5946},
    "192.0.2": {"city": "Delhi", "state": "Delhi", "country": "IN", "lat": 28.7041, "lng": 77.1025},
    "1.1.1": {"city": "Unknown", "state": "Unknown", "country": "Unknown", "lat": 0, "lng": 0},
}

# Mock VPN/Proxy detection
KNOWN_VPN_IPS = [
    "45.32", "45.33", "45.34", "45.35", "45.36",
    "95.211", "104.21", "141.98", "172.65"
]

class GeolocationService:
    """Handles IP geolocation and fraud risk assessment"""
    
    @staticmethod
    def get_ip_location(ip_address: str) -> Dict[str, Any]:
        """
        Gets location info from IP address
        In production, integrate with MaxMind, IP2Location, or similar
        
        Returns:
            {
                "ip": "203.0.113.42",
                "location": "Mumbai, Maharashtra",
                "country": "IN",
                "coordinates": {"lat": 19.0760, "lng": 72.8777},
                "is_vpn": False,
                "carrier": "Jio",
                "carrier_reputation": "Good"
            }
        """
        try:
            # Check cache first
            if ip_address in IP_REPUTATION_CACHE:
                return IP_REPUTATION_CACHE[ip_address]
            
            # Mock lookup based on IP prefix
            location = None
            for prefix, loc in MOCK_IP_LOCATIONS.items():
                if ip_address.startswith(prefix):
                    location = loc
                    break
            
            if not location:
                location = MOCK_IP_LOCATIONS["1.1.1"]
            
            # Check if VPN/Proxy
            is_vpn = GeolocationService._is_vpn_proxy(ip_address)
            
            # Get carrier info (mock)
            carrier = GeolocationService._get_carrier_info(ip_address)
            
            result = {
                "ip": ip_address,
                "location": f"{location['city']}, {location['state']}",
                "country": location["country"],
                "coordinates": {
                    "lat": location["lat"],
                    "lng": location["lng"]
                },
                "is_vpn": is_vpn,
                "carrier": carrier,
                "carrier_reputation": "Good" if not is_vpn else "Suspicious",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Cache result
            IP_REPUTATION_CACHE[ip_address] = result
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting IP location for {ip_address}: {e}")
            return {
                "ip": ip_address,
                "location": "Unknown",
                "country": "Unknown",
                "coordinates": {"lat": 0, "lng": 0},
                "is_vpn": False,
                "carrier": "Unknown",
                "carrier_reputation": "Unknown"
            }
    
    @staticmethod
    def _is_vpn_proxy(ip_address: str) -> bool:
        """Checks if IP belongs to known VPN/Proxy providers"""
        for vpn_prefix in KNOWN_VPN_IPS:
            if ip_address.startswith(vpn_prefix):
                return True
        return False
    
    @staticmethod
    def _get_carrier_info(ip_address: str) -> str:
        """Mock carrier detection from IP"""
        if ip_address.startswith("203.0.113"):
            return "Jio"
        elif ip_address.startswith("198.51.100"):
            return "Airtel"
        elif ip_address.startswith("192.0.2"):
            return "BSNL"
        return "Other"
    
    @staticmethod
    def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance in km between two coordinates (Haversine formula)"""
        R = 6371  # Earth radius in km
        
        d_lat = math.radians(lat2 - lat1)
        d_lng = math.radians(lng2 - lng1)
        
        a = (math.sin(d_lat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(d_lng / 2) ** 2)
        
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    @staticmethod
    def detect_impossible_travel(
        db: Session,
        user_id: str,
        current_ip: str,
        current_timestamp: datetime
    ) -> Dict[str, Any]:
        """
        Detects impossible travel patterns
        If user logged in from Mumbai 1 hour ago and now from Delhi with latency < 3 hours
        
        Returns:
            {
                "is_impossible_travel": True,
                "previous_location": "Mumbai, MH",
                "current_location": "Delhi, DL",
                "distance_km": 1200,
                "time_delta_minutes": 45,
                "required_speed_kmh": 1600,
                "possible": False,
                "risk_score": 0.85
            }
        """
        try:
            current_loc = GeolocationService.get_ip_location(current_ip)
            
            # Get most recent previous login
            previous_fp = db.query(models.DeviceFingerprint).filter(
                models.DeviceFingerprint.user_id == user_id,
                models.DeviceFingerprint.login_timestamp < current_timestamp
            ).order_by(models.DeviceFingerprint.login_timestamp.desc()).first()
            
            if not previous_fp:
                return {
                    "is_impossible_travel": False,
                    "previous_location": None,
                    "current_location": current_loc["location"],
                    "risk_score": 0.0
                }
            
            # Try to get previous location (would need to store IP in DB)
            # For now, use mock data
            previous_loc = GeolocationService.get_ip_location("203.0.113.1")  # Mock
            
            # Calculate distance
            distance = GeolocationService.calculate_distance(
                previous_loc["coordinates"]["lat"],
                previous_loc["coordinates"]["lng"],
                current_loc["coordinates"]["lat"],
                current_loc["coordinates"]["lng"]
            )
            
            # Calculate time delta
            time_delta = current_timestamp - previous_fp.login_timestamp
            time_delta_minutes = time_delta.total_seconds() / 60
            
            # Calculate required speed
            required_speed = (distance / max(time_delta_minutes, 1)) * 60  # km/h
            
            # Is travel possible? (Commercial flight max speed ~900 km/h)
            is_possible = required_speed <= 900
            
            risk_score = 0.0
            if not is_possible:
                risk_score = min(0.85, (required_speed - 900) / 1000)
            
            return {
                "is_impossible_travel": not is_possible,
                "previous_location": previous_loc["location"],
                "current_location": current_loc["location"],
                "distance_km": round(distance, 2),
                "time_delta_minutes": round(time_delta_minutes, 2),
                "required_speed_kmh": round(required_speed, 2),
                "possible": is_possible,
                "risk_score": round(risk_score, 4)
            }
            
        except Exception as e:
            logger.error(f"Error detecting impossible travel: {e}")
            return {"is_impossible_travel": False, "risk_score": 0.0}
    
    @staticmethod
    def assess_location_risk(
        db: Session,
        user_id: str,
        current_ip: str,
        current_timestamp: datetime
    ) -> Dict[str, Any]:
        """
        Comprehensive location-based risk assessment
        
        Returns:
            {
                "location_risk_score": 0.35,
                "factors": {
                    "impossible_travel": {"detected": False, "risk": 0.0},
                    "vpn_usage": {"detected": False, "risk": 0.0},
                    "high_fraud_region": {"detected": True, "risk": 0.15}
                }
            }
        """
        try:
            location = GeolocationService.get_ip_location(current_ip)
            impossible_travel = GeolocationService.detect_impossible_travel(
                db, user_id, current_ip, current_timestamp
            )
            
            risk_score = 0.0
            factors = {}
            
            # Factor 1: Impossible travel
            if impossible_travel.get("is_impossible_travel"):
                risk_score += impossible_travel.get("risk_score", 0.0)
                factors["impossible_travel"] = {
                    "detected": True,
                    "risk": impossible_travel.get("risk_score", 0.0)
                }
            else:
                factors["impossible_travel"] = {"detected": False, "risk": 0.0}
            
            # Factor 2: VPN/Proxy usage
            if location.get("is_vpn"):
                risk_score += 0.20
                factors["vpn_usage"] = {"detected": True, "risk": 0.20}
            else:
                factors["vpn_usage"] = {"detected": False, "risk": 0.0}
            
            # Factor 3: High fraud region
            # In real implementation, use historical fraud data by region
            high_fraud_states = ["Maharashtra", "Karnataka", "Telangana"]  # Example
            if any(state in location.get("location", "") for state in high_fraud_states):
                risk_score += 0.15
                factors["high_fraud_region"] = {"detected": True, "risk": 0.15}
            else:
                factors["high_fraud_region"] = {"detected": False, "risk": 0.0}
            
            # Factor 4: Carrier reputation
            if location.get("carrier_reputation") == "Suspicious":
                risk_score += 0.10
                factors["suspicious_carrier"] = {"detected": True, "risk": 0.10}
            else:
                factors["suspicious_carrier"] = {"detected": False, "risk": 0.0}
            
            return {
                "location_risk_score": round(min(1.0, risk_score), 4),
                "location": location["location"],
                "factors": factors,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error assessing location risk: {e}")
            return {"location_risk_score": 0.0, "factors": {}}
