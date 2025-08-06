
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Download, Calendar, Book, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { SelectItem, SelectTrigger, SelectValue, SelectContent, Select } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface TestOverviewProps {
  test: any;
  onUpdate?: (data: any) => Promise<void>;
}

export function TestOverview({ test, onUpdate }: TestOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const form = useForm({
    defaultValues: {
      title: test?.title || "",
      max_marks: test?.max_marks.toString() || "100",
      date: test?.date || new Date().toISOString().split("T")[0],
    }
  });
  
  const handleSubmit = async (data: any) => {
    if (onUpdate) {
      await onUpdate({
        title: data.title,
        max_marks: parseInt(data.max_marks, 10),
        date: data.date,
      });
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">{test?.title}</h2>
              <p className="text-muted-foreground">
                {test?.subject?.name ? (
                  <span className="flex items-center mt-1">
                    <Book className="h-4 w-4 mr-1" />
                    Subject: {test?.subject?.name}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex gap-2">
              {onUpdate && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Test Date</p>
              <p className="flex items-center text-muted-foreground">
                <Calendar className="h-4 w-4 mr-1" />
                {test?.date ? format(new Date(test.date), "PPP") : "Not set"}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Class</p>
              <p className="flex items-center text-muted-foreground">
                <Users className="h-4 w-4 mr-1" />
                {test?.class?.name || "Not assigned"}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Maximum Marks</p>
              <p className="text-muted-foreground">
                {test?.max_marks || 0} marks
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium">Test Papers</p>
              <p className="flex items-center text-muted-foreground">
                <FileText className="h-4 w-4 mr-1" />
                {test?.papers_count || 0} papers attached
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Test Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Test</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Date</FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date.toISOString().split('T')[0]);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
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
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
