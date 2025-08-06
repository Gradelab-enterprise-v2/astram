
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Search, BookOpen } from "lucide-react";
import { useSubjects } from "@/hooks/use-subjects";
import { ClassSelect } from "@/components/ui/ClassSelect";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Subjects() {
  const { subjects, createSubject, isLoading, isCreating } = useSubjects();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      name: "",
      code: "",
      class: "", // Changed from semester to class
    },
  });

  const onSubmit = (data) => {
    createSubject(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  const filteredSubjects = subjects.filter((subject) => 
    subject.name.toLowerCase().includes(search.toLowerCase()) ||
    subject.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-page-transition-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription>
                Enter the subject details to add them to your system.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter subject name" required {...field} />
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
                      <FormLabel>Subject Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter subject code" required {...field} />
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
                      <FormLabel>Class</FormLabel>
                      <FormControl>
                        <ClassSelect value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Adding..." : "Add Subject"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search subjects..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      ) : filteredSubjects.length === 0 ? (
        <Card className="border border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No Subjects Yet</CardTitle>
            <CardDescription>Get started by adding your first subject</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Add subjects, link them to classes, and manage curriculum details for better academic organization.
            </p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="mt-6 bg-primary">Add Subject</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Class</TableHead> {/* Changed from Semester to Class */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.map((subject) => (
                  <TableRow 
                    key={subject.id} 
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => navigate(`/subjects/${subject.id}`)}
                  >
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>{subject.code}</TableCell>
                    <TableCell>{subject.class}</TableCell> {/* Changed from semester to class */}
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
