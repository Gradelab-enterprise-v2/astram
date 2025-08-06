
import { useClasses } from "@/hooks/use-classes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface ClassSelectProps {
  value: string;
  onChange: (value: string) => void;
  includeNone?: boolean;
  disabled?: boolean;
}

export function ClassSelect({ value, onChange, includeNone = false, disabled = false }: ClassSelectProps) {
  const { classes, isLoading, error } = useClasses();

  // Make sure value is never an empty string
  const safeValue = value || (includeNone ? "none" : "loading");

  if (isLoading && !disabled) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (error && !disabled) {
    return (
      <Select disabled value="error">
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Error loading classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="error" disabled>
            Error: {error.message || "Failed to load classes"}
          </SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={safeValue} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a class" />
      </SelectTrigger>
      <SelectContent>
        {includeNone && (
          <SelectItem value="none">No Class</SelectItem>
        )}
        {isLoading ? (
          <SelectItem value="loading" disabled>
            Loading classes...
          </SelectItem>
        ) : classes.length === 0 ? (
          <SelectItem value="no_classes" disabled>
            No classes available
          </SelectItem>
        ) : (
          classes.map((classItem) => (
            <SelectItem 
              key={classItem.id} 
              value={classItem.id || `class_${Math.random().toString(36).substring(2, 9)}`}
            >
              {classItem.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
