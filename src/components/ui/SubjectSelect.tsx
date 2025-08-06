
import { useSubjects } from "@/hooks/use-subjects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubjectSelectProps {
  value: string;
  onChange: (value: string) => void;
  includeNone?: boolean;
}

export function SubjectSelect({ value, onChange, includeNone = true }: SubjectSelectProps) {
  const { subjects, isLoading } = useSubjects();

  // Make sure value is never an empty string
  const safeValue = value || (includeNone ? "none" : (subjects.length > 0 ? subjects[0].id : "loading"));

  // Add a proper handler for the onChange event
  const handleValueChange = (newValue: string) => {
    onChange(newValue === "none" ? "" : newValue);
  };

  return (
    <Select value={safeValue} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a subject" />
      </SelectTrigger>
      <SelectContent>
        {includeNone && (
          <SelectItem value="none">Select a subject</SelectItem>
        )}
        {isLoading ? (
          <SelectItem value="loading" disabled>
            Loading subjects...
          </SelectItem>
        ) : subjects.length === 0 ? (
          <SelectItem value="no_subjects" disabled>
            No subjects available
          </SelectItem>
        ) : (
          subjects.map((subject) => (
            <SelectItem key={subject.id} value={subject.id || "undefined_id"}>
              {subject.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
