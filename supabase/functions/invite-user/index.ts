import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Create a Supabase client with the Admin key
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { email, planId, isAnnual } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    console.log(`Attempting to invite user: ${email}`)

    // Generate a secure temporary password
    const length = 12
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+="
    
    const generatePassword = () => {
      let password = ""
      
      // Ensure we have at least one character from each category
      password += charset.match(/[a-z]/)![0]
      password += charset.match(/[A-Z]/)![0]
      password += charset.match(/[0-9]/)![0]
      password += charset.match(/[!@#$%^&*()_\-+=]/)![0]
      
      // Fill the rest of the password
      for (let i = 4; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length)
        password += charset[randomIndex]
      }
      
      // Shuffle the password
      return password.split('').sort(() => 0.5 - Math.random()).join('')
    }

    const temporaryPassword = generatePassword()

    // Create the user with service role key (admin privileges)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email for admin-created users
    })
    
    if (authError) {
      console.error("Error creating user:", authError)
      return new Response(
        JSON.stringify({ error: authError }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: { message: "Failed to create user account" } }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }
    
    const userId = authData.user.id
    console.log(`User created with ID: ${userId}`)
    
    // Send password reset to encourage user to set their own password
    await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: Deno.env.get('PASSWORD_RESET_REDIRECT_URL') || 'http://localhost:8080/reset-password'
      }
    })
    
    if (planId) {
      // Assign plan to the user
      try {
        const now = new Date()
        const renewalDate = new Date(now)
        renewalDate.setMonth(renewalDate.getMonth() + (isAnnual ? 12 : 1))
        
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('credit_amount')
          .eq('id', planId)
          .single()
          
        if (planError) {
          console.error("Error fetching plan:", planError)
          // Continue anyway, don't fail the whole operation
        }
        
        const resetDay = now.getDate()
        const creditAmount = planData?.credit_amount || 5 // Default if plan not found
        
        const { error: planInsertError } = await supabase
          .from('user_plans')
          .insert({
            user_id: userId,
            plan_id: planId,
            is_annual: isAnnual,
            renewal_date: renewalDate.toISOString().split('T')[0],
            monthly_usage_reset_day: resetDay,
            total_credits: creditAmount,
            remaining_credits: creditAmount
          })
          
        if (planInsertError) {
          console.error("Error assigning plan:", planInsertError)
          // Continue anyway as user was created successfully
        }
      } catch (error) {
        console.error("Error setting up user plan:", error)
        // Continue anyway as user was created successfully
      }
    }
        
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          userId, 
          temporaryPassword,
          email 
        } 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error("Exception during user invitation:", error)
    return new Response(
      JSON.stringify({ error: { message: `User invitation error: ${error.message}` } }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
