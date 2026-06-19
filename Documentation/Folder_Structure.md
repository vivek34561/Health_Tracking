# Health Tracking Application - Project Folder Structure

This document outlines the directory structure and organization for the **AI Health Tracking Application**. The project is split into a frontend web application, an Express.js business logic backend, a FastAPI AI services backend, and database schema definitions.

---

## 1. Directory Tree Overview

```text
Health_Tracking_app/
├── .gitignore
├── Readme.md
├── db/                                # Database Scripts & Migrations
│   └── schema.sql                     # Production MySQL Database Schema
├── Documentation/                     # Project Specifications & Documentation
│   ├── API_Documentation.md           # API Endpoints & Request/Response Contracts
│   ├── database _design.md            # ERD & Table Specifications
│   ├── documentation.md               # Product Requirement & Feature Phase Map
│   └── Folder_Structure.md            # [This File] Directory Layout & Architecture
├── frontend/                          # Angular Frontend Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                  # Singleton Services, Guards, Interceptors
│   │   │   ├── shared/                # Reusable UI Components, Directives, Pipes
│   │   │   ├── features/              # Feature Modules (Lazy Loaded)
│   │   │   └── app.component.ts
│   │   ├── assets/                    # Static Assets (Images, Icons, Fonts)
│   │   └── environments/              # Environment Config (Dev, Prod)
│   ├── angular.json
│   └── package.json
├── backend-express/                   # Express.js Core Backend
│   ├── src/
│   │   ├── config/                    # Database, JWT, & App Configuration
│   │   ├── controllers/               # Route Controllers (Request Handlers)
│   │   ├── middlewares/               # Authentication, Validation, Error Handling
│   │   ├── models/                    # SQL Data Access / Repository Layer
│   │   ├── routes/                    # API Route Mapping definitions
│   │   ├── utils/                     # Helper functions, Logger, Constants
│   │   └── app.js                     # Express Application Bootstrap
│   ├── package.json
│   └── server.js                      # Server Entry point
└── backend-fastapi/                   # FastAPI AI & RAG Services
    ├── app/
    │   ├── api/                       # API Endpoints (V1 Routes)
    │   ├── core/                      # Config (Settings, Environment, Security)
    │   ├── services/                  # LLM integration, Vector DB, RAG pipeline
    │   ├── utils/                     # PDF/Document parsers, Text splitters
    │   └── main.py                    # FastAPI Entry point
    ├── requirements.txt
    └── Dockerfile
```

---

## 2. Module Breakdown

### A. Core / Root
- **`db/`**: Contains raw SQL schemas, indexes, triggers, and migration scripts.
- **`Documentation/`**: Houses all architectural blueprints, API contracts, database designs, and layout specifications. Keep this updated as the project evolves.

---

### B. Frontend (`/frontend`) — Angular
Following Angular's best practice folder structure for scalability and maintainability:

- **`core/`**: Services, interceptors, and guards that are instantiated *once* in the application lifetime.
  - `guards/`: Route protection (e.g., `auth.guard.ts`).
  - `interceptors/`: Request modifications (e.g., `jwt.interceptor.ts`, `error.interceptor.ts`).
  - `services/`: Global services (e.g., `auth.service.ts`, `api.service.ts`).
- **`shared/`**: Reusable modules, components, directives, and pipes that are imported across multiple feature modules.
  - `components/`: UI components like tables, buttons, modals, input elements.
  - `pipes/`: Formats (e.g., weight unit converter, duration formatter).
- **`features/`**: Independent, lazy-loaded feature modules.
  - `auth/`: Login, Register, Profile components.
  - `dashboard/`: Overview widget cards, progress bars.
  - `health-metrics/`: Weight logging and history.
  - `activity-logs/`: Activity entry forms and activity list.
  - `water-logs/`: Daily water tracker controls.
  - `sleep-logs/`: Sleep log entry and hours analysis.
  - `goals/`: Target settings and progress check.
  - `reports/`: Analytics charts, history trends, and summaries.
  - `ai-coach/`: Chat interface to interact with the FastAPI AI health coach.

---

### C. Backend Express (`/backend-express`) — Express.js
Handles client authentication, business logic, MySQL database operations, and proxying requests to the AI services.

- **`config/`**: Manages environment variables, MySQL pool connections, and JWT validation settings.
- **`controllers/`**: Executes business rules, calls the model layer, and returns response objects.
- **`middlewares/`**: Filters incoming requests (e.g., `authMiddleware.js` for JWT checks, `validationMiddleware.js` for payload sanitation, `errorHandler.js` for standard error envelopes).
- **`models/`**: Executes SQL queries directly against MySQL. Standardized CRUD helpers to keep queries separate from controllers.
- **`routes/`**: Connects HTTP routes (e.g., `POST /auth/register`) with their corresponding controller handlers.

---

### D. Backend FastAPI (`/backend-fastapi`) — FastAPI
Dedicated microservice for heavy AI workflows, LLM prompt engineering, Retrieval-Augmented Generation (RAG), and PDF extraction.

- **`api/`**: Endpoints map to AI functionalities (`/ai/chat`, `/ai/recommendations`, `/ai/weekly-summary`, `/ai/upload-report`, `/ai/report-chat`).
- **`core/`**: Central configuration using `pydantic-settings` to handle OpenAI/Claude keys, Vector DB hosts, and environment checks.
- **`services/`**:
  - `llm_service.py`: Generative prompts and chatbot state management.
  - `vector_service.py`: Integrates Chroma DB, saves and queries medical document chunks.
  - `rag_service.py`: Integrates historical user data with LLM memory context.
- **`utils/`**: Functions for parsing medical PDF uploads and chunking text.

---

## 3. Initialization Plan

To build this structure without conflicts, follow these commands:

1. **Angular Frontend**:
   ```bash
   # Under root folder:
   npx -y @angular/cli@latest new frontend --routing --style=css --skip-git
   ```

2. **Express Backend**:
   ```bash
   mkdir backend-express
   cd backend-express
   npm init -y
   npm install express mysql2 jsonwebtoken bcryptjs cors dotenv
   ```

3. **FastAPI Backend**:
   ```bash
   mkdir backend-fastapi
   cd backend-fastapi
   python -m venv venv
   # Activate virtualenv and install packages:
   # pip install fastapi uvicorn langchain chromadb openai pydantic-settings python-multipart
   ```
