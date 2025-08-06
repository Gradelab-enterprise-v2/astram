import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CsvMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  csvHeaders: string[];
  csvData: string[][];
  onMappingComplete: (mapping: Record<string, string>) => void;
}

const REQUIRED_FIELDS = ["name", "gr_number", "roll_number"];

export function CsvMappingDialog({ isOpen, onClose, csvHeaders, csvData, onMappingComplete }: CsvMappingDialogProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const studentFields = [
    { value: "name", label: "Name", required: true },
    { value: "gr_number", label: "GR Number", required: true },
    { value: "roll_number", label: "Roll Number", required: true },
    { value: "email", label: "Email", required: false },
    { value: "phone", label: "Phone", required: false },
    { value: "address", label: "Address", required: false },
  ];

  useEffect(() => {
    if (isOpen) {
      setMapping({});
      setShowPreview(false);
    }
  }, [isOpen]);

  const handleMappingChange = (csvHeader: string, field: string) => {
    setMapping(prev => ({
      ...prev,
      [csvHeader]: field
    }));
  };

  const validateMapping = () => {
    const mappedFields = Object.values(mapping);
    const missingFields = REQUIRED_FIELDS.filter(field => !mappedFields.includes(field));
    
    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(", ")}`);
      return false;
    }
    
    return true;
  };

  const handlePreview = () => {
    if (!validateMapping()) {
      return;
    }
    setShowPreview(true);
  };

  const handleSubmit = () => {
    if (!validateMapping()) {
      return;
    }

    setIsSubmitting(true);
    try {
      onMappingComplete(mapping);
      onClose();
    } catch (error) {
      console.error("Error in mapping:", error);
      toast.error("Failed to process mapping");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPreviewData = () => {
    if (!showPreview) return [];
    
    return csvData.slice(1, 6).map(row => {
      const mappedRow: Record<string, string> = {};
      csvHeaders.forEach((header, index) => {
        const field = mapping[header];
        if (field) {
          mappedRow[field] = row[index] || "";
        }
      });
      return mappedRow;
    });
  };

  const getMissingRequiredFields = () => {
    const mappedFields = Object.values(mapping);
    return REQUIRED_FIELDS.filter(field => !mappedFields.includes(field));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Map CSV Columns</DialogTitle>
          <DialogDescription>
            Map your CSV columns to the corresponding student fields. Required fields are marked with *
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {getMissingRequiredFields().length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please map the following required fields: {getMissingRequiredFields().join(", ")}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            {csvHeaders.map((header) => (
              <div key={header} className="flex items-center gap-4">
                <Label htmlFor={header} className="w-32">
                  CSV Column: {header}
                </Label>
                <Select
                  value={mapping[header] || ""}
                  onValueChange={(value) => handleMappingChange(header, value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {studentFields.map((field) => (
                      <SelectItem 
                        key={field.value} 
                        value={field.value}
                        disabled={Object.values(mapping).includes(field.value)}
                        className={field.required ? "font-semibold" : ""}
                      >
                        {field.label}
                        {field.required && " *"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {showPreview && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Preview of Mapped Data</h3>
              <div className="border rounded-md overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.values(mapping).map(field => (
                        <TableHead key={field} className={REQUIRED_FIELDS.includes(field) ? "font-semibold" : ""}>
                          {studentFields.find(f => f.value === field)?.label}
                          {REQUIRED_FIELDS.includes(field) && " *"}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPreviewData().map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(mapping).map(field => (
                          <TableCell key={field} className={REQUIRED_FIELDS.includes(field) ? "font-medium" : ""}>
                            {row[field] || ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {!showPreview ? (
            <Button onClick={handlePreview} disabled={isSubmitting}>
              Preview Mapping
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm and Import"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 