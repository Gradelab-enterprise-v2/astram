import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useClasses } from "@/hooks/use-classes";
import { useSubjects } from "@/hooks/use-subjects";
import { useTests } from "@/hooks/use-tests";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface NewTestFormProps {
  onTestCreated: (testId: string) => void;
}

export function NewTestForm({ onTestCreated }: NewTestFormProps) {
  const { classes, isLoading: classesLoading } = useClasses();
  const { useSubjectsByClass } = useSubjects();
  const { createTest, isCreating } = useTests();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Use the new hook to fetch subjects by class ID
  const { 
    data: classSubjects = [], 
    isLoading: subjectsLoading 
  } = useSubjectsByClass(selectedClassId || "");
  
  const form = useForm({
    defaultValues: {
      title: "",
      subject_id: "",
      class_id: "",
      date: new Date().toISOString().split("T")[0],
      max_marks: 100,
    },
  });
  
  // Handle class selection change
  const handleClassChange = (classId: string) => {
    console.log("Class changed to:", classId);
    setSelectedClassId(classId);
    form.setValue("class_id", classId);
    form.setValue("subject_id", ""); // Reset subject when class changes
  };

  const onSubmit = (data: any) => {
    // Validate required fields
    if (!data.title) {
      toast.error("Test title is required");
      return;
    }

    if (!data.subject_id) {
      toast.error("Subject is required");
      return;
    }

    if (!data.class_id) {
      toast.error("Class is required");
      return;
    }

    createTest({
      title: data.title,
      subject_id: data.subject_id,
      class_id: data.class_id,
      date: new Date(data.date).toISOString().split("T")[0],
      max_marks: parseInt(data.max_marks, 10),
    }, {
      onSuccess: (createdTest) => {
        if (createdTest && createdTest.id) {
          toast.success("Test created successfully");
          navigate("/tests");
        } else {
          toast.error("Failed to create test: No test ID returned");
        }
      },
      onError: (error: any) => {
        toast.error(`Failed to create test: ${error.message}`);
        console.error("Test creation error:", error);
      }
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select 
                      onValueChange={handleClassChange}
                      defaultValue={field.value}
                      required
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
                name="subject_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!selectedClassId}
                      required
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedClassId ? "Select subject" : "Select a class first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!selectedClassId ? (
                          <SelectItem value="none" disabled>Select a class first</SelectItem>
                        ) : subjectsLoading ? (
                          <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                        ) : classSubjects && classSubjects.length > 0 ? (
                          classSubjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No subjects for this class</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
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
            </div>

            <Button 
              type="submit" 
              disabled={isCreating} 
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Test...
                </>
              ) : (
                "Create Test"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
