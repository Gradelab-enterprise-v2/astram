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
import { useSubjects } from "@/hooks/use-subjects";
import { ClassSelect } from "@/components/ui/ClassSelect";
import { useSubjectEnrollments } from "@/hooks/use-subject-enrollments";

const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().min(1, "Subject code is required"),
  class: z.string().min(1, "Class is required"),
  semester: z.string().optional(),
  information: z.string().optional(),
});

export default function EditSubject() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSubjectById, updateSubject, isUpdating, getClassForSubject, addSubjectToClass, removeSubjectFromClass } = useSubjects();
  const { enrollClassStudentsInSubject } = useSubjectEnrollments();
  const [loading, setLoading] = useState(true);
  const [originalClassId, setOriginalClassId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof subjectSchema>>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: "",
      code: "",
      class: "",
      semester: "",
      information: "",
    },
  });

  useEffect(() => {
    const loadSubject = async () => {
      try {
        if (!id) {
          setLoadError("Missing subject ID");
          setLoading(false);
          return;
        }
        setLoading(true);
        setLoadError(null);
        const subjectData = await getSubjectById(id);
        if (!subjectData) {
          setLoadError("Subject not found");
          setLoading(false);
          return;
        }
        form.reset({
          name: subjectData.name || "",
          code: subjectData.code || "",
          class: subjectData.class || "",
          semester: subjectData.semester || "",
          information: subjectData.information || "",
        });
        const classObj = await getClassForSubject(id);
        setOriginalClassId(classObj?.id || null);
        setLoading(false);
      } catch (error) {
        console.error("Error loading subject:", error);
        setLoadError("Failed to load subject data");
        setLoading(false);
      }
    };
    loadSubject();
  }, [id, getSubjectById, getClassForSubject, form]);

  const onSubmit = async (data: z.infer<typeof subjectSchema>) => {
    if (!id) return;
    try {
      const subjectData = {
        id,
        name: data.name,
        code: data.code,
        class: data.class,
        semester: data.semester,
        information: data.information,
      };
      await updateSubject(subjectData, {
        onSuccess: async () => {
          if (data.class !== originalClassId) {
            try {
              if (originalClassId) {
                await removeSubjectFromClass({ classId: originalClassId, subjectId: id });
              }
              if (data.class) {
                await addSubjectToClass({ classId: data.class, subjectId: id });
                await enrollClassStudentsInSubject({ classId: data.class, subjectId: id });
              }
            } catch (err) {
              toast.error("Failed to sync class assignment: " + (err as Error).message);
            }
          }
          toast.success("Subject updated successfully");
          navigate(`/subjects/${id}`);
        },
        onError: (error: Error) => {
          toast.error(`Failed to update subject: ${error.message}`);
        },
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to update subject. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{loadError}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/subjects")}>Back to Subjects</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Edit Subject</h1>
        <Button variant="outline" onClick={() => navigate(`/subjects/${id}`)}>
          Cancel
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Subject Information</CardTitle>
          <CardDescription>Update the details for this subject</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Mathematics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., MATH101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class *</FormLabel>
                    <FormControl>
                      <ClassSelect value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="information"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Information</FormLabel>
                    <FormControl>
                      <Input placeholder="Any extra details..." {...field} />
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
    </div>
  );
} 