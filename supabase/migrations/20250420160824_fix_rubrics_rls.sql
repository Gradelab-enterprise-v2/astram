-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view any rubrics" ON rubrics;
DROP POLICY IF EXISTS "Users can create rubrics if authenticated" ON rubrics;
DROP POLICY IF EXISTS "Users can update their rubrics" ON rubrics;
DROP POLICY IF EXISTS "Users can delete their rubrics" ON rubrics;
DROP POLICY IF EXISTS "Teachers can view rubrics for their subjects" ON rubrics;
DROP POLICY IF EXISTS "Teachers can create rubrics for their subjects" ON rubrics;
DROP POLICY IF EXISTS "Teachers can update rubrics for their subjects" ON rubrics;
DROP POLICY IF EXISTS "Teachers can delete rubrics for their subjects" ON rubrics;

-- Create simplified policies
CREATE POLICY "Users can view rubrics if authenticated"
    ON rubrics FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create rubrics if authenticated"
    ON rubrics FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update rubrics if authenticated"
    ON rubrics FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete rubrics if authenticated"
    ON rubrics FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Add created_by column if it doesn't exist
ALTER TABLE rubrics 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Set created_by on insert
CREATE OR REPLACE FUNCTION set_rubrics_created_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_by = auth.uid();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_rubrics_created_by ON rubrics;
CREATE TRIGGER set_rubrics_created_by
    BEFORE INSERT ON rubrics
    FOR EACH ROW
    EXECUTE FUNCTION set_rubrics_created_by(); 