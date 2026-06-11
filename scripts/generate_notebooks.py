import json
import os

def create_notebook(filename, cells):
    notebook = {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3 (.venv)",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "codemirror_mode": {
                    "name": "ipython",
                    "version": 3
                },
                "file_extension": ".py",
                "mimetype": "text/x-python",
                "name": "python",
                "nbconvert_exporter": "python",
                "pygments_lexer": "ipython3",
                "version": "3.11.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 2
    }
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(notebook, f, indent=1)
    print(f"Created notebook: {filename}")

# CELLS FOR NOTEBOOK 1: PHASE 3 (HARDWARE & TEMPORAL ANOMALY)
cells_p3 = [
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "# Phase 3: Hardware & Temporal Anomaly Detection (Isolation Forest)\n",
            "This notebook builds the machine learning pipeline for **Phase 3 (Incubation Loop Anomaly Detection)** of the **GuardIndia AI** platform.\n",
            "\n",
            "## Objective\n",
            "Identify synthetic identity fraud rings that reuse physical devices across multiple synthetic profiles or perform automated transaction/login bursts with mechanical timing regularity. We use the unsupervised **Isolation Forest** model to detect these patterns without needing explicit fraud labels.\n",
            "\n",
            "## Pipeline Phases:\n",
            "1. **Data Ingestion**: Load the `bank transactions data.csv` dataset.\n",
            "2. **Data Cleaning**: Handle missing values and parse timestamps.\n",
            "3. **Feature Engineering**:\n",
            "   * `time_delta_seconds`: Seconds between current and previous transactions.\n",
            "   * `accounts_per_device`: Count of unique accounts sharing the same device.\n",
            "   * Select core features for training: `time_delta_seconds`, `accounts_per_device`, `LoginAttempts`, `TransactionAmount`.\n",
            "4. **Preprocessing**: Standardize the features using a `StandardScaler`.\n",
            "5. **Model Training**: Train an `IsolationForest` model on the scaled features.\n",
            "6. **Evaluation**: Analyze anomaly scores, inspect the characteristics of flagged outliers, and plot the score distribution.\n",
            "7. **Model Saving**: Serialize the trained model and scaler to the `ml_core/device_fingerprint/` directory."
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 1: Data Ingestion & Setup"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "import pandas as pd\n",
            "import numpy as np\n",
            "import matplotlib.pyplot as plt\n",
            "import seaborn as sns\n",
            "import joblib\n",
            "import os\n",
            "\n",
            "# Style configuration for premium aesthetics\n",
            "plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')\n",
            "plt.rcParams['figure.figsize'] = (10, 6)\n",
            "plt.rcParams['font.family'] = 'sans-serif'\n",
            "\n",
            "# Load the dataset\n",
            "data_path = '../datasets/bank transactions data.csv'\n",
            "df = pd.read_csv(data_path)\n",
            "print(f\"Dataset successfully loaded. Shape: {df.shape}\")\n",
            "df.head()"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 2: Data Cleaning"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Check missing values\n",
            "print(\"Missing values before cleaning:\")\n",
            "print(df.isnull().sum())\n",
            "\n",
            "# Parse datetime fields\n",
            "df['TransactionDate'] = pd.to_datetime(df['TransactionDate'])\n",
            "df['PreviousTransactionDate'] = pd.to_datetime(df['PreviousTransactionDate'])\n",
            "\n",
            "# Drop duplicates\n",
            "df = df.drop_duplicates()\n",
            "print(f\"\\nShape after dropping duplicates: {df.shape}\")"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 3: Feature Engineering\n",
            "We engineer features representing device sharing patterns and temporal velocities:\n",
            "1. **`time_delta_seconds`**: Represents the speed of successive operations. High-frequency robotic scripts will have very low time deltas.\n",
            "2. **`accounts_per_device`**: Identifies hardware collisions where multiple synthetic identities are operating out of the same device fingerprinted container (WebGL hash/DeviceID)."
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# 1. Calculate time delta between successive transactions\n",
            "df['time_delta_seconds'] = (df['TransactionDate'] - df['PreviousTransactionDate']).dt.total_seconds().abs()\n",
            "\n",
            "# 2. Calculate number of unique accounts per device\n",
            "device_accounts = df.groupby('DeviceID')['AccountID'].nunique().reset_index()\n",
            "device_accounts.columns = ['DeviceID', 'accounts_per_device']\n",
            "df = df.merge(device_accounts, on='DeviceID', how='left')\n",
            "\n",
            "# Select the target training features\n",
            "features = ['time_delta_seconds', 'accounts_per_device', 'LoginAttempts', 'TransactionAmount']\n",
            "X = df[features].copy()\n",
            "\n",
            "# Fill missing values\n",
            "X['time_delta_seconds'] = X['time_delta_seconds'].fillna(X['time_delta_seconds'].median())\n",
            "X['accounts_per_device'] = X['accounts_per_device'].fillna(1)\n",
            "X['LoginAttempts'] = X['LoginAttempts'].fillna(1)\n",
            "X['TransactionAmount'] = X['TransactionAmount'].fillna(X['TransactionAmount'].median())\n",
            "\n",
            "print(\"Engineered training features summary:\")\n",
            "print(X.describe())"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 4: Preprocessing (Standard Scaling)\n",
            "Standardize features to ensure the Isolation Forest calculates tree cuts evenly across different numeric ranges."
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "from sklearn.preprocessing import StandardScaler\n",
            "\n",
            "scaler = StandardScaler()\n",
            "X_scaled = scaler.fit_transform(X)\n",
            "print(\"Scaled features sample (first 3 rows):\")\n",
            "print(X_scaled[:3])"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 5: Model Training (Isolation Forest)\n",
            "We fit an Isolation Forest. We set `contamination=0.05` (representing 5% expected anomaly rate), which is typical for fraud incubation periods."
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "from sklearn.ensemble import IsolationForest\n",
            "\n",
            "# Initialize the model\n",
            "model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)\n",
            "\n",
            "# Fit model on scaled features\n",
            "model.fit(X_scaled)\n",
            "\n",
            "# Compute anomaly scores and predictions\n",
            "# decision_function returns the anomaly score (lower is more anomalous)\n",
            "df['anomaly_score'] = model.decision_function(X_scaled)\n",
            "# predict returns -1 for anomalies and 1 for normal values\n",
            "df['anomaly_prediction'] = model.predict(X_scaled)\n",
            "df['is_anomaly'] = df['anomaly_prediction'].map({1: 0, -1: 1})\n",
            "\n",
            "print(\"Anomaly counts (0 = Normal, 1 = Anomalous):\")\n",
            "print(df['is_anomaly'].value_counts())\n",
            "print(\"Proportion:\")\n",
            "print(df['is_anomaly'].value_counts(normalize=True))"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 6: Evaluation & Anomaly Inspection\n",
            "Let's visualize the distribution of anomaly scores and inspect the profiles that were flagged as anomalies."
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Plot anomaly score distribution\n",
            "plt.figure(figsize=(10, 6))\n",
            "sns.histplot(data=df, x='anomaly_score', hue='is_anomaly', bins=50, kde=True, palette='magma', multiple='stack')\n",
            "plt.title('Distribution of Isolation Forest Anomaly Scores', fontsize=14, fontweight='bold', pad=15)\n",
            "plt.xlabel('Anomaly Score (lower = more anomalous)', fontsize=12)\n",
            "plt.ylabel('Frequency', fontsize=12)\n",
            "plt.axvline(x=0, color='crimson', linestyle='--', label='Theoretical Anomaly Boundary')\n",
            "plt.legend(frameon=True, facecolor='white', framealpha=0.9)\n",
            "plt.tight_layout()\n",
            "plt.savefig('phase3_anomaly_scores_dist.png', dpi=300)\n",
            "plt.show()\n",
            "\n",
            "# Statistical comparison between normal and anomalous records\n",
            "print(\"\\n=== Characteristics of Flagged Anomalies ===\")\n",
            "print(df[df['is_anomaly'] == 1][features].describe().loc[['mean', 'min', 'max']])\n",
            "\n",
            "print(\"\\n=== Characteristics of Normal Transactions ===\")\n",
            "print(df[df['is_anomaly'] == 0][features].describe().loc[['mean', 'min', 'max']])"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Inspect the most anomalous transactions\n",
            "print(\"Top 5 most extreme anomalies detected:\")\n",
            "df_sorted = df.sort_values(by='anomaly_score')\n",
            "df_sorted[features + ['anomaly_score', 'is_anomaly']].head(5)"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 7: Model & Scaler Serialization\n",
            "Save the models to the project's core directory so they can be loaded by the FastAPI backend during runtime."
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "os.makedirs('../ml_core/device_fingerprint', exist_ok=True)\n",
            "\n",
            "joblib.dump(model, '../ml_core/device_fingerprint/isolation_forest_model.pkl')\n",
            "joblib.dump(scaler, '../ml_core/device_fingerprint/scaler_p3.pkl')\n",
            "\n",
            "print(\"Model serialized to: ml_core/device_fingerprint/isolation_forest_model.pkl\")\n",
            "print(\"Scaler serialized to: ml_core/device_fingerprint/scaler_p3.pkl\")"
        ]
    }
]

# CELLS FOR NOTEBOOK 2: PHASE 4 (BEHAVIORAL TELEMETRY)
cells_p4 = [
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "# Phase 4: Behavioral Screen & Click Telemetry Classifier (Random Forest)\n",
            "This notebook builds the machine learning pipeline for **Phase 4 (Coordinated Bust-Out Behavioral Biometrics)** of the **GuardIndia AI** platform.\n",
            "\n",
            "## Objective\n",
            "Distinguish between organic human interactions and automated script/bot executions during critical loan application and withdrawal phases. Bots behave with rigid timing precision, straight-line mouse coordinates, and minimal hesitations. We train a supervised **Random Forest Classifier** using real telemetry parameters to detect bots.\n",
            "\n",
            "## Pipeline Phases:\n",
            "1. **Data Ingestion**: Load the `click fraud dataset.csv` dataset.\n",
            "2. **Data Cleaning**: Remove identifiers, handle missing values, and map categorical values.\n",
            "3. **Feature Selection**: Select core behavioral telemetry features matching our frontend tracking capability.\n",
            "4. **Train/Test Split & Preprocessing**: Normalize the features via standard scaling.\n",
            "5. **Model Training**: Train a `RandomForestClassifier` on normal vs fraudulent interactions.\n",
            "6. **Evaluation**: Compute classification reports, Confusion Matrix, ROC-AUC, and plot feature importances.\n",
            "7. **Model Saving**: Serialize the trained model and scaler to the `ml_core/behavioral_biometrics/` directory."
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 1: Data Ingestion & Setup"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "import pandas as pd\n",
            "import numpy as np\n",
            "import matplotlib.pyplot as plt\n",
            "import seaborn as sns\n",
            "import joblib\n",
            "import os\n",
            "\n",
            "# Style configuration for premium aesthetics\n",
            "plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')\n",
            "plt.rcParams['figure.figsize'] = (10, 6)\n",
            "plt.rcParams['font.family'] = 'sans-serif'\n",
            "\n",
            "# Load the dataset\n",
            "data_path = '../datasets/click fraud dataset.csv'\n",
            "df = pd.read_csv(data_path)\n",
            "print(f\"Dataset successfully loaded. Shape: {df.shape}\")\n",
            "df.head()"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 2: Data Cleaning & Preprocessing"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Print class distribution\n",
            "print(\"Class distribution of targets (0 = Human, 1 = Bot/Fraud):\")\n",
            "print(df['is_fraudulent'].value_counts())\n",
            "print(\"Proportion:\")\n",
            "print(df['is_fraudulent'].value_counts(normalize=True))\n",
            "\n",
            "# Clean missing values if any\n",
            "df = df.dropna(subset=['is_fraudulent'])\n",
            "\n",
            "# Map device reputation to numerical values (-1, 0, 1)\n",
            "reputation_map = {'Good': 1, 'Neutral': 0, 'Suspicious': 0, 'Bad': -1}\n",
            "df['device_ip_reputation_score'] = df['device_ip_reputation'].map(reputation_map).fillna(0)\n",
            "\n",
            "print(\"\\nUnique values mapped for IP reputation:\")\n",
            "print(df[['device_ip_reputation', 'device_ip_reputation_score']].drop_duplicates())"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 3: Feature Selection\n",
            "We focus strictly on the interaction features that our custom React hook `useBehavioralTracker` will record in real-time:"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Define the features to train on\n",
            "behavioral_features = [\n",
            "    'click_duration',          # Time mouse held down (seconds)\n",
            "    'scroll_depth',            # Scroll depth (pixels or percentage)\n",
            "    'mouse_movement',          # Pixel movements recorded\n",
            "    'keystrokes_detected',     # Count of keystrokes\n",
            "    'click_frequency',         # Number of clicks in window\n",
            "    'time_since_last_click',   # Time delta since last click (seconds)\n",
            "    'VPN_usage',               # VPN indicator (0 or 1)\n",
            "    'proxy_usage',             # Proxy indicator (0 or 1)\n",
            "    'device_ip_reputation_score' # Numeric mapped IP quality\n",
            "]\n",
            "\n",
            "X = df[behavioral_features].copy()\n",
            "y = df['is_fraudulent'].copy()\n",
            "\n",
            "# Fill missing feature values with medians\n",
            "for col in X.columns:\n",
            "    X[col] = X[col].fillna(X[col].median())\n",
            "\n",
            "print(\"Dataset Features Statistics:\")\n",
            "X.describe()"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 4: Train/Test Split & Preprocessing"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "from sklearn.model_selection import train_test_split\n",
            "from sklearn.preprocessing import StandardScaler\n",
            "\n",
            "# Train/Test split\n",
            "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)\n",
            "\n",
            "# Scaling features\n",
            "scaler = StandardScaler()\n",
            "X_train_scaled = scaler.fit_transform(X_train)\n",
            "X_test_scaled = scaler.transform(X_test)\n",
            "\n",
            "print(f\"Training set shape: {X_train_scaled.shape}\")\n",
            "print(f\"Testing set shape: {X_test_scaled.shape}\")"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 5: Model Training (Random Forest Classifier)"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "from sklearn.ensemble import RandomForestClassifier\n",
            "from sklearn.metrics import classification_report, accuracy_score, roc_auc_score\n",
            "\n",
            "# Initialize and fit model\n",
            "model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)\n",
            "model.fit(X_train_scaled, y_train)\n",
            "\n",
            "# Predict on test data\n",
            "y_pred = model.predict(X_test_scaled)\n",
            "y_prob = model.predict_proba(X_test_scaled)[:, 1]\n",
            "\n",
            "print(f\"Accuracy Score: {accuracy_score(y_test, y_pred):.4f}\")\n",
            "print(f\"ROC-AUC Score: {roc_auc_score(y_test, y_prob):.4f}\")"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 6: Evaluation Metrics & Plotting"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "from sklearn.metrics import confusion_matrix, roc_curve, ConfusionMatrixDisplay\n",
            "\n",
            "print(\"Classification Report:\")\n",
            "print(classification_report(y_test, y_pred))\n",
            "\n",
            "# Plot Confusion Matrix\n",
            "cm = confusion_matrix(y_test, y_pred)\n",
            "plt.figure(figsize=(6, 5))\n",
            "disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=['Human', 'Bot/Fraud'])\n",
            "disp.plot(cmap='magma', ax=plt.gca())\n",
            "plt.title('Confusion Matrix', fontsize=14, fontweight='bold', pad=12)\n",
            "plt.grid(False)\n",
            "plt.tight_layout()\n",
            "plt.savefig('phase4_confusion_matrix.png', dpi=300)\n",
            "plt.show()\n",
            "\n",
            "# Plot ROC Curve\n",
            "fpr, tpr, thresholds = roc_curve(y_test, y_prob)\n",
            "plt.figure(figsize=(8, 6))\n",
            "plt.plot(fpr, tpr, color='indigo', lw=2, label=f'ROC Curve (AUC = {roc_auc_score(y_test, y_prob):.4f})')\n",
            "plt.plot([0, 1], [0, 1], color='crimson', lw=1.5, linestyle='--')\n",
            "plt.xlim([0.0, 1.0])\n",
            "plt.ylim([0.0, 1.05])\n",
            "plt.xlabel('False Positive Rate', fontsize=12)\n",
            "plt.ylabel('True Positive Rate', fontsize=12)\n",
            "plt.title('Receiver Operating Characteristic (ROC)', fontsize=14, fontweight='bold', pad=12)\n",
            "plt.legend(loc=\"lower right\", frameon=True)\n",
            "plt.tight_layout()\n",
            "plt.savefig('phase4_roc_curve.png', dpi=300)\n",
            "plt.show()"
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "# Feature Importances\n",
            "importances = model.feature_importances_\n",
            "indices = np.argsort(importances)[::-1]\n",
            "\n",
            "plt.figure(figsize=(10, 6))\n",
            "sns.barplot(x=importances[indices], y=[behavioral_features[i] for i in indices], palette='viridis')\n",
            "plt.title('Behavioral Telemetry Feature Importances', fontsize=14, fontweight='bold', pad=12)\n",
            "plt.xlabel('Relative Importance', fontsize=12)\n",
            "plt.ylabel('Feature', fontsize=12)\n",
            "plt.tight_layout()\n",
            "plt.savefig('phase4_feature_importances.png', dpi=300)\n",
            "plt.show()"
        ]
    },
    {
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "## Step 7: Model & Scaler Serialization\n",
            "Export the trained classifier and scaler artifacts to the `ml_core/behavioral_biometrics/` directory for live FastAPI inference."
        ]
    },
    {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [
            "os.makedirs('../ml_core/behavioral_biometrics', exist_ok=True)\n",
            "\n",
            "joblib.dump(model, '../ml_core/behavioral_biometrics/behavioral_classifier.pkl')\n",
            "joblib.dump(scaler, '../ml_core/behavioral_biometrics/scaler_p4.pkl')\n",
            "\n",
            "print(\"Model serialized to: ml_core/behavioral_biometrics/behavioral_classifier.pkl\")\n",
            "print(\"Scaler serialized to: ml_core/behavioral_biometrics/scaler_p4.pkl\")"
        ]
    }
]

# Generate notebooks
create_notebook('notebooks/Phase_3_Hardware_Temporal_Anomaly.ipynb', cells_p3)
create_notebook('notebooks/Phase_4_Behavioral_Telemetry.ipynb', cells_p4)
print("Notebook generation complete!")
