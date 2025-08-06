-- Create rubrics table
CREATE TABLE rubrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    accuracy INTEGER DEFAULT 3,
    relevance INTEGER DEFAULT 3,
    clarity INTEGER DEFAULT 3,
    structure INTEGER DEFAULT 3,
    language INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rubrics for their tests"
    ON rubrics FOR SELECT
    USING (
        test_id IN (
            SELECT id FROM tests 
            WHERE subject_id IN (
                SELECT subject_id FROM teacher_subjects 
                WHERE teacher_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert rubrics for their tests"
    ON rubrics FOR INSERT
    WITH CHECK (
        test_id IN (
            SELECT id FROM tests 
            WHERE subject_id IN (
                SELECT subject_id FROM teacher_subjects 
                WHERE teacher_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update rubrics for their tests"
    ON rubrics FOR UPDATE
    USING (
        test_id IN (
            SELECT id FROM tests 
            WHERE subject_id IN (
                SELECT subject_id FROM teacher_subjects 
                WHERE teacher_id = auth.uid()
            )
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_rubrics_updated_at
    BEFORE UPDATE ON rubrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
