-- Rename price columns to match frontend expectations
ALTER TABLE plans RENAME COLUMN monthly_price TO price_monthly;
ALTER TABLE plans RENAME COLUMN yearly_price TO price_yearly;

-- Update the default plans with the new column names
UPDATE plans
SET 
    price_monthly = CASE 
        WHEN type = 'free' THEN 0
        WHEN type = 'basic' THEN 29.99
        WHEN type = 'premium' THEN 99.99
    END,
    price_yearly = CASE 
        WHEN type = 'free' THEN 0
        WHEN type = 'basic' THEN 299.99
        WHEN type = 'premium' THEN 999.99
    END
WHERE type IN ('free', 'basic', 'premium'); 