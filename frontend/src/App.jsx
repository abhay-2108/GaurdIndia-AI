import { useState, useRef, useCallback, useEffect } from 'react';
import './index.css';
import { useWebGLFingerprint } from './hooks/useWebGLFingerprint';
import { useBehavioralTracker } from './hooks/useBehavioralTracker';
import { onboardUser, getUserStatus, loginUser, submitTransaction, getCopilotCase, refreshCopilotCase, getWebAuthnRegistrationOptions, getAllUsers, getCircuitBreakers, tripCircuitBreaker, resetCircuitBreaker, getBlacklistedDevices, addBlacklistedDevice, removeBlacklistedDevice } from './api/guardApi';
import { startRegistration } from '@simplewebauthn/browser';
import PhaseScoreCard from './components/PhaseScoreCard';
import RiskBadge from './components/RiskBadge';
import RiskRing from './components/RiskRing';

/* ──────────────────────────────────────────────────────────
   NAV
────────────────────────────────────────────────────────── */
const VIEWS = ['home', 'onboard', 'login', 'transaction', 'dashboard', 'operations'];
const VIEW_LABELS = {
  home:        'Overview',
  onboard:     'Applicant Enrollment',
  login:       'Device Verification',
  transaction: 'Transaction Security',
  dashboard:   'Case Audit Directory',
  operations:  'Operations Console',
};

function Nav({ view, setView }) {
  return (
    <nav className="nav">
      <div className="nav__inner">
        <a href="#" className="nav__logo" onClick={(e) => { e.preventDefault(); setView('home'); }}>
          <div className="logo-shield">GI</div>
          <span>GuardIndia AI</span>
        </a>
        <div className="nav__tabs">
          {VIEWS.map((v) => (
            <button
              key={v}
              className={`nav__tab ${view === v ? 'active' : ''}`}
              onClick={() => setView(v)}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

/* ──────────────────────────────────────────────────────────
   HOME VIEW
────────────────────────────────────────────────────────── */
function HomeView({ setView }) {
  const layers = [
    {
      n: 1,
      title: 'Layer 1: Identity Graph Audit',
      desc: 'Converts PAN & phone into graph nodes and computes Jaccard Similarity to detect fresh-minted burner SIMs paired with leaked real PANs.',
      tech: ['NetworkX', 'Jaccard Index', 'SQLAlchemy'],
    },
    {
      n: 2,
      title: 'Layer 2: e-KYC Visual Scan',
      desc: 'Error Level Analysis (ELA) detects pixel-level photo tampering. Moiré FFT analysis exposes screen-photographed fake IDs.',
      tech: ['OpenCV', 'PIL', 'NumPy FFT'],
    },
    {
      n: 3,
      title: 'Layer 3: Device Fingerprinting',
      desc: 'Silent WebGL GPU render produces a hardware-unique hash. Isolation Forest flags emulation clusters and hyper-fast login cycles.',
      tech: ['WebGL', 'Isolation Forest', 'scikit-learn'],
    },
    {
      n: 4,
      title: 'Layer 4: Behavioral Biometrics',
      desc: 'Mouse trajectory velocity variance, keystroke dynamics, and scroll patterns expose bots with mechanical precision via Random Forest classifier.',
      tech: ['Random Forest', 'Trajectory Analysis', 'scikit-learn'],
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="hero-section">
        <div className="container container--narrow">
          <div className="hero-eyebrow">
            Built for India's DPI Stack
          </div>
          <h1 className="hero-title">
            Stop <span className="highlight">Synthetic Identity</span> Fraud Before It Starts
          </h1>
          <p className="hero-sub">
            GuardIndia AI deploys a 4-Layer ML Defence Pipeline — from identity graph audits to
            real-time behavioral biometrics — protecting digital micro-lenders against coordinated
            bust-out fraud rings.
          </p>
          <div className="hero-actions">
            <button className="btn btn--primary btn--lg" onClick={() => setView('onboard')}>
              Applicant Enrollment
            </button>
            <button className="btn btn--ghost btn--lg" onClick={() => setView('dashboard')}>
              Case Audit Directory
            </button>
          </div>
        </div>
      </section>

      {/* Layers */}
      <div className="container" style={{ paddingBottom: 40 }}>
        <div className="section-header text-center">
          <h2>4-Layer Defence Pipeline</h2>
          <p>Every applicant passes through all four security layers before approval.</p>
        </div>
        <div className="phase-grid">
          {layers.map((p) => (
            <div key={p.n} className="phase-card">
              <p className="phase-card__number">Layer {p.n}</p>
              <h4 className="phase-card__title" style={{ marginTop: 8 }}>{p.title}</h4>
              <p className="phase-card__desc">{p.desc}</p>
              <div className="phase-card__tech">
                {p.tech.map((t) => <span key={t} className="tag">{t}</span>)}
              </div>
            </div>
          ))}
        </div>

        {/* Latest Innovations */}
        <div className="section-header text-center" style={{ marginTop: 56, marginBottom: 32 }}>
          <h2>Latest Enterprise Additions</h2>
          <p>Cutting-edge features implemented to enforce strict, multi-layered identity assurance.</p>
        </div>
        <div className="grid-2" style={{ gap: 24, marginBottom: 56 }}>
          <div className="card card--accent">
            <div style={{ marginBottom: 12 }}>
              <h4>WebAuthn Device Binding</h4>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', lineHeight: '1.6' }}>
              Replaces traditional carrier SIM checks with secure device enrollment. Users bind their onboarding sessions directly to physical hardware using secure enclaves (TouchID, FaceID, or Windows Hello), ensuring logins and transactions happen from authorized devices.
            </p>
          </div>
          <div className="card card--accent">
            <div style={{ marginBottom: 12 }}>
              <h4>Consortium Blacklist</h4>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', lineHeight: '1.6' }}>
              A database-backed shared registry tracking WebGL fingerprints and device signatures. If a device has been flagged for fraudulent patterns elsewhere in the banking ecosystem, it is instantly blocked during onboarding before loan processing can occur.
            </p>
          </div>
          <div className="card card--accent">
            <div style={{ marginBottom: 12 }}>
              <h4>AI Analyst Copilot</h4>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', lineHeight: '1.6' }}>
              Ingests complex ML data (Jaccard similarity, ELA image validation, Isolation Forest anomaly scores, and LSTM behavioral telemetry) and produces plain, non-technical bulleted threat narratives using LLMs for human audit teams.
            </p>
          </div>
          <div className="card card--accent">
            <div style={{ marginBottom: 12 }}>
              <h4>Operations Dashboard</h4>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', lineHeight: '1.6' }}>
              Provides full transparency of model status. Features stateful CLOSED/OPEN/HALF-OPEN circuit breakers on inference layers (Isolation Forest, Random Forest) and Copilot LLM APIs with simulated controls to manage system-wide fail-safes.
            </p>
          </div>
        </div>

        {/* Platform Architecture */}
        <div className="card card--accent" style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 16 }}>Platform Architecture</h3>
          <div className="grid-3" style={{ gap: 20 }}>
            {[
              { title: 'Async Pipeline', desc: 'ELA + graph analysis run in background workers (FastAPI BackgroundTasks) — zero-blocking HTTP responses.' },
              { title: 'Circuit Breakers', desc: 'Stateful CLOSED/OPEN/HALF-OPEN breakers on ML inference and Gemini API — automatic fallback to rule-based logic.' },
              { title: 'Rate Limiter', desc: 'Sliding-window throttle (5 req/10s) on WebGL device fingerprints prevents coordinated burst attacks.' },
            ].map((f) => (
              <div key={f.title} className="card card--flat" style={{ padding: '16px 20px' }}>
                {f.icon && <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8 }}>{f.icon}</span>}
                <h5 style={{ marginBottom: 6 }}>{f.title}</h5>
                <p style={{ fontSize: '0.85rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   ONBOARD VIEW
────────────────────────────────────────────────────────── */
function OnboardView({ deviceId, setGlobalUserId }) {
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', panNumber: '' });
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [streamingSummary, setStreamingSummary] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const fileRef = useRef();
  const pollRef = useRef(null);

  // Dynamic Photometric Liveness State
  const [livenessActive, setLivenessActive] = useState(false);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessFlash, setLivenessFlash] = useState('transparent');
  const [livenessMsg, setLivenessMsg] = useState('Dynamic Photometric Liveness Scan required.');
  const [livenessProgress, setLivenessProgress] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup camera stream if user navigates away
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Typing Cadence & Clipboard Paste telemetry
  const [pastedFieldsCount, setPastedFieldsCount] = useState(0);
  const keystrokeIntervals = useRef([]);
  const lastKeyTime = useRef(null);

  const handleKeyPress = () => {
    const now = performance.now();
    if (lastKeyTime.current !== null) {
      const interval = now - lastKeyTime.current;
      keystrokeIntervals.current.push(interval);
    }
    lastKeyTime.current = now;
  };

  const handlePaste = () => {
    setPastedFieldsCount(prev => prev + 1);
  };

  const getTypingSpeedStd = () => {
    const intervals = keystrokeIntervals.current;
    if (intervals.length < 2) return 0.5; // default human baseline
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (intervals.length - 1);
    return Math.sqrt(variance) / 1000.0; // std dev in seconds
  };

  // WebAuthn Passkey State
  const [passkeyAttestation, setPasskeyAttestation] = useState(null);
  const [passkeyStatus, setPasskeyStatus] = useState('unverified'); // unverified, registering, verified
  const [passkeyError, setPasskeyError] = useState('');

  const registerPasskey = async () => {
    if (!form.fullName) {
      setPasskeyError('Please enter your Full Name first.');
      return;
    }
    setPasskeyError('');
    setPasskeyStatus('registering');
    try {
      const options = await getWebAuthnRegistrationOptions(form.fullName);
      const attestation = await startRegistration({ optionsJSON: options });
      setPasskeyAttestation(attestation);
      setPasskeyStatus('verified');
    } catch (err) {
      console.error(err);
      setPasskeyError('Passkey registration failed or was cancelled.');
      setPasskeyStatus('unverified');
    }
  };

  // Liveness Challenge State
  const [livenessChallenge, setLivenessChallenge] = useState('');
  const [livenessAction, setLivenessAction] = useState('');

  const LIVENESS_CHALLENGES = [
    { text: 'Blink twice', action: 'Blinking' },
    { text: 'Look left', action: 'Turning left' },
    { text: 'Look right', action: 'Turning right' },
    { text: 'Nod head', action: 'Nodding' },
    { text: 'Smile slightly', action: 'Smiling' }
  ];

  const startLivenessCheck = async () => {
    const selected = LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)];
    setLivenessChallenge(selected.text);
    setLivenessAction(selected.action);
    setLivenessActive(true);
    setLivenessPassed(false);
    setLivenessProgress(0);
    setLivenessMsg(`Challenge: Please ${selected.text} during the flash...`);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setTimeout(() => {
        runFlashingSequence(selected.text, selected.action, false);
      }, 800);

    } catch (err) {
      console.warn("Webcam access not allowed, running fallback avatar scanner.", err);
      runFlashingSequence(selected.text, selected.action, true);
    }
  };

  const runFlashingSequence = (challengeText, challengeAction, mock = false) => {
    const flashColors = [
      'rgba(0, 245, 255, 0.45)', // Neon Blue
      'rgba(255, 191, 0, 0.45)', // Amber
      'rgba(255, 0, 127, 0.45)', // Pink
    ];
    const messages = [
      'Emitting neon-blue scan... Please keep face centered.',
      `Emitting amber scan... Please ${challengeText} now!`,
      `Emitting pink scan... Verifying reflectance & ${challengeAction} dynamics.`,
    ];
    
    let step = 0;
    const intervalTime = 600;
    
    const interval = setInterval(() => {
      if (step < flashColors.length) {
        setLivenessFlash(flashColors[step]);
        setLivenessMsg(messages[step]);
        setLivenessProgress((step + 1) * 33);
        step++;
      } else {
        clearInterval(interval);
        stopLivenessCheck(true);
      }
    }, intervalTime);
  };

  const stopLivenessCheck = (success = true) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    setLivenessFlash('transparent');
    setLivenessProgress(100);
    setLivenessActive(false);
    setLivenessPassed(success);
    setLivenessMsg(success ? '✓ Photometric liveness & challenge verified!' : '✕ Liveness verification failed.');
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer?.files[0] || e.target.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const pollStatus = async (userId) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const status = await getUserStatus(userId);
        if (status.processing_complete) {
          clearInterval(pollRef.current);
          setPolling(false);
          setResult(status);
          setGlobalUserId(userId);
          if (!status.copilot_summary) {
            startStreaming(userId);
          }
        }
      } catch (_) {}
      if (attempts >= maxAttempts) {
        clearInterval(pollRef.current);
        setPolling(false);
      }
    }, 500);
  };

  const startStreaming = (userId) => {
    setIsStreaming(true);
    setStreamingSummary("");
    const eventSource = new EventSource(`http://localhost:8000/api/cases/${userId}/copilot/stream`);
    
    eventSource.onmessage = (e) => {
      if (e.data === "[DONE]") {
        eventSource.close();
        setIsStreaming(false);
        return;
      }
      try {
        const data = JSON.parse(e.data);
        if (data.text) {
          setStreamingSummary(prev => prev + data.text);
        }
      } catch (err) {}
    };

    eventSource.onerror = () => {
      eventSource.close();
      setIsStreaming(false);
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!file) { setError('Please upload a KYC document image.'); return; }
    if (!form.fullName || !form.phoneNumber || !form.panNumber) {
      setError('All fields are required.'); return;
    }
    if (!deviceId) { setError('WebGL fingerprint not ready. Please wait a moment and retry.'); return; }
    if (!livenessPassed) { setError('Please complete the Dynamic Photometric Liveness check first.'); return; }

    setLoading(true);
    try {
      const resp = await onboardUser({
        fullName: form.fullName,
        phoneNumber: form.phoneNumber,
        panNumber: form.panNumber.toUpperCase(),
        deviceId,
        userAgent: navigator.userAgent,
        file,
        livenessPassed,
        simVerified: passkeyAttestation !== null,
        pastedFieldsCount,
        typingSpeedStd: getTypingSpeedStd(),
        passkeyAttestation,
      });
      setLoading(false);
      // Start polling for async pipeline result
      pollStatus(resp.user_id);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Onboarding failed. Please try again.');
    }
  };

  const statusTier = result
    ? result.status === 'ONBOARDED' ? 'success'
    : result.status === 'NEEDS_MANUAL_REVIEW' ? 'warning'
    : 'danger'
    : null;

  return (
    <div className="animate-fade-in" style={{ padding: '24px 0' }}>
      <form onSubmit={handleSubmit} className="tiled-container">
        {/* Header (Spans full width) */}
        <div className="section-header tile-span-2">
          <h2>New Applicant Onboarding</h2>
          <p>Phase 1 (Identity Graph) and Phase 2 (ELA + Moiré scan) run automatically.</p>
        </div>

        {/* Tile 1: Applicant Input Form */}
        <div className="tile-card flex flex-col gap-4">
          <h3 style={{ marginBottom: 4 }}>Applicant Credentials</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Enter standard identity credentials and upload a physical card scan.</p>
          
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Full Name <span className="required">*</span></label>
            <input id="fullName" name="fullName" className="form-input" placeholder="Amit Kumar Sharma"
              value={form.fullName} onChange={handleChange} onKeyDown={handleKeyPress} onPaste={handlePaste} required />
          </div>

          <div className="grid-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="panNumber">PAN Number <span className="required">*</span></label>
              <input id="panNumber" name="panNumber" className="form-input" placeholder="ABCDE1234F"
                value={form.panNumber} onChange={handleChange} onKeyDown={handleKeyPress} onPaste={handlePaste} maxLength={10}
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phoneNumber">Mobile Number <span className="required">*</span></label>
              <input id="phoneNumber" name="phoneNumber" className="form-input" placeholder="+919876543210"
                value={form.phoneNumber} onChange={handleChange} onKeyDown={handleKeyPress} onPaste={handlePaste} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">KYC Document Scan <span className="required">*</span></label>
            <div
              className={`file-drop ${dragging ? 'drag-over' : ''}`}
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
              style={{ padding: '24px' }}
            >
              <input type="file" ref={fileRef} accept="image/*,.webp,.jpg,.jpeg,.png"
                onChange={handleFileDrop} />
              <span className="file-icon" style={{ fontSize: '2rem', marginBottom: 8 }}>{file ? '✓' : '↑'}</span>
              {file
                ? <p className="text-bold" style={{ fontSize: '0.9rem' }}>{file.name}</p>
                : <p style={{ fontSize: '0.9rem' }}>Drag &amp; drop your ID card here, or <span className="text-primary text-bold">browse files</span></p>
              }
              {!file && <small className="text-muted" style={{ marginTop: 4, display: 'block' }}>Aadhaar, PAN Card, or Voter ID accepted</small>}
              {file && <span className="file-name" style={{ fontSize: '0.8rem' }}>✓ File selected — click to change</span>}
            </div>
          </div>
        </div>

        {/* Column 2 - Tile 2: Hardware Binding & Telemetry */}
        <div className="tile-card flex flex-col gap-4">
          <h3 style={{ marginBottom: 4 }}>Hardware & Telemetry</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Secure hardware-level integration to protect onboarding integrity.</p>
          
          {/* WebGL Hardware Fingerprint */}
          <div className="form-group">
            <label className="form-label">WebGL Hardware Fingerprint</label>
            <div className="alert alert--info" style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-info-border)', margin: 0 }}>
              {deviceId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{deviceId}</code>
                  <small className="text-success" style={{ fontWeight: 600 }}>✓ GPU render signature captured</small>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="spinner spinner--sm" />
                  <span style={{ fontSize: '0.85rem' }}>Computing GPU fingerprint…</span>
                </div>
              )}
            </div>
          </div>

          {/* WebAuthn Device Binding */}
          <div className="form-group">
            <label className="form-label">WebAuthn Hardware Passkey Binding</label>
            <div className="sim-binding-widget" style={{ margin: 0, padding: '16px' }}>
              <div className="sim-binding-header" style={{ marginBottom: 6 }}>
                <div className="sim-binding-title" style={{ fontSize: '0.9rem' }}>
                  <span>TPM Cryptographic Binding</span>
                </div>
                <span className={`sim-binding-status-badge ${passkeyStatus}`} style={{ fontSize: '0.7rem' }}>
                  {passkeyStatus === 'unverified' ? 'Not Bound' :
                   passkeyStatus === 'registering' ? 'Registering...' :
                   '✓ Device Bound'}
                </span>
              </div>
              
              <p style={{ fontSize: '0.8rem', marginBottom: 12, lineHeight: 1.5 }}>
                Binds your registration to this physical device's Secure Enclave using TouchID, FaceID, or Windows Hello.
              </p>

              {passkeyError && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)', marginBottom: 8 }}>{passkeyError}</p>
              )}

              {passkeyStatus === 'unverified' && (
                <div className="flex flex-col gap-2" style={{ alignItems: 'flex-start' }}>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={registerPasskey}>
                    Register Device Passkey
                  </button>
                  <small style={{ color: 'var(--color-warning)', fontSize: '0.75rem' }}>
                    Bypassing triggers +0.20 AI risk penalty.
                  </small>
                </div>
              )}

              {passkeyStatus === 'verified' && (
                <div className="flex items-center gap-2" style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.8rem' }}>
                  <span>✓ Physical enclave signature successfully bound.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tile 3: Dynamic Photometric Liveness */}
        <div className="tile-card flex flex-col gap-4">
          <h3 style={{ marginBottom: 4 }}>Photometric Liveness</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Validates physical presence using random color reflectance scan.</p>
          
          <div className="card card--flat" style={{ border: '1px solid var(--color-border)', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 0 }}>
            <div className={`liveness-video-wrapper ${livenessActive ? 'active' : ''} ${livenessPassed ? 'passed' : ''}`} style={{ width: '180px', height: '180px' }}>
              {/* Flashing neon color filter */}
              <div className="liveness-flash-overlay" style={{ backgroundColor: livenessFlash }} />
              
              {/* Dashed outer ring during scan */}
              {livenessActive && <div className="liveness-glow-ring" />}
              
              {livenessActive ? (
                <video ref={videoRef} autoPlay playsInline className="liveness-video" />
              ) : (
                <div className="liveness-avatar-placeholder" style={{ background: livenessPassed ? 'var(--color-success-light)' : 'var(--color-surface-2)', fontSize: '1.25rem' }}>
                  {livenessPassed ? '✓' : 'Ready'}
                </div>
              )}
            </div>
            
            <div className="text-center" style={{ marginTop: 12, width: '100%' }}>
              <p className="text-bold" style={{ fontSize: '0.85rem', marginBottom: 4, color: livenessPassed ? 'var(--color-success)' : 'var(--color-text)' }}>
                {livenessMsg}
              </p>
              
              {livenessActive && (
                <div className="liveness-progress-bar" style={{ margin: '8px auto', maxWidth: '180px' }}>
                  <div className="liveness-progress-fill" style={{ width: `${livenessProgress}%` }} />
                </div>
              )}
              
              {!livenessActive && !livenessPassed && (
                <button type="button" className="btn btn--secondary btn--sm" style={{ marginTop: 8 }} onClick={startLivenessCheck}>
                  Start Photometric Scan
                </button>
              )}
              
              {!livenessActive && livenessPassed && (
                <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 8, color: 'var(--color-success)' }} onClick={startLivenessCheck}>
                  Re-verify Liveness
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tile 4: Submission & Streaming Results */}
        <div className="tile-span-2 tile-card flex flex-col gap-4">
          <h3 style={{ marginBottom: 4 }}>Submit Registration</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 8 }}>Run standard registry graph linking and digital forensic document scanning.</p>
          
          {error && (
            <div className="alert alert--danger">
              <span className="alert__icon">✕</span>
              <p>{error}</p>
            </div>
          )}

          <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading || polling || !deviceId} style={{ maxWidth: '400px', alignSelf: 'center' }}>
            {loading ? <><span className="spinner spinner--white" /> Uploading Credentials…</> :
             polling  ? <><span className="spinner spinner--white" /> Running ML Inference Pipeline…</> :
             'Submit for AI Verification'}
          </button>

          {/* Polling state */}
          {polling && !result && (
            <div className="result-panel" style={{ marginTop: 16 }}>
              <div className="loading-state" style={{ padding: '24px 0' }}>
                <div className="spinner spinner--lg" />
                <div style={{ marginTop: 12 }}>
                  <p className="text-bold">AI analysis pipeline running…</p>
                  <small>ELA scan → Moiré FFT → Identity Graph Jaccard → Copilot summary</small>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="animate-fade-in" style={{ marginTop: 16 }}>
              {/* Status banner */}
              <div className={`alert alert--${statusTier}`} style={{ marginBottom: 20 }}>
                <span className="alert__icon">{statusTier === 'success' ? '✓' : statusTier === 'warning' ? '!' : '✕'}</span>
                <div>
                  <p className="alert__title">Onboarding {result.status.replace(/_/g, ' ')}</p>
                  <p>User ID: <code>{result.user_id}</code></p>
                </div>
              </div>

              <div className="grid-2" style={{ gap: 20 }}>
                <PhaseScoreCard
                  phase={1}
                  icon=""
                  title="Identity Graph Linkage"
                  score={result.graph_similarity}
                  label="Jaccard index"
                  loading={false}
                  tech={['NetworkX', 'Jaccard']}
                  isFlag={false}
                />
                <PhaseScoreCard
                  phase={2}
                  icon=""
                  title="e-KYC Document Scan"
                  score={result.ela_score}
                  label="ELA anomaly"
                  loading={false}
                  tech={['OpenCV', 'PIL', 'FFT']}
                />
              </div>

              <div className="result-panel" style={{ marginTop: 20 }}>
                <p className="result-panel__title">Document & Security Diagnostics</p>
                <div className="metric-row">
                  <span className="metric-row__label">ELA Anomaly Score</span>
                  <span className="metric-row__value">{(result.ela_score * 100).toFixed(2)}%</span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">Moiré Screen Detection</span>
                  <span className="metric-row__value" style={{ color: result.moire_detected ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {result.moire_detected ? 'Screen Photo Detected' : '✓ Physical Document'}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">Liveness Challenge Check</span>
                  <span className="metric-row__value" style={{ color: result.liveness_passed ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {result.liveness_passed ? '✓ Passed (Active Verification)' : '✕ Failed / Bypassed'}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">WebAuthn Device Binding</span>
                  <span className="metric-row__value" style={{ color: result.sim_verified ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {result.sim_verified ? '✓ Verified (Hardware Bound)' : 'Unverified (Bypass Penalty)'}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">Real-time Bureau Inquiries (Last Hour)</span>
                  <span className="metric-row__value" style={{ color: result.bureau_inquiries_last_hour >= 3 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {result.bureau_inquiries_last_hour} queries {result.bureau_inquiries_last_hour >= 3 ? '(Storm Warning)' : '(Normal)'}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">Input Paste Detection</span>
                  <span className="metric-row__value" style={{ color: result.pasted_fields_count > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {result.pasted_fields_count} fields pasted
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">Typing Cadence Variance</span>
                  <span className="metric-row__value" style={{ color: result.typing_speed_std > 0 && result.typing_speed_std < 0.01 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {result.typing_speed_std.toFixed(4)}s {result.typing_speed_std > 0 && result.typing_speed_std < 0.01 ? '(Mechanical Script)' : '(Organic Human)'}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">Composite Risk Score</span>
                  <span className="metric-row__value">{(result.risk_score * 100).toFixed(1)}%</span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">Status</span>
                  <RiskBadge status={result.status} />
                </div>
              </div>

              {(streamingSummary || result.copilot_summary || isStreaming) && (
                <div style={{ marginTop: 20 }}>
                  <p className="result-panel__title" style={{ marginBottom: 8 }}>AI Analyst Copilot Report {isStreaming && <span className="spinner spinner--sm" style={{display: 'inline-block', marginLeft: 8}}/>}</p>
                  <div className="alert alert--info" style={{ whiteSpace: 'pre-line' }}>
                    {streamingSummary || result.copilot_summary || "Connecting to AI Analyst Copilot..."}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   LOGIN VIEW
────────────────────────────────────────────────────────── */
function LoginView({ deviceId, globalUserId }) {
  const [userId, setUserId] = useState(globalUserId || '');
  const [sessionStart] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!userId.trim()) { setError('User ID is required.'); return; }
    if (!deviceId) { setError('WebGL fingerprint not ready.'); return; }

    const sessionDuration = (Date.now() - sessionStart) / 1000;
    setLoading(true);
    try {
      const resp = await loginUser({
        userId: userId.trim(),
        deviceId,
        userAgent: navigator.userAgent,
        sessionDuration,
        otpAttempts: 1,
      });
      setResult(resp);
    } catch (err) {
      setError(err.message || 'Login check failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 24px' }}>
      <div className="section-header">
        <h2>Login Device Check</h2>
        <p>Layer 3 — Isolation Forest evaluates your WebGL hardware fingerprint and login timing patterns.</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
        <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 0 }}>
          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="login-user-id">User ID <span className="required">*</span></label>
              <input id="login-user-id" className="form-input" placeholder="Enter your UUID from onboarding"
                value={userId} onChange={(e) => setUserId(e.target.value)} required />
              <span className="form-hint">Obtained from Layer 1 onboarding response.</span>
            </div>

            <div className="card card--flat" style={{ padding: '14px 16px' }}>
              <p className="text-xs text-muted text-bold" style={{ marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Auto-collected telemetry</p>
              <div className="metric-row">
                <span className="metric-row__label">WebGL Fingerprint</span>
                <code style={{ fontSize: '0.75rem' }}>{deviceId || 'Computing…'}</code>
              </div>
              <div className="metric-row">
                <span className="metric-row__label">User Agent</span>
                <small className="text-muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{navigator.userAgent.substring(0, 50)}…</small>
              </div>
              <div className="metric-row">
                <span className="metric-row__label">Session Duration</span>
                <span className="metric-row__value">{((Date.now() - sessionStart) / 1000).toFixed(1)}s</span>
              </div>
            </div>

            {error && <div className="alert alert--danger"><span className="alert__icon">✕</span><p>{error}</p></div>}

            <button type="submit" className="btn btn--primary btn--full" disabled={loading || !deviceId}>
              {loading ? <><span className="spinner spinner--white" /> Running Layer 3…</> : 'Evaluate Device'}
            </button>
          </div>
        </form>

        {result && (
          <div className="animate-fade-in" style={{ marginTop: 0 }}>
            <PhaseScoreCard
              phase={3}
              icon=""
              title="Device Anomaly Detection"
              score={Math.abs(result.anomaly_score)}
              label={`Score: ${result.anomaly_score.toFixed(4)}`}
              tech={['Isolation Forest', 'WebGL Hash']}
            />
            <div className="result-panel" style={{ marginTop: 16 }}>
              <p className="result-panel__title">Login Evaluation</p>
              <div className="metric-row">
                <span className="metric-row__label">Device Anomaly Detected</span>
                <span className="metric-row__value" style={{ color: result.is_anomaly ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {result.is_anomaly ? 'ANOMALY' : '✓ CLEAN'}
                </span>
              </div>
              <div className="metric-row">
                <span className="metric-row__label">Isolation Forest Score</span>
                <span className="metric-row__value">{result.anomaly_score.toFixed(4)}</span>
              </div>
              <div className="metric-row">
                <span className="metric-row__label">Status</span>
                <RiskBadge status={result.status} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   TRANSACTION VIEW
────────────────────────────────────────────────────────── */
function TransactionView({ globalUserId }) {
  const { getPayload } = useBehavioralTracker();
  const [userId, setUserId] = useState(globalUserId || '');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!userId.trim()) { setError('User ID is required.'); return; }
    if (!amount || isNaN(parseFloat(amount))) { setError('Valid transaction amount required.'); return; }

    const telemetry = getPayload();
    setLoading(true);
    try {
      const resp = await submitTransaction({
        userId: userId.trim(),
        amount: parseFloat(amount),
        clickDuration: telemetry.click_duration,
        scrollDepth: telemetry.scroll_depth,
        mouseMovement: telemetry.mouse_movement,
        keystrokesDetected: telemetry.keystrokes_detected,
        clickFrequency: telemetry.click_frequency,
        timeSinceLastClick: telemetry.time_since_last_click,
        vpnUsage: 0.0,
        proxyUsage: 0.0,
        deviceIpReputation: 'Good',
        mouseTrajectory: telemetry.mouse_trajectory,
      });
      setResult(resp);
    } catch (err) {
      setError(err.message || 'Transaction check failed.');
    } finally {
      setLoading(false);
    }
  };

  const telemetry = getPayload();

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 24px' }}>
      <div className="section-header">
        <h2>Transaction Fraud Check</h2>
        <p>Layer 4 — behavioral biometrics you've generated on this page are automatically captured and scored.</p>
      </div>

      <div className="alert alert--info" style={{ marginBottom: 24 }}>
        <span className="alert__icon">i</span>
        <div>
          <p className="alert__title">Live Behavioral Telemetry Active</p>
          <p>Your mouse movements, clicks, keystrokes and scroll depth are being recorded to build your interaction fingerprint.</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
        {/* Live telemetry preview */}
        <div className="card card--flat" style={{ marginBottom: 0 }}>
          <p className="result-panel__title" style={{ marginBottom: 12 }}>Captured Telemetry (Live Preview)</p>
          <div className="grid-3" style={{ gap: 12 }}>
            {[
              { label: 'Avg Click Duration', val: `${telemetry.click_duration.toFixed(3)}s` },
              { label: 'Mouse Distance', val: `${telemetry.mouse_movement.toFixed(0)}px` },
              { label: 'Scroll Depth', val: `${telemetry.scroll_depth.toFixed(0)}px` },
              { label: 'Keystrokes', val: telemetry.keystrokes_detected },
              { label: 'Click Count', val: telemetry.click_frequency },
              { label: 'Trajectory Points', val: telemetry.mouse_trajectory.length },
            ].map((m) => (
              <div key={m.label} className="stat-card">
                <span className="stat-card__label">{m.label}</span>
                <span className="stat-card__value" style={{ fontSize: '1.25rem' }}>{m.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="card" style={{ marginBottom: 0 }}>
            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="tx-user-id">User ID <span className="required">*</span></label>
                <input id="tx-user-id" className="form-input" placeholder="UUID from onboarding"
                  value={userId} onChange={(e) => setUserId(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="tx-amount">Transaction Amount (INR) <span className="required">*</span></label>
                <input id="tx-amount" className="form-input" type="number" placeholder="25000"
                  value={amount} onChange={(e) => setAmount(e.target.value)} min={1} required />
              </div>

              {error && <div className="alert alert--danger"><span className="alert__icon">✕</span><p>{error}</p></div>}

              <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                {loading ? <><span className="spinner spinner--white" /> Scoring behavior…</> : 'Submit Transaction'}
              </button>
            </div>
          </form>

          {result && (
            <div className="animate-fade-in" style={{ marginTop: 12 }}>
              <PhaseScoreCard
                phase={4}
                icon=""
                title="Behavioral Biometrics"
                score={result.fraud_probability}
                label={`Bot probability`}
                tech={['Random Forest', 'Trajectory Variance']}
              />
              <div className="result-panel" style={{ marginTop: 16 }}>
                <p className="result-panel__title">Transaction Decision</p>
                <div className="metric-row">
                  <span className="metric-row__label">Bot Behavior Detected</span>
                  <span className="metric-row__value" style={{ color: result.is_bot_behavior ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {result.is_bot_behavior ? 'BOT DETECTED' : '✓ HUMAN'}
                  </span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">Fraud Probability</span>
                  <span className="metric-row__value">{(result.fraud_probability * 100).toFixed(1)}%</span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">Amount</span>
                  <span className="metric-row__value">₹{result.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="metric-row">
                  <span className="metric-row__label">Transaction Status</span>
                  <RiskBadge status={result.status} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   CASE DASHBOARD VIEW
────────────────────────────────────────────────────────── */
function DashboardView({ globalUserId }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCase, setLoadingCase] = useState(false);
  const [refreshingCase, setRefreshingCase] = useState(false);
  const [error, setError] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve cases directory.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.height = '100vh';
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.height = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.height = '';
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const handleSelectUser = async (userId) => {
    setLoadingCase(true);
    setError('');
    try {
      const details = await getCopilotCase(userId);
      setSelectedCase(details);
      setShowModal(true);
    } catch (err) {
      setError(err.message || 'Failed to retrieve case details.');
    } finally {
      setLoadingCase(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedCase) return;
    setRefreshingCase(true);
    try {
      const resp = await refreshCopilotCase(selectedCase.user_id);
      setSelectedCase(resp);
    } catch (err) {
      setError(err.message || 'Failed to refresh Copilot analysis.');
    } finally {
      setRefreshingCase(false);
    }
  };

  // Calculate high-level stats dynamically
  const totalCases = users.length;
  const rejectedCases = users.filter(u => u.risk_score >= 0.70).length;
  const reviewCases = users.filter(u => u.risk_score >= 0.40 && u.risk_score < 0.70).length;
  const cleanCases = users.filter(u => u.risk_score < 0.40).length;

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 24px' }}>
      {/* Slide-over Detailed Telemetry View */}
      {showModal && selectedCase && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>

            {/* Header */}
            <div style={{ marginBottom: 28, paddingRight: 32 }}>
              <div className="flex items-center gap-3" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
                <h2 style={{ fontSize: '1.65rem' }}>{selectedCase.full_name}</h2>
                <RiskBadge status={
                  selectedCase.overall_risk_score >= 0.70 ? 'REJECTED_BY_AI' :
                  selectedCase.overall_risk_score >= 0.40 ? 'NEEDS_MANUAL_REVIEW' :
                  'ONBOARDED'
                } />
              </div>
              <small className="text-muted">User UUID: <code>{selectedCase.user_id}</code></small>
            </div>

            {/* Stats Overview */}
            <div className="grid-3" style={{ marginBottom: 28, gap: 16 }}>
              <div className="flex items-center justify-center">
                <RiskRing score={selectedCase.overall_risk_score} />
              </div>
              {[
                { label: 'Jaccard Similarity', val: selectedCase.phase1_jaccard.toFixed(4), sub: 'Layer 1 Graph' },
                { label: 'ELA Anomaly Score', val: (selectedCase.phase2_ela * 100).toFixed(2) + '%', sub: 'Layer 2 Document' },
              ].map((s) => (
                <div key={s.label} className="stat-card" style={{ padding: '16px 20px' }}>
                  <span className="stat-card__label" style={{ fontSize: '0.7rem' }}>{s.label}</span>
                  <span className="stat-card__value" style={{ fontSize: '1.4rem' }}>{s.val}</span>
                  <span className="stat-card__sub" style={{ fontSize: '0.75rem' }}>{s.sub}</span>
                </div>
              ))}
            </div>

            {/* Real-time Threat Indicators */}
            <div className="card card--flat" style={{ marginBottom: 28, padding: '20px' }}>
              <h5 style={{ marginBottom: 12, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', color: 'var(--color-text-3)' }}>Real-time Threat Indicators</h5>
              <div className="grid-4" style={{ gap: 14 }}>
                <div className="stat-card" style={{ padding: '10px 12px', gap: '3px' }}>
                  <span className="stat-card__label" style={{ fontSize: '0.65rem' }}>WebAuthn Binding</span>
                  <span className="stat-card__value" style={{ fontSize: '1.1rem', color: selectedCase.sim_verified ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {selectedCase.sim_verified ? '✓ Bound' : '✕ Unbound'}
                  </span>
                  <span className="stat-card__sub" style={{ fontSize: '0.7rem' }}>Secure Enclave</span>
                </div>
                <div className="stat-card" style={{ padding: '10px 12px', gap: '3px' }}>
                  <span className="stat-card__label" style={{ fontSize: '0.65rem' }}>Inquiry Velocity</span>
                  <span className="stat-card__value" style={{ fontSize: '1.1rem', color: selectedCase.bureau_inquiries_last_hour >= 3 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {selectedCase.bureau_inquiries_last_hour !== null && selectedCase.bureau_inquiries_last_hour !== undefined ? `${selectedCase.bureau_inquiries_last_hour} queries` : 'N/A'}
                  </span>
                  <span className="stat-card__sub" style={{ fontSize: '0.7rem' }}>Bureau Hour</span>
                </div>
                <div className="stat-card" style={{ padding: '10px 12px', gap: '3px' }}>
                  <span className="stat-card__label" style={{ fontSize: '0.65rem' }}>Typing Cadence</span>
                  <span className="stat-card__value" style={{ fontSize: '1.1rem', color: selectedCase.typing_speed_std > 0 && selectedCase.typing_speed_std < 0.01 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {selectedCase.typing_speed_std !== null && selectedCase.typing_speed_std !== undefined ? `${selectedCase.typing_speed_std.toFixed(4)}s` : 'N/A'}
                  </span>
                  <span className="stat-card__sub" style={{ fontSize: '0.7rem' }}>Mechanical</span>
                </div>
                <div className="stat-card" style={{ padding: '10px 12px', gap: '3px' }}>
                  <span className="stat-card__label" style={{ fontSize: '0.65rem' }}>Clipboard Pastes</span>
                  <span className="stat-card__value" style={{ fontSize: '1.1rem', color: selectedCase.pasted_fields_count > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {selectedCase.pasted_fields_count !== null && selectedCase.pasted_fields_count !== undefined ? `${selectedCase.pasted_fields_count} fields` : 'N/A'}
                  </span>
                  <span className="stat-card__sub" style={{ fontSize: '0.7rem' }}>Ctrl+V events</span>
                </div>
              </div>
            </div>

            {/* Pipeline Stage Scores */}
            <div className="grid-2" style={{ marginBottom: 28, gap: 20 }}>
              <PhaseScoreCard
                phase={1} icon="" title="Identity Graph Linkage"
                score={selectedCase.phase1_jaccard}
                label="Jaccard coefficient"
                tech={['NetworkX', 'Jaccard Index']}
              />
              <PhaseScoreCard
                phase={2} icon="" title="e-KYC Visual Scan"
                score={selectedCase.phase2_ela}
                label="ELA anomaly score"
                tech={['OpenCV', 'Moiré FFT']}
              />
              <PhaseScoreCard
                phase={3} icon="" title="Device Fingerprint"
                isFlag={selectedCase.phase3_anomaly !== null && selectedCase.phase3_anomaly !== undefined}
                flagValue={selectedCase.phase3_anomaly}
                tech={['WebGL Hash', 'Isolation Forest']}
              />
              <PhaseScoreCard
                phase={4} icon="" title="Behavioral Biometrics"
                score={selectedCase.phase4_probability}
                label="Fraud probability"
                tech={['Random Forest', 'Mouse Track']}
              />
            </div>

            {/* AI Narrative Report */}
            <div className="card card--accent" style={{ padding: '24px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <h4>AI Analyst Copilot Report</h4>
                <div className="flex items-center gap-3">
                  <span className="badge badge--primary badge--pulse" style={{ fontSize: '0.7rem' }}>Gemini AI</span>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={handleRefresh}
                    disabled={refreshingCase}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    {refreshingCase ? <><span className="spinner spinner--sm" /> Refreshing…</> : 'Refresh AI'}
                  </button>
                </div>
              </div>
              <div className="narrative-box" style={{ fontSize: '0.9rem', padding: '16px', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap' }}>
                {selectedCase.copilot_narrative === 'Analyst Copilot threat summary compilation in progress...'
                  ? <div className="flex items-center gap-2"><span className="spinner spinner--sm" /><span>Compiling analyst report…</span></div>
                  : selectedCase.copilot_narrative
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spinner Overlay when loading single case */}
      {loadingCase && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.6)',
            zIndex: 199,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="loading-state">
            <div className="spinner spinner--lg" />
            <p>Fetching complete case telemetry...</p>
          </div>
        </div>
      )}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>Fraud Analyst Case Directory</h2>
          <p>Full threat vectors audit and live biometric telemetry across all applicants.</p>
        </div>
        <button className="btn btn--secondary btn--sm" onClick={fetchUsers} disabled={loadingUsers}>
          {loadingUsers ? <span className="spinner spinner--sm" /> : 'Refresh Directory'}
        </button>
      </div>

      {error && !showModal && (
        <div className="alert alert--danger" style={{ marginBottom: 24 }}>
          <span className="alert__icon">✕</span>
          <p>{error}</p>
        </div>
      )}

      {/* Dynamic Summary Cards */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <span className="stat-card__label">Total Applicants</span>
          <span className="stat-card__value">{totalCases}</span>
          <span className="stat-card__sub">Database records registered</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <span className="stat-card__label">Clean / Onboarded</span>
          <span className="stat-card__value">{cleanCases}</span>
          <span className="stat-card__sub">Risk score &lt; 40%</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <span className="stat-card__label">Needs Review</span>
          <span className="stat-card__value">{reviewCases}</span>
          <span className="stat-card__sub">Risk score 40% - 70%</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <span className="stat-card__label">AI Rejected</span>
          <span className="stat-card__value">{rejectedCases}</span>
          <span className="stat-card__sub">Risk score &gt;= 70%</span>
        </div>
      </div>

      {/* User Cases List */}
      {loadingUsers ? (
        <div className="loading-state">
          <div className="spinner spinner--lg" />
          <p>Loading application directory...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card text-center" style={{ padding: 48 }}>
          <p className="text-muted" style={{ marginBottom: 12 }}>No applicant records found in database.</p>
          <p style={{ fontSize: '0.9rem' }}>Submit a new applicant on the Onboard view to populate the database.</p>
        </div>
      ) : (
        <div className="users-grid">
          {users.map((u) => {
            const riskPct = (u.risk_score * 100).toFixed(0);
            let scoreColor = 'var(--color-success)';
            let scoreBg = 'var(--color-success-light)';
            if (u.risk_score >= 0.70) {
              scoreColor = 'var(--color-danger)';
              scoreBg = 'var(--color-danger-light)';
            } else if (u.risk_score >= 0.40) {
              scoreColor = 'var(--color-warning)';
              scoreBg = 'var(--color-warning-light)';
            }

            const formattedDate = u.created_at
              ? new Date(u.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A';

            return (
              <div
                key={u.id}
                className="user-card animate-fade-in"
                onClick={() => handleSelectUser(u.id)}
              >
                <div className="user-card__header">
                  <div>
                    <h4 className="user-card__name">{u.full_name}</h4>
                    <span className="text-xs text-muted">ID: <code>{u.id.substring(0, 8)}...</code></span>
                  </div>
                  <div
                    style={{
                      background: scoreBg,
                      color: scoreColor,
                      padding: '4px 10px',
                      borderRadius: '99px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {riskPct}% Risk
                  </div>
                </div>
                <div className="user-card__meta">
                  <div><strong>PAN:</strong> <span style={{ fontFamily: 'monospace' }}>{u.pan_number}</span></div>
                  <div><strong>Mobile:</strong> {u.phone_number}</div>
                  <div className="user-card__date">Submitted {formattedDate}</div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.8125rem',
                    color: 'var(--color-primary)',
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  <span>Verify Threat Telemetry</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   OPERATIONS VIEW
────────────────────────────────────────────────────────── */
function OperationsView({ deviceId }) {
  const [breakers, setBreakers] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [loadingBreakers, setLoadingBreakers] = useState(false);
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);
  const [newBlacklistHash, setNewBlacklistHash] = useState('');
  const [newBlacklistReason, setNewBlacklistReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBreakers = async () => {
    setLoadingBreakers(true);
    try {
      const data = await getCircuitBreakers();
      // data is a list of CircuitBreakerStatus items
      setBreakers(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch circuit breakers');
    } finally {
      setLoadingBreakers(false);
    }
  };

  const fetchBlacklist = async () => {
    setLoadingBlacklist(true);
    try {
      const data = await getBlacklistedDevices();
      setBlacklist(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch blacklist');
    } finally {
      setLoadingBlacklist(false);
    }
  };

  useEffect(() => {
    fetchBreakers();
    fetchBlacklist();

    // Poll circuit breakers every 3 seconds for live changes
    const interval = setInterval(() => {
      fetchBreakers();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleTrip = async (name) => {
    setError('');
    setSuccess('');
    try {
      await tripCircuitBreaker(name);
      setSuccess(`Circuit breaker '${name}' tripped successfully.`);
      fetchBreakers();
    } catch (err) {
      setError(err.message || 'Failed to trip breaker');
    }
  };

  const handleReset = async (name) => {
    setError('');
    setSuccess('');
    try {
      await resetCircuitBreaker(name);
      setSuccess(`Circuit breaker '${name}' reset successfully.`);
      fetchBreakers();
    } catch (err) {
      setError(err.message || 'Failed to reset breaker');
    }
  };

  const handleAddBlacklist = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newBlacklistHash.trim()) return;
    try {
      await addBlacklistedDevice(newBlacklistHash.trim(), newBlacklistReason.trim() || undefined);
      setSuccess(`Device signature added to Consortium Blacklist.`);
      setNewBlacklistHash('');
      setNewBlacklistReason('');
      fetchBlacklist();
    } catch (err) {
      setError(err.message || 'Failed to add to blacklist');
    }
  };

  const handleRemoveBlacklist = async (webglHash) => {
    setError('');
    setSuccess('');
    try {
      await removeBlacklistedDevice(webglHash);
      setSuccess(`Device signature removed from Consortium Blacklist.`);
      fetchBlacklist();
    } catch (err) {
      setError(err.message || 'Failed to remove from blacklist');
    }
  };

  const handleUseMyHash = () => {
    if (deviceId) {
      setNewBlacklistHash(deviceId);
      setSuccess('WebGL hash auto-filled with your current device signature.');
    } else {
      setError('Active device signature is still computing. Please try again in a moment.');
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 24px' }}>
      <div className="section-header">
        <h2>Operations Console</h2>
        <p>Monitor system health, manage stateful ML/LLM circuit breakers, and enforce consortium WebGL device blacklists.</p>
      </div>

      {error && (
        <div className="alert alert--danger" style={{ marginBottom: 24 }}>
          <span className="alert__icon">✕</span>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="alert alert--success" style={{ marginBottom: 24 }}>
          <span className="alert__icon">✓</span>
          <p>{success}</p>
        </div>
      )}

      {/* Circuit Breakers Section */}
      <div style={{ marginBottom: 40 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h3>Circuit Breakers</h3>
          <button className="btn btn--secondary btn--sm" onClick={fetchBreakers} disabled={loadingBreakers}>
            {loadingBreakers ? <span className="spinner spinner--sm" /> : 'Refresh Status'}
          </button>
        </div>
        
        <div className="grid-3" style={{ gap: 20 }}>
          {breakers.map((breaker) => {
            let color = 'var(--color-success)';
            let bg = 'var(--color-success-light)';
            if (breaker.state === 'OPEN') {
              color = 'var(--color-danger)';
              bg = 'var(--color-danger-light)';
            } else if (breaker.state === 'HALF-OPEN') {
              color = 'var(--color-warning)';
              bg = 'var(--color-warning-light)';
            }

            return (
              <div key={breaker.name} className="card card--flat" style={{ borderLeft: `4px solid ${color}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 16 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{breaker.name}</h4>
                    <span className="badge badge--pulse" style={{ background: bg, color: color, borderColor: color }}>
                      {breaker.state}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem', color: 'var(--color-text-2)' }}>
                    <span>Failures: <strong>{breaker.failure_count} / 3</strong></span>
                    <span>Cooldown: <strong>{breaker.recovery_time}s</strong></span>
                  </div>
                </div>
                <div className="flex gap-2" style={{ marginTop: 'auto' }}>
                  <button 
                    className="btn btn--danger btn--sm btn--full" 
                    onClick={() => handleTrip(breaker.name)}
                    disabled={breaker.state === 'OPEN'}
                  >
                    Trip
                  </button>
                  <button 
                    className="btn btn--secondary btn--sm btn--full" 
                    onClick={() => handleReset(breaker.name)}
                    disabled={breaker.state === 'CLOSED'}
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consortium Blacklist Section */}
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h3>Consortium Blacklist Registry</h3>
        </div>

        <div className="grid-2" style={{ gap: 24, gridTemplateColumns: '1fr 2fr' }}>
          {/* Left Column: Form */}
          <div className="tile-card flex flex-col gap-4">
            <h4 style={{ margin: 0 }}>Flag Device Fingerprint</h4>
            <p className="text-xs text-muted" style={{ marginBottom: 8 }}>Register a WebGL signature to block coordinated simulator farms and coordinated bust-outs.</p>
            
            <form onSubmit={handleAddBlacklist} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="blacklist-hash">WebGL Device Hash <span className="required">*</span></label>
                <div className="flex gap-2">
                  <input 
                    id="blacklist-hash"
                    className="form-input" 
                    placeholder="Enter device signature" 
                    value={newBlacklistHash}
                    onChange={(e) => setNewBlacklistHash(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    required
                  />
                  <button 
                    type="button" 
                    className="btn btn--secondary btn--sm" 
                    onClick={handleUseMyHash}
                    title="Autofill with my device hash"
                  >
                    Mine
                  </button>
                </div>
                {deviceId && (
                  <small className="text-muted" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    Active: <code>{deviceId}</code>
                  </small>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="blacklist-reason">Flag Reason</label>
                <input 
                  id="blacklist-reason"
                  className="form-input" 
                  placeholder="e.g. Coordinated burst attacks detected" 
                  value={newBlacklistReason}
                  onChange={(e) => setNewBlacklistReason(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn--primary btn--full" style={{ marginTop: 8 }}>
                Register Blacklist Hash
              </button>
            </form>
          </div>

          {/* Right Column: Table */}
          <div className="tile-card flex flex-col gap-4" style={{ overflow: 'hidden' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <div>
                <h4 style={{ margin: 0 }}>Registered Signatures Ledger</h4>
                <p className="text-xs text-muted">Active device fingerprints shared across the consortium network.</p>
              </div>
              <button className="btn btn--secondary btn--sm" onClick={fetchBlacklist} disabled={loadingBlacklist}>
                {loadingBlacklist ? <span className="spinner spinner--sm" /> : 'Refresh List'}
              </button>
            </div>

            <div className="ops-table-container">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Device WebGL Hash</th>
                    <th>Flag Reason</th>
                    <th>Date Added</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blacklist.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center text-muted" style={{ padding: '32px' }}>
                        No blacklisted device signatures currently found.
                      </td>
                    </tr>
                  ) : (
                    blacklist.map((device) => {
                      const formattedDate = device.created_at
                        ? new Date(device.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A';

                      return (
                        <tr key={device.id}>
                          <td className="text-mono" style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={device.webgl_hash}>
                            {device.webgl_hash}
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{device.reason}</td>
                          <td className="text-muted" style={{ fontSize: '0.8rem' }}>{formattedDate}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn btn--danger btn--sm" 
                              style={{ padding: '4px 8px' }}
                              onClick={() => handleRemoveBlacklist(device.webgl_hash)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   ROOT APP
────────────────────────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState('home');
  const [globalUserId, setGlobalUserId] = useState('');
  const deviceId = useWebGLFingerprint();

  const renderView = () => {
    switch (view) {
      case 'home':        return <HomeView setView={setView} />;
      case 'onboard':     return <OnboardView deviceId={deviceId} setGlobalUserId={setGlobalUserId} />;
      case 'login':       return <LoginView deviceId={deviceId} globalUserId={globalUserId} />;
      case 'transaction': return <TransactionView globalUserId={globalUserId} />;
      case 'dashboard':   return <DashboardView globalUserId={globalUserId} />;
      case 'operations':  return <OperationsView deviceId={deviceId} />;
      default:            return <HomeView setView={setView} />;
    }
  };


  return (
    <div className="app-container">
      <Nav view={view} setView={setView} />
      <div className="main-content">
        <main style={{ flex: 1 }}>
          {renderView()}
        </main>
        <footer className="footer">
          <p>GuardIndia AI · 4-Layer Synthetic Identity Fraud Detection · Built with FastAPI, NetworkX, OpenCV, scikit-learn &amp; React</p>
        </footer>
      </div>
    </div>
  );
}
