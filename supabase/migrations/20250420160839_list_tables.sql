-- Query to list all tables and their columns in the public schema
SELECT 
    tables.table_name,
    array_agg(
        columns.column_name || ' ' || 
        columns.data_type || 
        CASE 
            WHEN columns.character_maximum_length IS NOT NULL 
            THEN '(' || columns.character_maximum_length || ')'
            ELSE ''
        END
    ) as columns
FROM 
    information_schema.tables tables
    LEFT JOIN information_schema.columns columns 
    ON tables.table_name = columns.table_name
WHERE 
    tables.table_schema = 'public'
    AND tables.table_type = 'BASE TABLE'
GROUP BY 
    tables.table_name
ORDER BY 
    tables.table_name; 