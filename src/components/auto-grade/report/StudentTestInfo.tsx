
import { Card, CardContent } from "@/components/ui/card";

interface StudentTestInfoProps {
  studentName: string;
  rollNumber?: string | number;
  className?: string;
  subjectName?: string;
  testTitle?: string;
  totalEarned: number;
  totalPossible: number;
  percentageScore: number;
}

export function StudentTestInfo({
  studentName,
  rollNumber,
  className,
  subjectName,
  testTitle,
  totalEarned,
  totalPossible,
  percentageScore
}: StudentTestInfoProps) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Student Name</p>
          <p className="text-base font-medium">{studentName}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Roll Number</p>
          <p className="text-base font-medium">{rollNumber || "N/A"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Class</p>
          <p className="text-base font-medium">{className || "N/A"}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Subject</p>
          <p className="text-base font-medium">{subjectName || "N/A"}</p>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Test</p>
          <p className="text-base font-medium">{testTitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">Total Score</p>
          <p className="text-xl font-bold">
            {totalEarned} / {totalPossible} ({percentageScore}%)
          </p>
        </div>
      </div>
    </>
  );
}
