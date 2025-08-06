-- Drop existing table if it exists
DROP TABLE IF EXISTS plans;

-- Create enum for plan types if it doesn't exist
DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('free', 'basic', 'premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Recreate plans table with all necessary columns
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type plan_type NOT NULL DEFAULT 'free',
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    daily_checks_limit INTEGER NOT NULL DEFAULT 3,
    monthly_checks_limit INTEGER NOT NULL DEFAULT 100,
    auto_grade_limit INTEGER NOT NULL DEFAULT 50,
    description TEXT,
    features JSONB NOT NULL DEFAULT '{"features": []}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow anyone to view plans" ON plans;
DROP POLICY IF EXISTS "Allow admins to manage plans" ON plans;

CREATE POLICY "Allow anyone to view plans"
    ON plans FOR SELECT
    USING (true);

CREATE POLICY "Allow admins to manage plans"
    ON plans FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Create trigger for updating timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamp
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default plans
INSERT INTO plans (name, type, price, daily_checks_limit, monthly_checks_limit, auto_grade_limit, description, features)
VALUES 
(
    'Free Plan',
    'free',
    0,
    3,
    50,
    10,
    'Basic plan with limited features',
    '{
        "features": [
            "3 daily paper checks",
            "50 monthly checks",
            "10 auto-grading evaluations",
            "Basic support"
        ]
    }'
),
(
    'Basic Plan',
    'basic',
    29.99,
    10,
    200,
    100,
    'Perfect for small institutions',
    '{
        "features": [
            "10 daily paper checks",
            "200 monthly checks",
            "100 auto-grading evaluations",
            "Priority support",
            "Advanced analytics"
        ]
    }'
),
(
    'Premium Plan',
    'premium',
    99.99,
    50,
    1000,
    500,
    'Complete solution for large institutions',
    '{
        "features": [
            "Unlimited daily paper checks",
            "1000 monthly checks",
            "500 auto-grading evaluations",
            "24/7 Premium support",
            "Advanced analytics",
            "Custom integrations",
            "Dedicated account manager"
        ]
    }'
)
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    price = EXCLUDED.price,
    daily_checks_limit = EXCLUDED.daily_checks_limit,
    monthly_checks_limit = EXCLUDED.monthly_checks_limit,
    auto_grade_limit = EXCLUDED.auto_grade_limit,
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    updated_at = timezone('utc'::text, now()); 