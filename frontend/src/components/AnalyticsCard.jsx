/**
 * Feature 1: Real-Time Risk Dashboard - Analytics Card Component
 * Displays fraud statistics, trends, and model performance
 */
import React, { useState, useEffect } from 'react';
import '../styles/analytics.css';

export default function AnalyticsCard({
  title,
  value,
  unit = '',
  trend = null,
  status = 'neutral',
  icon = '📊',
  sparkline = null
}) {
  return (
    <div className={`analytics-card analytics-card--${status}`}>
      <div className="analytics-card__header">
        <span className="analytics-card__icon">{icon}</span>
        <h3 className="analytics-card__title">{title}</h3>
      </div>

      <div className="analytics-card__main">
        <div className="analytics-card__value">{value}</div>
        {unit && <div className="analytics-card__unit">{unit}</div>}
      </div>

      {trend && (
        <div className={`analytics-card__trend analytics-card__trend--${trend.direction}`}>
          <span className="analytics-card__trend-icon">
            {trend.direction === 'up' ? '↑' : '↓'}
          </span>
          <span className="analytics-card__trend-value">
            {Math.abs(trend.percent).toFixed(1)}%
          </span>
          <span className="analytics-card__trend-label">vs last period</span>
        </div>
      )}

      {sparkline && (
        <div className="analytics-card__sparkline">
          {sparkline.map((val, idx) => (
            <div
              key={idx}
              className="analytics-card__bar"
              style={{ height: `${val * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
