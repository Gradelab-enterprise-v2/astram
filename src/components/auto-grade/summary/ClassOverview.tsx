import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ClassOverviewProps {
  testData: any;
  classData: any;
  currentStudentId: string | undefined;
}

export function ClassOverview({ testData, classData, currentStudentId }: ClassOverviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // Show 10 students per page
  
  if (!classData || !classData.overview) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">No class data available.</p>
        </CardContent>
      </Card>
    );
  }
  
  const { average, median, highest, lowest, rankings, gradeDistribution } = classData.overview;
  
  // Calculate pagination
  const totalPages = Math.ceil(rankings.length / pageSize);
  
  // Get current page data
  const paginatedRankings = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return rankings.slice(startIndex, endIndex);
  }, [rankings, currentPage, pageSize]);
  
  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Get grade distribution totals for display
  const gradeDistributionEntries = Object.entries(gradeDistribution).filter(([_, count]) => 
    typeof count === 'number' && (count as number) > 0
  );
  const totalStudents = rankings.length;
  
  // Prepare data for histogram
  const histogramData = Object.entries(gradeDistribution).map(([grade, count]) => ({
    grade,
    count: Number(count)
  }));
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Class Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Class Average</p>
              <p className="text-2xl font-bold">{average.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Median Score</p>
              <p className="text-2xl font-bold">{median.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Highest Score</p>
              <p className="text-2xl font-bold">{highest.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lowest Score</p>
              <p className="text-2xl font-bold">{lowest.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Student Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-center w-20">Grade</TableHead>
                  <TableHead className="text-center w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRankings.map((student: any, index: number) => {
                  const actualRank = ((currentPage - 1) * pageSize) + index + 1;
                  
                  return (
                    <TableRow 
                      key={student.id}
                      className={student.id === currentStudentId ? "bg-muted/50" : ""}
                    >
                      <TableCell>{actualRank}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <span className="text-xs">{getInitials(student.name)}</span>
                          </Avatar>
                          {student.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{student.scorePercentage.toFixed(1)}%</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getGradeBadgeColor(student.grade)}>
                          {student.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                          completed
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Calculate which page numbers to show
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) {
                      // Show first 5 pages
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      // Show last 5 pages
                      pageNum = totalPages - 4 + i;
                    } else {
                      // Show current page and 2 pages before and after
                      pageNum = currentPage - 2 + i;
                    }
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        isActive={currentPage === pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gradeDistributionEntries.map(([grade, count]) => (
                <div key={grade} className="flex items-center gap-2">
                  <p className="text-sm font-medium min-w-20">Grade {grade}</p>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={getGradeColor(grade as string)}
                      style={{ width: `${(Number(count) / totalStudents) * 100}%`, height: '100%' }}
                    ></div>
                  </div>
                  <p className="text-sm min-w-40">{String(count)} students ({((Number(count) / totalStudents) * 100).toFixed(0)}%)</p>
                </div>
              ))}
            </div>
            <div className="h-64 text-center text-muted-foreground text-sm mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="grade" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-md p-3 bg-blue-50">
              <h4 className="font-medium text-blue-700 mb-1">Common Misconceptions</h4>
              <p className="text-sm text-blue-800">
                The AI detected that 68% of students struggled with correctly applying Newton's Third Law in question 4.
              </p>
            </div>
            
            <div className="border rounded-md p-3 bg-green-50">
              <h4 className="font-medium text-green-700 mb-1">Strengths</h4>
              <p className="text-sm text-green-800">
                Most students (92%) demonstrated strong understanding of basic physics terminology and definitions.
              </p>
            </div>
            
            <div className="border rounded-md p-3 bg-yellow-50">
              <h4 className="font-medium text-yellow-700 mb-1">Suggested Focus Areas</h4>
              <p className="text-sm text-yellow-800">
                Consider reviewing practical applications of physics concepts and providing more real-world examples in future lessons.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGradeBadgeColor(grade: string): string {
  if (grade.startsWith('A')) return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100';
  if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
  if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100';
  return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100';
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'bg-green-500';
  if (grade.startsWith('B')) return 'bg-blue-500';
  if (grade.startsWith('C')) return 'bg-yellow-500';
  if (grade.startsWith('D')) return 'bg-orange-500';
  return 'bg-red-500';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
