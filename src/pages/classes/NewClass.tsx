import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useClasses } from "@/hooks/use-classes";
import { toast } from "sonner";

const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  year: z.string().min(1, "Year is required"),
});

export default function NewClass() {
  const navigate = useNavigate();
  const { createClass, isCreating } = useClasses();
  
  const form = useForm<z.infer<typeof classSchema>>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      year: new Date().getFullYear().toString(),
    },
  });

  const onSubmit = (data: z.infer<typeof classSchema>) => {
    try {
      // Ensure all required fields are present
      const classData = {
        name: data.name,
        year: data.year,
      };
      
      createClass(classData, {
        onSuccess: () => {
          toast.success("Class created successfully");
          navigate("/classes");
        },
        onError: (error: Error) => {
          toast.error(`Failed to create class: ${error.message}`);
          console.error("Create class error:", error);
        }
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to create class. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Create New Class</h1>
        <Button variant="outline" onClick={() => navigate("/classes")}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Information</CardTitle>
          <CardDescription>Enter the details for the new class</CardDescription>
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
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Class"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
