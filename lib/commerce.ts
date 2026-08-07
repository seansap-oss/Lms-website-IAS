import type { DiscountType } from "@/types/database";

export interface DiscountValidation {
  valid: boolean;
  code?: string;
  description?: string | null;
  discountType?: DiscountType;
  discountValue?: number;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  remainingUses?: number | null;
  reason?: string;
  message: string;
}

export interface LocalPromoCode {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  minPurchaseInr: number;
  maxDiscountInr: number | null;
  expiresAt: string | null;
  isActive: boolean;
}

/**
 * Demo promo codes used when Supabase is not yet provisioned.
 * Mirrors the seed rows in supabase/migrations/002_commerce.sql.
 */
export const FALLBACK_PROMO_CODES: LocalPromoCode[] = [
  {
    code: "IAR2026",
    description: "Ibemhal Aspirant Rebate 2026 — 25% off",
    discountType: "percentage",
    discountValue: 25,
    maxUses: 500,
    currentUses: 0,
    minPurchaseInr: 0,
    maxDiscountInr: null,
    expiresAt: null,
    isActive: true,
  },
  {
    code: "EARLYBIRD",
    description: "Early bird — 30% off",
    discountType: "percentage",
    discountValue: 30,
    maxUses: 100,
    currentUses: 0,
    minPurchaseInr: 0,
    maxDiscountInr: null,
    expiresAt: null,
    isActive: true,
  },
  {
    code: "MANIPUR10",
    description: "Manipur student special — flat ₹10,000 off",
    discountType: "flat",
    discountValue: 10000,
    maxUses: null,
    currentUses: 0,
    minPurchaseInr: 20000,
    maxDiscountInr: null,
    expiresAt: null,
    isActive: true,
  },
  {
    code: "TOPPER50",
    description: "Topper scholarship — 50% off",
    discountType: "percentage",
    discountValue: 50,
    maxUses: 25,
    currentUses: 0,
    minPurchaseInr: 0,
    maxDiscountInr: null,
    expiresAt: null,
    isActive: true,
  },
];

/** Deterministic price calculator — mirrors validate_discount_code() exactly. */
export function computeDiscount(
  promo: LocalPromoCode | undefined,
  basePrice: number,
  rawCode: string
): DiscountValidation {
  const fail = (reason: string, message: string): DiscountValidation => ({
    valid: false,
    reason,
    message,
    basePrice,
    discountAmount: 0,
    finalPrice: basePrice,
  });

  if (!promo) return fail("not_found", "Invalid promo code.");
  if (!promo.isActive) return fail("inactive", "This promo code is no longer active.");

  if (promo.expiresAt && new Date(promo.expiresAt) <= new Date()) {
    return fail("expired", "This promo code has expired.");
  }
  if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
    return fail("exhausted", "This promo code has reached its usage limit.");
  }
  if (basePrice < promo.minPurchaseInr) {
    return fail(
      "below_minimum",
      `Minimum purchase of ${formatInr(promo.minPurchaseInr)} required.`
    );
  }

  let discount =
    promo.discountType === "percentage"
      ? Math.round((basePrice * promo.discountValue) / 100)
      : Math.min(promo.discountValue, basePrice);

  if (promo.maxDiscountInr !== null) {
    discount = Math.min(discount, promo.maxDiscountInr);
  }

  const finalPrice = Math.max(0, basePrice - discount);

  return {
    valid: true,
    code: rawCode.trim().toUpperCase(),
    description: promo.description,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    basePrice,
    discountAmount: discount,
    finalPrice,
    remainingUses: promo.maxUses === null ? null : promo.maxUses - promo.currentUses,
    message: `Promo applied — you save ${formatInr(discount)}!`,
  };
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------
// UPI configuration
// ---------------------------------------------------------------------
export const UPI_CONFIG = {
  vpa: process.env.NEXT_PUBLIC_UPI_VPA || "ibemhal@upi",
  payeeName: process.env.NEXT_PUBLIC_UPI_PAYEE || "IbemhalIAS",
  whatsapp: process.env.NEXT_PUBLIC_INSTITUTE_WHATSAPP || "919876543210",
  phone: process.env.NEXT_PUBLIC_INSTITUTE_PHONE || "+919876543210",
} as const;

/** Builds a NPCI-compliant `upi://pay` deep link. */
export function buildUpiLink(params: {
  amount: number;
  note?: string;
  transactionRef?: string;
}): string {
  const q = new URLSearchParams({
    pa: UPI_CONFIG.vpa,
    pn: UPI_CONFIG.payeeName,
    am: params.amount.toFixed(2),
    cu: "INR",
  });
  if (params.note) q.set("tn", params.note.slice(0, 50));
  if (params.transactionRef) q.set("tr", params.transactionRef);
  return `upi://pay?${q.toString()}`;
}

/** App-specific deep links for the three dominant Indian UPI apps. */
export function buildAppLinks(amount: number, note: string, ref: string) {
  const base = buildUpiLink({ amount, note, transactionRef: ref }).replace("upi://pay?", "");
  return {
    gpay: `tez://upi/pay?${base}`,
    phonepe: `phonepe://pay?${base}`,
    paytm: `paytmmp://pay?${base}`,
    generic: `upi://pay?${base}`,
  };
}

export function generateTransactionRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `IBM${ts}${rand}`;
}
