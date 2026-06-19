"""
Alert Service: Smart notification and escalation system
Supports Feature 8: Smart Alert & Escalation System
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from enum import Enum
import json

logger = logging.getLogger("guardindia_alert_service")

class AlertSeverity(Enum):
    """Alert severity levels"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class Alert:
    """Represents a single alert"""
    
    def __init__(
        self,
        alert_type: str,
        severity: AlertSeverity,
        title: str,
        message: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = self._generate_id()
        self.alert_type = alert_type
        self.severity = severity
        self.title = title
        self.message = message
        self.user_id = user_id
        self.metadata = metadata or {}
        self.created_at = datetime.utcnow()
        self.is_read = False
        self.assigned_to = None
        self.actions_taken = []
    
    def _generate_id(self) -> str:
        """Generate unique alert ID"""
        import uuid
        return f"ALT_{str(uuid.uuid4())[:8].upper()}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary"""
        return {
            "id": self.id,
            "alert_type": self.alert_type,
            "severity": self.severity.value,
            "title": self.title,
            "message": self.message,
            "user_id": self.user_id,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "is_read": self.is_read,
            "assigned_to": self.assigned_to,
            "actions_taken": self.actions_taken
        }


class AlertManager:
    """Manages alert creation, batching, and escalation"""
    
    def __init__(self):
        self.alerts: List[Alert] = []
        self.batched_alerts: Dict[str, List[Alert]] = {}
        self.escalation_rules = self._get_escalation_rules()
        self.alert_history: List[Dict[str, Any]] = []
    
    def _get_escalation_rules(self) -> Dict[str, Dict[str, Any]]:
        """Define escalation rules"""
        return {
            "CRITICAL": {
                "escalate_to": ["operations_team", "manager"],
                "notify_channels": ["slack", "email", "sms"],
                "batch_window_seconds": 0,  # No batching
                "auto_action": "auto_block"
            },
            "HIGH": {
                "escalate_to": ["operations_team"],
                "notify_channels": ["slack", "email"],
                "batch_window_seconds": 300,  # Batch for 5 minutes
                "auto_action": None
            },
            "MEDIUM": {
                "escalate_to": [],
                "notify_channels": ["slack"],
                "batch_window_seconds": 900,  # Batch for 15 minutes
                "auto_action": None
            },
            "LOW": {
                "escalate_to": [],
                "notify_channels": [],
                "batch_window_seconds": 1800,  # Batch for 30 minutes
                "auto_action": None
            }
        }
    
    def create_alert(
        self,
        alert_type: str,
        severity: AlertSeverity,
        title: str,
        message: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Alert:
        """Create a new alert"""
        alert = Alert(alert_type, severity, title, message, user_id, metadata)
        self.alerts.append(alert)
        
        logger.info(f"Created alert: {alert.id} - {alert.title} ({alert.severity.value})")
        
        # Record in history
        self.alert_history.append({
            "alert_id": alert.id,
            "timestamp": datetime.utcnow().isoformat(),
            "severity": severity.value,
            "type": alert_type
        })
        
        return alert
    
    def batch_similar_alerts(self, window_minutes: int = 5) -> Dict[str, List[Alert]]:
        """
        Batches similar alerts to reduce notification spam
        Returns grouped alerts: {"fraud_ring_001": [alert1, alert2, ...]}
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=window_minutes)
        batched = {}
        
        for alert in self.alerts:
            if alert.created_at >= cutoff_time:
                # Group by alert type + user_id
                batch_key = f"{alert.alert_type}_{alert.user_id or 'system'}"
                
                if batch_key not in batched:
                    batched[batch_key] = []
                
                batched[batch_key].append(alert)
        
        self.batched_alerts = batched
        
        logger.info(f"Batched {len(self.alerts)} alerts into {len(batched)} groups")
        
        return batched
    
    def get_escalation_actions(self, severity: AlertSeverity) -> Dict[str, Any]:
        """Get escalation actions for a severity level"""
        return self.escalation_rules.get(severity.value, self.escalation_rules["LOW"])
    
    def should_auto_block(self, alert: Alert) -> bool:
        """Determines if alert should trigger automatic blocking"""
        rules = self.get_escalation_actions(alert.severity)
        
        if rules.get("auto_action") == "auto_block":
            # Additional checks
            if alert.metadata.get("confidence", 0) >= 0.85:
                return True
        
        return False
    
    def format_notification(self, alert: Alert, channel: str) -> str:
        """Format alert message for notification channel"""
        if channel == "slack":
            severity_emoji = {
                "CRITICAL": "🚨",
                "HIGH": "⚠️",
                "MEDIUM": "⚠️",
                "LOW": "ℹ️"
            }
            
            emoji = severity_emoji.get(alert.severity.value, "📢")
            
            return (
                f"{emoji} *{alert.title}*\n"
                f"Severity: {alert.severity.value}\n"
                f"Message: {alert.message}\n"
                f"Alert ID: {alert.id}\n"
                f"Time: {alert.created_at.strftime('%Y-%m-%d %H:%M:%S')} UTC"
            )
        
        elif channel == "email":
            return (
                f"Subject: [{alert.severity.value}] {alert.title}\n\n"
                f"Alert Details:\n"
                f"ID: {alert.id}\n"
                f"Type: {alert.alert_type}\n"
                f"Severity: {alert.severity.value}\n"
                f"Message: {alert.message}\n"
                f"Time: {alert.created_at.isoformat()}\n"
                f"Metadata: {json.dumps(alert.metadata, indent=2)}"
            )
        
        elif channel == "sms":
            return (
                f"[{alert.severity.value}] {alert.title}: {alert.message[:100]}"
            )
        
        return alert.message
    
    def get_pending_alerts(self, read_status: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Get list of pending alerts"""
        alerts = self.alerts
        
        if read_status is not None:
            alerts = [a for a in alerts if a.is_read == read_status]
        
        return [a.to_dict() for a in alerts]
    
    def mark_alert_as_read(self, alert_id: str) -> bool:
        """Mark alert as read"""
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.is_read = True
                return True
        return False
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get summary of all alerts"""
        summary = {
            "total_alerts": len(self.alerts),
            "unread_alerts": len([a for a in self.alerts if not a.is_read]),
            "by_severity": {},
            "by_type": {},
            "recent_alerts": []
        }
        
        # Count by severity
        for severity in AlertSeverity:
            count = len([a for a in self.alerts if a.severity == severity])
            summary["by_severity"][severity.value] = count
        
        # Count by type
        for alert in self.alerts:
            if alert.alert_type not in summary["by_type"]:
                summary["by_type"][alert.alert_type] = 0
            summary["by_type"][alert.alert_type] += 1
        
        # Recent alerts (last 10)
        recent = sorted(self.alerts, key=lambda a: a.created_at, reverse=True)[:10]
        summary["recent_alerts"] = [a.to_dict() for a in recent]
        
        return summary
    
    def create_fraud_ring_alert(self, ring_data: Dict[str, Any]) -> Alert:
        """Create alert for detected fraud ring"""
        return self.create_alert(
            alert_type="fraud_ring_detected",
            severity=AlertSeverity.CRITICAL,
            title=f"Fraud Ring Detected: {ring_data.get('ring_id', 'Unknown')}",
            message=(
                f"Coordinated fraud ring detected with {ring_data.get('linked_accounts', 0)} "
                f"linked accounts (confidence: {ring_data.get('confidence', 0):.0%})"
            ),
            metadata={
                "ring_id": ring_data.get("ring_id"),
                "linked_accounts": ring_data.get("linked_accounts"),
                "confidence": ring_data.get("confidence"),
                "common_factors": ring_data.get("common_factors", [])
            }
        )
    
    def create_impossible_travel_alert(self, travel_data: Dict[str, Any]) -> Alert:
        """Create alert for impossible travel detection"""
        return self.create_alert(
            alert_type="impossible_travel_detected",
            severity=AlertSeverity.HIGH,
            title="Impossible Travel Pattern Detected",
            message=(
                f"User traveled {travel_data.get('distance_km', 0)} km in "
                f"{travel_data.get('time_delta_minutes', 0)} minutes "
                f"(required speed: {travel_data.get('required_speed_kmh', 0)} km/h)"
            ),
            user_id=travel_data.get("user_id"),
            metadata=travel_data
        )
    
    def create_high_risk_application_alert(self, user_data: Dict[str, Any]) -> Alert:
        """Create alert for high-risk application"""
        return self.create_alert(
            alert_type="high_risk_application",
            severity=AlertSeverity.HIGH,
            title=f"High-Risk Application: {user_data.get('user_name', 'Unknown')}",
            message=(
                f"Application flagged with risk score {user_data.get('risk_score', 0):.2f}. "
                f"Recommend manual review."
            ),
            user_id=user_data.get("user_id"),
            metadata=user_data
        )
    
    def create_burst_attack_alert(self, attack_data: Dict[str, Any]) -> Alert:
        """Create alert for burst attack detection"""
        return self.create_alert(
            alert_type="burst_attack_detected",
            severity=AlertSeverity.CRITICAL,
            title="Burst Attack Detected",
            message=(
                f"{attack_data.get('application_count', 0)} applications from "
                f"same device in {attack_data.get('time_window_minutes', 0)} minutes"
            ),
            metadata=attack_data
        )


# Global alert manager instance
alert_manager = AlertManager()
