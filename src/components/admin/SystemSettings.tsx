
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function SystemSettings() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      setIsLoading(true);
      // Signup is permanently disabled
    } catch (error) {
      console.error("Error fetching system settings:", error);
      toast.error("Failed to load system settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>
          Configure global system settings for your application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <Label className="flex flex-col space-y-1">
            <span>User Registration</span>
            <span className="font-normal text-sm text-muted-foreground">
              User registration is permanently disabled. New users must be invited by administrators.
            </span>
          </Label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Disabled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
