/**
 * GuardIndia AI — Central API Client
 * All backend calls route through this module.
 * API base URL is read from the Vite environment variable VITE_API_URL.
 */

export const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errDetail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      errDetail = body.detail || JSON.stringify(body);
    } catch (_) {}
    throw new Error(errDetail);
  }

  return response.json();
}

/**
 * Phase 1 & 2: Onboard a new applicant.
 * Sends multipart/form-data with KYC document image.
 * Returns HTTP 202 immediately (async pipeline).
 *
 * @param {Object} params
 * @param {string} params.fullName
 * @param {string} params.phoneNumber
 * @param {string} params.panNumber
 * @param {string} params.deviceId  — WebGL fingerprint hash
 * @param {string} params.userAgent
 * @param {File}   params.file      — KYC document image
 * @returns {Promise<{user_id: string, status: string, ...}>}
 */
export async function onboardUser({ 
  fullName, 
  phoneNumber, 
  panNumber, 
  deviceId, 
  userAgent, 
  file, 
  livenessPassed = true,
  simVerified = false,
  pastedFieldsCount = 0,
  typingSpeedStd = 0.0,
  passkeyAttestation = null
}) {
  const formData = new FormData();
  formData.append('full_name', fullName);
  formData.append('phone_number', phoneNumber);
  formData.append('pan_number', panNumber);
  formData.append('device_id', deviceId);
  formData.append('user_agent', userAgent);
  formData.append('file', file);
  formData.append('liveness_passed', livenessPassed);
  formData.append('sim_verified', simVerified);
  formData.append('pasted_fields_count', pastedFieldsCount);
  formData.append('typing_speed_std', typingSpeedStd);
  if (passkeyAttestation) {
    formData.append('passkey_attestation', JSON.stringify(passkeyAttestation));
  }

  const url = `${API_BASE}/api/onboard`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (response.status !== 200 && response.status !== 202) {
    let errDetail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      errDetail = body.detail || JSON.stringify(body);
    } catch (_) {}
    throw new Error(errDetail);
  }

  return response.json();
}

/**
 * Poll for async onboarding pipeline completion.
 * Call repeatedly until processing_complete === true.
 *
 * @param {string} userId
 * @returns {Promise<UserStatusResponse>}
 */
export async function getUserStatus(userId) {
  return apiFetch(`/api/status/${userId}`);
}

/**
 * Phase 3: Submit login device fingerprint for Isolation Forest check.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.deviceId
 * @param {string} params.userAgent
 * @param {number} params.sessionDuration
 * @param {number} params.otpAttempts
 * @returns {Promise<UserLoginResponse>}
 */
export async function loginUser({ userId, deviceId, userAgent, sessionDuration, otpAttempts }) {
  return apiFetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      device_id: deviceId,
      user_agent: userAgent,
      session_duration: sessionDuration,
      otp_attempts: otpAttempts,
    }),
  });
}

/**
 * Phase 4: Submit transaction with behavioral telemetry for Random Forest check.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.amount
 * @param {number} params.clickDuration
 * @param {number} params.scrollDepth
 * @param {number} params.mouseMovement
 * @param {number} params.keystrokesDetected
 * @param {number} params.clickFrequency
 * @param {number} params.timeSinceLastClick
 * @param {number} params.vpnUsage             — 0.0 or 1.0
 * @param {number} params.proxyUsage           — 0.0 or 1.0
 * @param {string} params.deviceIpReputation   — "Good" | "Suspicious" | "Bad"
 * @param {Array}  params.mouseTrajectory      — [[x, y, t], ...]
 * @returns {Promise<TransactionResponse>}
 */
export async function submitTransaction({
  userId,
  amount,
  clickDuration,
  scrollDepth,
  mouseMovement,
  keystrokesDetected,
  clickFrequency,
  timeSinceLastClick,
  vpnUsage = 0.0,
  proxyUsage = 0.0,
  deviceIpReputation = 'Good',
  mouseTrajectory = null,
}) {
  return apiFetch('/api/transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      amount,
      click_duration: clickDuration,
      scroll_depth: scrollDepth,
      mouse_movement: mouseMovement,
      keystrokes_detected: keystrokesDetected,
      click_frequency: clickFrequency,
      time_since_last_click: timeSinceLastClick,
      VPN_usage: vpnUsage,
      proxy_usage: proxyUsage,
      device_ip_reputation: deviceIpReputation,
      mouse_trajectory: mouseTrajectory,
    }),
  });
}

/**
 * LLM Copilot: Get the full fraud analyst case summary for a user.
 *
 * @param {string} userId
 * @returns {Promise<CopilotSummaryResponse>}
 */
export async function getCopilotCase(userId) {
  return apiFetch(`/api/cases/${userId}/copilot`);
}

/**
 * LLM Copilot: Force-refresh the analyst summary (invalidates cache).
 *
 * @param {string} userId
 * @returns {Promise<CopilotSummaryResponse>}
 */
export async function refreshCopilotCase(userId) {
  return apiFetch(`/api/cases/${userId}/copilot/refresh`, { method: 'POST' });
}

/**
 * Fetch all users from the database.
 * 
 * @returns {Promise<Array<UserSummaryResponse>>}
 */
export async function getAllUsers() {
  return apiFetch('/api/users');
}

/**
 * Fetch WebAuthn registration options for device binding.
 * 
 * @param {string} userName
 * @returns {Promise<Object>}
 */
export async function getWebAuthnRegistrationOptions(userName) {
  return apiFetch(`/api/webauthn/register/options?user_name=${encodeURIComponent(userName)}`);
}

/**
 * Operations Dashboard: Fetch circuit breakers.
 * @returns {Promise<Array<{name: string, state: string, failure_count: number, recovery_time: number}>>}
 */
export async function getCircuitBreakers() {
  return apiFetch('/api/operations/circuit-breakers');
}

/**
 * Operations Dashboard: Trip a circuit breaker.
 * @param {string} name
 */
export async function tripCircuitBreaker(name) {
  return apiFetch(`/api/operations/circuit-breakers/${encodeURIComponent(name)}/trip`, {
    method: 'POST',
  });
}

/**
 * Operations Dashboard: Reset a circuit breaker.
 * @param {string} name
 */
export async function resetCircuitBreaker(name) {
  return apiFetch(`/api/operations/circuit-breakers/${encodeURIComponent(name)}/reset`, {
    method: 'POST',
  });
}

/**
 * Consortium Blacklist: Fetch blacklisted WebGL device hashes.
 * @returns {Promise<Array<{id: string, webgl_hash: string, reason: string, created_at: string}>>}
 */
export async function getBlacklistedDevices() {
  return apiFetch('/api/consortium/blacklist');
}

/**
 * Consortium Blacklist: Add a WebGL hash to the blacklist.
 * @param {string} hash
 * @param {string} reason
 */
export async function addBlacklistedDevice(hash, reason) {
  return apiFetch('/api/consortium/blacklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webgl_hash: hash, reason }),
  });
}

/**
 * Consortium Blacklist: Remove a WebGL hash from the blacklist.
 * @param {string} hash
 */
export async function removeBlacklistedDevice(hash) {
  return apiFetch(`/api/consortium/blacklist/${encodeURIComponent(hash)}`, {
    method: 'DELETE',
  });
}




// ============================================================
// FEATURE 1: Real-Time Risk Dashboard Analytics
// ============================================================

export async function getFraudStatistics(days = 7) {
  return apiFetch(`/api/analytics/fraud-statistics?days=${days}`);
}

export async function getGeographicHotspots(days = 7) {
  return apiFetch(`/api/analytics/geographic-hotspots?days=${days}`);
}

export async function getDailyTrend(days = 30) {
  return apiFetch(`/api/analytics/daily-trend?days=${days}`);
}

export async function getModelPerformance() {
  return apiFetch(`/api/analytics/model-performance`);
}

// ============================================================
// FEATURE 3: Predictive Fraud Ring Detection
// ============================================================

export async function getFraudRings(minClusterSize = 3) {
  return apiFetch(`/api/analytics/fraud-rings?min_cluster_size=${minClusterSize}`);
}

// ============================================================
// FEATURE 2: Smart Risk Scoring Thresholds
// ============================================================

export async function getThresholds() {
  return apiFetch(`/api/config/thresholds`);
}

export async function updateThreshold(thresholdKey, value) {
  return apiFetch(`/api/config/thresholds/${thresholdKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  });
}

export async function resetThresholds() {
  return apiFetch(`/api/config/thresholds/reset`, {
    method: 'POST'
  });
}

export async function getAdaptiveThresholds(fraudRate, targetFraudRate = 0.05) {
  return apiFetch(`/api/config/adaptive-thresholds?fraud_rate=${fraudRate}&target_fraud_rate=${targetFraudRate}`);
}

export async function getABTests() {
  return apiFetch(`/api/config/ab-tests`);
}

export async function createABTest(testName, testConfig, trafficPercentage) {
  return apiFetch(`/api/config/ab-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      test_name: testName, 
      test_config: testConfig, 
      traffic_percentage: trafficPercentage 
    })
  });
}

// ============================================================
// FEATURE 5: Geolocation & IP Reputation Integration
// ============================================================

export async function getIPLocation(ipAddress) {
  return apiFetch(`/api/device/ip-location?ip_address=${ipAddress}`);
}

export async function checkImpossibleTravel(userId, currentIP) {
  return apiFetch(`/api/device/impossible-travel-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      current_ip: currentIP 
    })
  });
}

export async function assessLocationRisk(userId, currentIP) {
  return apiFetch(`/api/device/location-risk-assessment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      current_ip: currentIP 
    })
  });
}

// ============================================================
// FEATURE 8: Smart Alert & Escalation System
// ============================================================

export async function getAlerts(readStatus = null) {
  const statusParam = readStatus !== null ? `&read_status=${readStatus}` : '';
  return apiFetch(`/api/alerts?${statusParam}`);
}

export async function getAlertSummary() {
  return apiFetch(`/api/alerts/summary`);
}

export async function markAlertAsRead(alertId) {
  return apiFetch(`/api/alerts/${alertId}/read`, {
    method: 'PUT'
  });
}

export async function testCreateFraudRingAlert(ringId, linkedAccounts, confidence) {
  return apiFetch(`/api/alerts/test-fraud-ring`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      ring_id: ringId, 
      linked_accounts: linkedAccounts, 
      confidence 
    })
  });
}

export async function testCreateHighRiskAlert(userId, userName, riskScore) {
  return apiFetch(`/api/alerts/test-high-risk-application`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      user_name: userName, 
      risk_score: riskScore 
    })
  });
}
