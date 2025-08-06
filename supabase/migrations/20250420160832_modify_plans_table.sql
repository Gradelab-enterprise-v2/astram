-- First, drop the features column since it's causing issues
ALTER TABLE plans DROP COLUMN IF EXISTS features;

-- Add all the new columns
ALTER TABLE plans 
    ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS class_limit INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subject_limit INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS student_limit INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paper_upload_limit INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS document_upload_limit INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS question_generation_limit INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS auto_grade_limit INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_link TEXT,
    ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS plans_type_idx ON plans(type);
CREATE INDEX IF NOT EXISTS plans_price_monthly_idx ON plans(price_monthly);

-- Enable RLS if not already enabled
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anyone to read plans" ON plans;
DROP POLICY IF EXISTS "Allow admins to modify plans" ON plans;

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

-- Update or insert default plans
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
)
ON CONFLICT (name) 
DO UPDATE SET
    type = EXCLUDED.type,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    description = EXCLUDED.description,
    class_limit = EXCLUDED.class_limit,
    subject_limit = EXCLUDED.subject_limit,
    student_limit = EXCLUDED.student_limit,
    paper_upload_limit = EXCLUDED.paper_upload_limit,
    document_upload_limit = EXCLUDED.document_upload_limit,
    question_generation_limit = EXCLUDED.question_generation_limit,
    auto_grade_limit = EXCLUDED.auto_grade_limit,
    features = EXCLUDED.features; 