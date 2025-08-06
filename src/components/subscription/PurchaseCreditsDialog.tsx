
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencySelector } from "@/components/payments/CurrencySelector";
import { useRazorpay } from "@/components/payments/RazorpayProvider";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

interface PurchaseCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseCreditsDialog({ open, onOpenChange }: PurchaseCreditsDialogProps) {
  const { user } = useAuth();
  const { isReady, purchaseCredits } = useRazorpay();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch credit pricing
  const { data: creditPricing, isLoading } = useQuery({
    queryKey: ["creditPricing", selectedCurrency],
    queryFn: async () => {
      // In a real implementation, you would fetch this from your plans table
      // For now, we'll use a simplified approach with common pricing
      const { data, error } = await supabase
        .from('add_on_purchases')
        .select('unit_price, currency')
        .eq('add_on_type', 'extra_credits')
        .eq('currency', selectedCurrency)
        .limit(1);
        
      if (error) throw error;
      
      // Default pricing if none is found
      if (!data || data.length === 0) {
        const defaultPrices = {
          USD: 5,
          EUR: 4.5,
          GBP: 4,
          INR: 400
        };
        return { price: defaultPrices[selectedCurrency] || 5, currency: selectedCurrency };
      }
      
      return { price: data[0].unit_price, currency: data[0].currency };
    },
    enabled: open,
  });

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value < 1) {
      setQuantity(1);
    } else if (value > 10) {
      setQuantity(10);
    } else {
      setQuantity(value);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase credits.",
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
      await purchaseCredits({
        quantity,
        currency: selectedCurrency,
        onSuccess: () => {
          toast({
            title: "Purchase successful",
            description: `You have successfully purchased ${quantity * 100} credits.`,
          });
          onOpenChange(false);
        },
        onError: (error) => {
          console.error("Error purchasing credits:", error);
          toast({
            title: "Purchase failed",
            description: error.message,
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error("Error purchasing credits:", error);
      toast({
        title: "Error",
        description: "There was an error processing your request.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pricePerPack = creditPricing?.price || 5;
  const totalPrice = pricePerPack * quantity;
  const totalCredits = quantity * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Purchase Credits</DialogTitle>
          <DialogDescription>
            Add more credits to your account to use premium features.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <CurrencySelector 
                onCurrencyChange={setSelectedCurrency}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <div className="flex items-center mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-r-none"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="10"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="h-8 w-16 rounded-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-l-none"
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  disabled={quantity >= 10}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
          
          <Card className="p-4 border">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per pack:</span>
                <span>{formatCurrency(pricePerPack, selectedCurrency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credits per pack:</span>
                <span>100 credits</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity:</span>
                <span>{quantity}</span>
              </div>
              <div className="pt-2 mt-2 border-t flex justify-between font-medium">
                <span>Total price:</span>
                <span>{formatCurrency(totalPrice, selectedCurrency)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total credits:</span>
                <span>{totalCredits} credits</span>
              </div>
            </div>
          </Card>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={handlePurchase}
            disabled={isProcessing || isLoading}
            className="w-full"
          >
            {isProcessing ? "Processing..." : `Buy ${totalCredits} Credits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
