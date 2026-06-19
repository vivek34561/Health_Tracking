# Health Tracking Application

# Production Database Design Document

## 1. Database Information

Database Engine: MySQL 8.x

Purpose:
Store user health information, activity records, goals, reports, notifications, AI interactions, and RAG-related documents.


---

# 2. Entity Relationship Summary

Users (1) ------ (1) Profiles

Users (1) ------ (N) WeightLogs

Users (1) ------ (N) WaterLogs

Users (1) ------ (N) SleepLogs

Users (1) ------ (N) ActivityLogs

Users (1) ------ (N) Goals

Users (1) ------ (N) Notifications

Users (1) ------ (N) WeeklyReports

Users (1) ------ (N) AISummaries

Users (1) ------ (N) UploadedDocuments

Users (1) ------ (N) ChatHistory

UploadedDocuments (1) ------ (N) DocumentChunks

---

# 3. ER Diagram

Users
|
├── Profile (1:1)
├── WeightLogs (1:N)
├── WaterLogs (1:N)
├── SleepLogs (1:N)
├── ActivityLogs (1:N)
├── Goals (1:N)
├── Notifications (1:N)
├── WeeklyReports (1:N)
├── AISummaries (1:N)
├── UploadedDocuments (1:N)
└── ChatHistory (1:N)

UploadedDocuments
|
└── DocumentChunks (1:N)

---

# 4. Table Definitions

TABLE: users

Purpose:
Stores authentication information.

Columns:

id BIGINT PK AUTO_INCREMENT

name VARCHAR(100) NOT NULL

email VARCHAR(255) NOT NULL UNIQUE

password_hash VARCHAR(255) NOT NULL

status ENUM(
'ACTIVE',
'INACTIVE',
'SUSPENDED'
)

created_at TIMESTAMP

updated_at TIMESTAMP

Indexes:

PRIMARY KEY(id)

UNIQUE(email)

INDEX(status)

Business Rules:

Email must be unique.

Password stored as hash only.

No plain text passwords.

---

TABLE: profiles

Purpose:
Stores user demographic information.

Columns:

id BIGINT PK

user_id BIGINT FK

age INT

gender ENUM(
'MALE',
'FEMALE',
'OTHER'
)

height_cm DECIMAL(5,2)

current_weight_kg DECIMAL(5,2)

activity_level ENUM(
'LOW',
'MEDIUM',
'HIGH'
)

created_at TIMESTAMP

updated_at TIMESTAMP

Foreign Keys:

user_id REFERENCES users(id)

Relationship:

One User → One Profile

Constraints:

height_cm > 0

current_weight_kg > 0

UNIQUE(user_id)




# Health Tracking Tables

TABLE: weight_logs

Purpose:
Store historical weight measurements.

Columns:

id BIGINT PK

user_id BIGINT FK

weight_kg DECIMAL(5,2)

recorded_at DATETIME

Indexes:

INDEX(user_id)

INDEX(recorded_at)

Constraints:

weight_kg > 0

Relationship:

User (1) → Weight Logs (N)

---

TABLE: water_logs

Columns:

id BIGINT PK

user_id BIGINT FK

amount_ml INT

consumed_at DATETIME

Indexes:

INDEX(user_id)

INDEX(consumed_at)

Constraints:

amount_ml > 0

---

TABLE: sleep_logs

Columns:

id BIGINT PK

user_id BIGINT FK

sleep_start DATETIME

sleep_end DATETIME

total_hours DECIMAL(4,2)

quality_score INT

Indexes:

INDEX(user_id)

INDEX(sleep_start)

Constraints:

sleep_end > sleep_start

quality_score BETWEEN 1 AND 10

---

TABLE: activity_logs

Columns:

id BIGINT PK

user_id BIGINT FK

activity_type ENUM(
'WALKING',
'RUNNING',
'CYCLING',
'GYM',
'YOGA',
'OTHER'
)

duration_minutes INT

calories_burned INT

distance_km DECIMAL(6,2)

activity_date DATE

Indexes:

INDEX(user_id)

INDEX(activity_date)

INDEX(activity_type)

Constraints:

duration_minutes > 0

calories_burned >= 0

distance_km >= 0

---

TABLE: goals

Columns:

id BIGINT PK

user_id BIGINT FK

goal_type ENUM(
'WEIGHT',
'WATER',
'SLEEP',
'ACTIVITY',
'STEPS'
)

target_value DECIMAL(10,2)

current_value DECIMAL(10,2)

start_date DATE

end_date DATE

status ENUM(
'ACTIVE',
'COMPLETED',
'FAILED'
)

Indexes:

INDEX(user_id)

INDEX(status)

Constraints:

target_value > 0

end_date >= start_date


# AI & RAG Tables

TABLE: notifications

id BIGINT PK

user_id BIGINT FK

title VARCHAR(255)

message TEXT

notification_type VARCHAR(50)

is_read BOOLEAN

created_at TIMESTAMP

Indexes:

INDEX(user_id)

INDEX(is_read)

---

TABLE: weekly_reports

id BIGINT PK

user_id BIGINT FK

report_start_date DATE

report_end_date DATE

avg_sleep_hours DECIMAL(4,2)

avg_water_ml INT

total_workouts INT

weight_change DECIMAL(5,2)

created_at TIMESTAMP

Indexes:

INDEX(user_id)

INDEX(report_start_date)

---

TABLE: ai_summaries

id BIGINT PK

user_id BIGINT FK

summary_type VARCHAR(50)

summary_text LONGTEXT

generated_at TIMESTAMP

Indexes:

INDEX(user_id)

INDEX(summary_type)

---

TABLE: uploaded_documents

id BIGINT PK

user_id BIGINT FK

document_name VARCHAR(255)

file_path VARCHAR(500)

uploaded_at TIMESTAMP

Indexes:

INDEX(user_id)

---

TABLE: document_chunks

id BIGINT PK

document_id BIGINT FK

chunk_index INT

chunk_text LONGTEXT

embedding_id VARCHAR(255)

created_at TIMESTAMP

Indexes:

INDEX(document_id)

INDEX(embedding_id)

---

TABLE: chat_history

id BIGINT PK

user_id BIGINT FK

question TEXT

answer LONGTEXT

created_at TIMESTAMP

Indexes:

INDEX(user_id)

INDEX(created_at)

---


