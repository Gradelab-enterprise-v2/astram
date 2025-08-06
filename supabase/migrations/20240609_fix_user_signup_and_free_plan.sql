-- 1. Ensure the free plan exists and is unique
INSERT INTO plans (
    name, type, price_monthly, price_yearly, description, class_limit, subject_limit, student_limit, paper_upload_limit, document_upload_limit, question_generation_limit, auto_grade_limit, is_active
) VALUES (
    'Free', 'free', 0, 0, 'Basic free plan', 1, 2, 30, 10, 10, 50, 50, true
)
ON CONFLICT (name) DO NOTHING;

-- 2. Ensure the plans table has a unique constraint on name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'plans_name_unique'
    ) THEN
        ALTER TABLE plans ADD CONSTRAINT plans_name_unique UNIQUE (name);
    END IF;
END $$;

-- 3. Create or update the trigger function to assign the free plan robustly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    full_name TEXT;
BEGIN
    full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, '');
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        full_name
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure the trigger is set up on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 