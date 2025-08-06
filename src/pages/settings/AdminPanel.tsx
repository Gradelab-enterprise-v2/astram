import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdmin } from "@/hooks/use-admin";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SystemSettings } from "@/components/admin/SystemSettings";

export default function AdminPanel() {
  const { isAdmin, isLoading } = useAdmin();
  const [activeTab, setActiveTab] = useState("settings");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/settings" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admin Panel</h2>
        <p className="text-muted-foreground">
          Manage system settings.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="space-y-4">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
