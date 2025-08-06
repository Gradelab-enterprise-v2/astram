import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useSubscription } from '@/hooks/use-subscription';
import { Plan } from '@/types/subscription';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Plan name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  monthly_price: z.coerce.number().min(0, {
    message: "Price cannot be negative.",
  }),
  annual_price: z.coerce.number().min(0, {
    message: "Price cannot be negative.",
  }),
  student_limit: z.coerce.number().min(0, {
    message: "Limit cannot be negative.",
  }),
  test_limit: z.coerce.number().min(0, {
    message: "Limit cannot be negative.",
  }),
  credit_amount: z.coerce.number().min(0, {
    message: "Credit amount cannot be negative.",
  }),
  allows_rollover: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface PlanFormProps {
  plan?: Plan;
  onCancel: () => void;
}

export function PlanForm({ plan, onCancel }: PlanFormProps) {
  const { useUpsertPlan } = useSubscription();
  const { mutate: upsertPlan, isPending } = useUpsertPlan();
  
  const defaultValues: Partial<FormValues> = {
    name: plan?.name || '',
    description: plan?.description || '',
    monthly_price: plan?.monthly_price || 0,
    annual_price: plan?.annual_price || 0,
    student_limit: plan?.student_limit || 0,
    test_limit: plan?.test_limit || 0,
    credit_amount: plan?.credit_amount || 0,
    allows_rollover: plan?.allows_rollover || false,
    features: plan?.features || [],
    is_active: plan?.is_active !== false, // Default to true if undefined
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  function onSubmit(values: FormValues) {
    // If we have an existing plan, include the ID for update
    if (plan?.id) {
      upsertPlan({
        id: plan.id,
        name: values.name,
        description: values.description || null,
        monthly_price: values.monthly_price,
        annual_price: values.annual_price,
        student_limit: values.student_limit,
        test_limit: values.test_limit,
        credit_amount: values.credit_amount,
        allows_rollover: values.allows_rollover,
        features: values.features,
        is_active: values.is_active
      }, {
        onSuccess: () => {
          onCancel();
        }
      });
    } else {
      // Creating a new plan
      upsertPlan({
        name: values.name,
        description: values.description || null,
        monthly_price: values.monthly_price,
        annual_price: values.annual_price,
        student_limit: values.student_limit,
        test_limit: values.test_limit,
        credit_amount: values.credit_amount,
        allows_rollover: values.allows_rollover,
        features: values.features,
        is_active: values.is_active
      }, {
        onSuccess: () => {
          onCancel();
        }
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Basic Plan" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Brief description of the plan features" 
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="monthly_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Price ($)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="annual_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Price ($)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormDescription>
                  Total annual cost, not monthly rate
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="student_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student Grading Limit</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormDescription>
                  Use 9999 for unlimited
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="test_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Test Generation Limit</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormDescription>
                  Use 9999 for unlimited
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="credit_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credits Per Month</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormDescription>
                  Monthly credit allocation
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="allows_rollover"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 h-full">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Allow Credit Rollover
                  </FormLabel>
                  <FormDescription>
                    Allows unused credits to roll over to the next month
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Active
                </FormLabel>
                <FormDescription>
                  When active, this plan will be shown to users.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Plan'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
