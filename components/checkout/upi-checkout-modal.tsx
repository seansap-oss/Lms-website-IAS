"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Tag,
  Smartphone,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Phone,
  ShieldCheck,
  Copy,
  Sparkles,
  QrCode as QrIcon,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QrCode } from "@/components/ui/qr-code";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  UPI_CONFIG,
  buildUpiLink,
  buildAppLinks,
  generateTransactionRef,
  formatInr,
  type DiscountValidation,
} from "@/lib/commerce";
import { hapticSuccess } from "@/lib/native";

export interface CheckoutCourse {
  id: string;
  title: string;
  price: number;
  discountedPrice?: number | null;
}

type Step = 1 | 2 | 3 | 4;

export function UpiCheckoutModal({
  open,
  onClose,
  course,
}: {
  open: boolean;
  onClose: () => void;
  course: CheckoutCourse | null;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>(1);
  const [isMobile, setIsMobile] = React.useState(false);
  const [txnRef] = React.useState(() => generateTransactionRef());

  const [details, setDetails] = React.useState({ name: "", email: "", phone: "", password: "" });
  const [accountBusy, setAccountBusy] = React.useState(false);
  const [accountError, setAccountError] = React.useState("");

  const [promo, setPromo] = React.useState("");
  const [promoBusy, setPromoBusy] = React.useState(false);
  const [validation, setValidation] = React.useState<DiscountValidation | null>(null);

  const [confirming, setConfirming] = React.useState(false);
  const [enrolled, setEnrolled] = React.useState(false);

  const basePrice = course ? course.discountedPrice ?? course.price : 0;
  const finalPrice = validation?.valid ? validation.finalPrice : basePrice;
  const savings = validation?.valid ? validation.discountAmount : 0;

  React.useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    setIsMobile(/android|iphone|ipad|ipod|mobile/i.test(ua));
  }, []);

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setValidation(null);
      setPromo("");
      setEnrolled(false);
      setAccountError("");
    }
  }, [open]);

  if (!course) return null;

  const note = `Ibemhal IAS - ${course.title}`.slice(0, 50);
  const upiLink = buildUpiLink({ amount: finalPrice, note, transactionRef: txnRef });
  const appLinks = buildAppLinks(finalPrice, note, txnRef);

  const whatsappUrl = `https://wa.me/${UPI_CONFIG.whatsapp}?text=${encodeURIComponent(
    `Hello Ibemhal IAS! I want to enrol in "${course.title}" (${formatInr(finalPrice)}). ` +
      `I would like to pay by cash / need assistance. Ref: ${txnRef}`
  )}`;

  /* ---------------- Step 1 — account ---------------- */
  const handleAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountBusy(true);
    setAccountError("");

    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.auth.signUp({
        email: details.email.trim().toLowerCase(),
        password: details.password,
        options: { data: { full_name: details.name, phone: details.phone } },
      });

      if (error && !/already registered/i.test(error.message)) {
        setAccountError(error.message);
        setAccountBusy(false);
        return;
      }

      if (error) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: details.email.trim().toLowerCase(),
          password: details.password,
        });
        if (signInErr) {
          setAccountError("Account exists — password incorrect. Try again or reset it.");
          setAccountBusy(false);
          return;
        }
      }
    }

    setAccountBusy(false);
    setStep(2);
  };

  /* ---------------- Step 2 — promo ---------------- */
  const applyPromo = async () => {
    if (!promo.trim()) return;
    setPromoBusy(true);
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: promo, courseId: course.id, basePrice }),
      });
      const json = (await res.json()) as DiscountValidation;
      setValidation(json);
      if (json.valid) hapticSuccess();
    } catch {
      setValidation({
        valid: false,
        message: "Could not reach the server. Please retry.",
        basePrice,
        discountAmount: 0,
        finalPrice: basePrice,
      });
    } finally {
      setPromoBusy(false);
    }
  };

  /* ---------------- Step 4 — confirm ---------------- */
  const confirmPayment = async () => {
    setConfirming(true);
    const supabase = createClient();

    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.rpc("redeem_enrollment", {
          p_course_id: course.id,
          p_code: validation?.valid ? validation.code ?? null : null,
          p_via: "upi_auto",
          p_reference: txnRef,
        });
      }
    }

    hapticSuccess();
    setEnrolled(true);
    setConfirming(false);

    setTimeout(() => {
      onClose();
      router.push("/dashboard");
    }, 2000);
  };

  const steps = [
    { n: 1, label: "Details", icon: User },
    { n: 2, label: "Promo", icon: Tag },
    { n: 3, label: "Pay", icon: Smartphone },
    { n: 4, label: "Done", icon: CheckCircle2 },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[190] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md"
          >
            <Card className="rounded-b-none sm:rounded-b-xl max-h-[92vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="shrink-0 border-b px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Enrolling in
                    </p>
                    <p className="font-semibold text-sm truncate">{course.title}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                    aria-label="Close checkout"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {steps.map((s, i) => (
                    <React.Fragment key={s.n}>
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                          step > s.n
                            ? "bg-green-500 text-white"
                            : step === s.n
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {step > s.n ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.n}
                      </div>
                      {i < steps.length - 1 && (
                        <div
                          className={cn(
                            "h-0.5 flex-1 rounded-full transition-colors",
                            step > s.n ? "bg-green-500" : "bg-muted"
                          )}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <CardContent className="flex-1 overflow-y-auto p-5">
                {/* -------- STEP 1 -------- */}
                {step === 1 && (
                  <motion.form
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    onSubmit={handleAccount}
                    className="space-y-3"
                  >
                    <p className="text-sm font-semibold">Your details</p>
                    {accountError && (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {accountError}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="ck-name">Full Name</Label>
                      <Input
                        id="ck-name"
                        required
                        value={details.name}
                        onChange={(e) => setDetails({ ...details, name: e.target.value })}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ck-email">Email</Label>
                      <Input
                        id="ck-email"
                        type="email"
                        required
                        value={details.email}
                        onChange={(e) => setDetails({ ...details, email: e.target.value })}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ck-phone">Phone</Label>
                      <Input
                        id="ck-phone"
                        type="tel"
                        required
                        value={details.phone}
                        onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ck-pw">Create Password</Label>
                      <Input
                        id="ck-pw"
                        type="password"
                        required
                        minLength={6}
                        value={details.password}
                        onChange={(e) => setDetails({ ...details, password: e.target.value })}
                        placeholder="min 6 characters"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={accountBusy}>
                      {accountBusy ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Setting up…</>
                      ) : (
                        <>Continue<ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                  </motion.form>
                )}

                {/* -------- STEP 2 -------- */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <p className="text-sm font-semibold">Have a promo code?</p>
                    <div className="flex gap-2">
                      <Input
                        value={promo}
                        onChange={(e) => setPromo(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                        placeholder="IAR2026"
                        className="uppercase tracking-wider font-mono"
                        disabled={promoBusy}
                      />
                      <Button onClick={applyPromo} disabled={promoBusy || !promo.trim()} variant="outline">
                        {promoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>

                    {validation && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex items-start gap-2 rounded-lg border p-2.5 text-xs",
                          validation.valid
                            ? "bg-green-500/10 border-green-500/25 text-green-700 dark:text-green-400"
                            : "bg-destructive/10 border-destructive/20 text-destructive"
                        )}
                      >
                        {validation.valid ? (
                          <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        )}
                        {validation.message}
                      </motion.div>
                    )}

                    <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Course fee</span>
                        <span>{formatInr(basePrice)}</span>
                      </div>
                      {savings > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Discount ({validation?.code})</span>
                          <span>− {formatInr(savings)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between items-baseline">
                        <span className="text-sm font-semibold">Total payable</span>
                        <span className="text-2xl font-bold text-primary">
                          {formatInr(finalPrice)}
                        </span>
                      </div>
                      {savings > 0 && (
                        <Badge variant="success" className="text-[10px]">
                          You save {formatInr(savings)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                        <ArrowLeft className="mr-2 h-4 w-4" />Back
                      </Button>
                      <Button onClick={() => setStep(3)} className="flex-1">
                        Pay {formatInr(finalPrice)}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* -------- STEP 3 -------- */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="text-center">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Amount payable
                      </p>
                      <p className="text-3xl font-bold text-primary">{formatInr(finalPrice)}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Ref: {txnRef}</p>
                    </div>

                    {isMobile ? (
                      <div className="space-y-2">
                        <p className="text-xs text-center text-muted-foreground">
                          Tap to pay with your UPI app
                        </p>
                        <a href={appLinks.gpay} className="block">
                          <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-green-500 hover:opacity-90">
                            <Smartphone className="mr-2 h-4 w-4" />Pay with Google Pay
                          </Button>
                        </a>
                        <a href={appLinks.phonepe} className="block">
                          <Button variant="outline" className="w-full h-11">Pay with PhonePe</Button>
                        </a>
                        <a href={appLinks.paytm} className="block">
                          <Button variant="outline" className="w-full h-11">Pay with Paytm</Button>
                        </a>
                        <a href={appLinks.generic} className="block">
                          <Button variant="ghost" className="w-full h-10 text-xs">
                            Any other UPI app
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <QrIcon className="h-3.5 w-3.5" />
                          Scan with any UPI app
                        </p>
                        <div className="rounded-xl border-2 border-primary/20 bg-white p-3 shadow-lg">
                          <QrCode value={upiLink} size={220} logoText="II" />
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <code className="rounded bg-muted px-2 py-1 font-mono">{UPI_CONFIG.vpa}</code>
                          <button
                            onClick={() => navigator.clipboard?.writeText(UPI_CONFIG.vpa)}
                            className="p-1 rounded hover:bg-muted"
                            aria-label="Copy UPI ID"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                        <ShieldCheck className="h-3 w-3 inline mr-1" />
                        After completing the payment in your UPI app, tap
                        <strong> &ldquo;I have paid&rdquo;</strong> below. Our team verifies every
                        transaction within 30 minutes.
                      </p>
                    </div>

                    <Button onClick={() => setStep(4)} className="w-full h-11">
                      <CheckCircle2 className="mr-2 h-4 w-4" />I have paid {formatInr(finalPrice)}
                    </Button>

                    <Button variant="ghost" onClick={() => setStep(2)} className="w-full h-9 text-xs">
                      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Back to promo code
                    </Button>
                  </motion.div>
                )}

                {/* -------- STEP 4 -------- */}
                {step === 4 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4 space-y-4"
                  >
                    {enrolled ? (
                      <>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 220 }}
                          className="mx-auto h-16 w-16 rounded-full bg-green-500 flex items-center justify-center"
                        >
                          <CheckCircle2 className="h-9 w-9 text-white" />
                        </motion.div>
                        <div>
                          <h3 className="text-lg font-bold">Enrollment confirmed!</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Welcome to {course.title}. Redirecting to your dashboard…
                          </p>
                        </div>
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                      </>
                    ) : (
                      <>
                        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold">Confirm your payment</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Confirm you sent {formatInr(finalPrice)} to {UPI_CONFIG.vpa}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3 text-left space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Course</span>
                            <span className="font-medium truncate ml-2">{course.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium">{formatInr(finalPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reference</span>
                            <span className="font-mono">{txnRef}</span>
                          </div>
                        </div>
                        <Button onClick={confirmPayment} className="w-full h-11" disabled={confirming}>
                          {confirming ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming…</>
                          ) : (
                            "Confirm & Activate Course"
                          )}
                        </Button>
                        <Button variant="ghost" onClick={() => setStep(3)} className="w-full h-9 text-xs">
                          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Back to payment
                        </Button>
                      </>
                    )}
                  </motion.div>
                )}
              </CardContent>

              {/* Offline fallback */}
              {!enrolled && (
                <div className="shrink-0 border-t bg-muted/30 p-4 pb-safe sm:pb-4 space-y-2">
                  <p className="text-[11px] text-center text-muted-foreground">
                    Paying cash or need help?
                  </p>
                  <div className="flex gap-2">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full h-10 text-xs border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-500/10"
                      >
                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />WhatsApp Admin
                      </Button>
                    </a>
                    <a href={`tel:${UPI_CONFIG.phone}`} className="flex-1">
                      <Button variant="outline" className="w-full h-10 text-xs">
                        <Phone className="mr-1.5 h-3.5 w-3.5" />Call Institute
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
