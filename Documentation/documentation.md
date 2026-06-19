# AI Health Tracking Application - Project Documentation

## 1. Project Overview

AI Health Tracking Application is a web-based platform that enables users to monitor their health metrics, track daily activities, analyze progress, and receive AI-powered health recommendations.

The system combines traditional health tracking features with Generative AI capabilities such as personalized health coaching, weekly health summaries, and recommendation generation.

---

## 2. Technology Stack

### Frontend

* Angular
* Angular Material
* Chart.js / ngx-charts

### Backend

* Express.js (Core Business APIs)
* FastAPI (AI Services)

### Database

* MySQL

### Authentication

* JWT Authentication

### AI Components

* LangChain
* LangGraph
* OpenAI / Claude API
* Vector Database (Chroma)

### Deployment

* Docker
* Nginx
* Railway / Render / AWS

---

# Phase 1: Core Health Tracking

## 3. Authentication Module

### Features

* User Registration
* User Login
* JWT Authentication
* Password Hashing
* Profile Management

### APIs

POST /api/auth/register

POST /api/auth/login

GET /api/auth/profile

PUT /api/auth/profile

---

## 4. Health Metrics Module

### Description

Users can maintain historical health measurements.

### Data Captured

Weight

* Value
* Unit (kg)

Blood Pressure (Optional)

* Systolic
* Diastolic

Heart Rate (Optional)

Blood Sugar (Optional)

### APIs

POST /api/health-metrics

GET /api/health-metrics

PUT /api/health-metrics/:id

DELETE /api/health-metrics/:id

---

## 5. Activity Tracking Module

### Activity Types

* Walking
* Running
* Cycling
* Gym Workout

### Data Captured

* Activity Type
* Duration
* Calories Burned
* Activity Date

### APIs

POST /api/activities

GET /api/activities

PUT /api/activities/:id

DELETE /api/activities/:id

---

## 6. Water Tracking Module

### Features

Users can record water intake throughout the day.

### Data Captured

* Quantity (ml)
* Time
* Date

### APIs

POST /api/water

GET /api/water

DELETE /api/water/:id

---

## 7. Sleep Tracking Module

### Features

Track sleeping patterns and duration.

### Data Captured

* Sleep Start Time
* Wake Time
* Total Hours

### APIs

POST /api/sleep

GET /api/sleep

PUT /api/sleep/:id

DELETE /api/sleep/:id

---

## 8. Goal Management Module

### Supported Goals

* Daily Water Goal
* Weight Goal
* Sleep Goal
* Activity Goal

### APIs

POST /api/goals

GET /api/goals

PUT /api/goals/:id

DELETE /api/goals/:id

---

## 9. Dashboard Module

### Dashboard Widgets

* Today's Water Intake
* Today's Sleep Hours
* Current Weight
* Activity Summary
* Goal Progress

Dashboard provides a single health overview screen.





# Phase 2: Analytics & Reporting

## 10. Charts Module

### Supported Charts

* Weight Trend Chart
* Water Intake Trend Chart
* Sleep Trend Chart
* Activity Trend Chart

### Time Filters

* Daily
* Weekly
* Monthly

---

## 11. Reports Module

### Weekly Report

Contains:

* Average Sleep
* Total Activities
* Water Goal Completion
* Weight Change

### Monthly Report

Contains:

* Health Trend Analysis
* Goal Achievement Summary
* Performance Insights

---

## 12. Notification Module

### Notification Types

* Water Reminder
* Workout Reminder
* Sleep Reminder
* Goal Achievement Alert

### Delivery Channels

* In-App Notifications
* Email Notifications (Optional)




# Phase 3: AI Features

## 13. AI Health Coach

### Description

An AI chatbot that answers health-related questions based on user history.

### Example Questions

* How am I progressing this month?
* How can I improve my sleep?
* Am I meeting my fitness goals?

### Flow

User → Angular → Express → FastAPI → LLM

---

## 14. Personalized Suggestions

### Inputs

* Weight History
* Sleep Data
* Activity Logs
* Water Intake
* Goals

### Outputs

* Personalized Recommendations
* Goal Adjustments
* Lifestyle Improvements

Example:

"Your average sleep is 6 hours. Consider sleeping 30 minutes earlier."

---

## 15. Weekly AI Health Summary

### Generated Automatically

Every week the AI generates:

* Health Overview
* Goal Progress
* Sleep Analysis
* Activity Analysis
* Improvement Suggestions

Example:

Average Sleep: 7.2 Hours

Workout Days: 5

Water Goal Completion: 82%

Recommendation:
Increase water intake by 500 ml/day.

---

## 16. Future RAG Module

### Knowledge Sources

* Nutrition Articles
* Exercise Guides
* User Historical Data
* Uploaded Medical Reports

### Features

* Report Analysis
* Health Q&A
* Personalized Health Education

### Example Questions

"What does my cholesterol level indicate?"

"Suggest foods to improve protein intake."

"Analyze my blood report."
