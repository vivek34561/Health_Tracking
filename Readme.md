# AI Health Tracking Application 🩺📊

Welcome to the **AI Health Tracking Application** repository! This is a state-of-the-art health monitoring platform that combines daily tracking of vital health metrics with advanced, personalized AI features.

---

## 🚀 Project Overview

The application empowers users to monitor their metrics (weight, water intake, sleep, activity), track daily progress, set goals, view trends/reports, and receive personalized recommendations or chat with an **AI Health Coach** powered by LLMs.

### Tech Stack
- **Frontend:** Angular, Angular Material, Chart.js
- **Express Backend:** Express.js, MySQL (Core business logic & user records)
- **AI Backend:** FastAPI, LangChain, Chroma DB, OpenAI/Claude (AI coaching, recommendations, and PDF medical reports RAG)

---

## 📁 Repository Structure & Documentation

Detailed blueprints, endpoints, and table schemas can be found in the [Documentation](file:///c:/Users/Vivek/Desktop/Health_Tracking_app/Documentation/) directory:

1. 📂 **[Folder Structure & Layout](file:///c:/Users/Vivek/Desktop/Health_Tracking_app/Documentation/Folder_Structure.md)** - Details the directory layout and files across frontend, Express.js backend, and FastAPI AI service.
2. 🔌 **[API Documentation](file:///c:/Users/Vivek/Desktop/Health_Tracking_app/Documentation/API_Documentation.md)** - Detailed REST endpoints, payloads, response structures, and backend routing maps.
3. 💾 **[Database Design](file:///c:/Users/Vivek/Desktop/Health_Tracking_app/Documentation/database%20_design.md)** - Entity-Relationship diagram, MySQL schema definitions, constraints, and index details.
4. 📄 **[Product Specifications](file:///c:/Users/Vivek/Desktop/Health_Tracking_app/Documentation/documentation.md)** - Feature breakdowns, user stories, and execution phases.

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (3.9+)
- [MySQL](https://www.mysql.com/) (8.x)

### Setup Instructions

#### 1. Database Setup
Ensure MySQL is running and import the database schema:
```bash
mysql -u root -p < db/schema.sql
```

#### 2. Express Backend Setup
```bash
cd backend-express
npm install
npm run dev
```

#### 3. FastAPI AI Backend Setup
```bash
cd backend-fastapi
python -m venv venv
# Activate virtual environment:
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 4. Angular Frontend Setup
```bash
cd frontend
npm install
npm start
```
