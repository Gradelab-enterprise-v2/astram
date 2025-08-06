-- Drop existing plans table if it exists
DROP TABLE IF EXISTS plans;

-- Create enum for plan types
DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('free', 'basic', 'premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create plans table
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type plan_type NOT NULL DEFAULT 'free',
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    class_limit INTEGER NOT NULL DEFAULT 0,
    subject_limit INTEGER NOT NULL DEFAULT 0,
    student_limit INTEGER NOT NULL DEFAULT 0,
    paper_upload_limit INTEGER NOT NULL DEFAULT 0,
    document_upload_limit INTEGER NOT NULL DEFAULT 0,
    question_generation_limit INTEGER NOT NULL DEFAULT 0,
    auto_grade_limit INTEGER NOT NULL DEFAULT 0,
    payment_link TEXT,
    features JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS plans_type_idx ON plans(type);
CREATE INDEX IF NOT EXISTS plans_price_monthly_idx ON plans(price_monthly);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow anyone to read plans"
ON plans
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admins to modify plans"
ON plans
FOR ALL
TO authenticated
USING (
    (SELECT is_admin FROM is_admin(auth.uid()))
)
WITH CHECK (
    (SELECT is_admin FROM is_admin(auth.uid()))
);

-- Function to update updated_at timestamp
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
INSERT INTO plans (
    name, 
    type, 
    price_monthly,
    price_yearly,
    description,
    class_limit,
    subject_limit,
    student_limit,
    paper_upload_limit,
    document_upload_limit,
    question_generation_limit,
    auto_grade_limit,
    features
)
VALUES 
-- Free Plan
(
    'Free Plan',
    'free',
    0,
    0,
    'Start your journey with basic features',
    2,
    4,
    50,
    10,
    20,
    100,
    50,
    '{"csv_download": false, "white_labelling": false, "view_summary": true}'::jsonb
),
-- Basic Plan
(
    'Basic Plan',
    'basic',
    29.99,
    299.99,
    'Perfect for small to medium institutions',
    5,
    10,
    200,
    50,
    100,
    500,
    200,
    '{"csv_download": true, "white_labelling": false, "view_summary": true}'::jsonb
),
-- Premium Plan
(
    'Premium Plan',
    'premium',
    99.99,
    999.99,
    'Unlimited access to all features',
    999999,
    999999,
    999999,
    999999,
    999999,
    999999,
    999999,
    '{"csv_download": true, "white_labelling": true, "view_summary": true}'::jsonb
); 