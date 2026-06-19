/**
 * Feature 1 & 2: Real-Time Risk Dashboard View
 * Main analytics dashboard showing fraud statistics, trends, and operational metrics
 */
import React, { useState, useEffect } from 'react';
import AnalyticsCard from '../components/AnalyticsCard';
import FraudRingDetector from '../components/FraudRingDetector';
import AlertPanel from '../components/AlertPanel';
import {
  getFraudStatistics,
  getGeographicHotspots,
  getDailyTrend,
  getModelPerformance,
  getFraudRings,
  getAlerts,
  markAlertAsRead
} from '../api/guardApi';
import '../styles/analytics.css';

export default function RiskDashboardView() {
  const [stats, setStats] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [trend, setTrend] = useState([]);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [rings, setRings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [statsData, hotspotsData, trendData, metricsData, ringsData, alertsData] = await Promise.all([
        getFraudStatistics(7),
        getGeographicHotspots(7),
        getDailyTrend(30),
        getModelPerformance(),
        getFraudRings(3),
        getAlerts(false) // Get unread alerts only
      ]);

      setStats(statsData);
      setHotspots(hotspotsData?.hotspots || []);
      setTrend(trendData?.trend || []);
      setModelMetrics(metricsData);
      setRings(ringsData?.rings || []);
      setAlerts(alertsData?.alerts || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchData().finally(() => setRefreshing(false));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAlertRead = async (alertId) => {
    try {
      await markAlertAsRead(alertId);
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_read: true } : a));
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const getSparklineData = (trendData, dataKey = 'rate') => {
    if (!trendData || trendData.length === 0) return [];
    const maxVal = Math.max(...trendData.map(d => d[dataKey] || 0));
    return trendData.slice(-7).map(d => maxVal > 0 ? d[dataKey] / maxVal : 0);
  };

  if (loading) {
    return (
      <div className="container animate-fade-in" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div className="spinner spinner--lg" />
        <p style={{ marginTop: 16, color: 'var(--color-text-2)' }}>Loading dashboard analytics...</p>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 24px' }}>
      <div className="section-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>Real-Time Risk Dashboard</h2>
            <p>Live fraud metrics, detected rings, and system performance.</p>
          </div>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => {
              setRefreshing(true);
              fetchData().finally(() => setRefreshing(false));
            }}
            disabled={refreshing}
          >
            {refreshing ? <span className="spinner spinner--sm" /> : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: 24 }}>
          <span className="alert__icon">✕</span>
          <p>{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      {stats && (
        <div className="analytics-grid">
          <AnalyticsCard
            title="Total Applications"
            value={stats.total_applications}
            unit="users"
            icon="👥"
            status="neutral"
          />
          <AnalyticsCard
            title="Fraud Rate"
            value={`${(stats.fraud_rate * 100).toFixed(2)}%`}
            unit="flagged"
            status={stats.fraud_rate > 0.10 ? 'danger' : stats.fraud_rate > 0.05 ? 'warning' : 'success'}
            icon="⚠️"
            trend={
              stats.fraud_rate > 0.08
                ? { direction: 'up', percent: (stats.fraud_rate * 100).toFixed(1) }
                : { direction: 'down', percent: (stats.fraud_rate * 100).toFixed(1) }
            }
          />
          <AnalyticsCard
            title="Approved"
            value={stats.approved}
            unit="users"
            icon="✓"
            status="success"
          />
          <AnalyticsCard
            title="Rejected/Flagged"
            value={stats.rejected}
            unit="users"
            icon="✕"
            status="danger"
          />
        </div>
      )}

      {/* Layer-wise Fraud Rates */}
      {stats && stats.by_layer && (
        <div style={{ marginBottom: 30 }}>
          <h3 style={{ marginBottom: 16 }}>Fraud Detection by Layer</h3>
          <div className="analytics-grid">
            <AnalyticsCard
              title="Layer 1: Identity Graph"
              value={`${(stats.by_layer.layer1 * 100).toFixed(2)}%`}
              unit="fraud rate"
              icon="🔗"
              status="info"
              sparkline={getSparklineData(trend, 'fraud')}
            />
            <AnalyticsCard
              title="Layer 2: Document Scan"
              value={`${(stats.by_layer.layer2 * 100).toFixed(2)}%`}
              unit="fraud rate"
              icon="📄"
              status="info"
              sparkline={getSparklineData(trend, 'fraud')}
            />
            <AnalyticsCard
              title="Layer 3: Device Fingerprint"
              value={`${(stats.by_layer.layer3 * 100).toFixed(2)}%`}
              unit="fraud rate"
              icon="💻"
              status="info"
              sparkline={getSparklineData(trend, 'fraud')}
            />
            <AnalyticsCard
              title="Layer 4: Behavioral Biometrics"
              value={`${(stats.by_layer.layer4 * 100).toFixed(2)}%`}
              unit="fraud rate"
              icon="⚡"
              status="info"
              sparkline={getSparklineData(trend, 'fraud')}
            />
          </div>
        </div>
      )}

      <div className="grid-2" style={{ gap: 24, marginBottom: 30 }}>
        {/* Geographic Hotspots */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <h3 style={{ marginBottom: 16 }}>Geographic Hotspots</h3>
          {hotspots && hotspots.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {hotspots.slice(0, 5).map((spot, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{spot.state}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>{spot.count} applications</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${spot.fraud_rate * 100}%`, height: '100%', background: spot.fraud_rate > 0.10 ? 'var(--color-danger)' : 'var(--color-warning)' }} />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
                      {(spot.fraud_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ color: 'var(--color-text-3)', fontSize: '13px', margin: 0 }}>
                No geographic data available
              </p>
              <p style={{ color: 'var(--color-text-4)', fontSize: '11px', margin: '6px 0 0 0' }}>
                Geographic hotspots will appear once applications are submitted from different regions.
              </p>
            </div>
          )}
        </div>

        {/* Model Performance - Only for ML-enabled layers (3 & 4) */}
        {modelMetrics && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <h3 style={{ marginBottom: 16 }}>ML Model Performance</h3>
            <div style={{ marginBottom: 12, fontSize: '12px', color: 'var(--color-text-3)' }}>
              Precision & Recall metrics for ML-enabled layers (Layer 3: Isolation Forest, Layer 4: Random Forest)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Only render Layer 3 & 4 */}
              {['layer3', 'layer4'].map((layer) => {
                const metrics = modelMetrics[layer];
                if (!metrics) return null;
                
                // If data is not available, show message
                if (!metrics.available) {
                  return (
                    <div key={layer}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 6, textTransform: 'uppercase' }}>
                        {layer === 'layer3' ? 'Layer 3: Device Fingerprinting' : 'Layer 4: Behavioral Biometrics'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-3)', fontStyle: 'italic', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                        {metrics.message || 'No data available'}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={layer}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 6, textTransform: 'uppercase' }}>
                      {layer === 'layer3' ? 'Layer 3: Device Fingerprinting' : 'Layer 4: Behavioral Biometrics'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: '12px' }}>
                      <div>
                        <div style={{ color: 'var(--color-text-3)' }}>Precision</div>
                        <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>{(metrics.precision * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--color-text-3)' }}>Recall</div>
                        <div style={{ fontWeight: 600, color: 'var(--color-info)' }}>{(metrics.recall * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--color-text-3)' }}>F1 Score</div>
                        <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{(metrics.f1 * 100).toFixed(0)}%</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--color-text-3)' }}>Model</div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '11px' }}>{metrics.model}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Fraud Ring Detection */}
      {rings.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <FraudRingDetector rings={rings} />
        </div>
      )}

      {/* Active Alerts */}
      <div style={{ marginBottom: 30 }}>
        <h3 style={{ marginBottom: 16 }}>Active Alerts</h3>
        <AlertPanel alerts={alerts} onMarkRead={handleMarkAlertRead} />
      </div>

      {/* Daily Trend Chart (Text-based) */}
      {trend && trend.length > 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <h3 style={{ marginBottom: 16 }}>Daily Fraud Trend (Last 30 Days)</h3>
          <div style={{ fontSize: '11px', color: 'var(--color-text-3)', marginBottom: 16, fontFamily: 'monospace' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 60px 60px 80px', gap: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>Date</div>
              <div style={{ fontWeight: 600 }}>Total</div>
              <div style={{ fontWeight: 600 }}>Fraud</div>
              <div style={{ fontWeight: 600 }}>Rate</div>
            </div>
            {trend.slice(-7).map((day, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '70px 60px 60px 80px', gap: 8, padding: '4px 0' }}>
                <div>{day.date}</div>
                <div>{day.total}</div>
                <div>{day.fraud}</div>
                <div>{(day.rate * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
