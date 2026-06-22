import joblib
import pandas as pd
import numpy as np

model_path = r"c:\Users\Vivek\Desktop\Health_Tracking_app\backend-fastapi\app\model\best_model_RandomForest.joblib"
csv_path = r"c:\Users\Vivek\Desktop\Health_Tracking_app\backend-fastapi\app\dataset\bodyfat.csv"

try:
    model = joblib.load(model_path)
    print("Model type:", type(model))
    
    # Try to see if it is a pipeline
    if hasattr(model, "steps"):
        print("Model is a pipeline with steps:", model.steps)
    else:
        print("Model has no steps (not a pipeline)")
        
    if hasattr(model, "feature_names_in_"):
        print("Feature names in model:", model.feature_names_in_)
    else:
        print("Model does not have feature_names_in_")
        
    # Check number of features expected
    if hasattr(model, "n_features_in_"):
        print("Number of features in:", model.n_features_in_)
        
    # Let's inspect the CSV
    df = pd.read_csv(csv_path)
    print("CSV columns:", df.columns.tolist())
    print("CSV shape:", df.shape)
    
except Exception as e:
    import traceback
    print("Error:", str(e))
    traceback.print_exc()
