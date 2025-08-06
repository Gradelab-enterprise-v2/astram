
import { Check, Search, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavigateFunction } from "react-router-dom";

interface StudentSelectionDialogProps {
  showStudentDialog: boolean;
  setShowStudentDialog: (show: boolean) => void;
  studentSearchQuery: string;
  setStudentSearchQuery: (query: string) => void;
  filteredClassmates: any[];
  studentId: string;
  testId: string;
  navigate: NavigateFunction;
}

export function StudentSelectionDialog({
  showStudentDialog,
  setShowStudentDialog,
  studentSearchQuery,
  setStudentSearchQuery,
  filteredClassmates,
  studentId,
  testId,
  navigate
}: StudentSelectionDialogProps) {
  // Handle student selection properly
  const handleStudentSelect = (studentId: string) => {
    // First close the dialog to prevent UI issues
    setShowStudentDialog(false);
    
    // Then navigate to the new student after a small delay
    // This helps prevent UI interaction issues
    setTimeout(() => {
      navigate(`/auto-grade/evaluation/${testId}/${studentId}`);
    }, 50);
  };

  return (
    <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Student</DialogTitle>
          <DialogDescription>
            Choose a student to view their evaluation
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-8"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-1 pr-2">
              {filteredClassmates.map((student) => (
                <div
                  key={student.id}
                  className={`p-3 rounded-md flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 ${
                    student.id === studentId ? 'bg-slate-100 dark:bg-slate-800/70' : ''
                  }`}
                  onClick={() => handleStudentSelect(student.id)}
                >
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5 text-muted-foreground" />
                    <span>{student.name}</span>
                    {student.roll_no && (
                      <span className="text-xs text-muted-foreground">({student.roll_no})</span>
                    )}
                  </div>
                  {student.id === studentId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
              {filteredClassmates.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No students found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
