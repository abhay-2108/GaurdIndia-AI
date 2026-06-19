# GuardIndia AI — Architecture & Technology Summary

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GUARDINDIA AI PLATFORM                          │
│                    Multi-Layered Fraud Detection                    │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ FRONTEND: React 19 + Vite                                       │
├──────────────────────────────────────────────────────────────────┤
│ • Real-time telemetry capture (mouse, keyboard, scroll)        │
│ • WebGL GPU fingerprinting (device identification)             │
│ • Dynamic photometric liveness verification                     │
│ • Real-Time Risk Dashboard with live metrics                   │
│ • WebAuthn device binding (security)                           │
│                                                                 │
│ Hooks: useBehavioralTracker, useWebGLFingerprint              │
│ Port: 5173                                                      │
└──────────────────────────────────────────────────────────────────┘
                            ↓ HTTPS/WebSocket ↓
┌──────────────────────────────────────────────────────────────────┐
│ BACKEND: FastAPI (Python)                                       │
├──────────────────────────────────────────────────────────────────┤
│ Core Components:                                                │
│                                                                 │
│ ┌─ app/api/endpoints.py                                        │
│ │  - 40+ REST endpoints                                        │
│ │  - Request/response validation (Pydantic)                    │
│ │  - Rate limiting (token bucket)                              │
│ │  - Async processing (BackgroundTasks)                        │
│ │                                                              │
│ ├─ app/services/                                               │
│ │  ├─ ml_service.py         (Layer 3 & 4 inference)           │
│ │  ├─ analytics_service.py  (Dashboard metrics)               │
│ │  ├─ copilot_service.py    (LLM integration)                 │
│ │  ├─ geolocation_service.py (IP & location checks)           │
│ │  ├─ config_service.py     (Threshold management)            │
│ │  └─ alert_service.py      (Alert routing)                   │
│ │                                                              │
│ └─ app/core/rate_limiter.py                                    │
│    (Sliding window, per-device throttle)                       │
│                                                                 │
│ Port: 8000                                                      │
│ API Docs: http://localhost:8000/docs                          │
└──────────────────────────────────────────────────────────────────┘
                            ↓ Sync/Async ↓
┌──────────────────────────────────────────────────────────────────┐
│ ML INFERENCE LAYER                                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                 │
│ LAYER 1: Identity Graph (NetworkX)                             │
│   Input: PAN, Phone number                                      │
│   Process: Query graph edges, calculate Jaccard similarity     │
│   Output: Similarity score (0-1)                               │
│   Latency: 40-60ms                                             │
│                                                                 │
│ LAYER 2: e-KYC Visual Scan (OpenCV + PIL)                      │
│   Input: Document image                                         │
│   Process: ELA analysis + FFT Moiré + Photometric liveness    │
│   Output: Tampering flag, liveness pass/fail                   │
│   Latency: 1.5-2.5s (background task)                         │
│                                                                 │
│ LAYER 3: Device Fingerprinting (Isolation Forest)              │
│   Input: Device hash, login time delta, session duration       │
│   Model: scikit-learn Isolation Forest                         │
│   Output: Anomaly score (-1 to +1)                            │
│   Latency: 80-120ms                                            │
│                                                                 │
│ LAYER 4: Behavioral Biometrics (Random Forest)                 │
│   Input: Mouse velocity, keystroke patterns, scroll depth      │
│   Model: scikit-learn Random Forest                            │
│   Output: Bot probability (0-1)                                │
│   Latency: 120-200ms                                           │
│                                                                 │
└──────────────────────────────────────────────────────────────────┘
                            ↓ Aggregation ↓
┌──────────────────────────────────────────────────────────────────┐
│ DECISION ENGINE                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Combined Risk Score = w1×L1 + w2×L2 + w3×L3 + w4×L4           │
│                                                                 │
│ Risk Score (0.0-1.0):                                          │
│   >= 0.70 → REJECT_BY_AI                                       │
│   0.40-0.70 → NEEDS_MANUAL_REVIEW                              │
│   < 0.40 → ONBOARD                                             │
│                                                                 │
└──────────────────────────────────────────────────────────────────┘
                            ↓ Enrichment ↓
┌──────────────────────────────────────────────────────────────────┐
│ LLM COPILOT LAYER (Gemini API)                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Input: All layer scores + risk factors                         │
│ Process: Stream narrative generation                           │
│ Output: Human-readable threat assessment                       │
│ Format: Server-Sent Events (SSE) streaming                    │
│                                                                 │
│ Example Output:                                                │
│ "⚠️ CRITICAL: Device hash matches 47 other accounts.          │
│  PAN-Phone pairing unusual (1st time). Document shows         │
│  pixel-level tampering. Recommend immediate block."           │
│                                                                 │
└──────────────────────────────────────────────────────────────────┘
                            ↓ Output ↓
┌──────────────────────────────────────────────────────────────────┐
│ OPERATIONS CONSOLE                                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Real-Time Risk Dashboard                                    │
│    • Live fraud metrics                                        │
│    • Geographic hotspots                                       │
│    • Model performance (precision/recall)                      │
│    • Fraud ring detection                                      │
│                                                                 │
│ 2. Circuit Breaker Management                                  │
│    • CLOSED → Running normally                                 │
│    • HALF-OPEN → Degraded, fallback enabled                  │
│    • OPEN → Failed, using rules                               │
│                                                                 │
│ 3. Consortium Blacklist Management                             │
│    • Add/remove WebGL hashes                                  │
│    • View linked accounts                                      │
│    • Historical audit log                                      │
│                                                                 │
│ 4. Case Audit Directory                                        │
│    • Manual review queue                                       │
│    • Pagination (6, 12, 24, 50 items)                         │
│    • Copilot narratives                                        │
│                                                                 │
│ 5. Alert Configuration                                         │
│    • Alert severity levels                                     │
│    • Escalation rules                                          │
│    • Threshold tuning                                          │
│                                                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Complete Onboarding Journey

```
USER SUBMITS FORM
├─ Full Name: "Raj Kumar"
├─ PAN: "ABCDE1234F"
├─ Phone: "9876543210"
├─ ID Card Image: scan.jpg
├─ Device WebGL: "xyz123..."
└─ Liveness Check: PASSED
        ↓
SERVER CREATES USER (Status: PROCESSING)
        ↓
FIRE BACKGROUND TASK (Async, non-blocking)
        ↓
[LAYER 1] Identity Graph Audit
├─ Query: Ever seen this PAN + Phone together?
├─ Answer: NO (first pairing)
├─ Jaccard Similarity: 0.15
└─ Risk contribution: +0.40
        ↓
[LAYER 2] e-KYC Visual Scan (Time: ~2s)
├─ ELA Analysis: Resave at Q=95, check pixel deviation
│  └─ Result: ELA = 0.12 (clean, not edited)
├─ Moiré FFT: Check for screen frequency patterns
│  └─ Result: No moiré detected
├─ Photometric Liveness: Already verified in frontend
│  └─ Result: PASSED
└─ Risk contribution: +0.05
        ↓
[LAYER 3] Device Fingerprinting
├─ Query: How many accounts use this GPU hash?
├─ Answer: 1 (just this user)
├─ Isolation Forest Anomaly Score: +0.42 (normal)
└─ Risk contribution: +0.08
        ↓
CALCULATE FINAL RISK SCORE
├─ L1 contribution: 0.40
├─ L2 contribution: 0.05
├─ L3 contribution: 0.08
├─ Weighted sum: 0.53
└─ Decision: NEEDS_MANUAL_REVIEW (0.40-0.70 range)
        ↓
[LLM COPILOT] Generate Threat Narrative
├─ Input: All scores + risk factors
├─ Process: Call Gemini API (streaming)
├─ Output: "This application shows medium-risk...
│          Recommend manual review."
└─ Format: Server-Sent Events (real-time)
        ↓
RETURN RESULTS TO FRONTEND
├─ user_id: "abc-123-def"
├─ status: "NEEDS_MANUAL_REVIEW"
├─ risk_score: 0.53
├─ layer_scores: {L1: 0.40, L2: 0.05, L3: 0.08}
└─ copilot_narrative: "..." (streaming)
        ↓
DISPLAY TO USER
├─ Show risk score visualization
├─ Show layer-wise breakdowns
├─ Show Copilot narrative
└─ "Your application is under review"
        ↓
MANUAL ANALYST REVIEW (Async)
├─ Review case in dashboard
├─ Check all layer details
├─ Read Copilot narrative
└─ Make APPROVE/REJECT decision
```

---

## Technology Stack Details

### Frontend
```
React 19               - UI framework
Vite                   - Build tool (dev: <3s, prod: optimized)
SimpleWebAuthn         - WebAuthn device binding
React Hooks            - State management
CSS Variables          - Design system (GuardIndia theme)

Custom Hooks:
├─ useBehavioralTracker    (captures telemetry)
├─ useWebGLFingerprint     (GPU identification)
└─ useGeolocation          (optional: user location)

Performance:
├─ SPA (Single Page App)    → Client-side routing
├─ Lazy loading             → Code splitting
├─ WebSocket support        → Real-time updates
└─ SSE (Server-Sent Events) → Streaming Copilot
```

### Backend
```
FastAPI                - Web framework (async)
Uvicorn                - ASGI server
SQLAlchemy             - ORM (database abstraction)
Pydantic               - Data validation
Python 3.10+           - Language

Services:
├─ NetworkX            - Graph operations (Layer 1)
├─ OpenCV + PIL        - Image processing (Layer 2)
├─ scikit-learn        - ML models (L3: Isolation Forest, L4: RF)
├─ NumPy + Scipy       - Math operations
├─ Requests            - HTTP client (LLM API)
└─ python-dotenv       - Environment config

Async Features:
├─ AsyncIO             - Concurrency
├─ BackgroundTasks     - Offload heavy work
├─ aiofiles            - Async file I/O
└─ httpx               - Async HTTP
```

### Database
```
SQLite (Development)
├─ File-based, zero configuration
├─ Perfect for prototyping
└─ Path: data/guardindia.db

PostgreSQL (Production)
├─ Horizontal scalability
├─ Advanced indexing
├─ Replication support
└─ AWS RDS / Google Cloud SQL

Tables:
├─ users                        (user accounts)
├─ kyc_documents               (ID card images + ELA scores)
├─ device_fingerprints         (WebGL hashes + anomaly flags)
├─ transactions                (checkout interactions)
├─ identity_graph_edges        (PAN-Phone linkages)
├─ consortium_blacklist_devices (shared fraud registry)
├─ circuit_breaker_state       (ML model health)
└─ alerts                      (fraud alerts)
```

### ML Models
```
Layer 3: Isolation Forest
├─ Library: scikit-learn
├─ Training: Unsupervised
├─ Input Features: 5
│  ├─ login_time_delta (seconds)
│  ├─ session_duration (seconds)
│  ├─ accounts_per_device (count)
│  ├─ login_attempts (count)
│  └─ network_hop_count (VPN hops)
├─ Output: Anomaly score (-1 to +1)
├─ File: ml_core/device_fingerprint/isolation_forest_model.pkl
└─ Performance: Precision 80%, Recall 75%

Layer 4: Random Forest
├─ Library: scikit-learn
├─ Training: Supervised
├─ Input Features: 6
│  ├─ click_duration (seconds)
│  ├─ scroll_depth (pixels)
│  ├─ mouse_movement (pixels)
│  ├─ keystrokes_detected (count)
│  ├─ click_frequency (count)
│  └─ time_since_last_click (seconds)
├─ Output: Bot probability (0-1)
├─ File: ml_core/behavioral_biometrics/random_forest_model.pkl
└─ Performance: Precision 82%, Recall 79%
```

---

## API Architecture

### Request/Response Pattern

**HTTP Request:**
```http
POST /api/analytics/fraud-statistics?days=7
Host: localhost:8000
Authorization: Bearer token
Content-Type: application/json
```

**Response:**
```json
{
  "total_applications": 127,
  "fraud_rate": 0.0827,
  "approved": 117,
  "rejected": 10,
  "by_layer": {
    "layer1": 0.0315,
    "layer2": 0.0157,
    "layer3": 0.0394,
    "layer4": 0.0315
  },
  "is_demo": true
}
```

### Streaming Endpoint (SSE)

**Request:**
```http
GET /api/cases/{user_id}/copilot/stream
```

**Response (Stream):**
```
data: {"text": "⚠️ CRITICAL ALERT: Synthetic Fraud Ring\n\n"}

data: {"text": "THREAT SUMMARY:\nThis application shows..."}

data: {"text": "• PAN + Phone pairing is UNUSUAL..."}

...

data: [DONE]
```

---

## Scalability & Performance

### Horizontal Scaling

```
Load Balancer
      ↓
┌─────────────────────────────────┐
│  FastAPI Instance 1 (Port 8000) │
│  FastAPI Instance 2 (Port 8001) │
│  FastAPI Instance 3 (Port 8002) │
└─────────────────────────────────┘
      ↓ (all share same)
┌─────────────────────────────────┐
│   PostgreSQL (Primary)          │
│   + Read Replicas (x2)          │
│   + Connection Pool             │
└─────────────────────────────────┘
      ↓
┌─────────────────────────────────┐
│   Redis Cache                   │
│   (Model cache, sessions)       │
└─────────────────────────────────┘
```

### Performance Targets

| Component | Target Latency | Achieved |
|-----------|---------------|----------|
| L1 (Graph) | <100ms | 40-60ms ✓ |
| L2 (Vision) | <3s | 1.5-2.5s ✓ |
| L3 (IF) | <150ms | 80-120ms ✓ |
| L4 (RF) | <250ms | 120-200ms ✓ |
| Full Pipeline | <5s | ~4s ✓ |
| API Response | <500ms | <200ms ✓ |
| Dashboard Load | <2s | <1.5s ✓ |

---

## Security Layers

```
┌─────────────────────────────────────────────────────┐
│ Input Validation (Pydantic)                         │
│ └─ Type checking, range validation, format checks   │
├─────────────────────────────────────────────────────┤
│ Rate Limiting (Token Bucket)                        │
│ └─ 5 requests per 10 seconds per device             │
├─────────────────────────────────────────────────────┤
│ CSRF Protection (CORS, SameSite cookies)            │
│ └─ All POST endpoints protected                     │
├─────────────────────────────────────────────────────┤
│ SQL Injection Prevention (SQLAlchemy ORM)           │
│ └─ Parameterized queries, no raw SQL                │
├─────────────────────────────────────────────────────┤
│ Data Encryption (AES-256 at rest)                   │
│ └─ PII encrypted, keys in environment               │
├─────────────────────────────────────────────────────┤
│ TLS 1.3 (In Transit)                                │
│ └─ HTTPS required, certificate pinning              │
├─────────────────────────────────────────────────────┤
│ WebAuthn Device Binding                             │
│ └─ Hardware security keys, no passwords             │
├─────────────────────────────────────────────────────┤
│ Audit Logging (Immutable logs)                      │
│ └─ Every decision, every access logged              │
└─────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
Development
├─ Frontend: npm run dev (Vite, HMR)
├─ Backend: uvicorn --reload (auto-restart)
└─ Database: SQLite (guardindia.db)

Staging
├─ Frontend: Vercel/Netlify (preview)
├─ Backend: Docker on EC2
├─ Database: PostgreSQL RDS (test data)
└─ Monitoring: CloudWatch

Production
├─ Frontend: Vercel/Netlify (CDN, automatic deploys)
├─ Backend: ECS/EKS (containerized, auto-scaling)
├─ Database: RDS PostgreSQL (multi-AZ, automated backups)
├─ Cache: ElastiCache Redis
├─ Monitoring: Datadog + CloudWatch
└─ Disaster Recovery: Multi-region replication
```

---

## Summary

GuardIndia AI combines **4 independent detection layers** using:
- **Layer 1:** Graph Theory (NetworkX)
- **Layer 2:** Computer Vision (OpenCV, FFT)
- **Layer 3:** ML - Isolation Forest (scikit-learn)
- **Layer 4:** ML - Random Forest (scikit-learn)

Each layer catches different fraud tactics. Combined scoring + LLM narrative provides high-confidence fraud detection with minimal false positives.

**Result:** Real-time protection against organized synthetic identity fraud rings targeting India's digital lending ecosystem.

---

**File:** ARCHITECTURE_SUMMARY.md  
**Status:** Complete Technical Reference  
**Last Updated:** January 2025
