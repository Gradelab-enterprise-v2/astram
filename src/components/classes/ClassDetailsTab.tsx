
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface ClassDetailsTabProps {
  classData: {
    id: string;
    name: string;
    year: string;
    teacher?: string;
    grade?: string;
    room?: string;
    schedule?: string;
  } | null;
  isEditing: boolean;
  isLoading?: boolean;
}

export function ClassDetailsTab({ classData, isEditing, isLoading = false }: ClassDetailsTabProps) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!classData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Class Not Found</CardTitle>
          <CardDescription>
            The requested class information could not be loaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">There was a problem loading the class details. Please try again or check if the class exists.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate("/classes")}>
            Back to Classes
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{classData.name} Details</CardTitle>
        <CardDescription>
          {isEditing ? "Edit the class details" : "View class details"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium leading-none">Academic Year</p>
            <p className="text-muted-foreground">{classData.year}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Class Teacher</p>
            <p className="text-muted-foreground">{classData.teacher || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Grade</p>
            <p className="text-muted-foreground">{classData.grade || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Room</p>
            <p className="text-muted-foreground">{classData.room || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Schedule</p>
            <p className="text-muted-foreground">{classData.schedule || "-"}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isEditing ? null : (
          <Button onClick={() => navigate(`/classes/${classData.id}/edit`)}>
            Edit Class
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
