#!/bin/bash

# Script to copy extract-text function code to clipboard for manual deployment
echo "📋 Copying extract-text function code to clipboard..."

# Check if pbcopy is available (macOS)
if command -v pbcopy &> /dev/null; then
    cat supabase/functions/extract-text/index.ts | pbcopy
    echo "✅ Function code copied to clipboard!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Open your Supabase dashboard: https://mfnhgldghrnjrwlhtvor.supabase.co"
    echo "2. Go to Edge Functions"
    echo "3. Find the 'extract-text' function"
    echo "4. Click 'Edit'"
    echo "5. Replace all content with the clipboard content (Cmd+V)"
    echo "6. Click 'Save'"
    echo "7. Test the function"
    echo ""
    echo "🎯 This will update the function to handle all document types:"
    echo "  - Test papers (imageUrls + paperId)"
    echo "  - Student sheets (base64Images + sheetId)"
    echo "  - Chapter materials (base64Images + sheetId)"
elif command -v xclip &> /dev/null; then
    cat supabase/functions/extract-text/index.ts | xclip -selection clipboard
    echo "✅ Function code copied to clipboard!"
else
    echo "⚠️  Clipboard not available. Please copy the function code manually:"
    echo ""
    cat supabase/functions/extract-text/index.ts
fi 