import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, KeyRound, Cloud, Sparkles } from "lucide-react";

const emailSchema = z.string().email("সঠিক email দিন");
const otpSchema = z.string().length(6, "OTP ৬ সংখ্যার হতে হবে");

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await sendOtp(email);
    setLoading(false);

    if (!error) {
      setStep("otp");
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = otpSchema.safeParse(otp);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await verifyOtp(email, otp);
    setLoading(false);

    if (!error) {
      onOpenChange(false);
      setStep("email");
      setEmail("");
      setOtp("");
    } else {
      setError("ভুল OTP কোড। আবার চেষ্টা করুন।");
    }
  };

  const handleBack = () => {
    setStep("email");
    setOtp("");
    setError("");
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    await sendOtp(email);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            Cloud Sync চালু করুন
          </DialogTitle>
          <DialogDescription>
            Email দিয়ে সাইন ইন করুন প্রিমিয়াম ফিচার পেতে
          </DialogDescription>
        </DialogHeader>

        {/* Premium Features */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span className="font-medium text-sm">Premium Features</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ সীমাহীন নোট</li>
            <li>✓ সব ডিভাইসে সিঙ্ক</li>
            <li>✓ ভয়েস ডিক্টেশন</li>
            <li>✓ ট্যাগ ও ফোল্ডার</li>
            <li>✓ PDF/Word এ এক্সপোর্ট</li>
          </ul>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  OTP পাঠাচ্ছে...
                </>
              ) : (
                "OTP কোড পাঠান"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ <strong>{email}</strong> এ OTP পাঠানো হয়েছে
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Email এ পাঠানো ৬-সংখ্যার কোড নিচে দিন
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">OTP কোড</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="otp"
                  type="text"
                  placeholder="১২৩৪৫৬"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="pl-10 text-center tracking-[0.5em] text-xl font-mono"
                  disabled={loading}
                  maxLength={6}
                  autoFocus
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={loading}
              >
                পেছনে
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || otp.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    যাচাই করছে...
                  </>
                ) : (
                  "যাচাই করুন"
                )}
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              onClick={handleResendOtp}
              disabled={loading}
            >
              কোড পাননি? আবার পাঠান
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
