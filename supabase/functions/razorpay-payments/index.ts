
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function getRazorpayAuthHeader() {
  const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  return `Basic ${auth}`;
}

function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function createOrder(req: Request) {
  try {
    const { amount, currency, planId, isAnnual, userId, receipt } = await req.json();
    
    // Create order with Razorpay
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": getRazorpayAuthHeader(),
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay amount is in smallest currency unit (paise)
        currency: currency || "INR",
        receipt: receipt || `receipt_${Date.now()}`,
        notes: {
          plan_id: planId,
          is_annual: isAnnual.toString(),
          user_id: userId,
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.description || "Failed to create order");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating order:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}

async function createSubscription(req: Request) {
  try {
    const { 
      planId, 
      userId, 
      isAnnual, 
      currency = "INR",
      customerEmail,
      customerName
    } = await req.json();
    
    // Fetch plan details from database
    const supabase = createSupabaseClient();
    
    // Get pricing based on currency
    const { data: currencyPricing, error: currencyError } = await supabase
      .from('currency_pricing')
      .select('*')
      .eq('plan_id', planId)
      .eq('currency_code', currency)
      .single();
    
    if (currencyError) {
      // Fallback to plan's default pricing
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();
        
      if (planError) {
        throw new Error("Plan not found");
      }
      
      const amount = isAnnual ? plan.annual_price : plan.monthly_price;
      
      // Create a Razorpay plan and subscription
      const planResponse = await fetch("https://api.razorpay.com/v1/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": getRazorpayAuthHeader(),
        },
        body: JSON.stringify({
          period: isAnnual ? "yearly" : "monthly",
          interval: 1,
          item: {
            name: `${plan.name} Plan (${isAnnual ? "Annual" : "Monthly"})`,
            amount: Math.round(amount * 100), // Convert to paise
            currency: currency,
            description: plan.description || `${plan.name} Subscription`,
          },
          notes: {
            plan_id: planId,
            user_id: userId,
            is_annual: isAnnual.toString(),
          },
        }),
      });

      const planData = await planResponse.json();
      
      if (!planResponse.ok) {
        throw new Error(planData.error?.description || "Failed to create plan");
      }
      
      // Create a subscription using the plan
      const subscriptionResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": getRazorpayAuthHeader(),
        },
        body: JSON.stringify({
          plan_id: planData.id,
          total_count: isAnnual ? 1 : 12, // Bill once for annual, 12 times for monthly
          customer_notify: 1,
          start_at: Math.floor(Date.now() / 1000) + 300, // Start 5 minutes from now
          notes: {
            app_plan_id: planId,
            user_id: userId,
          },
          customer: {
            name: customerName,
            email: customerEmail,
            contact: "",
          },
        }),
      });

      const subscriptionData = await subscriptionResponse.json();
      
      if (!subscriptionResponse.ok) {
        throw new Error(subscriptionData.error?.description || "Failed to create subscription");
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: subscriptionData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Use currency-specific pricing
      const amount = isAnnual ? currencyPricing.annual_price : currencyPricing.monthly_price;
      
      // Get plan details for name and description
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('name, description')
        .eq('id', planId)
        .single();
        
      if (planError) {
        throw new Error("Plan details not found");
      }
      
      // Create a Razorpay plan
      const planResponse = await fetch("https://api.razorpay.com/v1/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": getRazorpayAuthHeader(),
        },
        body: JSON.stringify({
          period: isAnnual ? "yearly" : "monthly",
          interval: 1,
          item: {
            name: `${plan.name} Plan (${isAnnual ? "Annual" : "Monthly"})`,
            amount: Math.round(amount * 100), // Convert to paise
            currency: currency,
            description: plan.description || `${plan.name} Subscription`,
          },
          notes: {
            plan_id: planId,
            user_id: userId,
            is_annual: isAnnual.toString(),
          },
        }),
      });

      const planData = await planResponse.json();
      
      if (!planResponse.ok) {
        throw new Error(planData.error?.description || "Failed to create plan");
      }
      
      // Create a subscription using the plan
      const subscriptionResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": getRazorpayAuthHeader(),
        },
        body: JSON.stringify({
          plan_id: planData.id,
          total_count: isAnnual ? 1 : 12, // Bill once for annual, 12 times for monthly
          customer_notify: 1,
          start_at: Math.floor(Date.now() / 1000) + 300, // Start 5 minutes from now
          notes: {
            app_plan_id: planId,
            user_id: userId,
          },
          customer: {
            name: customerName,
            email: customerEmail,
            contact: "",
          },
        }),
      });

      const subscriptionData = await subscriptionResponse.json();
      
      if (!subscriptionResponse.ok) {
        throw new Error(subscriptionData.error?.description || "Failed to create subscription");
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: subscriptionData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error creating subscription:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}

async function purchaseAddon(req: Request) {
  try {
    const { 
      userId, 
      addonType, 
      quantity = 1,
      price,
      currency = "INR",
      isRecurring = false,
      customerEmail,
      customerName
    } = await req.json();
    
    if (isRecurring) {
      // For recurring addons like priority support
      const planResponse = await fetch("https://api.razorpay.com/v1/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": getRazorpayAuthHeader(),
        },
        body: JSON.stringify({
          period: "monthly",
          interval: 1,
          item: {
            name: `${addonType === 'priority_support' ? 'Priority Support' : 'Addon'} Subscription`,
            amount: Math.round(price * 100), // Convert to paise
            currency: currency,
            description: `Monthly subscription for ${addonType}`,
          },
          notes: {
            addon_type: addonType,
            user_id: userId,
          },
        }),
      });

      const planData = await planResponse.json();
      
      if (!planResponse.ok) {
        throw new Error(planData.error?.description || "Failed to create addon plan");
      }
      
      // Create a subscription using the plan
      const subscriptionResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": getRazorpayAuthHeader(),
        },
        body: JSON.stringify({
          plan_id: planData.id,
          total_count: 12, // Monthly billing for a year
          customer_notify: 1,
          start_at: Math.floor(Date.now() / 1000) + 300, // Start 5 minutes from now
          notes: {
            addon_type: addonType,
            user_id: userId,
          },
          customer: {
            name: customerName,
            email: customerEmail,
            contact: "",
          },
        }),
      });

      const subscriptionData = await subscriptionResponse.json();
      
      if (!subscriptionResponse.ok) {
        throw new Error(subscriptionData.error?.description || "Failed to create addon subscription");
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: subscriptionData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // For one-time purchases like extra credits
      // Create an order for immediate payment
      const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": getRazorpayAuthHeader(),
        },
        body: JSON.stringify({
          amount: Math.round(price * quantity * 100), // Total price in paise
          currency: currency,
          receipt: `${addonType}_${Date.now()}`,
          notes: {
            addon_type: addonType,
            quantity: quantity.toString(),
            user_id: userId,
          },
        }),
      });

      const orderData = await orderResponse.json();
      
      if (!orderResponse.ok) {
        throw new Error(orderData.error?.description || "Failed to create order for addon");
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: orderData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error purchasing addon:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}

async function handleWebhook(req: Request) {
  try {
    const payload = await req.json();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "";
    
    // In a production environment, verify the webhook signature
    // For now, we'll trust the incoming webhook
    
    const supabase = createSupabaseClient();
    const eventType = payload.event;
    
    if (eventType.startsWith("subscription.")) {
      // Handle subscription events
      const subscription = payload.payload.subscription.entity;
      const userId = subscription.notes.user_id;
      const planId = subscription.notes.app_plan_id;
      const isRecurringAddon = subscription.notes.addon_type !== undefined;
      
      if (eventType === "subscription.activated") {
        if (isRecurringAddon) {
          // Handle addon subscription activation
          const addonType = subscription.notes.addon_type;
          
          // Store the addon purchase
          await supabase.from('add_on_purchases').insert({
            user_id: userId,
            add_on_type: addonType,
            unit_price: subscription.plan_id.item.amount / 100, // Convert from paise
            currency: subscription.plan_id.item.currency,
            is_recurring: true,
            next_billing_date: new Date(subscription.current_end * 1000).toISOString(),
            payment_id: subscription.id,
            status: 'active'
          });
          
          // If this is priority support, you might need to update a flag on the user's account
          if (addonType === 'priority_support') {
            // Implement priority support flag logic
          }
        } else {
          // Handle main subscription activation
          // Update user's plan
          const now = new Date();
          const isAnnual = subscription.notes.is_annual === "true";
          const renewalDate = new Date();
          renewalDate.setMonth(renewalDate.getMonth() + (isAnnual ? 12 : 1));
          
          // Update the user's plan
          await supabase.from('user_plans').update({
            plan_id: planId,
            is_annual: isAnnual,
            renewal_date: renewalDate.toISOString().split('T')[0],
            payment_status: 'active',
            payment_retry_count: 0,
            last_payment_attempt: now.toISOString(),
            subscription_id: subscription.id,
            updated_at: now.toISOString()
          }).eq('user_id', userId);
        }
        
        // Log the payment
        await supabase.from('payment_history').insert({
          user_id: userId,
          subscription_id: subscription.id,
          amount: subscription.plan_id.item.amount / 100, // Convert from paise
          currency: subscription.plan_id.item.currency,
          status: 'success',
          payment_method: 'razorpay',
          description: isRecurringAddon 
            ? `${subscription.notes.addon_type} subscription payment`
            : `${isAnnual ? 'Annual' : 'Monthly'} plan subscription payment`
        });
      } else if (eventType === "subscription.charged") {
        // Handle successful charge
        // Log the payment
        await supabase.from('payment_history').insert({
          user_id: userId,
          subscription_id: subscription.id,
          payment_id: payload.payload.payment?.entity?.id,
          amount: subscription.plan_id.item.amount / 100, // Convert from paise
          currency: subscription.plan_id.item.currency,
          status: 'success',
          payment_method: 'razorpay',
          description: isRecurringAddon 
            ? `${subscription.notes.addon_type} subscription renewal`
            : `Subscription renewal payment`
        });
        
        // Update next billing date for addon
        if (isRecurringAddon) {
          await supabase.from('add_on_purchases')
            .update({
              next_billing_date: new Date(subscription.current_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', subscription.id)
            .eq('user_id', userId);
        }
      } else if (eventType === "subscription.cancelled") {
        if (isRecurringAddon) {
          // Update addon status
          await supabase.from('add_on_purchases')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', subscription.id)
            .eq('user_id', userId);
        } else {
          // Mark user's subscription as cancelled
          await supabase.from('user_plans')
            .update({
              payment_status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('subscription_id', subscription.id)
            .eq('user_id', userId);
        }
      } else if (eventType === "subscription.pending") {
        // Payment is pending
        await supabase.from('payment_history').insert({
          user_id: userId,
          subscription_id: subscription.id,
          amount: subscription.plan_id.item.amount / 100,
          currency: subscription.plan_id.item.currency,
          status: 'pending',
          payment_method: 'razorpay',
          description: `Pending ${isRecurringAddon ? 'addon' : 'subscription'} payment`
        });
      } else if (eventType === "subscription.halted") {
        // Subscription halted due to payment failures
        if (isRecurringAddon) {
          // Update addon status
          await supabase.from('add_on_purchases')
            .update({
              status: 'halted',
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', subscription.id)
            .eq('user_id', userId);
        } else {
          // Mark user's subscription as halted and increment retry count
          const { data: userPlan } = await supabase
            .from('user_plans')
            .select('payment_retry_count')
            .eq('subscription_id', subscription.id)
            .eq('user_id', userId)
            .single();
            
          const retryCount = (userPlan?.payment_retry_count || 0) + 1;
          
          await supabase.from('user_plans')
            .update({
              payment_status: retryCount >= 3 ? 'suspended' : 'retry',
              payment_retry_count: retryCount,
              last_payment_attempt: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('subscription_id', subscription.id)
            .eq('user_id', userId);
        }
      }
    } else if (eventType.startsWith("order.")) {
      // Handle order events (one-time payments)
      const order = payload.payload.order.entity;
      const userId = order.notes.user_id;
      
      if (eventType === "order.paid") {
        // One-time payment successful
        if (order.notes.addon_type === 'extra_credits') {
          // Add credits to the user
          const quantity = parseInt(order.notes.quantity) || 1;
          const creditAmount = quantity * 100; // 100 credits per purchase
          
          // Add credits to user
          await supabase.rpc('add_credits', {
            uid: userId,
            credits_to_add: creditAmount
          });
          
          // Record the purchase
          await supabase.from('add_on_purchases').insert({
            user_id: userId,
            add_on_type: 'extra_credits',
            quantity: quantity,
            unit_price: order.amount / 100 / quantity, // Convert from paise
            currency: order.currency,
            is_recurring: false,
            payment_id: order.id,
            status: 'completed'
          });
        }
        
        // Log the payment
        await supabase.from('payment_history').insert({
          user_id: userId,
          payment_id: order.id,
          amount: order.amount / 100, // Convert from paise
          currency: order.currency,
          status: 'success',
          payment_method: 'razorpay',
          description: `One-time payment for ${order.notes.addon_type}`
        });
      }
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing webhook:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  if (req.method === 'POST') {
    switch (path) {
      case 'create-order':
        return createOrder(req);
      case 'create-subscription':
        return createSubscription(req);
      case 'purchase-addon':
        return purchaseAddon(req);
      case 'webhook':
        return handleWebhook(req);
      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 405,
  });
});
