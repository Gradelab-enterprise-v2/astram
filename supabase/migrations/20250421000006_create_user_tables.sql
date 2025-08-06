-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
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
    -- Get the ID of the free plan
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

-- Add table comments
COMMENT ON TABLE public.users IS 'Profile data for each user';
COMMENT ON TABLE public.activity_logs IS 'Log of all user activities';
COMMENT ON TABLE public.billing_logs IS 'Log of all billing transactions';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON public.activity_logs (created_at);
CREATE INDEX IF NOT EXISTS billing_logs_user_id_idx ON public.billing_logs (user_id);
CREATE INDEX IF NOT EXISTS billing_logs_created_at_idx ON public.billing_logs (created_at); 