import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendOtp = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { email },
      });

      if (error) {
        toast.error(error.message || "Failed to send OTP");
        return { error };
      }

      if (data?.error) {
        toast.error(data.error);
        return { error: data.error };
      }

      toast.success("OTP কোড পাঠানো হয়েছে! Email চেক করুন।");
      return { error: null };
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
      return { error: err };
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { email, code },
      });

      if (error) {
        toast.error(error.message || "Invalid OTP");
        return { error };
      }

      if (data?.error) {
        toast.error(data.error);
        return { error: data.error };
      }

      if (data?.session) {
        // Set the session manually
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        toast.success("সফলভাবে লগইন হয়েছে!");
        return { error: null };
      }

      toast.error("Authentication failed");
      return { error: "Authentication failed" };
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
      return { error: err };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return { error };
    }
    toast.success("সাইন আউট হয়েছে");
    return { error: null };
  };

  return {
    user,
    session,
    loading,
    sendOtp,
    verifyOtp,
    signOut,
    isAuthenticated: !!user,
  };
}
