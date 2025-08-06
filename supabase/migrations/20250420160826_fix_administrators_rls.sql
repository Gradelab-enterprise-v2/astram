-- Drop all existing policies
DROP POLICY IF EXISTS "Allow admins to view administrators" ON administrators;
DROP POLICY IF EXISTS "Allow admins to manage administrators" ON administrators;
DROP POLICY IF EXISTS "Allow anyone to view administrators" ON administrators;
DROP POLICY IF EXISTS "Allow anyone to view plans" ON plans;
DROP POLICY IF EXISTS "Allow admins to manage plans" ON plans;

-- Enable RLS on both tables
ALTER TABLE administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Simple admin check function to avoid recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM administrators 
    WHERE user_id = auth.uid() 
    AND auth.role() = 'authenticated'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Administrators table policies
CREATE POLICY "Allow anyone to view administrators"
    ON administrators FOR SELECT
    USING (true);

CREATE POLICY "Allow admins to manage administrators"
    ON administrators FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Plans table policies
CREATE POLICY "Allow anyone to view plans"
    ON plans FOR SELECT
    USING (true);

CREATE POLICY "Allow admins to manage plans"
    ON plans FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Add specific delete policy for plans
CREATE POLICY "Allow admins to delete plans"
    ON plans FOR DELETE
    USING (is_admin());

-- Add columns for free plan limits
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_checks_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_checks_limit INTEGER DEFAULT 3;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_check_date DATE DEFAULT CURRENT_DATE;

-- Function to reset daily limits
CREATE OR REPLACE FUNCTION reset_daily_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_check_date < CURRENT_DATE THEN
    NEW.daily_checks_used := 0;
    NEW.last_check_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to reset daily limits
DROP TRIGGER IF EXISTS reset_daily_limits_trigger ON users;
CREATE TRIGGER reset_daily_limits_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_limits();

-- Create enum for plan types
CREATE TYPE plan_type AS ENUM ('free', 'basic', 'premium');

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