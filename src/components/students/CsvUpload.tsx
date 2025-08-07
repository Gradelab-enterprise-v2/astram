import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CsvMappingDialog } from "./CsvMappingDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ClassSelect } from "@/components/ui/ClassSelect";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

interface CsvUploadProps {
  onSuccess?: () => void;
}

export function CsvUpload({ onSuccess }: CsvUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv") {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(selectedFile);
      readCsvFile(selectedFile);
    }
  };

  const readCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").map(line => line.split(",").map(cell => cell.trim()));
      setCsvHeaders(lines[0]);
      setCsvData(lines);
      setShowMappingDialog(true);
    };
    reader.readAsText(file);
  };

  const handleMappingComplete = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
    processCsvFile(mapping);
  };

  const processCsvFile = async (mapping: Record<string, string>) => {
    if (!file || Object.keys(mapping).length === 0) return;

    if (!selectedClassId || selectedClassId === "none") {
      toast.error("Please select a class for the students");
      return;
    }

    setIsUploading(true);
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`);
      }
      
      if (!user) {
        throw new Error("No authenticated user found");
      }

      // Process each row
      const students = csvData.slice(1).map(row => {
        const student: Record<string, string> = {};
        
        csvHeaders.forEach((header, index) => {
          const field = mapping[header];
          if (field) {
            student[field] = row[index] || "";
          }
        });
        
        // Add user_id, year, and class_id to each student
        return {
          ...student,
          user_id: user.id,
          year: new Date().getFullYear().toString(),
          class_id: selectedClassId || null
        };
      }).filter(student => Object.keys(student).length > 0);

      // Upload students to database
      const { error } = await supabase
        .from("students")
        .insert(students);

      if (error) {
        throw error;
      }

      // Invalidate relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["students", "without-class"] })
      ]);

      toast.success(`Successfully imported ${students.length} students to the selected class`);
      setFile(null);
      setColumnMapping({});
      setSelectedClassId("");
      setShowConfirmation(true); // Show confirmation dialog
      onSuccess?.();
    } catch (error: any) {
      console.error("Error processing CSV:", error);
      toast.error("Failed to import students from CSV");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ["name", "gr_number", "roll_number", "email", "phone", "address"];
    const sampleData = [
      "John Doe,GR001,1,john.doe@example.com,+1234567890,123 Main St",
      "Jane Smith,GR002,2,jane.smith@example.com,+1234567891,456 Oak Ave",
      "Mike Johnson,GR003,3,mike.johnson@example.com,+1234567892,789 Pine Rd"
    ];
    const csvContent = headers.join(",") + "\n" + sampleData.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Import Students via CSV</h3>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file containing student information. Required fields: Name, GR Number, and Roll Number. 
          Students will be assigned to the selected class.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Make sure your CSV file includes the following required fields: Name, GR Number, and Roll Number. 
          Students will be automatically assigned to the selected class.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="csv">Upload CSV File</Label>
                <p className="text-sm text-muted-foreground">
                  Select a CSV file to import student data
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="class">Select Class</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Choose the class to assign the imported students to
                </p>
                <ClassSelect
                  value={selectedClassId}
                  onChange={setSelectedClassId}
                  includeNone={true}
                />
              </div>

              <div className="flex items-center gap-4">
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="flex-1"
                />
                {file && (
                  <Button
                    onClick={() => setShowMappingDialog(true)}
                    disabled={isUploading || !selectedClassId || selectedClassId === "none"}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Map Columns
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CsvMappingDialog
        isOpen={showMappingDialog}
        onClose={() => setShowMappingDialog(false)}
        csvHeaders={csvHeaders}
        csvData={csvData}
        onMappingComplete={handleMappingComplete}
      />

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Complete</AlertDialogTitle>
            <AlertDialogDescription>
              Students have been successfully imported. You will be redirected to the students list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate("/students", { replace: true })}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
