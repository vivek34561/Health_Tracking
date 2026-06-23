# Health Tracking Application - API Documentation

Base URL:

http://localhost:5000/api

Authentication:

Authorization: Bearer <JWT_TOKEN>

---

# Authentication APIs

## Register User

POST /auth/register

Request

{
"name": "Vivek Gupta",
"email": "[vivek@example.com](mailto:vivek@example.com)",
"password": "password123"
}

Response

{
"success": true,
"message": "User registered successfully"
}

---

## Login User

POST /auth/login

Request

{
"email": "[vivek@example.com](mailto:vivek@example.com)",
"password": "password123"
}

Response

{
"token": "jwt_token_here",
"user": {
"id": 1,
"name": "Vivek Gupta",
"email": "[vivek@example.com](mailto:vivek@example.com)"
}
}

---

## Get Profile

GET /auth/profile

Response

{
"id": 1,
"name": "Vivek Gupta",
"email": "[vivek@example.com](mailto:vivek@example.com)",
"age": 25,
"height": 175,
"weight": 75
}

---

## Update Profile

PUT /auth/profile

Request

{
"age": 25,
"height": 175,
"weight": 75,
"gender": "Male"
}

Response

{
"message": "Profile updated successfully"
}








# Health Tracking APIs

## Add Weight Record

POST /weights

Request

{
"weight": 75.5
}

Response

{
"message": "Weight recorded successfully"
}

---

## Get Weight History

GET /weights

Response

[
{
"id": 1,
"weight": 75.5,
"recorded_at": "2026-06-19"
}
]

---

## Add Water Intake

POST /water

Request

{
"amount_ml": 500
}

Response

{
"message": "Water intake added"
}

---

## Get Water Logs

GET /water

Response

[
{
"id": 1,
"amount_ml": 500,
"recorded_at": "2026-06-19T10:00:00"
}
]

---

## Add Sleep Record

POST /sleep

Request

{
"sleep_start": "2026-06-18T22:30:00",
"sleep_end": "2026-06-19T06:30:00"
}

Response

{
"message": "Sleep record added"
}

---

## Get Sleep History

GET /sleep

Response

[
{
"id": 1,
"total_hours": 8
}
]

---

## Add Activity

POST /activities

Request

{
"activity_type": "Running",
"duration": 30,
"calories_burned": 250
}

Response

{
"message": "Activity recorded successfully"
}

---

## Get Activities

GET /activities

Response

[
{
"id": 1,
"activity_type": "Running",
"duration": 30,
"calories_burned": 250
}
]







# Goals, Dashboard, Reports & AI APIs

## Create Goal

POST /goals

Request

{
"goal_type": "Water",
"target_value": 3000
}

Response

{
"message": "Goal created successfully"
}

---

## Get Goals

GET /goals

Response

[
{
"id": 1,
"goal_type": "Water",
"target_value": 3000,
"current_value": 2200
}
]

---

## Dashboard Summary

GET /dashboard

Response

{
"current_weight": 75,
"water_consumed": 2200,
"sleep_hours": 8,
"activities_today": 2,
"goal_completion": 75
}

---

## Weekly Report

GET /reports/weekly

Response

{
"avg_sleep": 7.2,
"avg_water": 2500,
"total_workouts": 5,
"weight_change": -0.5
}

---

# Food Log, Diet, & Nutrition APIs

## Add Food Log
POST /foods

Request
```json
{
  "food_name": "Paneer Tikka",
  "quantity": 150,
  "unit": "grams",
  "meal_type": "LUNCH",
  "calories": 320.0,
  "protein": 18.0,
  "carbs": 8.0,
  "fat": 22.0,
  "fiber": 2.0,
  "created_at": "2026-06-23T12:00:00"
}
```

Response
```json
{
  "success": true,
  "message": "Food item logged successfully",
  "id": 15
}
```

---

## Get Food Logs
GET /foods?date=2026-06-23

Response
```json
[
  {
    "id": 15,
    "user_id": 1,
    "food_name": "Paneer Tikka",
    "quantity": 150.00,
    "unit": "grams",
    "calories": 320.00,
    "protein": 18.00,
    "carbs": 8.00,
    "fat": 22.00,
    "fiber": 2.00,
    "meal_type": "LUNCH",
    "created_at": "2026-06-23T12:00:00.000Z"
  }
]
```

---

## Search Food Dictionary
GET /foods/search?query=roti

Response
```json
[
  {
    "name": "Roti",
    "calories": 120,
    "protein": 3.5,
    "carbs": 25,
    "fat": 0.5,
    "fiber": 3.0,
    "unit": "pieces"
  }
]
```

---

## Update Food Log
PUT /foods/:id

Request
```json
{
  "quantity": 200,
  "calories": 426
}
```

Response
```json
{
  "success": true,
  "message": "Food log updated successfully"
}
```

---

## Delete Food Log
DELETE /foods/:id

Response
```json
{
  "success": true,
  "message": "Food log deleted successfully"
}
```

---

## Get Diet Goals
GET /diet/goals

Response
```json
{
  "id": 1,
  "user_id": 1,
  "goal_type": "MUSCLE_GAIN",
  "target_calories": 2500,
  "target_protein": 150,
  "target_carbs": 300,
  "target_fat": 75
}
```

---

## Update Diet Goals
PUT /diet/goals

Request
```json
{
  "goal_type": "MUSCLE_GAIN",
  "target_calories": 2500,
  "target_protein": 150,
  "target_carbs": 300,
  "target_fat": 75
}
```

Response
```json
{
  "success": true,
  "message": "Diet goals updated successfully"
}
```

---

## Get Today's Nutrition Summary
GET /nutrition/today?date=2026-06-23

Response
```json
{
  "date": "2026-06-23",
  "goal_type": "MUSCLE_GAIN",
  "consumed": {
    "calories": 320.00,
    "protein": 18.00,
    "carbs": 8.00,
    "fat": 22.00,
    "fiber": 2.00
  },
  "targets": {
    "calories": 2500,
    "protein": 150,
    "carbs": 300,
    "fat": 75,
    "fiber": 25
  },
  "remaining": {
    "calories": 2180,
    "protein": 132,
    "carbs": 292,
    "fat": 53,
    "fiber": 23
  }
}
```

---

## Get Diet Recommendations
GET /nutrition/recommendations

Response
```json
{
  "goal_type": "MUSCLE_GAIN",
  "macro_status": {
    "remaining_calories": 2180,
    "remaining_protein": 132,
    "remaining_carbs": 292,
    "remaining_fat": 53
  },
  "recommendations": [
    {
      "category": "High Protein Foods",
      "reason": "You are currently 132g short of your daily protein target.",
      "foods": [
        { "name": "Chicken Breast", "description": "Lean protein source, 31g protein per 100g serving." }
      ]
    }
  ]
}
```

---

# AI & MACHINE LEARNING SERVICES

## AI Health Coach (Chatbot API Gateway)
POST /api/ai/chat

*Exposes unified interface to LangGraph AI health coach workflow. Proxies request to FastAPI.*

Request
```json
{
  "message": "Log 300ml of water",
  "conversation_history": [
    { "role": "user", "content": "Hi HealthAI" },
    { "role": "assistant", "content": "Hi! I am HealthAI, how can I help you today?" }
  ],
  "confirmed_action": null
}
```

Response (Action Execution)
```json
{
  "reply": "Successfully logged 300ml of water intake (Log ID: 41).",
  "intent": "CREATE",
  "sources_used": [],
  "confirmation_required": false,
  "confirm_action": null,
  "structured_data": {
    "intent": "CREATE",
    "entity": "water"
  }
}
```

Response (Delete Interception/Confirmation Prompt)
```json
{
  "reply": "I found the target water entry (ID: 41). Are you sure you want to delete it?",
  "intent": "DELETE",
  "sources_used": [],
  "confirmation_required": true,
  "confirm_action": {
    "tool": "delete_water_log",
    "id": 41
  },
  "structured_data": {
    "intent": "DELETE",
    "entity": "water",
    "id": 41
  }
}
```

---

## Predict Body Fat (ML Gateway)
POST /api/ai/predict-bodyfat

*Uses Random Forest machine learning model to estimate user body fat percentage. Proxies request to FastAPI.*

Request
```json
{
  "density": 1.06,
  "age": 25,
  "weight": 78,
  "height": 178,
  "neck": 37.5,
  "chest": 100.0,
  "abdomen": 85.0,
  "hip": 98.0,
  "thigh": 58.0,
  "knee": 38.0,
  "ankle": 22.0,
  "biceps": 34.0,
  "forearm": 28.0,
  "wrist": 17.5,
  "gender": "male",
  "unit_system": "metric"
}
```

Response
```json
{
  "predicted_bodyfat": 14.85,
  "category": "Fitness",
  "description": "You are in the fitness range. This is highly recommended for standard muscle tone..."
}
```

---

# STANDALONE FASTAPI SERVICE (Port 8000)

## Upload Medical PDF Report
POST /api/upload-report

*Accepts file via multipart/form-data. Computes sentence embeddings and saves to Chroma Vector DB.*

Request
`multipart/form-data`
* `file`: (binary pdf data)
* `user_id`: 1

Response
```json
{
  "success": true,
  "message": "Report 'blood_test.pdf' processed and stored successfully.",
  "filename": "blood_test.pdf",
  "chunks_stored": 24
}
```

---

## Get Health Context Summary
GET /api/health-summary

*Internal endpoint used by the AI Agent node to fetch the formatted health metrics dashboard summary.*

Response
```json
{
  "success": true,
  "data": {
    "weight": { "latest_kg": 75.5, "trend": "stable", "total_records": 10 },
    "sleep": { "avg_hours_last_7_days": 7.2, "quality": "good" }
  }
}
```

---

## Backend Route Map

### Express.js Core API (Port 5000)
* `/api/auth`
* `/api/weights`
* `/api/water`
* `/api/sleep`
* `/api/activities`
* `/api/goals`
* `/api/foods`
* `/api/nutrition`
* `/api/diet`
* `/api/dashboard`
* `/api/reports`
* `/api/ai/chat` (ML gateway proxy)
* `/api/ai/predict-bodyfat` (ML gateway proxy)

### FastAPI AI Service (Port 8000)
* `/api/chat` (LangGraph workflow & tools)
* `/api/upload-report` (RAG vectorizer)
* `/api/health-summary` (Context collector)
* `/api/predict-bodyfat` (ML inference engine)