-- Remove features column from plans table
ALTER TABLE plans DROP COLUMN IF EXISTS features;

-- Update default plans without features
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