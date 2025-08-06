import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useStudents } from "@/hooks/use-students";
import { useSubjects } from "@/hooks/use-subjects";
import { useTests } from "@/hooks/use-tests";
import { useClasses } from "@/hooks/use-classes";
import { useQuestionBank } from "@/hooks/use-question-bank";
import { useAdmin } from "@/hooks/use-admin";
import {
  Users,
  BookOpen,
  ClipboardCheck,
  FolderKanban,
  BrainCircuit,
  FolderClosed,
  BarChart4,
  Settings,
  ShieldCheck,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { GoogleClassroomSyncService } from "@/integrations/google-classroom/services/sync.service";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { students } = useStudents();
  const { subjects } = useSubjects();
  const { useAllTests } = useTests();
  const { data: tests = [] } = useAllTests();
  const { classes } = useClasses();
  const { questions } = useQuestionBank();
  const { isAdmin } = useAdmin();
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  useEffect(() => {
    checkGoogleClassroomConnection();
  }, []);

  const checkGoogleClassroomConnection = async () => {
    try {
      const { data: connections, error } = await supabase
        .from('google_classroom_connections')
        .select('id, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      if (connections && connections.length > 0) {
        setConnectionId(connections[0].id);
      }
    } catch (error) {
      console.error('Error checking Google Classroom connection:', error);
    }
  };

  const handleSync = async () => {
    if (!connectionId) {
      navigate('/google-classroom');
      return;
    }

    try {
      setIsSyncing(true);
      const { data: connections, error } = await supabase
        .from('google_classroom_connections')
        .select('access_token, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !connections || connections.length === 0) {
        throw new Error('Connection not found');
      }

      const syncService = new GoogleClassroomSyncService(connections[0].access_token);
      const result = await syncService.syncAll(connectionId);

      toast({
        title: 'Sync Complete',
        description: `Synced ${result.courses.length} courses and ${result.students.length} students`
      });
    } catch (error) {
      console.error('Error syncing:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync with Google Classroom',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const upcomingTests = tests.filter((test: any) => 
    new Date(test.date) > new Date() && test.status !== 'Completed'
  );
  
  const quickAccessItems = [
    {
      title: "Students",
      description: "Manage student profiles and information",
      icon: Users,
      href: "/students",
    },
    {
      title: "Classes",
      description: "Organize and manage class schedules",
      icon: FolderKanban,
      href: "/classes",
    },
    {
      title: "Subjects",
      description: "Curriculum and subject management",
      icon: BookOpen,
      href: "/subjects",
    },
    {
      title: "Tests",
      description: "Create and manage assessments",
      icon: ClipboardCheck,
      href: "/tests",
    },
    {
      title: "Question Generation",
      description: "AI-powered question creation",
      icon: BrainCircuit,
      href: "/question-generation",
    },
    {
      title: "Auto Grade",
      description: "Automated grading system",
      icon: BrainCircuit,
      href: "/auto-grade",
    },
    {
      title: "Resources",
      description: "Educational materials and resources",
      icon: FolderClosed,
      href: "/resources",
    },
    {
      title: "Settings",
      description: "System configuration and preferences",
      icon: Settings,
      href: "/settings",
    }
  ];

  const studentCount = Array.isArray(students) ? students.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {isAdmin && (
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => navigate("/admingl304")}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin Dashboard
          </Button>
        )}
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Total Students</div>
            <div className="text-3xl font-bold">{studentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Active Classes</div>
            <div className="text-3xl font-bold">{classes?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Subjects</div>
            <div className="text-3xl font-bold">{subjects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Upcoming Tests</div>
            <div className="text-3xl font-bold">{upcomingTests.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Google Classroom</div>
                  <div className="text-lg font-semibold">
                    {connectionId ? 'Connected' : 'Not Connected'}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <BrainCircuit className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : connectionId ? (
                  <>
                    <BrainCircuit className="h-4 w-4" />
                    Sync Now
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-4 w-4" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">Quick Access</h2>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {quickAccessItems.map((item, index) => (
          <Card 
            key={index} 
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => navigate(item.href)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
