-- Database Migration script for Food Log and Diet Tracking

CREATE TABLE IF NOT EXISTS foods (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique food log identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    food_name VARCHAR(255) NOT NULL COMMENT 'Name of the food item',
    quantity DECIMAL(8,2) NOT NULL COMMENT 'Amount consumed',
    unit VARCHAR(50) NOT NULL COMMENT 'Unit of measurement (grams, pieces, cups, ml)',
    calories DECIMAL(8,2) NOT NULL COMMENT 'Calories calculated',
    protein DECIMAL(8,2) NOT NULL COMMENT 'Protein in grams',
    carbs DECIMAL(8,2) NOT NULL COMMENT 'Carbohydrates in grams',
    fat DECIMAL(8,2) NOT NULL COMMENT 'Fat in grams',
    fiber DECIMAL(8,2) NOT NULL COMMENT 'Fiber in grams',
    meal_type ENUM('BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS') NOT NULL COMMENT 'Meal category',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Log timestamp',
    PRIMARY KEY (id),
    CONSTRAINT fk_foods_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_foods_quantity CHECK (quantity >= 0.00),
    CONSTRAINT chk_foods_calories CHECK (calories >= 0.00),
    CONSTRAINT chk_foods_protein CHECK (protein >= 0.00),
    CONSTRAINT chk_foods_carbs CHECK (carbs >= 0.00),
    CONSTRAINT chk_foods_fat CHECK (fat >= 0.00),
    CONSTRAINT chk_foods_fiber CHECK (fiber >= 0.00),
    INDEX idx_foods_user (user_id),
    INDEX idx_foods_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS diet_goals (
    id BIGINT AUTO_INCREMENT COMMENT 'Unique diet goal identifier',
    user_id BIGINT NOT NULL COMMENT 'Associated user identifier',
    goal_type ENUM('WEIGHT_LOSS', 'WEIGHT_GAIN', 'MUSCLE_GAIN', 'MAINTENANCE') NOT NULL COMMENT 'Diet goal type',
    target_calories INT NOT NULL COMMENT 'Daily target calories',
    target_protein INT NOT NULL COMMENT 'Daily target protein in grams',
    target_carbs INT NOT NULL COMMENT 'Daily target carbs in grams',
    target_fat INT NOT NULL COMMENT 'Daily target fat in grams',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Goal set timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_diet_goals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_diet_calories CHECK (target_calories > 0),
    CONSTRAINT chk_diet_protein CHECK (target_protein >= 0),
    CONSTRAINT chk_diet_carbs CHECK (target_carbs >= 0),
    CONSTRAINT chk_diet_fat CHECK (target_fat >= 0),
    UNIQUE KEY uq_diet_goal_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
