import os
import sys
import joblib
import numpy as np

def verify_phase3():
    print("\n--- Verifying Phase 3 Model (Isolation Forest) ---")
    model_path = 'ml_core/device_fingerprint/isolation_forest_model.pkl'
    scaler_path = 'ml_core/device_fingerprint/scaler_p3.pkl'
    
    assert os.path.exists(model_path), f"Model not found at {model_path}"
    assert os.path.exists(scaler_path), f"Scaler not found at {scaler_path}"
    
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    
    # Feature columns: ['time_delta_seconds', 'accounts_per_device', 'LoginAttempts', 'TransactionAmount']
    # 1. Normal/Human sample (large login delay, unique device, normal amount)
    normal_sample = np.array([[3600.0, 1.0, 1.0, 1500.0]])
    # 2. Anomalous/Bot sample (millisecond delay, 30 accounts on same device, high attempts, high amount)
    anomalous_sample = np.array([[0.2, 30.0, 12.0, 48000.0]])
    
    # Preprocess
    normal_scaled = scaler.transform(normal_sample)
    anomalous_scaled = scaler.transform(anomalous_sample)
    
    # Predict
    # Isolation Forest: -1 for anomaly, 1 for normal
    normal_pred = model.predict(normal_scaled)[0]
    anomalous_pred = model.predict(anomalous_scaled)[0]
    
    # Decision scores: lower = more anomalous
    normal_score = model.decision_function(normal_scaled)[0]
    anomalous_score = model.decision_function(anomalous_scaled)[0]
    
    print(f"Normal Sample - Scaled: {normal_scaled[0]}")
    print(f"Normal Sample - Prediction: {normal_pred} (Score: {normal_score:.4f})")
    print(f"Anomalous Sample - Scaled: {anomalous_scaled[0]}")
    print(f"Anomalous Sample - Prediction: {anomalous_pred} (Score: {anomalous_score:.4f})")
    
    assert normal_score > anomalous_score, "Error: Normal score should be higher than anomalous score"
    print("Phase 3 model loaded and validated successfully!")

def verify_phase4():
    print("\n--- Verifying Phase 4 Model (Random Forest Classifier) ---")
    model_path = 'ml_core/behavioral_biometrics/behavioral_classifier.pkl'
    scaler_path = 'ml_core/behavioral_biometrics/scaler_p4.pkl'
    
    assert os.path.exists(model_path), f"Model not found at {model_path}"
    assert os.path.exists(scaler_path), f"Scaler not found at {scaler_path}"
    
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    
    # Feature columns:
    # ['click_duration', 'scroll_depth', 'mouse_movement', 'keystrokes_detected', 
    #  'click_frequency', 'time_since_last_click', 'VPN_usage', 'proxy_usage', 'device_ip_reputation_score']
    
    # 1. Typical Human sample
    human_sample = np.array([[0.35, 750.0, 140.0, 18.0, 4.0, 3.2, 0.0, 0.0, 1.0]])
    # 2. Typical Bot/Fraud sample
    bot_sample = np.array([[0.01, 10.0, 2.0, 0.0, 15.0, 0.05, 1.0, 1.0, -1.0]])
    
    # Preprocess
    human_scaled = scaler.transform(human_sample)
    bot_scaled = scaler.transform(bot_sample)
    
    # Predict probabilities (index 1 is fraud class)
    human_prob = model.predict_proba(human_scaled)[0][1]
    bot_prob = model.predict_proba(bot_scaled)[0][1]
    
    # Predict classes (0 = Human, 1 = Fraud)
    human_pred = model.predict(human_scaled)[0]
    bot_pred = model.predict(bot_scaled)[0]
    
    print(f"Human Sample - Scaled: {human_scaled[0]}")
    print(f"Human Sample - Prediction: {human_pred} (Fraud Probability: {human_prob:.4f})")
    print(f"Bot Sample - Scaled: {bot_scaled[0]}")
    print(f"Bot Sample - Prediction: {bot_pred} (Fraud Probability: {bot_prob:.4f})")
    
    assert bot_prob > human_prob, "Error: Bot fraud probability should be higher than human"
    print("Phase 4 model loaded and validated successfully!")

if __name__ == "__main__":
    try:
        verify_phase3()
        verify_phase4()
        print("\nAll models verified successfully! Ready for FastAPI integration.")
    except Exception as e:
        print(f"\nVerification failed: {e}")
        sys.exit(1)
