import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTests } from "@/hooks/use-tests";
import { format } from "date-fns";
import { Plus, Loader2, Search, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Tests() {
  const navigate = useNavigate();
  const { useAllTests, deleteTest, isDeleting } = useTests();
  const { data: tests = [], isLoading } = useAllTests();
  const [searchQuery, setSearchQuery] = useState("");
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Filter tests based on search query
  const filteredTests = tests.filter(test => {
    const searchTerms = searchQuery.toLowerCase().split(" ");
    const testData = [
      test.title,
      test.subject?.name || "",
      test.class?.name || "",
      format(new Date(test.date), "d MMM yyyy")
    ].map(term => term.toLowerCase());
    
    // Check if all search terms match any of the test data
    return searchTerms.every(term => 
      testData.some(data => data.includes(term))
    );
  });

  const handleCreateTest = () => {
    navigate("/tests/new");
  };
  
  const handleRowClick = (testId: string) => {
    navigate(`/tests/${testId}`);
  };
  
  const handleDeleteTest = (id: string) => {
    deleteTest(id, {
      onSuccess: () => {
        setTestToDelete(null);
        // Invalidate all relevant queries to ensure data consistency
        queryClient.invalidateQueries({ queryKey: ["tests"] });
        queryClient.invalidateQueries({ queryKey: ["test-papers"] });
        queryClient.invalidateQueries({ queryKey: ["test-results"] });
        toast.success("Test deleted successfully");
      }
    });
  };
  
  const handleEditTest = (e: React.MouseEvent, testId: string) => {
    e.stopPropagation();
    navigate(`/tests/${testId}`);
  };

  return (
    <div className="space-y-6 animate-page-transition-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tests Management</h1>
        <Button onClick={handleCreateTest}>
          <Plus className="mr-2 h-4 w-4" />
          Create Test
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Tests</CardTitle>
          <div className="flex mt-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tests..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">Loading tests...</p>
              </div>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No tests found matching your search query." : "No tests found. Click 'Create Test' to add your first test."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((test) => (
                  <TableRow 
                    key={test.id}
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => testToDelete !== test.id && handleRowClick(test.id)}
                  >
                    <TableCell className="font-medium">{test.title}</TableCell>
                    <TableCell>{test.subject?.name || '—'}</TableCell>
                    <TableCell>{test.class?.name || '—'}</TableCell>
                    <TableCell>{format(new Date(test.date), "d MMM yyyy")}</TableCell>
                    <TableCell>{test.max_marks}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => handleEditTest(e, test.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog open={testToDelete === test.id} onOpenChange={(open) => !open && setTestToDelete(null)}>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-destructive border-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTestToDelete(test.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Test</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{test.title}"? This action cannot be undone 
                                and will remove all associated papers and results.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTest(test.id)}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {isDeleting && testToDelete === test.id ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
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
