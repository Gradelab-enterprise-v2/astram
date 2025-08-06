
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/use-subscription';
import { Plan } from '@/types/subscription';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRazorpay } from '@/components/payments/RazorpayProvider';

interface UpgradeCalculatorProps {
  currentPlanId: string;
  newPlanId: string;
  isAnnual: boolean;
  onSubmit: () => void;
  currency?: string;
}

export function UpgradeCalculator({ 
  currentPlanId, 
  newPlanId, 
  isAnnual,
  onSubmit,
  currency = 'USD'
}: UpgradeCalculatorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [proratedAmount, setProratedAmount] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [newPlan, setNewPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { usePlans, useRequestUpgrade } = useSubscription();
  const { data: plans = [] } = usePlans();
  const { createSubscription, isReady } = useRazorpay();
  const { mutate: requestUpgrade, isPending } = useRequestUpgrade();

  // For demo purposes, apply exchange rates
  const getAdjustedPrice = (usdPrice: number, currencyCode: string) => {
    const exchangeRates: Record<string, number> = {
      "USD": 1,
      "EUR": 0.92,
      "GBP": 0.79,
      "INR": 83.50,
      "JPY": 151.8,
      "CAD": 1.38,
      "AUD": 1.52,
      "SGD": 1.35
    };
    
    return usdPrice * (exchangeRates[currencyCode] || 1);
  };

  // Get currency symbol
  const getCurrencySymbol = (code: string) => {
    const currencySymbols: Record<string, string> = {
      "USD": "$",
      "EUR": "€",
      "GBP": "£",
      "INR": "₹",
      "JPY": "¥",
      "CAD": "C$",
      "AUD": "A$",
      "SGD": "S$"
    };
    return currencySymbols[code] || code;
  };

  useEffect(() => {
    const calculateProration = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (!currentPlanId || !newPlanId) {
          throw new Error("Plan information is missing");
        }
        
        // Get current plan and new plan details
        const current = plans.find(p => p.id === currentPlanId);
        const next = plans.find(p => p.id === newPlanId);
        
        if (!current || !next) {
          throw new Error("Could not find plan details");
        }
        
        setCurrentPlan(current);
        setNewPlan(next);
        
        // Calculate prorated amount based on days left in cycle
        const { data, error } = await supabase.rpc('calculate_prorated_amount', {
          current_plan_id: currentPlanId,
          new_plan_id: newPlanId,
          is_annual: isAnnual
        });
        
        if (error) throw error;
        
        setProratedAmount(getAdjustedPrice(data, currency));
      } catch (err: any) {
        console.error("Error calculating proration:", err);
        setError(err.message || "Failed to calculate prorated amount");
      } finally {
        setIsLoading(false);
      }
    };
    
    calculateProration();
  }, [currentPlanId, newPlanId, isAnnual, plans, currency]);
  
  const handleUpgradeClick = () => {
    if (newPlanId) {
      requestUpgrade(
        { 
          planId: newPlanId, 
          isAnnual: isAnnual 
        },
        {
          onSuccess: () => {
            onSubmit();
          }
        }
      );
    }
  };
  
  const handleRazorpayClick = async () => {
    if (!newPlanId) return;
    
    try {
      await createSubscription({
        planId: newPlanId,
        isAnnual,
        currency,
        onSuccess: () => {
          onSubmit();
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p>Calculating prorated amount...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-destructive">
          <p>Error: {error}</p>
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={onSubmit}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const symbol = getCurrencySymbol(currency);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upgrade Preview</CardTitle>
        <CardDescription>
          Review your plan upgrade details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Plan:</span>
            <span className="font-medium">{currentPlan?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">New Plan:</span>
            <span className="font-medium">{newPlan?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Billing Period:</span>
            <span className="font-medium">{isAnnual ? 'Annual' : 'Monthly'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Currency:</span>
            <span className="font-medium">{currency}</span>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prorated Amount:</span>
              <span className="font-medium">{symbol}{proratedAmount?.toFixed(2) || 0}</span>
            </div>
            {isAnnual && (
              <p className="text-xs text-muted-foreground mt-1">
                Annual plans include a 20% discount compared to monthly billing.
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onSubmit}
          >
            Cancel
          </Button>
          
          {isReady ? (
            <div className="flex gap-2">
              <Button 
                onClick={handleUpgradeClick}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Request Upgrade`
                )}
              </Button>
              
              <Button
                variant="secondary"
                onClick={handleRazorpayClick}
              >
                Pay Now ({symbol}{proratedAmount?.toFixed(2) || 0})
              </Button>
            </div>
          ) : (
            <Button disabled>
              Loading payment system...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
