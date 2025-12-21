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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast.error(error.message || "Failed to send OTP");
        return { error };
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
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (error) {
        toast.error(error.message || "Invalid OTP");
        return { error };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        toast.success("সফলভাবে লগইন হয়েছে!");
      }

      return { error: null };
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
