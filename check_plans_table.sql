-- First, let's check if the table exists and its current structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plans';

-- Now let's fix the features column type
ALTER TABLE plans 
ALTER COLUMN features TYPE JSONB USING features::JSONB;

-- Add any missing columns
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE plans ADD COLUMN monthly_checks_limit INTEGER NOT NULL DEFAULT 100;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE plans ADD COLUMN auto_grade_limit INTEGER NOT NULL DEFAULT 50;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE plans ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Update the default plans
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
    END,
    features = CASE
        WHEN type = 'free' THEN '{"features": ["3 daily paper checks", "50 monthly checks", "10 auto-grading evaluations", "Basic support"]}'::jsonb
        WHEN type = 'basic' THEN '{"features": ["10 daily paper checks", "200 monthly checks", "100 auto-grading evaluations", "Priority support", "Advanced analytics"]}'::jsonb
        WHEN type = 'premium' THEN '{"features": ["Unlimited daily paper checks", "1000 monthly checks", "500 auto-grading evaluations", "24/7 Premium support", "Advanced analytics", "Custom integrations", "Dedicated account manager"]}'::jsonb
        ELSE '{"features": []}'::jsonb
    END
WHERE type IN ('free', 'basic', 'premium'); 