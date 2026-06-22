import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

csv_path = r"c:\Users\Vivek\Desktop\Health_Tracking_app\backend-fastapi\app\dataset\bodyfat.csv"
model_dir = r"c:\Users\Vivek\Desktop\Health_Tracking_app\backend-fastapi\app\model"

# Load dataset
df = pd.read_csv(csv_path)

# Features and target
X = df.drop(columns=['BodyFat'])
y = df['BodyFat']

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Split data to evaluate
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

# Grid Search to find a really good RandomForestRegressor
param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [None, 10, 20, 30],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4],
    'max_features': [1.0, 'sqrt', 'log2']
}

rf = RandomForestRegressor(random_state=42)
grid_search = GridSearchCV(estimator=rf, param_grid=param_grid, cv=5, scoring='neg_mean_squared_error', n_jobs=-1)
grid_search.fit(X_train, y_train)

best_rf = grid_search.best_estimator_

# Evaluate on test set
y_pred = best_rf.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)

print("Best Parameters:", grid_search.best_params_)
print(f"Test RMSE: {rmse:.4f}")
print(f"Test R2 Score: {r2:.4f}")

# Fit on ALL data using the best parameters
final_scaler = StandardScaler()
X_all_scaled = final_scaler.fit_transform(X)

final_rf = RandomForestRegressor(**grid_search.best_params_, random_state=42)
final_rf.fit(X_all_scaled, y)

# Save the final model and scaler
os.makedirs(model_dir, exist_ok=True)
model_path = os.path.join(model_dir, "best_model_RandomForest.joblib")
scaler_path = os.path.join(model_dir, "scaler.joblib")

joblib.dump(final_rf, model_path)
joblib.dump(final_scaler, scaler_path)

print(f"Model saved to: {model_path}")
print(f"Scaler saved to: {scaler_path}")
