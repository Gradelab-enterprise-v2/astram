import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useUserProfile } from "@/hooks/use-profile";
import { useEffect } from "react";
import Intercom from '@intercom/messenger-js-sdk';
import { Toaster } from "@/components/ui/toaster";
import ClassesIndex from "./pages/classes/Index";
import ClassDetails from "./pages/classes/ClassDetails";
import NewClass from "./pages/classes/NewClass";
import EditClass from "./pages/classes/EditClass";
import SubjectsIndex from "./pages/subjects/Index";
import SubjectDetails from "./pages/subjects/SubjectDetails";
import StudentsIndex from "./pages/students/Index";
import StudentDetails from "./pages/students/StudentDetails";
import NewStudent from "./pages/students/NewStudent";
import EditStudent from "./pages/students/EditStudent";
import TestsIndex from "./pages/tests/Index";
import TestDetails from "./pages/tests/TestDetails";
import ResourcesIndex from "./pages/resources/Index";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Profile from "./pages/settings/Index";
import SubjectTests from "./pages/tests/SubjectTests";
import AutoGradeDashboard from "./pages/auto-grade/Index";
import Evaluate from "./pages/auto-grade/Evaluate";
import StudentEvaluation from "./pages/auto-grade/StudentEvaluation";
import AssessmentSummary from "./pages/auto-grade/AssessmentSummary";
import Index from "./pages/Index";
import { AppLayout } from "./components/layout/AppLayout";
import { PublicLayout } from "./components/layout/PublicLayout";
import QuestionGeneration from "./pages/question-generation/Index";
import QuestionHistory from "./pages/question-generation/History";
import GeneratedQuestions from "./pages/question-generation/GeneratedQuestions";
import AdminPanel from "./pages/settings/AdminPanel";
import { ThemeProvider } from "next-themes";
import { RazorpayProvider } from "@/components/payments/RazorpayProvider";
import { SystemSettingsProvider } from "./context/SystemSettingsContext";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { AdminDashboard } from "@/pages/admin/dashboard";
import { AdminUsers } from "@/pages/admin/users";
import { ADMIN_ROUTE } from "@/lib/constants";
import EditSubject from "./pages/subjects/EditSubject";
import ResetPassword from "./pages/ResetPassword";
import GoogleClassroomIntegration from "@/pages/GoogleClassroomIntegration";
import GoogleClassroomCallback from "@/pages/GoogleClassroomCallback";

function IntercomIntegration() {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  useEffect(() => {
    if (user && profile) {
      Intercom({
        app_id: 'wis73oxc',
        user_id: user.id,
        name: profile.name || (user.email ? user.email.split('@')[0] : "User"),
        email: user.email,
        created_at: user.created_at ? Math.floor(new Date(user.created_at).getTime() / 1000) : undefined,
      });
    }
  }, [user, profile]);

  return null;
}

function App() {
  const { user } = useAuth();
  const location = useLocation();

  // Check for recovery (password reset) in the URL
  const isRecovery = (
    location.pathname === "/reset-password" ||
    location.hash.includes("type=recovery") ||
    location.hash.includes("access_token") ||
    location.search.includes("type=recovery") ||
    location.search.includes("access_token")
  );

  // Handle recovery flow redirection
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace('#', ''));
    
    // Check if this is a recovery flow
    const type = params.get('type') || hash.get('type');
    const token = params.get('token') || hash.get('access_token');
    
    if (type === 'recovery' && token) {
      // Redirect to reset password page with the token
      window.location.href = `/reset-password?token=${token}&type=${type}`;
    }
  }, [location]);

  return (
    <ThemeProvider defaultTheme="dark" forcedTheme="dark" storageKey="gradelab-theme">
      <SystemSettingsProvider>
        <RazorpayProvider>
          <IntercomIntegration />
          <Routes>
            {/* Root route - redirect to dashboard if logged in, login if not, but allow reset-password/recovery */}
            <Route path="/" element={
              user && !isRecovery ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            } />
            
            {/* Public Routes */}
            <Route path="/login" element={
              user && !isRecovery ? <Navigate to="/dashboard" /> : <PublicLayout><Login /></PublicLayout>
            } />
            {/* Signup route removed - only login is available */}

            {/* Private Routes - accessible only when authenticated */}
            <Route path="/dashboard" element={
              <AppLayout><Dashboard /></AppLayout>
            } />
            <Route path="/profile" element={
              <AppLayout><Profile /></AppLayout>
            } />

            {/* Academics Routes */}
            <Route path="/classes" element={
              <AppLayout><ClassesIndex /></AppLayout>
            } />
            <Route path="/classes/new" element={
              <AppLayout><NewClass /></AppLayout>
            } />
            <Route path="/classes/:id" element={
              <AppLayout><ClassDetails /></AppLayout>
            } />
            <Route path="/classes/:id/edit" element={
              <AppLayout><EditClass /></AppLayout>
            } />
            <Route path="/subjects" element={
              <AppLayout><SubjectsIndex /></AppLayout>
            } />
            <Route path="/subjects/:id" element={
              <AppLayout><SubjectDetails /></AppLayout>
            } />
            <Route path="/subjects/:id/edit" element={
              <AppLayout><EditSubject /></AppLayout>
            } />
            <Route path="/students" element={
              <AppLayout><StudentsIndex /></AppLayout>
            } />
            <Route path="/students/new" element={
              <AppLayout><NewStudent /></AppLayout>
            } />
            <Route path="/students/:id" element={
              <AppLayout><StudentDetails /></AppLayout>
            } />
            <Route path="/students/:id/edit" element={
              <AppLayout><EditStudent /></AppLayout>
            } />

            {/* Auto Grade Routes */}
            <Route path="/auto-grade" element={
              <AppLayout><AutoGradeDashboard /></AppLayout>
            } />
            <Route path="/auto-grade/evaluate" element={
              <AppLayout><Evaluate /></AppLayout>
            } />
            <Route path="/auto-grade/evaluation/:testId/:studentId" element={
              <AppLayout><StudentEvaluation /></AppLayout>
            } />
            <Route path="/auto-grade/assessment-summary/:testId/:studentId" element={
              <AppLayout><AssessmentSummary /></AppLayout>
            } />

            {/* Resources Routes */}
            <Route path="/resources" element={
              <AppLayout><ResourcesIndex /></AppLayout>
            } />

            {/* Tests Routes */}
            <Route path="/tests" element={
              <AppLayout><TestsIndex /></AppLayout>
            } />
            <Route path="/tests/:id" element={
              <AppLayout><TestDetails /></AppLayout>
            } />
            <Route path="/tests/subject/:subjectId" element={
              <AppLayout><SubjectTests /></AppLayout>
            } />

            {/* Question Generation Routes */}
            <Route path="/question-generation" element={
              <AppLayout><QuestionGeneration /></AppLayout>
            } />
            <Route path="/question-generation/history" element={
              <AppLayout><QuestionHistory /></AppLayout>
            } />
            <Route path="/question-generation/generated" element={
              <AppLayout><GeneratedQuestions /></AppLayout>
            } />
            <Route path="/question-bank" element={
              <AppLayout><Navigate to="/question-generation" replace /></AppLayout>
            } />
          
            {/* Settings Routes */}
            <Route path="/settings" element={
              <AppLayout><Profile /></AppLayout>
            } />
            <Route path="/settings/admin" element={
              <AppLayout><AdminPanel /></AppLayout>
            } />

            {/* Admin routes */}
            <Route path={ADMIN_ROUTE} element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>

            {/* Add the reset password route explicitly */}
            <Route path="/reset-password" element={
              user ? <Navigate to="/dashboard" /> : <PublicLayout><ResetPassword /></PublicLayout>
            } />

            {/* Google Classroom Integration Routes */}
            <Route path="/google-classroom" element={
              <AppLayout><GoogleClassroomIntegration /></AppLayout>
            } />
            <Route path="/google-classroom/callback" element={
              <GoogleClassroomCallback />
            } />

            {/* Catch-all route for redirecting to dashboard if authenticated or signin if not, but allow reset-password/recovery */}
            <Route path="*" element={
              user && !isRecovery ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            } />
          </Routes>
          <Toaster />
        </RazorpayProvider>
      </SystemSettingsProvider>
    </ThemeProvider>
  );
}

export default App;
