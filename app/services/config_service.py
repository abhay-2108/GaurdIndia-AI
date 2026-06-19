"""
Configuration Service: Manages risk thresholds and adaptive settings
Supports Feature 2: Smart Risk Scoring Thresholds
"""
import logging
import json
import os
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger("guardindia_config_service")

# Default risk thresholds
DEFAULT_THRESHOLDS = {
    "layer1_jaccard_threshold": 0.30,
    "layer2_ela_threshold": 0.20,
    "layer3_isolation_forest_threshold": -0.15,
    "layer4_bot_probability_threshold": 0.50,
    "overall_risk_low": 0.40,
    "overall_risk_critical": 0.70,
    "device_sharing_threshold": 5,  # Max accounts per device
    "bureau_inquiry_threshold": 3,  # Max inquiries in 1 hour
    "pasted_field_penalty": 0.10,
    "typing_speed_penalty": 0.15,
}

# Config storage file
if os.environ.get("RENDER"):
    CONFIG_FILE = "/data/config/risk_thresholds.json"
else:
    CONFIG_FILE = "data/config/risk_thresholds.json"

class RiskThresholdManager:
    """Manages dynamic risk thresholds with A/B testing support"""
    
    def __init__(self):
        self.config = self._load_config()
        self.ab_tests = self._load_ab_tests()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file or return defaults"""
        try:
            os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
            
            if os.path.exists(CONFIG_FILE):
                with open(CONFIG_FILE, 'r') as f:
                    config = json.load(f)
                    logger.info(f"Loaded config from {CONFIG_FILE}")
                    return config
        except Exception as e:
            logger.warning(f"Could not load config: {e}. Using defaults.")
        
        return DEFAULT_THRESHOLDS.copy()
    
    def _load_ab_tests(self) -> Dict[str, Any]:
        """Load A/B test configurations"""
        return {
            "strict_mode": {
                "enabled": False,
                "thresholds": {
                    "overall_risk_low": 0.30,
                    "overall_risk_critical": 0.60
                },
                "traffic_percentage": 0
            },
            "lenient_mode": {
                "enabled": False,
                "thresholds": {
                    "overall_risk_low": 0.50,
                    "overall_risk_critical": 0.80
                },
                "traffic_percentage": 0
            }
        }
    
    def get_threshold(self, key: str, default: Optional[float] = None) -> float:
        """Get a specific threshold value"""
        value = self.config.get(key)
        if value is not None:
            return value
        return default or DEFAULT_THRESHOLDS.get(key, 0.5)
    
    def update_threshold(self, key: str, value: float) -> bool:
        """Update a threshold value"""
        try:
            self.config[key] = value
            self._save_config()
            logger.info(f"Updated threshold {key} = {value}")
            return True
        except Exception as e:
            logger.error(f"Error updating threshold: {e}")
            return False
    
    def _save_config(self):
        """Persist configuration to file"""
        try:
            os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
            with open(CONFIG_FILE, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving config: {e}")
    
    def get_all_thresholds(self) -> Dict[str, Any]:
        """Get all current thresholds"""
        return self.config.copy()
    
    def reset_to_defaults(self) -> bool:
        """Reset all thresholds to defaults"""
        try:
            self.config = DEFAULT_THRESHOLDS.copy()
            self._save_config()
            logger.info("Reset thresholds to defaults")
            return True
        except Exception as e:
            logger.error(f"Error resetting thresholds: {e}")
            return False
    
    def calculate_adaptive_threshold(self, fraud_rate: float, target_fraud_rate: float = 0.05) -> Dict[str, Any]:
        """
        Calculates adaptive thresholds based on current fraud rate
        If fraud rate is too high, lower thresholds to catch more fraud
        If fraud rate is acceptable, raise thresholds to reduce false positives
        """
        adjustment_factor = target_fraud_rate / max(fraud_rate, 0.01)
        
        # Cap adjustment to reasonable range (0.8 to 1.2)
        adjustment_factor = max(0.8, min(1.2, adjustment_factor))
        
        adaptive_config = {}
        for key, value in self.config.items():
            if isinstance(value, (int, float)) and key.endswith("_threshold"):
                # For lower thresholds (stricter), multiply
                if key in ["layer1_jaccard_threshold", "layer2_ela_threshold"]:
                    adaptive_config[key] = value * adjustment_factor
                else:
                    adaptive_config[key] = value * adjustment_factor
            else:
                adaptive_config[key] = value
        
        return {
            "current_fraud_rate": fraud_rate,
            "target_fraud_rate": target_fraud_rate,
            "adjustment_factor": round(adjustment_factor, 3),
            "recommended_thresholds": adaptive_config
        }
    
    def create_ab_test(self, test_name: str, test_config: Dict[str, Any], traffic_percentage: float) -> bool:
        """Create a new A/B test for threshold variations"""
        try:
            self.ab_tests[test_name] = {
                "enabled": True,
                "thresholds": test_config,
                "traffic_percentage": traffic_percentage,
                "created_at": datetime.utcnow().isoformat()
            }
            logger.info(f"Created A/B test: {test_name}")
            return True
        except Exception as e:
            logger.error(f"Error creating A/B test: {e}")
            return False
    
    def get_ab_tests(self) -> Dict[str, Any]:
        """Get all active A/B tests"""
        return self.ab_tests.copy()
    
    def get_threshold_for_request(self, user_id: str, layer: int) -> float:
        """
        Get the appropriate threshold for a user based on A/B tests
        Returns threshold from either active A/B test or default config
        """
        # Simple hash-based assignment to A/B test
        hash_val = hash(user_id) % 100
        
        if self.ab_tests.get("strict_mode", {}).get("enabled"):
            if hash_val < self.ab_tests["strict_mode"]["traffic_percentage"]:
                return self.ab_tests["strict_mode"]["thresholds"].get(
                    f"layer{layer}_risk_threshold",
                    self.config.get(f"layer{layer}_risk_threshold")
                )
        
        return self.config.get(f"layer{layer}_risk_threshold", 0.5)


# Global instance
threshold_manager = RiskThresholdManager()
