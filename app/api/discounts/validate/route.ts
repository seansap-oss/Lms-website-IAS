import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  FALLBACK_PROMO_CODES,
  computeDiscount,
  type DiscountValidation,
} from "@/lib/commerce";

export const dynamic = "force-dynamic";

interface Body {
  code?: string;
  courseId?: string;
  basePrice?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { code, courseId, basePrice }: Body = await request.json();

    if (!code || !code.trim()) {
      return NextResponse.json(
        { valid: false, reason: "empty", message: "Enter a promo code." },
        { status: 400 }
      );
    }

    const normalised = code.trim().toUpperCase();
    const supabase = await createClient();

    // ---- Preferred path: server-side RPC (authoritative, tamper-proof) ----
    if (supabase && courseId) {
      const { data, error } = await supabase.rpc("validate_discount_code", {
        p_code: normalised,
        p_course_id: courseId,
      });

      if (!error && data) {
        const result = data as unknown as DiscountValidation;
        return NextResponse.json({ ...result, source: "supabase" });
      }
    }

    // ---- Fallback: read the codes table directly ----
    if (supabase) {
      const { data: row } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", normalised)
        .maybeSingle();

      if (row) {
        const price = Number(basePrice ?? 0);
        const result = computeDiscount(
          {
            code: row.code,
            description: row.description ?? "",
            discountType: row.discount_type,
            discountValue: Number(row.discount_value),
            maxUses: row.max_uses,
            currentUses: row.current_uses,
            minPurchaseInr: row.min_purchase_inr,
            maxDiscountInr: row.max_discount_inr,
            expiresAt: row.expires_at,
            isActive: row.is_active,
          },
          price,
          normalised
        );
        return NextResponse.json({ ...result, source: "supabase-table" });
      }
    }

    // ---- Deterministic offline fallback (Supabase not provisioned) ----
    const price = Number(basePrice ?? 0);
    if (!price) {
      return NextResponse.json(
        {
          valid: false,
          reason: "no_price",
          message: "Could not determine the course price.",
          basePrice: 0,
          discountAmount: 0,
          finalPrice: 0,
        },
        { status: 400 }
      );
    }

    const promo = FALLBACK_PROMO_CODES.find((p) => p.code === normalised);
    const result = computeDiscount(promo, price, normalised);

    return NextResponse.json(
      { ...result, source: "offline" },
      { status: result.valid ? 200 : 200 }
    );
  } catch (error) {
    console.error("[discounts/validate]", error);
    return NextResponse.json(
      {
        valid: false,
        reason: "server_error",
        message: "Could not validate the code. Please try again.",
        basePrice: 0,
        discountAmount: 0,
        finalPrice: 0,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const supabase = await createClient();

  if (supabase) {
    const { data } = await supabase
      .from("discount_codes")
      .select("code, description, discount_type, discount_value, expires_at")
      .eq("is_active", true);

    if (data?.length) {
      return NextResponse.json({ source: "supabase", codes: data });
    }
  }

  return NextResponse.json({
    source: "offline",
    codes: FALLBACK_PROMO_CODES.filter((c) => c.isActive).map((c) => ({
      code: c.code,
      description: c.description,
      discount_type: c.discountType,
      discount_value: c.discountValue,
      expires_at: c.expiresAt,
    })),
  });
}
