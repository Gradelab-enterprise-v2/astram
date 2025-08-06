
import { getSubjectById, getSubjectsByClassId, getStudentsForSubject, getClassForSubject } from "./subject-api";
import { useSubjectQueries } from "./use-subject-queries";
import { useSubjectMutations } from "./use-subject-mutations";
import { addSubjectToClass, removeSubjectFromClass } from "./subject-class-api";

export function useSubjects() {
  const queries = useSubjectQueries();
  const mutations = useSubjectMutations();
  
  return {
    ...queries,
    ...mutations,
    getSubjectById,
    getSubjectsByClassId,
    fetchSubjectsByClass: getSubjectsByClassId, // Alias for backward compatibility
    getStudentsForSubject,
    getClassForSubject,
    addSubjectToClass,
    removeSubjectFromClass
  };
}
