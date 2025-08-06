-- Drop existing tables if they exist
DROP TABLE IF EXISTS upgrade_requests;
DROP TABLE IF EXISTS plans;
DROP FUNCTION IF EXISTS get_user_plan;
DROP FUNCTION IF EXISTS get_user_plan_with_credits;

-- Create plans table with correct structure
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type plan_type NOT NULL DEFAULT 'free',
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    class_limit INTEGER NOT NULL DEFAULT 0,
    subject_limit INTEGER NOT NULL DEFAULT 0,
    student_limit INTEGER NOT NULL DEFAULT 0,
    paper_upload_limit INTEGER NOT NULL DEFAULT 0,
    document_upload_limit INTEGER NOT NULL DEFAULT 0,
    question_generation_limit INTEGER NOT NULL DEFAULT 0,
    auto_grade_limit INTEGER NOT NULL DEFAULT 0,
    payment_link TEXT,
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create upgrade_requests table
CREATE TABLE upgrade_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    requested_plan_id UUID NOT NULL REFERENCES plans(id),
    is_annual BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    user_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX plans_type_idx ON plans(type);
CREATE INDEX plans_price_monthly_idx ON plans(price_monthly);
CREATE INDEX plans_features_idx ON plans USING GIN (features);
CREATE INDEX upgrade_requests_user_id_idx ON upgrade_requests(user_id);
CREATE INDEX upgrade_requests_status_idx ON upgrade_requests(status);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
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

CREATE POLICY "Allow users to read their own upgrade requests"
ON upgrade_requests
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    (SELECT is_admin FROM is_admin(auth.uid()))
);

CREATE POLICY "Allow users to create their own upgrade requests"
ON upgrade_requests
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Allow admins to update upgrade requests"
ON upgrade_requests
FOR UPDATE
TO authenticated
USING (
    (SELECT is_admin FROM is_admin(auth.uid()))
)
WITH CHECK (
    (SELECT is_admin FROM is_admin(auth.uid()))
);

-- Insert basic plans
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
    payment_link,
    features,
    is_active
) VALUES
('Free', 'free', 0, 0, 'Basic plan for trying out GradeLab', 1, 2, 30, 10, 10, 50, 50, null, '{"basic_features": true}'::jsonb, true),
('Basic', 'basic', 29.99, 299.99, 'Perfect for individual teachers', 5, 10, 150, 100, 100, 500, 500, null, '{"basic_features": true, "advanced_features": true}'::jsonb, true),
('Premium', 'premium', 99.99, 999.99, 'Ideal for schools and institutions', 999999, 999999, 999999, 999999, 999999, 999999, 999999, null, '{"basic_features": true, "advanced_features": true, "premium_features": true}'::jsonb, true); 