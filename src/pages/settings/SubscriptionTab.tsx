import { UserPlanInfo } from "@/components/subscription/UserPlanInfo";
import { useAdmin, UserRole } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { PurchaseCreditsDialog } from "@/components/subscription/PurchaseCreditsDialog";
import { AvailablePlans } from "@/components/subscription/AvailablePlans";

export function SubscriptionTab() {
  const { isAdmin, isInstitutionAdmin, isSuperAdmin, userRole, isLoading } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        {userRole && userRole !== UserRole.TEACHER && (
          <Badge variant="outline" className="text-xs">
            {userRole === UserRole.SUPER_ADMIN ? 'Super Admin' : 'Institution Admin'}
          </Badge>
        )}
      </div>

      <UserPlanInfo />
      <div className="pt-4 border-t">
        <AvailablePlans />
      </div>

      {isSuperAdmin && (
        <div className="pt-6 border-t">
          <h3 className="text-lg font-medium mb-2">Admin Controls</h3>
          <p className="text-sm text-muted-foreground mb-4">
            As an administrator, you have access to additional controls for
            managing plans and users.
          </p>
          <Button onClick={() => navigate("/settings/admin")}>Go to Admin Panel</Button>
        </div>
      )}

      <PurchaseCreditsDialog
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
      />
    </div>
  );
}
