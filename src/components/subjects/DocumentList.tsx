
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChapterMaterial } from "@/hooks/use-chapter-materials";
import { FileText, Eye, Trash2, Loader2 } from "lucide-react";

interface DocumentListProps {
  documents: ChapterMaterial[];
  isLoading: boolean;
  onViewDocument: (document: ChapterMaterial) => void;
  onDeleteDocument: (document: ChapterMaterial) => void;
}

export function DocumentList({ 
  documents, 
  isLoading, 
  onViewDocument, 
  onDeleteDocument 
}: DocumentListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject Documents</CardTitle>
        <CardDescription>Access all materials for this subject</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading documents...</p>
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No documents have been uploaded for this subject yet.
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div 
                key={document.id}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium">{document.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => onViewDocument(document)}
                  >
                    {document.extraction_status === "processing" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDeleteDocument(document)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only md:not-sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
