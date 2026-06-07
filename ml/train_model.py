import pandas as pd
import numpy as np
import joblib
import warnings
warnings.filterwarnings('ignore')

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.model_selection import train_test_split
import xgboost as xgb
import lightgbm as lgb
from sklearn.metrics import accuracy_score, classification_report

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from data_generator import SyntheticAccidentDataGenerator

def extract_features(df):
    """Extract derived features before pipeline."""
    df = df.copy()
    
    if 'timestamp' in df.columns:
        if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        df['hour_of_day'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.weekday
        df['month'] = df['timestamp'].dt.month
        df['is_weekend'] = (df['timestamp'].dt.weekday >= 5).astype(int)
        
        df['lighting'] = df['timestamp'].dt.hour.apply(
            lambda h: 'daylight' if 6 <= h < 18 else 'dusk' if 18 <= h < 20 else 'dark'
        )
    
    if 'weather' in df.columns and 'road_surface' not in df.columns:
        road_surface_map = {'clear': 'dry', 'rain': 'wet', 'snow': 'snowy', 'fog': 'wet', 'wind': 'dry'}
        df['road_surface'] = df['weather'].map(lambda x: road_surface_map.get(str(x), 'dry'))
        
    return df

def train_and_save_model():
    print("Generating synthetic data...")
    generator = SyntheticAccidentDataGenerator(seed=42)
    df = generator.generate_dataset(n_samples=5000)
    
    print("Extracting features...")
    df = extract_features(df)
    
    # Define features
    numerical_cols = [
        'latitude', 'longitude', 'road_curvature', 'road_gradient', 
        'traffic_volume', 'congestion_level', 'visibility', 'vehicle_count', 
        'intersection_nearby', 'hour_of_day', 'day_of_week', 'month', 'is_weekend'
    ]
    
    categorical_cols = [
        'road_type', 'weather', 'time_period', 'road_surface', 'lighting'
    ]
    
    df = df.dropna(subset=['accident_occurred'])
    
    X = df[numerical_cols + categorical_cols]
    y = df['accident_occurred']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Building pipeline...")
    numeric_transformer = StandardScaler()
    categorical_transformer = OneHotEncoder(handle_unknown='ignore')
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numerical_cols),
            ('cat', categorical_transformer, categorical_cols)
        ])
        
    clf1 = RandomForestClassifier(n_estimators=100, random_state=42)
    clf2 = xgb.XGBClassifier(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42, eval_metric='logloss')
    clf3 = lgb.LGBMClassifier(n_estimators=100, max_depth=4, learning_rate=0.05, random_state=42, verbose=-1)
    
    hybrid_model = VotingClassifier(
        estimators=[('rf', clf1), ('xgb', clf2), ('lgb', clf3)],
        voting='soft'
    )
    
    clf = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', hybrid_model)
    ])
    
    print("Training model...")
    clf.fit(X_train, y_train)
    
    print("Evaluating model...")
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save model
    model_path = Path(__file__).parent / 'accident_model.pkl'
    joblib.dump(clf, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_and_save_model()