
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export function NotificationsTab() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [testResults, setTestResults] = useState(true);
  const [planUpdates, setPlanUpdates] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call to save notification preferences
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Notification preferences saved");
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive notifications and updates.
        </p>
      </div>
      
      <div className="border rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications" className="text-base">
              Email Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications via email
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="test-results" className="text-base">
              Test Results
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when test results are available
            </p>
          </div>
          <Switch
            id="test-results"
            checked={testResults}
            onCheckedChange={setTestResults}
            disabled={!emailNotifications}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="plan-updates" className="text-base">
              Plan & Subscription Updates
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified about plan changes and billing
            </p>
          </div>
          <Switch
            id="plan-updates"
            checked={planUpdates}
            onCheckedChange={setPlanUpdates}
            disabled={!emailNotifications}
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
