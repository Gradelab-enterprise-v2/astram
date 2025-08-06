# Testing Guide for Consolidated Extract-Text Function

This guide helps you test the consolidated `extract-text` function to ensure it works correctly for all scenarios before removing the old `extract-handwritten` function.

## 🧪 Test Scenarios

### 1. Question Paper Extraction (OpenAI Path)
**What to test:** Upload a question paper and extract text
**Expected behavior:** Uses OpenAI API with `imageUrls` parameter

**Steps:**
1. Go to the question paper upload page
2. Upload a question paper PDF/image
3. Click "Extract Text"
4. Verify text extraction works correctly
5. Check that the function uses `documentType: 'question'`

**Files to check:**
- `src/components/QuestionPaper.tsx`
- `src/services/test-paper/extract-text.ts`

### 2. Student Answer Sheet Extraction (Azure Path)
**What to test:** Upload a student answer sheet and extract text
**Expected behavior:** Uses Azure OpenAI API with `base64Images` parameter

**Steps:**
1. Go to the auto-grade section
2. Upload a student answer sheet
3. Click "Extract Text" or let it auto-extract
4. Verify text extraction works correctly
5. Check that the function uses `documentType: 'student-sheet'`

**Files to check:**
- `src/services/student-sheets/student-sheets-api.ts`
- `src/pages/auto-grade/Evaluate.tsx`

### 3. Chapter Material Extraction (Azure Path)
**What to test:** Upload chapter materials and extract text
**Expected behavior:** Uses Azure OpenAI API with `base64Images` parameter

**Steps:**
1. Go to the question generation section
2. Upload chapter materials
3. Extract text from the document
4. Verify text extraction works correctly
5. Check that the function uses `documentType: 'chapter-material'`

**Files to check:**
- `src/hooks/use-chapter-materials.ts`
- `src/pages/question-generation/Index.tsx`

## 🔍 Verification Checklist

### Function Parameters
- [ ] `documentType` is correctly set for each scenario
- [ ] `imageUrls` is used for question papers
- [ ] `base64Images` is used for student sheets and chapter materials
- [ ] `sheetId` is provided for student sheets and chapter materials

### API Selection
- [ ] Question papers use OpenAI API
- [ ] Student sheets use Azure OpenAI API
- [ ] Chapter materials use Azure OpenAI API

### Error Handling
- [ ] Proper error messages for missing parameters
- [ ] Graceful handling of API failures
- [ ] Database updates work correctly

### Database Updates
- [ ] Student sheets update `student_answer_sheets` table
- [ ] Chapter materials update `analysis_history` table
- [ ] Status updates work correctly

## 🚨 Common Issues to Watch For

1. **Environment Variables:** Ensure both OpenAI and Azure OpenAI keys are configured
2. **Function Deployment:** Make sure the updated function is deployed to Supabase
3. **Parameter Names:** Verify `documentType` is used instead of `paperType`
4. **API Selection:** Check that the correct API is being used for each document type

## 📊 Testing Results

After testing each scenario, document your results:

### Question Papers
- [ ] ✅ Works correctly
- [ ] ❌ Has issues (describe below)
- [ ] ⚠️ Needs investigation

**Notes:**

### Student Answer Sheets
- [ ] ✅ Works correctly
- [ ] ❌ Has issues (describe below)
- [ ] ⚠️ Needs investigation

**Notes:**

### Chapter Materials
- [ ] ✅ Works correctly
- [ ] ❌ Has issues (describe below)
- [ ] ⚠️ Needs investigation

**Notes:**

## ✅ Ready for Cleanup

Once all tests pass:
1. [ ] All scenarios work correctly
2. [ ] No errors in function logs
3. [ ] Database updates work properly
4. [ ] User experience is smooth

**Then you can safely remove the old `extract-handwritten` function!**

## 🧹 Cleanup Steps (After Testing)

1. Remove the old function:
   ```bash
   ./scripts/remove-extract-handwritten.sh
   ```

2. Update documentation:
   - Remove references to `extract-handwritten`
   - Update any documentation mentioning the old function

3. Clean up any remaining references in code comments 