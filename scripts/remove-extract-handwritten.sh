#!/bin/bash

# Script to remove the old extract-handwritten edge function
# since we've consolidated everything into extract-text

echo "Removing old extract-handwritten edge function..."

# Remove the extract-handwritten function directory
if [ -d "supabase/functions/extract-handwritten" ]; then
    rm -rf supabase/functions/extract-handwritten
    echo "✓ Removed supabase/functions/extract-handwritten"
else
    echo "⚠ extract-handwritten directory not found"
fi

echo "✓ Cleanup complete!"
echo ""
echo "The extract-text function now handles all text extraction scenarios:"
echo "- Question papers and test papers (using OpenAI)"
echo "- Student answer sheets (using Azure OpenAI)"
echo "- Chapter materials (using Azure OpenAI)"
echo ""
echo "All client code has been updated to use the consolidated function." 