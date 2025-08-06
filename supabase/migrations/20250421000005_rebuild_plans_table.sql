-- Drop existing plans table and related objects
DROP TABLE IF EXISTS plans CASCADE;
DROP TYPE IF EXISTS plan_type CASCADE;

-- Create plan type enum
CREATE TYPE plan_type AS ENUM ('free', 'basic', 'premium');

-- Create the plans table with the new structure
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type plan_type NOT NULL DEFAULT 'free',
    monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    class_limit INTEGER NOT NULL DEFAULT 0,
    subject_limit INTEGER NOT NULL DEFAULT 0,
    student_limit INTEGER NOT NULL DEFAULT 0,
    paper_upload_limit INTEGER NOT NULL DEFAULT 0,
    document_upload_limit INTEGER NOT NULL DEFAULT 0,
    question_generation_limit INTEGER NOT NULL DEFAULT 0,
    auto_grade_limit INTEGER NOT NULL DEFAULT 0,
    payment_link TEXT,
    csv_download BOOLEAN NOT NULL DEFAULT false,
    white_labelling BOOLEAN NOT NULL DEFAULT false,
    view_summary BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add table comment
COMMENT ON TABLE plans IS 'Subscription plans with limits and features';

-- Insert default plans
INSERT INTO plans (
    name,
    type,
    monthly_price,
    yearly_price,
    description,
    class_limit,
    subject_limit,
    student_limit,
    paper_upload_limit,
    document_upload_limit,
    question_generation_limit,
    auto_grade_limit,
    csv_download,
    white_labelling,
    view_summary
) VALUES 
(
    'Free Plan',
    'free',
    0,
    0,
    'Basic features for small classes',
    2,
    4,
    50,
    10,
    20,
    100,
    50,
    false,
    false,
    true
),
(
    'Basic Plan',
    'basic',
    29.99,
    299.99,
    'Perfect for growing institutions',
    5,
    10,
    200,
    50,
    100,
    500,
    200,
    true,
    false,
    true
),
(
    'Premium Plan',
    'premium',
    99.99,
    999.99,
    'Full features for large institutions',
    999999,
    999999,
    999999,
    999999,
    999999,
    999999,
    999999,
    true,
    true,
    true
);

-- Create admin check function
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

-- Enable Row Level Security (RLS)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow anyone to view plans"
    ON plans FOR SELECT
    USING (true);

CREATE POLICY "Allow admins to manage plans"
    ON plans FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    current_plan_id UUID REFERENCES plans(id),
    papers_graded INTEGER DEFAULT 0,
    questions_generated INTEGER DEFAULT 0,
    daily_checks_used INTEGER DEFAULT 0,
    daily_checks_limit INTEGER DEFAULT 3,
    last_check_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    action_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create billing logs table
CREATE TABLE IF NOT EXISTS public.billing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    plan_id UUID REFERENCES plans(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL,
    payment_method TEXT,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create trigger to update users.updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, current_plan_id)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        (SELECT id FROM plans WHERE type = 'free' LIMIT 1)
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own data"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can manage all user data"
    ON public.users
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Users can view their own activity logs"
    ON public.activity_logs
    FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "System can insert activity logs"
    ON public.activity_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can view their own billing logs"
    ON public.billing_logs
    FOR SELECT
    USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can manage billing logs"
    ON public.billing_logs
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at);
CREATE INDEX IF NOT EXISTS billing_logs_user_id_idx ON public.billing_logs (user_id);
CREATE INDEX IF NOT EXISTS billing_logs_created_at_idx ON public.billing_logs (created_at); 