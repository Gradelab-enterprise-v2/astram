-- First, drop any existing indexes on the features column
DROP INDEX IF EXISTS plans_features_idx;

-- Create a temporary table with the desired structure
CREATE TABLE plans_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type plan_type NOT NULL DEFAULT 'free',
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    student_limit INTEGER NOT NULL DEFAULT 50,
    test_limit INTEGER NOT NULL DEFAULT 100,
    credit_amount INTEGER NOT NULL DEFAULT 0,
    allows_rollover BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Copy data from the old table to the new one, excluding the features column
INSERT INTO plans_new (
    id, name, type, price_monthly, price_yearly, description,
    student_limit, test_limit, credit_amount, allows_rollover,
    is_active, created_at, updated_at
)
SELECT 
    id, name, type, price_monthly, price_yearly, description,
    student_limit, test_limit, credit_amount, allows_rollover,
    is_active, created_at, updated_at
FROM plans;

-- Drop the old table
DROP TABLE plans;

-- Rename the new table to the original name
ALTER TABLE plans_new RENAME TO plans;

-- Recreate the trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update the table comment
COMMENT ON TABLE plans IS 'Subscription plans with core limits and pricing information'; 