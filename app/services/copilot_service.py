import os
import time
import logging
import google.generativeai as genai

logger = logging.getLogger("guardindia_copilot_service")

# Stateful Circuit Breaker for Gemini API
class CircuitBreaker:
    def __init__(self, name: str, failure_threshold: int = 3, recovery_time_seconds: int = 15):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_time = recovery_time_seconds
        self.state = "CLOSED" # CLOSED, OPEN, HALF-OPEN
        self.failure_count = 0
        self.last_state_change = 0.0

    def record_success(self):
        if self.state != "CLOSED":
            logger.info(f"[{self.name} Circuit] Connection restored. Closing circuit.")
        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self):
        self.failure_count += 1
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            self.last_state_change = time.time()
            logger.warning(
                f"[{self.name} Circuit] TRIPPED to OPEN. Failure threshold reached. "
                f"Forcing local fallbacks for next {self.recovery_time}s."
            )

    def allow_request(self) -> bool:
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if time.time() - self.last_state_change > self.recovery_time:
                self.state = "HALF-OPEN"
                logger.info(f"[{self.name} Circuit] Cooldown expired. Testing connection (HALF-OPEN).")
                return True
            return False
        elif self.state == "HALF-OPEN":
            return True

copilot_breaker = CircuitBreaker("NVIDIA/Ollama LLM API")

import requests
import json
from dotenv import load_dotenv

load_dotenv()

# --- Config for NVIDIA and Ollama ---
NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY", "").strip('"')
NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")
LLM_API_BASE = os.environ.get("LLM_API_BASE", "http://localhost:11434/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "qwen3.5:9b")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "ollama")

if NVIDIA_API_KEY:
    logger.info(f"NVIDIA API configured. Model: {NVIDIA_MODEL}")
else:
    logger.warning("NVIDIA_API_KEY not found. Copilot service will fallback to local Ollama.")

def _call_openai_compatible_api(api_base: str, api_key: str, model: str, system_prompt: str, prompt: str) -> str:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 512
    }
    
    response = requests.post(f"{api_base}/chat/completions", headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()

def _call_openai_compatible_api_stream(api_base: str, api_key: str, model: str, system_prompt: str, prompt: str):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 512,
        "stream": True
    }
    
    response = requests.post(f"{api_base}/chat/completions", headers=headers, json=payload, stream=True, timeout=60)
    response.raise_for_status()
    
    for line in response.iter_lines():
        if line:
            decoded_line = line.decode('utf-8')
            if decoded_line.startswith('data: '):
                data_str = decoded_line[6:]
                if data_str == '[DONE]':
                    break
                try:
                    data = json.loads(data_str)
                    if "choices" in data and len(data["choices"]) > 0:
                        delta = data["choices"][0].get("delta", {})
                        if "content" in delta:
                            yield delta["content"]
                except json.JSONDecodeError:
                    continue

def generate_fraud_analysis(
    user_name: str,
    pan_number: str,
    phone_number: str,
    jaccard_similarity: float,
    ela_score: float,
    is_device_anomaly: bool,
    device_anomaly_score: float,
    bot_probability: float,
    amount: float,
    status: str,
    sim_verified: bool = True,
    pasted_fields_count: int = 0,
    typing_speed_std: float = 0.5,
    bureau_inquiries: int = 0
) -> str:
    """
    Generates a security analyst narrative explaining the user's synthetic fraud risk
    across all 4 phases using NVIDIA API, with a fallback to local Ollama.
    """
    
    # Define overall risk rating
    risk_score = (
        (1.0 - jaccard_similarity) * 0.2 + 
        ela_score * 0.2 + 
        (0.2 if is_device_anomaly else 0.0) + 
        bot_probability * 0.2 +
        (0.2 if not sim_verified else 0.0) +
        (0.2 if bureau_inquiries >= 3 else 0.0)
    )
    
    risk_level = "LOW"
    if risk_score >= 0.70:
        risk_level = "CRITICAL (Immediate Block)"
    elif risk_score >= 0.40:
        risk_level = "MEDIUM (Needs Review)"
        
    system_prompt = (
        "You are 'GuardIndia AI Analyst Copilot', a specialized AI security assistant. "
        "You must analyze the security logs and explain your findings in plain human language using a bulleted list. "
        "CRITICAL: Do NOT use any technical terms (do not say Jaccard similarity, ELA, Isolation Forest, Random Forest, LSTM, bot probability, or error scores). "
        "Instead, use simple human terms:\n"
        "- Instead of 'Jaccard similarity' or 'Phase 1', refer to it as 'relationship network link' or 'history connection check'.\n"
        "- Instead of 'ELA' or 'Phase 2', refer to it as 'document scan integrity check'.\n"
        "- Instead of 'device anomaly' or 'Phase 3', refer to it as 'device behavior check'.\n"
        "- Instead of 'bot probability' or 'Phase 4', refer to it as 'typing pattern check'.\n"
        "- Instead of 'SIM binding', refer to it as 'WebAuthn Device Binding'.\n"
        "Ensure your entire output consists ONLY of simple bullet points (starting with • or -) using plain, everyday language."
    )
    
    prompt = f"""
    Evaluate the following applicant risk logs and write a 3-4 sentence threat assessment summary.
    
    APPLICANT PROFILE:
    - Name: {user_name}
    - PAN Number: {pan_number}
    - Mobile: {phone_number}
    - Transaction Amount: INR {amount:.2f}
    - Current Transaction Status: {status}
    
    SECURITY TELEMETRY LOGS:
    - Phase 1 (Registry Graph Connection): {"Strong" if jaccard_similarity > 0.3 else "Weak"} history link
    - Phase 2 (Document Scan): {"Clean" if ela_score < 0.2 else "Tampered"}
    - Phase 3 (Hardware Anomaly): {"DETECTED" if is_device_anomaly else "CLEAN"}
    - Phase 4 (Bot Probability): {bot_probability * 100:.2f}%
    - WebAuthn Device Binding: {"VERIFIED" if sim_verified else "FAILED/UNVERIFIED"}
    - Form Input Clipboard Pastes: {pasted_fields_count} field(s)
    - Form Typing Speed Variance: {typing_speed_std:.4f}
    - Real-Time Bureau Inquiries (Last Hour): {bureau_inquiries} queries
    
    OVERALL COMPOSITE RISK RATING: {risk_level} (Score: {risk_score:.2f})
    
    Structure your assessment as a simple bulleted list:
    - Describe the primary findings simply.
    - Mention if there are signs of organized fraud.
    - Give a clear recommendation (e.g., approve, review, or block).
    """
    
    # Try NVIDIA API first
    if NVIDIA_API_KEY and copilot_breaker.allow_request():
        try:
            logger.info("Calling NVIDIA AI for copilot summary...")
            res = _call_openai_compatible_api(
                api_base="https://integrate.api.nvidia.com/v1",
                api_key=NVIDIA_API_KEY,
                model=NVIDIA_MODEL,
                system_prompt=system_prompt,
                prompt=prompt
            )
            copilot_breaker.record_success()
            return res
        except Exception as e:
            copilot_breaker.record_failure()
            logger.error(f"NVIDIA API failed: {e}. Falling back to local Ollama model...")
    
    # Fallback to local Ollama
    if LLM_API_BASE and copilot_breaker.allow_request():
        try:
            logger.info(f"Calling Ollama model {LLM_MODEL} for copilot summary...")
            res = _call_openai_compatible_api(
                api_base=LLM_API_BASE,
                api_key=LLM_API_KEY,
                model=LLM_MODEL,
                system_prompt=system_prompt,
                prompt=prompt
            )
            copilot_breaker.record_success()
            return res
        except Exception as e:
            copilot_breaker.record_failure()
            logger.error(f"Ollama API failed: {e}. Falling back to deterministic local template.")
            
    # --- Local Fallback Generator (Deterministic, High Fidelity) ---
    narrative_parts = []
    
    if risk_score >= 0.70:
        narrative_parts.append(f"• **CRITICAL RISK DETECTED**: This application looks like organized fraud.\n")
        narrative_parts.append(f"• Identity check shows this phone number has no historical link to the provided details.\n")
        if ela_score >= 0.50:
            narrative_parts.append(f"• Document image analysis shows signs of digital tampering or editing.\n")
        if is_device_anomaly:
            narrative_parts.append(f"• The device being used behaves suspiciously, typical of automated fraud tools.\n")
        if not sim_verified:
            narrative_parts.append(f"• WebAuthn device binding failed or was bypassed, which is a major security red flag.\n")
        if bureau_inquiries >= 3:
            narrative_parts.append(f"• The user has applied for loans {bureau_inquiries} times in the last hour elsewhere.\n")
        if pasted_fields_count > 0:
            narrative_parts.append(f"• Information was pasted into {pasted_fields_count} field(s) instead of being typed normally.\n")
        narrative_parts.append(f"• **ACTION RECOMMENDED**: Block this application immediately.")
    elif risk_score >= 0.40:
        narrative_parts.append(f"• **SUSPICIOUS ACTIVITY**: The profile shows some warning signs.\n")
        narrative_parts.append(f"• Typing and clicking seem normal, but identity and document checks are slightly concerning.\n")
        if not sim_verified:
            narrative_parts.append(f"• WebAuthn device binding was not completed.\n")
        if bureau_inquiries > 0:
            narrative_parts.append(f"• There are recent loan inquiries elsewhere ({bureau_inquiries}).\n")
        narrative_parts.append(f"• **ACTION RECOMMENDED**: Place under manual review.")
    else:
        narrative_parts.append(f"• **CLEAN PROFILE**: All security checks passed.\n")
        narrative_parts.append(f"• Identity, document image, and behavioral checks all confirm a normal human user.\n")
        if sim_verified:
            narrative_parts.append(f"• WebAuthn hardware binding was successfully verified.\n")
        narrative_parts.append(f"• **ACTION RECOMMENDED**: Approve application.")
        
    return "".join(narrative_parts)

def generate_fraud_analysis_stream(
    user_name: str,
    pan_number: str,
    phone_number: str,
    jaccard_similarity: float,
    ela_score: float,
    is_device_anomaly: bool,
    device_anomaly_score: float,
    bot_probability: float,
    amount: float,
    status: str,
    sim_verified: bool = True,
    pasted_fields_count: int = 0,
    typing_speed_std: float = 0.5,
    bureau_inquiries: int = 0
):
    """
    Generator that yields a security analyst narrative chunk-by-chunk using NVIDIA API, 
    with a fallback to local Ollama.
    """
    risk_score = (
        (1.0 - jaccard_similarity) * 0.2 + 
        ela_score * 0.2 + 
        (0.2 if is_device_anomaly else 0.0) + 
        bot_probability * 0.2 +
        (0.2 if not sim_verified else 0.0) +
        (0.2 if bureau_inquiries >= 3 else 0.0)
    )
    
    risk_level = "LOW"
    if risk_score >= 0.70:
        risk_level = "CRITICAL (Immediate Block)"
    elif risk_score >= 0.40:
        risk_level = "MEDIUM (Needs Review)"
        
    system_prompt = (
        "You are 'GuardIndia AI Analyst Copilot', a specialized AI security assistant. "
        "You must analyze the security logs and explain your findings in plain human language using a bulleted list. "
        "CRITICAL: Do NOT use any technical terms (do not say Jaccard similarity, ELA, Isolation Forest, Random Forest, LSTM, bot probability, or error scores). "
        "Instead, use simple human terms:\n"
        "- Instead of 'Jaccard similarity' or 'Phase 1', refer to it as 'relationship network link' or 'history connection check'.\n"
        "- Instead of 'ELA' or 'Phase 2', refer to it as 'document scan integrity check'.\n"
        "- Instead of 'device anomaly' or 'Phase 3', refer to it as 'device behavior check'.\n"
        "- Instead of 'bot probability' or 'Phase 4', refer to it as 'typing pattern check'.\n"
        "- Instead of 'SIM binding', refer to it as 'WebAuthn Device Binding'.\n"
        "Ensure your entire output consists ONLY of simple bullet points (starting with • or -) using plain, everyday language."
    )
    
    prompt = f"""
    Evaluate the following applicant risk logs and write a 3-4 sentence threat assessment summary.
    
    APPLICANT PROFILE:
    - Name: {user_name}
    - PAN Number: {pan_number}
    - Mobile: {phone_number}
    - Transaction Amount: INR {amount:.2f}
    - Current Transaction Status: {status}
    
    SECURITY TELEMETRY LOGS:
    - Phase 1 (Registry Graph Connection): {"Strong" if jaccard_similarity > 0.3 else "Weak"} history link
    - Phase 2 (Document Scan): {"Clean" if ela_score < 0.2 else "Tampered"}
    - Phase 3 (Hardware Anomaly): {"DETECTED" if is_device_anomaly else "CLEAN"}
    - Phase 4 (Bot Probability): {bot_probability * 100:.2f}%
    - WebAuthn Device Binding: {"VERIFIED" if sim_verified else "FAILED/UNVERIFIED"}
    - Form Input Clipboard Pastes: {pasted_fields_count} field(s)
    - Form Typing Speed Variance: {typing_speed_std:.4f}
    - Real-Time Bureau Inquiries (Last Hour): {bureau_inquiries} queries
    
    OVERALL COMPOSITE RISK RATING: {risk_level} (Score: {risk_score:.2f})
    
    Structure your assessment as a simple bulleted list:
    - Describe the primary findings simply.
    - Mention if there are signs of organized fraud.
    - Give a clear recommendation (e.g., approve, review, or block).
    """
    
    # Try NVIDIA API first
    if NVIDIA_API_KEY and copilot_breaker.allow_request():
        try:
            logger.info("Calling NVIDIA AI stream for copilot summary...")
            for chunk in _call_openai_compatible_api_stream(
                api_base="https://integrate.api.nvidia.com/v1",
                api_key=NVIDIA_API_KEY,
                model=NVIDIA_MODEL,
                system_prompt=system_prompt,
                prompt=prompt
            ):
                yield chunk
            copilot_breaker.record_success()
            return
        except Exception as e:
            copilot_breaker.record_failure()
            logger.error(f"NVIDIA API stream failed: {e}. Falling back to local Ollama model...")
    
    # Fallback to local Ollama
    if LLM_API_BASE and copilot_breaker.allow_request():
        try:
            logger.info(f"Calling Ollama model {LLM_MODEL} stream for copilot summary...")
            for chunk in _call_openai_compatible_api_stream(
                api_base=LLM_API_BASE,
                api_key=LLM_API_KEY,
                model=LLM_MODEL,
                system_prompt=system_prompt,
                prompt=prompt
            ):
                yield chunk
            copilot_breaker.record_success()
            return
        except Exception as e:
            copilot_breaker.record_failure()
            logger.error(f"Ollama API stream failed: {e}. Falling back to deterministic local template.")
            
    # Yield static template in chunks
    fallback_text = generate_fraud_analysis(
        user_name, pan_number, phone_number, jaccard_similarity, ela_score,
        is_device_anomaly, device_anomaly_score, bot_probability, amount, status,
        sim_verified, pasted_fields_count, typing_speed_std, bureau_inquiries
    )
    words = fallback_text.split()
    for word in words:
        yield word + " "
        import time
        time.sleep(0.05)
