
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscription } from "@/hooks/use-subscription";
import { Plan } from "@/types/subscription";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AssignPlanDialogProps {
  userId: string;
  userEmail: string;
  currentPlan: string | null;
  isAnnual: boolean;
  onClose: () => void;
}

export function AssignPlanDialog({
  userId,
  userEmail,
  currentPlan,
  isAnnual,
  onClose,
}: AssignPlanDialogProps) {
  const { usePlans, useUpdateUserPlan } = useSubscription();
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { mutate: updateUserPlan, isPending } = useUpdateUserPlan();
  
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlan);
  const [selectedBilling, setSelectedBilling] = useState<string>(
    isAnnual ? "annual" : "monthly"
  );
  
  const handleUpdate = () => {
    if (!selectedPlanId) return;
    
    updateUserPlan(
      {
        userId,
        planId: selectedPlanId,
        isAnnual: selectedBilling === "annual",
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Plan to {userEmail}</DialogTitle>
        </DialogHeader>
        
        {plansLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Tabs value={selectedBilling} onValueChange={setSelectedBilling}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="annual">Annual</TabsTrigger>
              </TabsList>
              
              <TabsContent value="monthly" className="pt-4">
                <RadioGroup
                  value={selectedPlanId || ""}
                  onValueChange={setSelectedPlanId}
                  className="space-y-3"
                >
                  {plans.map((plan: Plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center space-x-2 border p-4 rounded-md"
                    >
                      <RadioGroupItem value={plan.id} id={`monthly-${plan.id}`} />
                      <Label htmlFor={`monthly-${plan.id}`} className="flex-1">
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${plan.monthly_price}/month
                        </div>
                      </Label>
                      <div className="text-sm">
                        <div>
                          Students: {plan.student_limit === 9999 ? "Unlimited" : plan.student_limit}
                        </div>
                        <div>
                          Tests: {plan.test_limit === 9999 ? "Unlimited" : plan.test_limit}
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </TabsContent>
              
              <TabsContent value="annual" className="pt-4">
                <RadioGroup
                  value={selectedPlanId || ""}
                  onValueChange={setSelectedPlanId}
                  className="space-y-3"
                >
                  {plans.map((plan: Plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center space-x-2 border p-4 rounded-md"
                    >
                      <RadioGroupItem value={plan.id} id={`annual-${plan.id}`} />
                      <Label htmlFor={`annual-${plan.id}`} className="flex-1">
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${plan.annual_price}/year (${(plan.annual_price / 12).toFixed(2)}/month)
                        </div>
                      </Label>
                      <div className="text-sm">
                        <div>
                          Students: {plan.student_limit === 9999 ? "Unlimited" : plan.student_limit}
                        </div>
                        <div>
                          Tests: {plan.test_limit === 9999 ? "Unlimited" : plan.test_limit}
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </TabsContent>
            </Tabs>
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!selectedPlanId || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
