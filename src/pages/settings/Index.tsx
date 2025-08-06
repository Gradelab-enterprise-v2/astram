
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionTab } from "./SubscriptionTab";
import { AppearanceTab } from "./AppearanceTab";
import { AccountTab } from "./AccountTab";
import { NotificationsTab } from "./NotificationsTab";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="space-y-4">
          <AccountTab />
        </TabsContent>
        <TabsContent value="appearance" className="space-y-4">
          <AppearanceTab />
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="subscription" className="space-y-4">
          <SubscriptionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
