import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Info, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRazorpay } from "@/components/payments/RazorpayProvider";
import { useToast } from "@/hooks/use-toast";
import { CurrencySelector } from "@/components/payments/CurrencySelector";
import { formatCurrency } from "@/lib/utils";

export function PrioritySupport() {
  const { user } = useAuth();
  const { isReady, addPrioritySupport } = useRazorpay();
  const { toast } = useToast();
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch active priority support for the user
  const { data: activePrioritySupport, isLoading: isLoadingSupport } = useQuery({
    queryKey: ["prioritySupport", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('add_on_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('add_on_type', 'priority_support')
        .eq('status', 'active')
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch priority support pricing
  const { data: prioritySupportPricing, isLoading: isLoadingPricing } = useQuery({
    queryKey: ["prioritySupportPricing", selectedCurrency],
    queryFn: async () => {
      // In a real implementation, you would fetch this from your plans table
      const { data, error } = await supabase
        .from('add_on_purchases')
        .select('unit_price, currency')
        .eq('add_on_type', 'priority_support')
        .eq('currency', selectedCurrency)
        .limit(1);
        
      if (error) throw error;
      
      // Default pricing if none is found
      if (!data || data.length === 0) {
        const defaultPrices = {
          USD: 10,
          EUR: 9,
          GBP: 8,
          INR: 800
        };
        return { price: defaultPrices[selectedCurrency] || 10, currency: selectedCurrency };
      }
      
      return { price: data[0].unit_price, currency: data[0].currency };
    },
    enabled: true,
  });

  const handleAddPrioritySupport = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add priority support.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isReady) {
      toast({
        title: "Payment system initializing",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      await addPrioritySupport({
        currency: selectedCurrency,
        onSuccess: () => {
          toast({
            title: "Priority support added",
            description: "You now have access to priority support.",
          });
        },
        onError: (error) => {
          console.error("Error adding priority support:", error);
          toast({
            title: "Failed to add priority support",
            description: error.message,
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error("Error adding priority support:", error);
      toast({
        title: "Error",
        description: "There was an error processing your request.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isLoadingSupport || isLoadingPricing;
  const price = prioritySupportPricing?.price || 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
          Priority Support
        </CardTitle>
        <CardDescription>
          Get faster responses and dedicated support
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="animate-pulse bg-muted h-8 w-full rounded"></div>
          </div>
        ) : activePrioritySupport ? (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="px-3 py-1 text-sm">Active</Badge>
            <p className="text-sm text-muted-foreground">
              Next billing: {new Date(activePrioritySupport.next_billing_date).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start space-x-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                Priority support gives you access to faster response times and dedicated support staff.
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">
                  {formatCurrency(price, selectedCurrency)}<span className="text-sm font-normal">/month</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  Billed monthly
                </span>
              </div>
              
              <CurrencySelector 
                onCurrencyChange={setSelectedCurrency}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        {!isLoading && !activePrioritySupport && (
          <Button 
            onClick={handleAddPrioritySupport}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Add Priority Support"}
          </Button>
        )}
        
        {!isLoading && activePrioritySupport && (
          <div className="w-full text-center">
            <div className="flex items-center justify-center text-sm text-muted-foreground mb-2">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>To cancel, please contact support</span>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
