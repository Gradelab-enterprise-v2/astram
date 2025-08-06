
import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type RazorpayContextType = {
  isReady: boolean;
  createSubscription: (options: CreateSubscriptionOptions) => Promise<void>;
  purchaseCredits: (options: PurchaseCreditsOptions) => Promise<void>;
  addPrioritySupport: (options: AddPrioritySupportOptions) => Promise<void>;
};

type CreateSubscriptionOptions = {
  planId: string;
  isAnnual: boolean;
  currency?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

type PurchaseCreditsOptions = {
  quantity?: number;
  currency?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

type AddPrioritySupportOptions = {
  currency?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

const RazorpayContext = createContext<RazorpayContextType | null>(null);

export const useRazorpay = () => {
  const context = useContext(RazorpayContext);
  if (!context) {
    throw new Error('useRazorpay must be used within a RazorpayProvider');
  }
  return context;
};

type RazorpayProviderProps = {
  children: ReactNode;
};

export const RazorpayProvider = ({ children }: RazorpayProviderProps) => {
  const [isReady, setIsReady] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Initialize Razorpay if it's not loaded
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setIsReady(true);
      document.body.appendChild(script);
    } else {
      setIsReady(true);
    }
  }, []);

  const createSubscription = async ({
    planId,
    isAnnual,
    currency = 'INR',
    onSuccess,
    onError,
  }: CreateSubscriptionOptions) => {
    try {
      if (!user) {
        throw new Error('User must be logged in');
      }

      // Get user profile details
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      // Call the edge function to create a subscription
      const { data, error } = await supabase.functions.invoke('razorpay-payments', {
        body: {
          path: 'create-subscription',
          planId,
          userId: user.id,
          isAnnual,
          currency,
          customerEmail: user.email,
          customerName: profile?.name || user.email,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      // Open Razorpay checkout for the subscription
      const subscriptionData = data.data;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: subscriptionData.id,
        name: "GradeLab",
        description: `${isAnnual ? 'Annual' : 'Monthly'} Subscription`,
        image: 'https://astramtech.com/static/media/logo.e952f2da044d9188dcfb.webp',
        prefill: {
          email: user.email,
          name: profile?.name,
        },
        theme: {
          color: '#007bff',
        },
        handler: function (response: any) {
          // Handle successful payment
          toast({
            title: 'Subscription created',
            description: 'Your subscription has been created successfully.',
          });
          
          if (onSuccess) {
            onSuccess();
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Subscription failed',
        description: error.message,
        variant: 'destructive',
      });
      
      if (onError) {
        onError(error);
      }
    }
  };

  const purchaseCredits = async ({
    quantity = 1,
    currency = 'INR',
    onSuccess,
    onError,
  }: PurchaseCreditsOptions) => {
    try {
      if (!user) {
        throw new Error('User must be logged in');
      }

      // Get user profile details
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      // Calculate price based on quantity (100 credits for $5)
      const price = 5 * quantity;

      // Call the edge function to create an order
      const { data, error } = await supabase.functions.invoke('razorpay-payments', {
        body: {
          path: 'purchase-addon',
          userId: user.id,
          addonType: 'extra_credits',
          quantity,
          price,
          currency,
          isRecurring: false,
          customerEmail: user.email,
          customerName: profile?.name || user.email,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Open Razorpay checkout for the order
      const orderData = data.data;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "GradeLab",
        description: `Purchase ${quantity * 100} Credits`,
        order_id: orderData.id,
        image: 'https://astramtech.com/static/media/logo.e952f2da044d9188dcfb.webp',
        prefill: {
          email: user.email,
          name: profile?.name,
        },
        theme: {
          color: '#007bff',
        },
        handler: function (response: any) {
          // Handle successful payment
          toast({
            title: 'Credits purchased',
            description: `You have successfully purchased ${quantity * 100} credits.`,
          });
          
          if (onSuccess) {
            onSuccess();
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error purchasing credits:', error);
      toast({
        title: 'Purchase failed',
        description: error.message,
        variant: 'destructive',
      });
      
      if (onError) {
        onError(error);
      }
    }
  };

  const addPrioritySupport = async ({
    currency = 'INR',
    onSuccess,
    onError,
  }: AddPrioritySupportOptions) => {
    try {
      if (!user) {
        throw new Error('User must be logged in');
      }

      // Get user profile details
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      // Call the edge function to create priority support subscription
      const { data, error } = await supabase.functions.invoke('razorpay-payments', {
        body: {
          path: 'purchase-addon',
          userId: user.id,
          addonType: 'priority_support',
          price: 10, // $10/month for priority support
          currency,
          isRecurring: true,
          customerEmail: user.email,
          customerName: profile?.name || user.email,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create priority support subscription');
      }

      // Open Razorpay checkout for the subscription
      const subscriptionData = data.data;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: subscriptionData.id,
        name: "GradeLab",
        description: "Priority Support Subscription",
        image: 'https://astramtech.com/static/media/logo.e952f2da044d9188dcfb.webp',
        prefill: {
          email: user.email,
          name: profile?.name,
        },
        theme: {
          color: '#007bff',
        },
        handler: function (response: any) {
          // Handle successful payment
          toast({
            title: 'Priority Support Added',
            description: 'You have successfully subscribed to priority support.',
          });
          
          if (onSuccess) {
            onSuccess();
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error adding priority support:', error);
      toast({
        title: 'Subscription failed',
        description: error.message,
        variant: 'destructive',
      });
      
      if (onError) {
        onError(error);
      }
    }
  };

  return (
    <RazorpayContext.Provider
      value={{
        isReady,
        createSubscription,
        purchaseCredits,
        addPrioritySupport,
      }}
    >
      {children}
    </RazorpayContext.Provider>
  );
};
