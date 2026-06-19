/**
 * Feature 3: Predictive Fraud Ring Detection Component
 * Displays detected coordinated fraud rings with linked accounts
 */
import React, { useState, useEffect } from 'react';
import '../styles/fraud-rings.css';

export default function FraudRingDetector({ rings = [] }) {
  const [selectedRing, setSelectedRing] = useState(null);
  const [sortBy, setSortBy] = useState('confidence'); // 'confidence' or 'accounts'

  const sortedRings = [...rings].sort((a, b) => {
    if (sortBy === 'confidence') {
      return b.confidence - a.confidence;
    } else {
      return b.linked_accounts - a.linked_accounts;
    }
  });

  const getRiskLevel = (confidence) => {
    if (confidence >= 0.85) return { level: 'CRITICAL', icon: '🚨' };
    if (confidence >= 0.70) return { level: 'HIGH', icon: '⚠️' };
    if (confidence >= 0.50) return { level: 'MEDIUM', icon: '⚡' };
    return { level: 'LOW', icon: 'ℹ️' };
  };

  if (rings.length === 0) {
    return (
      <div className="fraud-ring-detector fraud-ring-detector--empty">
        <div className="fraud-ring-empty">
          <div className="fraud-ring-empty__icon">🔒</div>
          <div className="fraud-ring-empty__text">No fraud rings detected</div>
          <div className="fraud-ring-empty__subtext">System is monitoring for coordinated activity</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fraud-ring-detector">
      <div className="fraud-ring-header">
        <h2 className="fraud-ring-title">Detected Fraud Rings</h2>
        <div className="fraud-ring-controls">
          <button
            className={`fraud-ring-sort ${sortBy === 'confidence' ? 'active' : ''}`}
            onClick={() => setSortBy('confidence')}
          >
            By Confidence
          </button>
          <button
            className={`fraud-ring-sort ${sortBy === 'accounts' ? 'active' : ''}`}
            onClick={() => setSortBy('accounts')}
          >
            By Size
          </button>
        </div>
      </div>

      <div className="fraud-ring-list">
        {sortedRings.map((ring, idx) => {
          const riskInfo = getRiskLevel(ring.confidence);
          const isSelected = selectedRing === ring.ring_id;

          return (
            <div
              key={idx}
              className={`fraud-ring-item ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedRing(isSelected ? null : ring.ring_id)}
            >
              <div className="fraud-ring-card">
                <div className="fraud-ring-card__icon">{riskInfo.icon}</div>

                <div className="fraud-ring-card__main">
                  <div className="fraud-ring-card__id">{ring.ring_id}</div>
                  <div className="fraud-ring-card__type">
                    {ring.common_factors?.join(', ') || 'Device hash match'}
                  </div>
                </div>

                <div className="fraud-ring-card__metrics">
                  <div className="fraud-ring-metric">
                    <span className="fraud-ring-metric__label">Accounts</span>
                    <span className="fraud-ring-metric__value">{ring.linked_accounts}</span>
                  </div>
                  <div className="fraud-ring-metric">
                    <span className="fraud-ring-metric__label">Confidence</span>
                    <span className="fraud-ring-metric__value">
                      {(ring.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="fraud-ring-card__badge">{riskInfo.level}</div>
              </div>

              {isSelected && (
                <div className="fraud-ring-details">
                  <h4 className="fraud-ring-details__title">Ring Details</h4>

                  <div className="fraud-ring-details__section">
                    <div className="fraud-ring-details__label">Ring ID</div>
                    <div className="fraud-ring-details__value">{ring.ring_id}</div>
                  </div>

                  <div className="fraud-ring-details__section">
                    <div className="fraud-ring-details__label">Linked Accounts</div>
                    <div className="fraud-ring-details__value">{ring.linked_accounts}</div>
                  </div>

                  <div className="fraud-ring-details__section">
                    <div className="fraud-ring-details__label">Confidence Score</div>
                    <div className="fraud-ring-details__value">
                      {(ring.confidence * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="fraud-ring-details__section">
                    <div className="fraud-ring-details__label">Common Factors</div>
                    <div className="fraud-ring-details__factors">
                      {ring.common_factors?.map((factor, i) => (
                        <span key={i} className="fraud-ring-details__factor">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>

                  {ring.webgl_hash && (
                    <div className="fraud-ring-details__section">
                      <div className="fraud-ring-details__label">Device Hash</div>
                      <div className="fraud-ring-details__value fraud-ring-details__value--mono">
                        {ring.webgl_hash}
                      </div>
                    </div>
                  )}

                  <div className="fraud-ring-details__actions">
                    <button className="fraud-ring-details__action fraud-ring-details__action--primary">
                      Block All Accounts
                    </button>
                    <button className="fraud-ring-details__action fraud-ring-details__action--secondary">
                      View Accounts
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fraud-ring-summary">
        <div className="fraud-ring-summary__stat">
          <span className="fraud-ring-summary__label">Total Rings</span>
          <span className="fraud-ring-summary__value">{rings.length}</span>
        </div>
        <div className="fraud-ring-summary__stat">
          <span className="fraud-ring-summary__label">Total Linked Accounts</span>
          <span className="fraud-ring-summary__value">
            {rings.reduce((sum, ring) => sum + ring.linked_accounts, 0)}
          </span>
        </div>
        <div className="fraud-ring-summary__stat">
          <span className="fraud-ring-summary__label">Avg Confidence</span>
          <span className="fraud-ring-summary__value">
            {(rings.reduce((sum, ring) => sum + ring.confidence, 0) / rings.length * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
