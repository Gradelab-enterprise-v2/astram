-- Add columns to track user limits and usage
ALTER TABLE users ADD COLUMN IF NOT EXISTS questions_generated integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS papers_graded integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Create discount codes table
CREATE TABLE IF NOT EXISTS discount_codes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text NOT NULL UNIQUE,
    discount_percent decimal(5,2) NOT NULL,
    valid_from timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    valid_until timestamp with time zone,
    max_uses integer,
    current_uses integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create white label settings table
CREATE TABLE IF NOT EXISTS white_label_settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id),
    logo_url text,
    custom_domain text,
    primary_color text,
    secondary_color text,
    email_footer_text text,
    pdf_footer_text text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL UNIQUE,
    description text,
    enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user feature flags table
CREATE TABLE IF NOT EXISTS user_feature_flags (
    user_id uuid REFERENCES auth.users(id),
    feature_id uuid REFERENCES feature_flags(id),
    enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, feature_id)
);

-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id),
    feature text NOT NULL,
    tokens_used integer NOT NULL,
    cost decimal(10,6),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create billing logs table
CREATE TABLE IF NOT EXISTS billing_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id),
    amount decimal(10,2) NOT NULL,
    currency text DEFAULT 'USD',
    status text NOT NULL,
    provider text NOT NULL,
    provider_payment_id text,
    details jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Allow admins full access to discount_codes" ON discount_codes FOR ALL USING (is_admin());
CREATE POLICY "Allow admins full access to white_label_settings" ON white_label_settings FOR ALL USING (is_admin());
CREATE POLICY "Allow admins full access to feature_flags" ON feature_flags FOR ALL USING (is_admin());
CREATE POLICY "Allow admins full access to user_feature_flags" ON user_feature_flags FOR ALL USING (is_admin());
CREATE POLICY "Allow admins full access to ai_usage" ON ai_usage FOR ALL USING (is_admin());
CREATE POLICY "Allow admins full access to billing_logs" ON billing_logs FOR ALL USING (is_admin());

-- Create policies for user access
CREATE POLICY "Allow users to view their own white label settings" ON white_label_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to view their own feature flags" ON user_feature_flags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to view their own ai usage" ON ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to view their own billing logs" ON billing_logs FOR SELECT USING (auth.uid() = user_id);

-- Insert default feature flags
INSERT INTO feature_flags (name, description, enabled) VALUES
    ('test_management', 'Access to test management features', true),
    ('subject_management', 'Access to subject management features', true),
    ('ai_mcq_generation', 'Access to AI MCQ generation', true),
    ('ai_theory_questions', 'Access to AI theory question generation', true),
    ('auto_paper_grading', 'Access to automatic paper grading', true),
    ('handwriting_recognition', 'Access to handwriting recognition', false),
    ('plagiarism_detection', 'Access to plagiarism detection', false)
ON CONFLICT (name) DO NOTHING;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_discount_codes_updated_at
    BEFORE UPDATE ON discount_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_white_label_settings_updated_at
    BEFORE UPDATE ON white_label_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to track user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (NEW.id, TG_ARGV[0], row_to_json(NEW));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity logging
CREATE TRIGGER log_user_creation
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity('user_created');

CREATE TRIGGER log_user_update
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION log_user_activity('user_updated'); 