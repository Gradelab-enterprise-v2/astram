import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Save } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input, YearInput } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Student } from "@/types/academics";
import { Class } from "@/types/academics";
import { useNavigate } from "react-router-dom";
import { CsvUpload } from "./CsvUpload";

interface StudentFormProps {
  student?: Student;
  classes: Class[];
  onSubmit: (data: any) => void;
  isUpdating: boolean;
  isCreating?: boolean;
  returnPath?: string;
  onCancel?: () => void;
}

export function StudentForm({ 
  student, 
  classes, 
  onSubmit, 
  isUpdating,
  isCreating = false,
  returnPath,
  onCancel
}: StudentFormProps) {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      name: "",
      gr_number: "",
      roll_number: "",
      year: new Date().getFullYear().toString(),
      class_id: "",
      email: "",
      phone: "",
      gender: "",
      date_of_birth: "",
      address: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name,
        gr_number: student.gr_number,
        roll_number: student.roll_number,
        year: student.year,
        class_id: student.class_id || "none",
        email: student.email || "",
        phone: student.phone || "",
        gender: student.gender || "",
        date_of_birth: student.date_of_birth ? format(new Date(student.date_of_birth), 'yyyy-MM-dd') : "",
        address: student.address || "",
        notes: student.notes || "",
      });
    }
  }, [student, form]);

  const handleFormSubmit = (data: any) => {
    const submitData = {
      ...data,
      class_id: data.class_id === "none" ? null : data.class_id
    };
    onSubmit(submitData);
  };

  const navigateBack = () => {
    if (onCancel) {
      onCancel();
    } else if (student && student.id) {
      navigate(`/students/${student.id}`);
    } else if (returnPath) {
      navigate(returnPath);
    } else {
      navigate("/students");
    }
  };

  const isNewStudent = !student;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {isNewStudent && (
          <div className="px-6 pt-4 space-y-6">
            <div className="space-y-4">
              <CsvUpload onClose={navigateBack} />
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or Add Manually
                </span>
              </div>
            </div>
          </div>
        )}
          
        <ScrollArea className={`${isNewStudent ? 'h-[calc(100vh-300px)]' : 'h-[calc(100vh-250px)]'} px-6 pb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isNewStudent ? "Full Name *" : "Student Name*"}</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter student name" required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gr_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GR Number*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter GR number" required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roll_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roll Number*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter roll number" required {...field} />
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
                  <FormLabel>Year*</FormLabel>
                  <FormControl>
                    <YearInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth*</FormLabel>
                  <FormControl>
                    <Input type="date" required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender*</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} required>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email*</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email" required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" required {...field} />
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
                  <FormLabel>Class {isNewStudent ? "(Optional)" : ""}</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="col-span-1 md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter address (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="col-span-1 md:col-span-2">
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes about the student (optional)" 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ScrollArea>
        
        <div className="flex justify-end pt-4 sticky bottom-0 bg-background pb-2 px-6">
          <Button 
            type="button" 
            variant="outline" 
            className="mr-2"
            onClick={navigateBack}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isUpdating || isCreating}>
            {!student ? (
              <>Create Student</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isUpdating || isCreating ? "Saving..." : "Save Changes"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
