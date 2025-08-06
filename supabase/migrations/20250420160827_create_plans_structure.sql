-- Create enum for plan types if it doesn't exist
DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('free', 'basic', 'premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alter existing plans table
DO $$ BEGIN
    -- Add new columns if they don't exist
    ALTER TABLE plans 
        ADD COLUMN IF NOT EXISTS type plan_type NOT NULL DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS class_limit INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS subject_limit INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS student_limit INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS paper_upload_limit INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS document_upload_limit INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS question_generation_limit INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS auto_grade_limit INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_link TEXT,
        ADD COLUMN IF NOT EXISTS features JSONB,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
EXCEPTION
    WHEN undefined_table THEN
        -- Create plans table if it doesn't exist
        CREATE TABLE plans (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
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
            features JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
END $$;

-- Ensure features column is of type JSONB
DO $$ BEGIN
    ALTER TABLE plans ALTER COLUMN features TYPE JSONB USING features::jsonb;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Insert or update default free plan
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
VALUES (
    'Free Plan',
    'free',
    0,
    0,
    'Basic plan with limited features',
    2,
    4,
    50,
    10,
    20,
    100,
    50,
    '{"csv_download": false, "white_labelling": false, "view_summary": true}'::jsonb
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