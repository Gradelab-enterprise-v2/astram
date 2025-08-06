
import { useQuery } from "@tanstack/react-query";
import { getStudentById } from "./student-api";

// Student details hook for individual student access
export const useStudentDetails = (id: string) => {
  return useQuery({
    queryKey: ["student", id],
    queryFn: () => getStudentById(id),
    enabled: !!id
  });
};
