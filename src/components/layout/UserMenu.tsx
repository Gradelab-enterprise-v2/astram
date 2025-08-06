import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, ChevronDown, BookOpen, Calendar } from "lucide-react";
import { useUserProfile } from "@/hooks/use-profile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

export const UserMenu = () => {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Use the user's name if available, otherwise use the email
  const displayName = profile?.name || (user?.email ? user.email.split('@')[0] : "User");
  
  // Get initials for avatar
  const getInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return user?.email ? user.email[0].toUpperCase() : "U";
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      
      const { error } = await signOut();
      
      if (error) {
        console.error("Error signing out:", error);
        toast.error("Failed to sign out. Please try again.");
        setIsLoggingOut(false);
        return;
      }
      
      setOpen(false);
      // Navigate to signin page after successful logout
      navigate("/signin");
    } catch (err) {
      console.error("Exception signing out:", err);
      toast.error("An unexpected error occurred");
      setIsLoggingOut(false);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-sm font-medium hover:bg-accent/50 transition-colors">
          <Avatar className="h-8 w-8 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10">{getInitials()}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline-block">{displayName}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <div className="grid gap-0.5">
          <Button
            variant="ghost"
            className="flex items-center justify-start w-full px-2 py-1.5 text-sm hover:bg-accent/50 transition-colors"
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button
            variant="ghost"
            className="flex items-center justify-start w-full px-2 py-1.5 text-sm hover:bg-accent/50 transition-colors"
            onClick={() => {
              setOpen(false);
              window.open("https://cal.com/teamgradelab/15min", "_blank");
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Schedule a Demo
          </Button>
          <Button
            variant="ghost"
            className="flex items-center justify-start w-full px-2 py-1.5 text-sm hover:bg-accent/50 transition-colors"
            onClick={() => {
              setOpen(false);
              window.open("https://docs.gradelab.io", "_blank");
            }}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Gradelab Docs
          </Button>
          <Button
            variant="ghost"
            className="flex items-center justify-start w-full px-2 py-1.5 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={handleSignOut}
            disabled={isLoggingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? "Signing out..." : "Logout"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
