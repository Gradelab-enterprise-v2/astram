
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useTests } from "@/hooks/use-tests";
import { useSubjects } from "@/hooks/use-subjects";
import { ArrowLeft, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { useClasses } from "@/hooks/use-classes";

export default function SubjectTests() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  
  const { subjects, isLoading: subjectsLoading } = useSubjects();
  const { useTestsBySubject, createTest, isCreating } = useTests();
  const { classes, isLoading: classesLoading } = useClasses();
  
  const { data: tests = [], isLoading: testsLoading } = useTestsBySubject(subjectId || "");
  
  const [subject, setSubject] = useState<any>(null);
  
  useEffect(() => {
    if (subjects && subjectId) {
      const foundSubject = subjects.find(s => s.id === subjectId);
      if (foundSubject) {
        setSubject(foundSubject);
      }
    }
  }, [subjects, subjectId]);

  const form = useForm({
    defaultValues: {
      title: "",
      subject_id: subjectId || "",
      class_id: "",
      date: new Date().toISOString().split("T")[0],
      max_marks: 100,
    },
  });

  const onSubmit = (data) => {
    createTest({
      ...data,
      date: new Date(data.date).toISOString().split("T")[0],
      max_marks: parseInt(data.max_marks, 10),
    }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  const handleTestClick = (testId: string) => {
    navigate(`/tests/${testId}`);
  };
  
  const handleBackClick = () => {
    navigate("/tests");
  };

  if (subjectsLoading || !subject) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-page-transition-in">
      <div>
        <Button 
          variant="outline" 
          className="mb-4 flex items-center gap-2"
          onClick={handleBackClick}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Subjects
        </Button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{subject.name} Tests</h1>
            <p className="text-muted-foreground">Subject Code: {subject.code || "—"}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Test
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Test</DialogTitle>
                <DialogDescription>
                  Create a new test for {subject.name}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Mid-term Test" required {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="class_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classesLoading ? (
                              <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                            ) : classes && classes.length > 0 ? (
                              classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No classes available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Test Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(date.toISOString().split('T')[0]);
                                }
                              }}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_marks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Marks</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            placeholder="100" 
                            required 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={isCreating} className="bg-primary">
                      {isCreating ? "Creating..." : "Create Test"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">All Tests</h2>
            <p className="text-muted-foreground mb-6">Manage all tests for {subject.name}</p>
          </div>

          {testsLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No tests found for this subject. Click "Add Test" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Max Marks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow 
                    key={test.id}
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleTestClick(test.id)}
                  >
                    <TableCell className="font-medium">{test.title}</TableCell>
                    <TableCell>{test.class?.name || "—"}</TableCell>
                    <TableCell>{format(new Date(test.date), "d MMM yyyy")}</TableCell>
                    <TableCell>{test.max_marks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
