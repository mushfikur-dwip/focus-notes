import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      throw new Error("Email and code are required");
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      throw new Error("Invalid code format");
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find valid OTP
    const { data: otpRecord, error: findError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (findError || !otpRecord) {
      console.error("OTP not found or expired:", findError);
      throw new Error("Invalid or expired verification code");
    }

    // Mark OTP as used
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let session;

    if (existingUser) {
      // User exists - generate magic link token for them
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
      });

      if (linkError) {
        console.error("Error generating link:", linkError);
        throw new Error("Failed to authenticate");
      }

      // Verify the token to create a session
      const token = linkData.properties?.hashed_token;
      if (token) {
        const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "email",
        });

        if (verifyError) {
          console.error("Error verifying:", verifyError);
          throw new Error("Failed to authenticate");
        }

        session = sessionData.session;
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw new Error("Failed to create account");
      }

      // Generate session for new user
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email,
      });

      if (linkError) {
        console.error("Error generating link for new user:", linkError);
        throw new Error("Failed to authenticate");
      }

      const token = linkData.properties?.hashed_token;
      if (token) {
        const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "email",
        });

        if (verifyError) {
          console.error("Error verifying new user:", verifyError);
          throw new Error("Failed to authenticate");
        }

        session = sessionData.session;
      }
    }

    if (!session) {
      throw new Error("Failed to create session");
    }

    console.log(`User ${email} authenticated successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          token_type: session.token_type,
          user: session.user,
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
