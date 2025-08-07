-- Create test_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(test_id, student_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS test_results_test_id_idx ON public.test_results(test_id);
CREATE INDEX IF NOT EXISTS test_results_student_id_idx ON public.test_results(student_id);
CREATE INDEX IF NOT EXISTS test_results_test_student_idx ON public.test_results(test_id, student_id);

-- Enable RLS
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for test_results
CREATE POLICY "Users can view test results for their subjects"
    ON public.test_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tests t
            JOIN public.teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_results.test_id
            AND ts.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert test results for their subjects"
    ON public.test_results FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tests t
            JOIN public.teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_id
            AND ts.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Users can update test results for their subjects"
    ON public.test_results FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tests t
            JOIN public.teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_id
            AND ts.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tests t
            JOIN public.teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_id
            AND ts.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete test results for their subjects"
    ON public.test_results FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tests t
            JOIN public.teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_id
            AND ts.teacher_id = auth.uid()
        )
    );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_test_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_test_results_updated_at
    BEFORE UPDATE ON public.test_results
    FOR EACH ROW
    EXECUTE FUNCTION update_test_results_updated_at();

-- Add table comment
COMMENT ON TABLE public.test_results IS 'Test results for students with marks obtained'; 