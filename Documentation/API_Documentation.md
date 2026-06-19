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

# AI SERVICE (FastAPI)

Base URL

http://localhost:8000

---

## AI Health Coach

POST /ai/chat

Request

{
"user_id": 1,
"question": "How can I improve my sleep?"
}

Response

{
"answer": "Your average sleep is 6.5 hours. Try sleeping 30 minutes earlier."
}

---

## Personalized Suggestions

GET /ai/recommendations/{user_id}

Response

{
"recommendations": [
"Increase daily water intake by 500ml",
"Aim for 8000 steps daily",
"Sleep before 11 PM"
]
}

---

## Generate Weekly Summary

POST /ai/weekly-summary

Request

{
"user_id": 1
}

Response

{
"summary": "You completed 85% of your health goals this week. Your sleep improved by 12%."
}

---

## Upload Medical Report

POST /ai/upload-report

multipart/form-data

file: blood_report.pdf

Response

{
"document_id": "abc123"
}

---

## Ask Questions About Uploaded Report

POST /ai/report-chat

Request

{
"document_id": "abc123",
"question": "What does my cholesterol level mean?"
}

Response

{
"answer": "Your cholesterol is within the normal range..."
}







## Backend Split

### Express.js

/auth
/weights
/water
/sleep
/activities
/goals
/dashboard
/reports

### FastAPI

/ai/chat
/ai/recommendations
/ai/weekly-summary
/ai/upload-report
/ai/report-chat