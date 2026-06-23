-- -------------------------------------------------------------
-- Health Tracking Application Database Schema
-- Target Database Engine: MySQL 8.x
-- -------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS health_tracking;
USE health_tracking;

-- Disable foreign key checks temporarily to drop existing tables in order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS chat_history;
DROP TABLE IF EXISTS document_chunks;
DROP TABLE IF EXISTS uploaded_documents;
DROP TABLE IF EXISTS ai_summaries;
DROP TABLE IF EXISTS weekly_reports;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS sleep_logs;
DROP TABLE IF EXISTS water_logs;
DROP TABLE IF EXISTS weight_logs;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- -------------------------------------------------------------
-- Table: users
-- Purpose: Stores primary authentication and account detail.
-- -------------------------------------------------------------
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique user identifier',
    name VARCHAR(100) NOT NULL COMMENT 'Display name of the user',
    email VARCHAR(255) NOT NULL COMMENT 'Unique user email address used for login',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Hashed version of user password',
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE' COMMENT 'Account status',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp of account creation',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp of last update',
    PRIMARY KEY (id),
    UNIQUE KEY uq_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: profiles
-- Purpose: Stores demographic and static health parameters. 1-to-1 with users.
-- -------------------------------------------------------------
CREATE TABLE profiles (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique profile record identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    age INT DEFAULT NULL COMMENT 'Age in years',
    gender ENUM('MALE', 'FEMALE', 'OTHER') DEFAULT NULL COMMENT 'Gender identification',
    height_cm DECIMAL(5,2) DEFAULT NULL COMMENT 'Height in centimeters',
    current_weight_kg DECIMAL(5,2) DEFAULT NULL COMMENT 'Baseline/Current weight in kilograms',
    activity_level ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT NULL COMMENT 'General activity index',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Profile creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Profile last update timestamp',
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_id (user_id),
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_profile_age CHECK (age IS NULL OR age >= 0),
    CONSTRAINT chk_profile_height CHECK (height_cm IS NULL OR height_cm > 0.00),
    CONSTRAINT chk_profile_weight CHECK (current_weight_kg IS NULL OR current_weight_kg > 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: weight_logs
-- Purpose: Historical record of user weight progress.
-- -------------------------------------------------------------
CREATE TABLE weight_logs (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique weight record identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    weight_kg DECIMAL(5,2) NOT NULL COMMENT 'Recorded weight in kilograms',
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time of measurement',
    PRIMARY KEY (id),
    CONSTRAINT fk_weight_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_weight_val CHECK (weight_kg > 0.00),
    INDEX idx_weight_user (user_id),
    INDEX idx_weight_recorded (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: water_logs
-- Purpose: Log of fluid intake throughout the day.
-- -------------------------------------------------------------
CREATE TABLE water_logs (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique water entry identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    amount_ml INT NOT NULL COMMENT 'Quantity consumed in milliliters',
    consumed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time of intake',
    PRIMARY KEY (id),
    CONSTRAINT fk_water_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_water_amount CHECK (amount_ml > 0),
    INDEX idx_water_user (user_id),
    INDEX idx_water_consumed (consumed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: sleep_logs
-- Purpose: Tracking parameters of sleep duration and quality.
-- -------------------------------------------------------------
CREATE TABLE sleep_logs (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique sleep entry identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    sleep_start DATETIME NOT NULL COMMENT 'Bedtime datetime reference',
    sleep_end DATETIME NOT NULL COMMENT 'Wakeup datetime reference',
    total_hours DECIMAL(4,2) NOT NULL COMMENT 'Calculated length of sleep in hours',
    quality_score INT DEFAULT NULL COMMENT 'User-provided quality scale between 1 and 10',
    PRIMARY KEY (id),
    CONSTRAINT fk_sleep_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_sleep_dates CHECK (sleep_end > sleep_start),
    CONSTRAINT chk_sleep_quality CHECK (quality_score IS NULL OR (quality_score >= 1 AND quality_score <= 10)),
    INDEX idx_sleep_user (user_id),
    INDEX idx_sleep_start (sleep_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: activity_logs
-- Purpose: Captures details of physical activities and workouts.
-- -------------------------------------------------------------
CREATE TABLE activity_logs (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique activity log identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    activity_type ENUM('WALKING', 'RUNNING', 'CYCLING', 'GYM', 'YOGA', 'OTHER') NOT NULL COMMENT 'Type of exercise',
    duration_minutes INT NOT NULL COMMENT 'Length of activity in minutes',
    calories_burned INT DEFAULT 0 COMMENT 'Calories burned calculation',
    distance_km DECIMAL(6,2) DEFAULT 0.00 COMMENT 'Covered distance in kilometers if applicable',
    activity_date DATE NOT NULL COMMENT 'Day of the physical activity',
    PRIMARY KEY (id),
    CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_activity_duration CHECK (duration_minutes > 0),
    CONSTRAINT chk_activity_calories CHECK (calories_burned >= 0),
    CONSTRAINT chk_activity_distance CHECK (distance_km >= 0.00),
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_date (activity_date),
    INDEX idx_activity_type (activity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: goals
-- Purpose: Stores active/past health objectives for target tracking.
-- -------------------------------------------------------------
CREATE TABLE goals (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique goal identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    goal_type ENUM('WEIGHT', 'WATER', 'SLEEP', 'ACTIVITY', 'STEPS') NOT NULL COMMENT 'Type of tracked goal',
    target_value DECIMAL(10,2) NOT NULL COMMENT 'Target value to reach',
    current_value DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Current progressed value',
    start_date DATE NOT NULL COMMENT 'Active date start window',
    end_date DATE NOT NULL COMMENT 'Date standard to complete goal',
    status ENUM('ACTIVE', 'COMPLETED', 'FAILED') DEFAULT 'ACTIVE' COMMENT 'Lifecycle status of the goal',
    PRIMARY KEY (id),
    CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_goals_target CHECK (target_value > 0.00),
    CONSTRAINT chk_goals_dates CHECK (end_date >= start_date),
    INDEX idx_goals_user (user_id),
    INDEX idx_goals_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: notifications
-- Purpose: Stores alerts and push reminders sent to user interfaces.
-- -------------------------------------------------------------
CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique notification identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    title VARCHAR(255) NOT NULL COMMENT 'Brief notification header',
    message TEXT DEFAULT NULL COMMENT 'Detailed context payload',
    notification_type VARCHAR(50) DEFAULT NULL COMMENT 'Classification e.g., Reminder, Alert',
    is_read BOOLEAN DEFAULT FALSE COMMENT 'Read status flag',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Dispatch creation timestamp',
    PRIMARY KEY (id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: weekly_reports
-- Purpose: Caches analytics compiled at the end of each weekly cycle.
-- -------------------------------------------------------------

CREATE TABLE weekly_reports (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique report identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    report_start_date DATE NOT NULL COMMENT 'Weekly start day constraint',
    report_end_date DATE NOT NULL COMMENT 'Weekly end day constraint',
    avg_sleep_hours DECIMAL(4,2) DEFAULT NULL COMMENT 'Average sleep in weekly window',
    avg_water_ml INT DEFAULT NULL COMMENT 'Average water intake in weekly window',
    total_workouts INT DEFAULT NULL COMMENT 'Sum of activities recorded',
    weight_change DECIMAL(5,2) DEFAULT NULL COMMENT 'Delta value of weight shift',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Report generation timestamp',
    PRIMARY KEY (id),
    CONSTRAINT fk_weekly_reports_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_reports_dates CHECK (report_end_date >= report_start_date),
    INDEX idx_weekly_user (user_id),
    INDEX idx_weekly_start (report_start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: ai_summaries
-- Purpose: Caches weekly or monthly summary analyses generated by LLM.
-- -------------------------------------------------------------
CREATE TABLE ai_summaries (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique summary identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    summary_type VARCHAR(50) NOT NULL COMMENT 'Range type (e.g. WEEKLY, MONTHLY)',
    summary_text LONGTEXT NOT NULL COMMENT 'Markdown descriptive text response from LLM',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Time of model generation',
    PRIMARY KEY (id),
    CONSTRAINT fk_summaries_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_summaries_user (user_id),
    INDEX idx_summaries_type (summary_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: uploaded_documents
-- Purpose: Lists documents uploaded by the user (medical reports, etc.).
-- -------------------------------------------------------------
CREATE TABLE uploaded_documents (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique document identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    document_name VARCHAR(255) NOT NULL COMMENT 'Original file name',
    file_path VARCHAR(500) NOT NULL COMMENT 'Storage file pointer location',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Uploading action timestamp',
    PRIMARY KEY (id),
    CONSTRAINT fk_docs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_docs_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: document_chunks
-- Purpose: Holds split document text segments with vector identifiers for RAG search.
-- -------------------------------------------------------------
CREATE TABLE document_chunks (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique chunk identifier',
    document_id BIGINT NOT NULL COMMENT 'Associated document identifier',
    chunk_index INT NOT NULL COMMENT 'Segment position in sequence',
    chunk_text LONGTEXT NOT NULL COMMENT 'Content segment body text',
    embedding_id VARCHAR(255) DEFAULT NULL COMMENT 'Reference ID in Vector DB (Chroma)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Chunk creation date',
    PRIMARY KEY (id),
    CONSTRAINT fk_chunks_doc FOREIGN KEY (document_id) REFERENCES uploaded_documents (id) ON DELETE CASCADE,
    INDEX idx_chunks_doc (document_id),
    INDEX idx_chunks_embedding (embedding_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -------------------------------------------------------------
-- Table: chat_history
-- Purpose: Retains LLM chat conversation records per user session.
-- -------------------------------------------------------------
CREATE TABLE chat_history (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique chat message row identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    question TEXT NOT NULL COMMENT 'User prompt text input',
    answer LONGTEXT NOT NULL COMMENT 'LLM engine response',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Chat message exchange timestamp',
    PRIMARY KEY (id),
    CONSTRAINT fk_chat_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_chat_user (user_id),
    INDEX idx_chat_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
