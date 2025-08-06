import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL, ADMIN_ROUTE } from "@/lib/constants";
import { setupAdminAccount } from "@/lib/admin-utils";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [searchParams] = useSearchParams();
  const { user, signIn, resetPassword, isSupabaseReady } = useAuth();

  const navigate = useNavigate();


  // Signup is disabled - always show login tab
  useEffect(() => {
    setActiveTab("login");
  }, []);

  useEffect(() => {
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    
    if (error) {
      console.error("Auth error from URL:", error);
      toast.error(error === "unauthorized" ? "Email not verified. Please check your inbox." : error);
    }
    
    if (message) {
      toast.success(message);
    }
  }, [searchParams]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "forget") setActiveTab("reset");
    else setActiveTab("login");
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if it's an admin login attempt
      if (email === ADMIN_EMAIL && password === "Jainil@1901") {
        // Setup/verify admin account
        const setupResult = await setupAdminAccount();
        
        if (!setupResult.success) {
          throw new Error(setupResult.message);
        }

        if (setupResult.isNewAccount) {
          toast.success("Admin account created. Please check your email for verification.");
          return;
        }

        // Try to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // If we get here, login was successful
        navigate(ADMIN_ROUTE);
        toast.success("Welcome back, Admin!");
      } else {
        // Regular user login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Regular user redirect to dashboard
        navigate("/dashboard");
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };



  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        console.error("Password reset error:", error);
        toast.error(error.message || "Failed to send reset link");
        return;
      }
      
      toast.success("Password reset link sent to your email!");
      setActiveTab("login");
    } catch (error: any) {
      console.error("Password reset exception:", error);
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <main className="flex-1 flex items-center justify-center p-4 md:p-8">
      {!isSupabaseReady && (
        <Card className="mx-auto max-w-md w-full mb-4 border border-amber-500 bg-amber-50 dark:bg-amber-950/20 shadow-lg animate-fade-in backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Supabase Not Configured
            </CardTitle>
            <CardDescription>Environment variables for Supabase are missing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              To enable authentication, you need to configure your Supabase environment variables:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">supabase.com</a></li>
              <li>Add these environment variables to your project:</li>
              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 overflow-x-auto text-xs">
                <code>
                  VITE_SUPABASE_URL=your_supabase_url{"\n"}
                  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
                </code>
              </pre>
            </ol>
            <p className="text-sm font-medium">
              Login functionality will not work until Supabase is properly configured.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mx-auto max-w-md w-full shadow-lg animate-fade-in backdrop-blur-sm">
        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            setActiveTab(tab);
            if (tab === "register") window.location.hash = "register";
            else if (tab === "reset") window.location.hash = "forget";
            else window.location.hash = "login";
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="reset">Reset Password</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Sign in to your GradeLab account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your.email@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-0 top-0 h-full px-3 py-2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">Toggle password visibility</span>
                    </Button>
                  </div>
                </div>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90" 
                  type="submit" 
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign In
                </Button>
              </CardContent>
            </form>
          </TabsContent>
          

          
          <TabsContent value="reset">
            <form onSubmit={handleResetPassword}>
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>Enter your email to receive a password reset link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input 
                    id="reset-email" 
                    type="email" 
                    placeholder="your.email@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90" 
                  type="submit" 
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send Reset Link
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full" 
                  type="button" 
                  onClick={() => { window.location.hash = "login"; setActiveTab("login"); }}
                >
                  Back to Login
                </Button>
              </CardContent>
            </form>
          </TabsContent>
        </Tabs>
        <CardFooter className="flex flex-col items-center">
          <p className="text-xs text-muted-foreground mt-4">
            By using GradeLab, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>


    </main>
  );
}
