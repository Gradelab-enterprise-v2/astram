import { useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/use-admin-auth"; // Assuming this hook exists for admin auth
import { ThemeProvider } from "next-themes"; // Assuming next-themes is used
import {
  BarChart3, Users, CreditCard, Settings, Flag, Activity, Shield, LogOut, Bell, User, LayoutDashboard, ShieldCheck, Settings2, Loader2
} from "lucide-react"; // Restore necessary icons
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client"; // Assuming supabase client path
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Header } from "@/components/layout/Header"; // Corrected path
import { Sidebar } from "@/components/layout/Sidebar"; // Corrected path - Assuming this is the correct sidebar for admin

// Restore Admin Sidebar Navigation (Adjust paths/icons if needed)
const adminNavigation = [
  { name: "Dashboard", href: "/admingl304", icon: BarChart3 },
  { name: "Users", href: "/admingl304/users", icon: Users },
  { name: "Plans", href: "/admingl304/plans", icon: CreditCard },
  { name: "White Label", href: "/admingl304/white-label", icon: Settings },
  { name: "Features", href: "/admingl304/features", icon: Flag },
  { name: "Usage & Billing", href: "/admingl304/usage", icon: Activity },
  { name: "Logs & Security", href: "/admingl304/logs", icon: Shield },
];


export function AdminLayout() {
  const { isAdmin, isLoading } = useAdminAuth(); // Use admin auth check
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Assuming sidebar state management

  // Restore handleLogout function
   const handleLogout = async () => {
     try {
       await supabase.auth.signOut();
       navigate("/login");
       toast.success("Logged out successfully");
     } catch (error) {
       console.error("Error logging out:", error);
       toast.error("Failed to log out");
     }
   };

  if (isLoading) {
    // Restore loading state
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // Redirect if not admin - uncomment if useAdminAuth handles redirection
  // if (!isAdmin) {
  //   navigate('/login'); // Or wherever non-admins should go
  //   return null;
  // }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <div className="flex h-screen bg-background"> {/* Use bg-background for theme compatibility */}
        {/* Admin Sidebar - Using generic Sidebar for now, adjust if specific admin sidebar exists */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform bg-card transition-transform duration-300 ease-in-out border-r border-border", // Use theme variables
            !sidebarOpen && "-translate-x-full"
          )}
        >
          <div className="flex h-full flex-col">
             <div className="flex h-16 items-center justify-between px-4 border-b border-border">
               {/* Logo/Brand */}
               <Link to="/admingl304" className="flex items-center space-x-2">
                  <img src="https://astramtech.com/static/media/logo.e952f2da044d9188dcfb.webp" alt="Astram Logo" className="h-8 w-8"/>
               </Link>
               {/* Close button for mobile */}
               <Button
                 variant="ghost"
                 size="icon"
                 onClick={() => setSidebarOpen(false)}
                 className="lg:hidden text-muted-foreground hover:text-foreground"
               >
                 × {/* Use a proper close icon if available */}
               </Button>
             </div>
             {/* Navigation */}
             <nav className="flex-1 space-y-1 px-2 py-4">
               {adminNavigation.map((item) => {
                 const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                 return (
                   <Link
                     key={item.name}
                     to={item.href}
                     className={cn(
                       "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                       isActive
                         ? "bg-primary text-primary-foreground" // Use theme variables
                         : "text-muted-foreground hover:bg-muted hover:text-foreground"
                     )}
                   >
                     <item.icon
                       className={cn(
                         "mr-3 h-5 w-5",
                         isActive
                           ? "text-primary-foreground"
                           : "text-muted-foreground group-hover:text-foreground"
                       )}
                     />
                     {item.name}
                   </Link>
                 );
               })}
             </nav>
          </div>
        </div>


        {/* Main content area */}
        <div className={cn("flex-1 flex flex-col transition-margin duration-300 ease-in-out", sidebarOpen ? "ml-64" : "ml-0")}>
          {/* Admin Header - Using generic Header for now, adjust if specific admin header exists */}
           <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
             {/* Hamburger Menu Toggle */}
             <Button
               variant="ghost"
               size="icon"
               onClick={() => setSidebarOpen(!sidebarOpen)}
               className="text-muted-foreground hover:text-foreground"
             >
               ☰ {/* Use a proper menu icon if available */}
             </Button>

             {/* Header Right Section (e.g., User Menu) */}
             <div className="flex items-center gap-x-4">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Go to App
                </Button>
               {/* Notifications (Example) */}
               <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                 <Bell className="h-6 w-6" />
                 {/* Optional: Notification indicator */}
                 {/* <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-600" /> */}
               </Button>

               {/* Profile Dropdown */}
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="flex items-center gap-2 px-2">
                     <Avatar className="h-8 w-8">
                       {/* Add user image if available */}
                       <AvatarFallback>AD</AvatarFallback> {/* Initials */}
                     </Avatar>
                     <div className="hidden md:block text-left">
                        {/* Replace with actual admin user data */}
                       <p className="text-sm font-medium text-foreground">Admin User</p>
                       <p className="text-xs text-muted-foreground">admin@example.com</p>
                     </div>
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent className="w-56" align="end" forceMount>
                   <DropdownMenuLabel className="font-normal">
                     <div className="flex flex-col space-y-1">
                       <p className="text-sm font-medium leading-none">Admin User</p>
                       <p className="text-xs leading-none text-muted-foreground">
                         admin@example.com
                       </p>
                     </div>
                   </DropdownMenuLabel>
                   <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Go to App
                     </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => navigate('/settings')}> {/* Assuming a general settings page */}
                       <Settings2 className="mr-2 h-4 w-4" /> Settings
                     </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={handleLogout}>
                     <LogOut className="mr-2 h-4 w-4" /> Log out
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
             </div>
           </header>

          {/* Page Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 md:p-6">
            <Outlet /> {/* THIS IS CRUCIAL FOR ROUTING */}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}