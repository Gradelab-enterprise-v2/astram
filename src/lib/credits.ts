
import { supabase } from './supabase';

export enum CreditAction {
  GENERATE_QUESTIONS = 'generate_questions',
  ANALYZE_PAPER = 'analyze_paper',
  GRADE_STUDENT = 'grade_student'
}

export const creditCosts = {
  [CreditAction.GENERATE_QUESTIONS]: 1,
  [CreditAction.ANALYZE_PAPER]: 2,
  [CreditAction.GRADE_STUDENT]: 3
};

export const actionDescriptions = {
  [CreditAction.GENERATE_QUESTIONS]: 'Generated question paper',
  [CreditAction.ANALYZE_PAPER]: 'Analyzed question paper',
  [CreditAction.GRADE_STUDENT]: 'Graded student answer sheet'
};

export const useCreditsForAction = async (
  userId: string,
  action: CreditAction,
  customDescription?: string
): Promise<boolean> => {
  if (!userId) return false;
  
  const credits = creditCosts[action];
  const description = customDescription || actionDescriptions[action];
  
  try {
    const { data, error } = await supabase.rpc('use_credits', {
      uid: userId,
      credits_to_use: credits,
      action,
      action_description: description
    });
    
    if (error) {
      console.error('Error using credits:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Exception using credits:', error);
    return false;
  }
};
