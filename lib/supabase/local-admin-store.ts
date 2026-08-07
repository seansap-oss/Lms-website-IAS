"use client";

import { createClient } from "./client";
import { courses as mockCourses } from "@/lib/mock-data";
import { FALLBACK_PROMO_CODES } from "@/lib/commerce";
import type { DiscountType } from "@/types/database";

export type StoreMode = "supabase" | "local";

export interface AdminStudent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  tier: string;
  created_at: string;
  enrolledCourseIds: string[];
}

export interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  category: string;
  price_inr: number;
  discounted_price_inr: number | null;
  is_published: boolean;
}

export interface AdminPromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
}

export interface AdminAnalytics {
  totalStudents: number;
  totalEnrollments: number;
  totalRevenueInr: number;
  activeCourses: number;
  upiEnrollments: number;
  manualEnrollments: number;
  activeDiscountCodes: number;
  revenueThisMonthInr: number;
}

const LS_STUDENTS = "ibemhal.la.students";
const LS_CODES = "ibemhal.la.codes";

function readLs<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLs<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------
export async function fetchCourses(): Promise<{ courses: AdminCourse[]; mode: StoreMode }> {
  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, slug, category, price_inr, discounted_price_inr, is_published")
      .order("display_order", { ascending: true });

    if (!error && data) {
      return { courses: data as AdminCourse[], mode: "supabase" };
    }
  }

  return {
    courses: mockCourses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      category: c.category,
      price_inr: c.price,
      discounted_price_inr: null,
      is_published: true,
    })),
    mode: "local",
  };
}

// ---------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------
export async function fetchStudents(): Promise<{ students: AdminStudent[]; mode: StoreMode }> {
  const supabase = createClient();
  if (supabase) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, tier, created_at")
      .eq("role", "student")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error && profiles) {
      const { data: enrolments } = await supabase
        .from("enrollments")
        .select("user_id, course_id");

      const byUser = new Map<string, string[]>();
      for (const e of enrolments ?? []) {
        const arr = byUser.get(e.user_id) ?? [];
        arr.push(e.course_id);
        byUser.set(e.user_id, arr);
      }

      return {
        students: profiles.map((p) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone ?? null,
          tier: p.tier ?? "free",
          created_at: p.created_at,
          enrolledCourseIds: byUser.get(p.id) ?? [],
        })),
        mode: "supabase",
      };
    }
  }

  return { students: readLs<AdminStudent[]>(LS_STUDENTS, []), mode: "local" };
}

export async function createStudent(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ ok: boolean; message: string; student?: AdminStudent }> {
  const supabase = createClient();

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: { full_name: input.fullName, role: "student", phone: input.phone },
      },
    });

    if (error) return { ok: false, message: error.message };

    if (data.user) {
      await supabase
        .from("profiles")
        .update({ phone: input.phone, full_name: input.fullName })
        .eq("id", data.user.id);

      return {
        ok: true,
        message: "Student created. They can sign in with the temporary password.",
        student: {
          id: data.user.id,
          full_name: input.fullName,
          email: input.email,
          phone: input.phone,
          tier: "free",
          created_at: new Date().toISOString(),
          enrolledCourseIds: [],
        },
      };
    }
  }

  const student: AdminStudent = {
    id: uid("stu"),
    full_name: input.fullName,
    email: input.email.trim().toLowerCase(),
    phone: input.phone,
    tier: "free",
    created_at: new Date().toISOString(),
    enrolledCourseIds: [],
  };
  const all = readLs<AdminStudent[]>(LS_STUDENTS, []);
  writeLs(LS_STUDENTS, [student, ...all]);

  return { ok: true, message: "Student saved locally (Supabase not connected).", student };
}

// ---------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------
export async function setEntitlement(
  studentId: string,
  courseId: string,
  grant: boolean,
  amount = 0
): Promise<boolean> {
  const supabase = createClient();

  if (supabase) {
    const fn = grant ? "admin_grant_entitlement" : "admin_revoke_entitlement";
    const args = grant
      ? { p_user_id: studentId, p_course_id: courseId, p_via: "admin_manual", p_amount: amount }
      : { p_user_id: studentId, p_course_id: courseId };

    const { error } = await supabase.rpc(fn, args as never);
    if (!error) return true;

    // Fallback to direct table access if the RPC is not installed yet
    if (grant) {
      const { error: insErr } = await supabase
        .from("enrollments")
        .insert({
          user_id: studentId,
          course_id: courseId,
          amount_paid: amount,
          enrolled_via: "admin_manual",
        });
      if (!insErr) return true;
    } else {
      const { error: delErr } = await supabase
        .from("enrollments")
        .delete()
        .eq("user_id", studentId)
        .eq("course_id", courseId);
      if (!delErr) return true;
    }
  }

  const all = readLs<AdminStudent[]>(LS_STUDENTS, []);
  writeLs(
    LS_STUDENTS,
    all.map((s) =>
      s.id === studentId
        ? {
            ...s,
            enrolledCourseIds: grant
              ? Array.from(new Set([...s.enrolledCourseIds, courseId]))
              : s.enrolledCourseIds.filter((id) => id !== courseId),
          }
        : s
    )
  );
  return true;
}

// ---------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------
export async function fetchPromoCodes(): Promise<{ codes: AdminPromoCode[]; mode: StoreMode }> {
  const supabase = createClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("discount_codes")
      .select("id, code, description, discount_type, discount_value, max_uses, current_uses, expires_at, is_active")
      .order("created_at", { ascending: false });

    if (!error && data) return { codes: data as AdminPromoCode[], mode: "supabase" };
  }

  const stored = readLs<AdminPromoCode[] | null>(LS_CODES, null);
  if (stored) return { codes: stored, mode: "local" };

  const seeded: AdminPromoCode[] = FALLBACK_PROMO_CODES.map((c) => ({
    id: uid("code"),
    code: c.code,
    description: c.description,
    discount_type: c.discountType,
    discount_value: c.discountValue,
    max_uses: c.maxUses,
    current_uses: c.currentUses,
    expires_at: c.expiresAt,
    is_active: c.isActive,
  }));
  writeLs(LS_CODES, seeded);
  return { codes: seeded, mode: "local" };
}

export async function createPromoCode(input: {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  expiresAt: string | null;
}): Promise<{ ok: boolean; message: string }> {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
    return { ok: false, message: "Code must be 3-24 chars: A-Z, 0-9, - or _" };
  }
  if (input.discountType === "percentage" && (input.discountValue <= 0 || input.discountValue > 100)) {
    return { ok: false, message: "Percentage must be between 1 and 100." };
  }
  if (input.discountValue <= 0) {
    return { ok: false, message: "Discount value must be greater than zero." };
  }

  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase.from("discount_codes").insert({
      code,
      description: input.description || null,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      max_uses: input.maxUses,
      expires_at: input.expiresAt,
      is_active: true,
    });

    if (!error) return { ok: true, message: `Promo code ${code} created.` };
    if (error.code === "23505") return { ok: false, message: "That code already exists." };
  }

  const all = readLs<AdminPromoCode[]>(LS_CODES, []);
  if (all.some((c) => c.code === code)) {
    return { ok: false, message: "That code already exists." };
  }
  writeLs(LS_CODES, [
    {
      id: uid("code"),
      code,
      description: input.description || null,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      max_uses: input.maxUses,
      current_uses: 0,
      expires_at: input.expiresAt,
      is_active: true,
    },
    ...all,
  ]);
  return { ok: true, message: `Promo code ${code} created locally.` };
}

export async function togglePromoCode(id: string, isActive: boolean): Promise<boolean> {
  const supabase = createClient();
  if (supabase) {
    const { error } = await supabase
      .from("discount_codes")
      .update({ is_active: isActive })
      .eq("id", id);
    if (!error) return true;
  }

  const all = readLs<AdminPromoCode[]>(LS_CODES, []);
  writeLs(LS_CODES, all.map((c) => (c.id === id ? { ...c, is_active: isActive } : c)));
  return true;
}

// ---------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------
export async function fetchAnalytics(): Promise<{ analytics: AdminAnalytics; mode: StoreMode }> {
  const supabase = createClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("sales_analytics")
      .select("*")
      .maybeSingle();

    if (!error && data) {
      return {
        analytics: {
          totalStudents: Number(data.total_students ?? 0),
          totalEnrollments: Number(data.total_enrollments ?? 0),
          totalRevenueInr: Number(data.total_revenue_inr ?? 0),
          activeCourses: Number(data.active_courses ?? 0),
          upiEnrollments: Number(data.upi_enrollments ?? 0),
          manualEnrollments: Number(data.manual_enrollments ?? 0),
          activeDiscountCodes: Number(data.active_discount_codes ?? 0),
          revenueThisMonthInr: Number(data.revenue_this_month_inr ?? 0),
        },
        mode: "supabase",
      };
    }
  }

  const students = readLs<AdminStudent[]>(LS_STUDENTS, []);
  const codes = readLs<AdminPromoCode[]>(LS_CODES, []);
  const enrolments = students.reduce((n, s) => n + s.enrolledCourseIds.length, 0);
  const priceById = new Map(mockCourses.map((c) => [c.id, c.price]));
  const revenue = students.reduce(
    (sum, s) => sum + s.enrolledCourseIds.reduce((a, id) => a + (priceById.get(id) ?? 0), 0),
    0
  );

  return {
    analytics: {
      totalStudents: students.length,
      totalEnrollments: enrolments,
      totalRevenueInr: revenue,
      activeCourses: mockCourses.length,
      upiEnrollments: 0,
      manualEnrollments: enrolments,
      activeDiscountCodes: codes.filter((c) => c.is_active).length,
      revenueThisMonthInr: revenue,
    },
    mode: "local",
  };
}
