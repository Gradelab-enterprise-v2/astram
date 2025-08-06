-- Update Basic Plan with new values
UPDATE plans
SET 
    type = 'basic',
    price_monthly = 0,
    price_yearly = 0,
    class_limit = 0,
    subject_limit = 0,
    student_limit = 0,
    paper_upload_limit = 0,
    document_upload_limit = 0,
    question_generation_limit = 0,
    auto_grade_limit = 0,
    payment_link = NULL,
    features = '{
        "csv_download": false,
        "white_labelling": false,
        "view_summary": false
    }'::jsonb
WHERE name = 'Basic Plan';

-- If the plan doesn't exist, insert it
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
    features
)
SELECT 
    'Basic Plan',
    'basic',
    0,
    0,
    'Basic tier plan',
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    NULL,
    '{
        "csv_download": false,
        "white_labelling": false,
        "view_summary": false
    }'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM plans WHERE name = 'Basic Plan'
); 