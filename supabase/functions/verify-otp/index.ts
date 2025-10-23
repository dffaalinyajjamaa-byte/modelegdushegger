import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { phoneNumber, otp, fullName } = await req.json();
    
    if (!phoneNumber || !otp) {
      return new Response(
        JSON.stringify({ error: "Phone number and OTP required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the provided OTP
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Verify OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("otp_hash", otpHash)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    // Create a unique email for phone-based auth
    const phoneEmail = `${phoneNumber.replace(/\+/g, '')}@phone.user`;

    // Check if user exists
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("user_id, email")
      .eq("phone_number", phoneNumber);

    let userId: string;
    let isNewUser = false;

    if (existingProfiles && existingProfiles.length > 0) {
      // User exists, sign them in
      userId = existingProfiles[0].user_id;
    } else {
      // Create new user
      isNewUser = true;
      const randomPassword = crypto.randomUUID();
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: phoneEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          phone_number: phoneNumber,
          full_name: fullName || "User",
        },
      });

      if (authError || !authData.user) {
        throw new Error("Failed to create user account");
      }

      userId = authData.user.id;

      // Update profile with phone number
      await supabase
        .from("profiles")
        .update({ phone_number: phoneNumber })
        .eq("user_id", userId);
    }

    // Generate session token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: phoneEmail,
    });

    if (sessionError || !sessionData) {
      throw new Error("Failed to create session");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification successful",
        isNewUser,
        session: sessionData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
