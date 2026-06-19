/**
 * Feature 8: Smart Alert & Escalation System - Alert Panel Component
 * Displays active alerts with severity levels and actions
 */
import React, { useState, useEffect } from 'react';
import '../styles/alerts.css';

const SEVERITY_COLORS = {
  CRITICAL: '#DC2626',
  HIGH: '#D97706',
  MEDIUM: '#F59E0B',
  LOW: '#6B7280'
};

const SEVERITY_ICONS = {
  CRITICAL: '🚨',
  HIGH: '⚠️',
  MEDIUM: '⚠️',
  LOW: 'ℹ️'
};

export default function AlertPanel({ alerts = [], onMarkRead = null }) {
  const [groupedAlerts, setGroupedAlerts] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    // Group alerts by severity
    const grouped = {};
    alerts.forEach(alert => {
      const severity = alert.severity || 'LOW';
      if (!grouped[severity]) {
        grouped[severity] = [];
      }
      grouped[severity].push(alert);
    });

    // Sort by severity
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const sorted = {};
    severityOrder.forEach(severity => {
      if (grouped[severity]) {
        sorted[severity] = grouped[severity];
      }
    });

    setGroupedAlerts(sorted);
  }, [alerts]);

  const toggleGroup = (severity) => {
    setExpandedGroups(prev => ({
      ...prev,
      [severity]: !prev[severity]
    }));
  };

  const handleMarkRead = (alertId) => {
    if (onMarkRead) {
      onMarkRead(alertId);
    }
  };

  const renderAlert = (alert) => (
    <div key={alert.id} className="alert-item">
      <div className="alert-item__icon">
        {SEVERITY_ICONS[alert.severity] || 'ℹ️'}
      </div>

      <div className="alert-item__content">
        <div className="alert-item__title">{alert.title}</div>
        <div className="alert-item__message">{alert.message}</div>
        <div className="alert-item__meta">
          <span className="alert-item__time">
            {new Date(alert.created_at).toLocaleTimeString()}
          </span>
          <span className="alert-item__type">{alert.alert_type}</span>
        </div>
      </div>

      <div className="alert-item__actions">
        {!alert.is_read && (
          <button
            className="alert-item__action-btn alert-item__action-btn--read"
            onClick={() => handleMarkRead(alert.id)}
            title="Mark as read"
          >
            ✓
          </button>
        )}
        {alert.is_read && (
          <span className="alert-item__badge alert-item__badge--read">Read</span>
        )}
      </div>
    </div>
  );

  if (Object.keys(groupedAlerts).length === 0) {
    return (
      <div className="alert-panel alert-panel--empty">
        <div className="alert-panel__empty-state">
          <div className="alert-panel__empty-icon">✓</div>
          <div className="alert-panel__empty-text">No active alerts</div>
          <div className="alert-panel__empty-subtext">Your system is operating normally</div>
        </div>
      </div>
    );
  }

  return (
    <div className="alert-panel">
      {Object.entries(groupedAlerts).map(([severity, severityAlerts]) => (
        <div key={severity} className="alert-group">
          <button
            className="alert-group__header"
            onClick={() => toggleGroup(severity)}
          >
            <div className="alert-group__icon" style={{ color: SEVERITY_COLORS[severity] }}>
              {SEVERITY_ICONS[severity]}
            </div>
            <div className="alert-group__label">
              <span className="alert-group__severity">{severity}</span>
              <span className="alert-group__count">{severityAlerts.length}</span>
            </div>
            <span className="alert-group__toggle">
              {expandedGroups[severity] ? '▼' : '▶'}
            </span>
          </button>

          {expandedGroups[severity] && (
            <div className="alert-group__content">
              {severityAlerts.map(alert => renderAlert(alert))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
