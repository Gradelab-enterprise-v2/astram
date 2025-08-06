import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useClasses } from "@/hooks/use-classes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  year: z.string().min(1, "Year is required"),
});

export default function EditClass() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { useClassById, updateClass, isUpdating } = useClasses();
  const { data: classData, isLoading, error } = useClassById(id || "");

  const form = useForm<z.infer<typeof classSchema>>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      year: "",
    },
  });

  useEffect(() => {
    if (classData) {
        form.reset({
          name: classData.name,
          year: classData.year,
        });
    }
  }, [classData, form]);

  const onSubmit = (data: z.infer<typeof classSchema>) => {
    if (!id) return;
    
    try {
      // Prepare data
      const classData = {
        id,
        name: data.name,
        year: data.year,
      };
      
      updateClass(classData, {
        onSuccess: () => {
          toast.success("Class updated successfully");
          navigate(`/classes/${id}`);
        },
        onError: (error: Error) => {
          toast.error(`Failed to update class: ${error.message}`);
        }
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to update class. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
        <p className="text-muted-foreground">Class not found</p>
        <Button onClick={() => navigate("/classes")}>Back to Classes</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Class</h1>
        <Button variant="outline" onClick={() => navigate(`/classes/${id}`)}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Information</CardTitle>
          <CardDescription>Update the details for this class</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Class 10A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {classData?.class_subjects && classData.class_subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assigned Subjects</CardTitle>
            <CardDescription>Subjects assigned to this class</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Subject Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classData.class_subjects.map((cs: any) => (
                  <TableRow key={cs.subject.id}>
                    <TableCell>{cs.subject.name}</TableCell>
                    <TableCell>{cs.subject.code}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
