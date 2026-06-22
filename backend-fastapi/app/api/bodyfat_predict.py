import os
import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

# Get model and scaler paths dynamically
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "model", "best_model_RandomForest.joblib")
SCALER_PATH = os.path.join(BASE_DIR, "model", "scaler.joblib")

class BodyFatPredictRequest(BaseModel):
    density: float = Field(1.05, description="Body density (default: 1.05)")
    age: int = Field(..., description="Age in years")
    weight: float = Field(..., description="Weight in kg or lbs")
    height: float = Field(..., description="Height in cm or inches")
    neck: float = Field(..., description="Neck circumference in cm")
    chest: float = Field(..., description="Chest circumference in cm")
    abdomen: float = Field(..., description="Abdomen circumference in cm")
    hip: float = Field(..., description="Hip circumference in cm")
    thigh: float = Field(..., description="Thigh circumference in cm")
    knee: float = Field(..., description="Knee circumference in cm")
    ankle: float = Field(..., description="Ankle circumference in cm")
    biceps: float = Field(..., description="Biceps circumference in cm")
    forearm: float = Field(..., description="Forearm circumference in cm")
    wrist: float = Field(..., description="Wrist circumference in cm")
    gender: str = Field("male", description="Gender: male or female")
    unit_system: str = Field("metric", description="Unit system: metric or imperial")

class BodyFatPredictResponse(BaseModel):
    predicted_bodyfat: float
    category: str
    description: str

def get_bodyfat_category(bf: float, gender: str) -> tuple[str, str]:
    gender = gender.lower()
    if gender == "female":
        if bf < 10.0:
            return "Dangerously Low", "Your body fat percentage is critically low. This can negatively impact hormonal health, bone density, and general physiological function. Please consult a healthcare professional."
        elif bf < 14.0:
            return "Essential Fat", "You are at the essential body fat level required for physiological functioning. This is typical for highly competitive female endurance athletes."
        elif bf < 21.0:
            return "Athletes", "You have an athletic body fat range. This is excellent for physical performance, endurance, and general high-intensity activities."
        elif bf < 25.0:
            return "Fitness", "You are in the fitness range. This is a very healthy body composition that supports standard daily physical activity and lower metabolic risk."
        elif bf < 32.0:
            return "Acceptable / Average", "You have an average, healthy body fat level. While acceptable, you can aim for the fitness range by incorporating regular strength and cardiovascular exercises."
        else:
            return "Obese", "Your body fat level indicates excess fat storage, which is associated with increased risks of diabetes, cardiovascular diseases, and metabolic syndrome. We recommend consulting a nutritionist or trainer."
    else: # male
        if bf < 2.0:
            return "Dangerously Low", "Your body fat percentage is critically low. This can lead to low energy levels, impaired recovery, and endocrine dysfunction. Please consult a healthcare professional."
        elif bf < 6.0:
            return "Essential Fat", "You are at the essential body fat level. This is standard for bodybuilders peak-cut or elite male athletes but hard to maintain long-term."
        elif bf < 14.0:
            return "Athletes", "You have an athletic body fat range. This is an optimal composition for agility, stamina, cardiovascular efficiency, and low joint stress."
        elif bf < 18.0:
            return "Fitness", "You are in the fitness range. This is highly recommended for standard muscle tone, high metabolic health, and general fitness goals."
        elif bf < 25.0:
            return "Acceptable / Average", "You have an average, acceptable body fat level. Consider adding regular physical workouts and balancing calorie intake to move towards the fitness category."
        else:
            return "Obese", "Your body fat level is in the obese range, representing higher health risks for heart issues, high blood pressure, and type 2 diabetes. Consistent training and nutritional adjustments are highly recommended."

@router.post("/predict-bodyfat", response_model=BodyFatPredictResponse)
async def predict_bodyfat(request: BodyFatPredictRequest):
    # Ensure model and scaler files exist
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        raise HTTPException(
            status_code=500,
            detail="Prediction model or scaler is missing. Please ensure the model is trained."
        )

    try:
        # Load the model and scaler
        model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load model or scaler: {str(e)}"
        )

    # Perform conversions for Weight and Height if in metric
    weight_in_lbs = request.weight
    height_in_inches = request.height

    if request.unit_system.lower() == "metric":
        # kg to lbs
        weight_in_lbs = request.weight * 2.20462
        # cm to inches
        height_in_inches = request.height / 2.54

    # Build the input DataFrame matching the exact features expected by the model
    # Note: circumferences (neck, chest, abdomen, hip, thigh, knee, ankle, biceps, forearm, wrist) are all in cm in dataset
    input_data = pd.DataFrame({
        'Density': [request.density],
        'Age': [request.age],
        'Weight': [weight_in_lbs],
        'Height': [height_in_inches],
        'Neck': [request.neck],
        'Chest': [request.chest],
        'Abdomen': [request.abdomen],
        'Hip': [request.hip],
        'Thigh': [request.thigh],
        'Knee': [request.knee],
        'Ankle': [request.ankle],
        'Biceps': [request.biceps],
        'Forearm': [request.forearm],
        'Wrist': [request.wrist]
    })

    try:
        # Scale the inputs
        scaled_data = scaler.transform(input_data)
        
        # Predict bodyfat percentage
        prediction = model.predict(scaled_data)
        predicted_bf = float(prediction[0])
        
        # Ensure predicted value doesn't go below 0%
        predicted_bf = max(0.0, predicted_bf)

        category, description = get_bodyfat_category(predicted_bf, request.gender)

        return BodyFatPredictResponse(
            predicted_bodyfat=round(predicted_bf, 2),
            category=category,
            description=description
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error running prediction model: {str(e)}"
        )
