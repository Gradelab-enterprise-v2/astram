
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "sonner";
import { Plan } from "@/types/subscription";
import { Loader2, AlertCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Switch
} from "@/components/ui/switch";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface InviteUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InviteUserDialog({ open, onClose }: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isAnnual, setIsAnnual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { adminInviteUser } = useAuth();
  const { usePlans } = useSubscription();
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setEmail("");
      setSelectedPlanId("");
      setIsAnnual(false);
      setInviteSuccess(false);
      setTempPassword("");
      setErrorMessage(null);
    }
  }, [open]);
  
  // Set default plan to Free plan if available
  useEffect(() => {
    if (plans.length > 0) {
      const freePlan = plans.find((plan: Plan) => plan.name === 'Free');
      if (freePlan) {
        setSelectedPlanId(freePlan.id);
      } else if (plans[0]) {
        setSelectedPlanId(plans[0].id);
      }
    }
  }, [plans]);
  
  const handleInviteUser = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    
    if (!selectedPlanId) {
      toast.error("Please select a plan");
      return;
    }
    
    if (!adminInviteUser) {
      toast.error("You don't have permission to invite users");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const { error, data } = await adminInviteUser(email, selectedPlanId, isAnnual);
      
      if (error) {
        console.error("Error inviting user:", error);
        let errorMsg = error.message || "Failed to invite user";
        
        // Handle specific error cases
        if (errorMsg.includes("User already registered")) {
          errorMsg = `The email ${email} is already registered. Please use a different email.`;
        }
        
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }
      
      toast.success(`Invitation sent to ${email}`);
      
      // If we have a temporary password, show it to the admin
      if (data?.temporaryPassword) {
        setTempPassword(data.temporaryPassword);
        setInviteSuccess(true);
      } else {
        onClose();
      }
    } catch (error: any) {
      console.error("Exception inviting user:", error);
      const errorMsg = `Error inviting user: ${error.message}`;
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    toast.success("Temporary password copied to clipboard");
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        {!inviteSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Send an invitation email to a new user. They'll receive instructions to verify their email and set their password.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="plan">Plan</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger id="plan" className="mt-1">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plansLoading ? (
                      <div className="flex justify-center py-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : (
                      plans
                        .filter((plan: Plan) => plan.is_active)
                        .map((plan: Plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="billing">Annual Billing</Label>
                <Switch
                  id="billing"
                  checked={isAnnual}
                  onCheckedChange={setIsAnnual}
                />
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setIsLoading(false)}>Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleInviteUser}
                disabled={isLoading || !email || !selectedPlanId}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Check className="h-5 w-5 mr-2 text-green-500" />
                User Invited Successfully
              </DialogTitle>
              <DialogDescription>
                The user will receive an email to verify their account and set their password
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important Information</AlertTitle>
                <AlertDescription>
                  A temporary password has been created for this user. You may want to share it with them through a secure channel in case they need it.
                </AlertDescription>
              </Alert>
              
              <div className="mt-4">
                <Label htmlFor="temp-password">Temporary Password</Label>
                <div className="flex mt-1">
                  <Input
                    id="temp-password"
                    type="text"
                    value={tempPassword}
                    readOnly
                    className="mr-2 font-mono"
                  />
                  <Button 
                    onClick={handleCopyPassword}
                    variant="outline"
                    size="sm"
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  The user will be prompted to change this password after verifying their email.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
