-- First, drop any existing indexes on the features column
DROP INDEX IF EXISTS plans_features_idx;

-- Remove the features column
ALTER TABLE plans DROP COLUMN IF EXISTS features;

-- Update the table comment
COMMENT ON TABLE plans IS 'Subscription plans with core limits and pricing information';

-- Update existing plans to ensure they have the correct structure
UPDATE plans
SET 
    monthly_checks_limit = CASE 
        WHEN type = 'free' THEN 50
        WHEN type = 'basic' THEN 200
        WHEN type = 'premium' THEN 1000
        ELSE 100
    END,
    auto_grade_limit = CASE 
        WHEN type = 'free' THEN 10
        WHEN type = 'basic' THEN 100
        WHEN type = 'premium' THEN 500
        ELSE 50
    END
WHERE type IN ('free', 'basic', 'premium'); 