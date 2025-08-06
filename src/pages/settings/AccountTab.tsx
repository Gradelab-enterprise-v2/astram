import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Mail, User } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AccountTab() {
  const { profile, isLoading, updateUserName, isUpdating } = useUserProfile();
  const { user } = useAuth();
  const [name, setName] = useState(profile?.name || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      updateUserName(name.trim());
    } else {
      toast.error("Name cannot be empty");
    }
  };

  const handleSendResetLink = async () => {
    if (!user?.email) {
      toast.error("No email found for your account.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: "http://localhost:8080/reset-password"
    });
    if (error) {
      toast.error("Failed to send reset link: " + error.message);
    } else {
      toast.success("Password reset link sent to your email.");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">
          Update your account settings and profile information.
        </p>
      </div>
      
      <div className="border rounded-lg p-6 space-y-6">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
            <Mail className="h-4 w-4 mr-2 opacity-70" />
            <span className="opacity-70">{user?.email}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your email address cannot be changed.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-sm font-medium">Display Name</Label>
            <div className="flex rounded-md overflow-hidden">
              <div className="flex h-10 items-center bg-muted px-3 border border-r-0 border-input rounded-l-md">
                <User className="h-4 w-4 opacity-70" />
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-l-none"
                placeholder="Enter your name"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isUpdating || isLoading}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
          <Button
            variant="outline"
            className="mt-2"
            onClick={handleSendResetLink}
            type="button"
          >
            Send Password Reset Link
          </Button>
        </form>
      </div>
    </div>
  );
}
