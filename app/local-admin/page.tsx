"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Users,
  IndianRupee,
  BookOpen,
  Ticket,
  UserPlus,
  LogOut,
  Loader2,
  Check,
  Search,
  Plus,
  ArrowLeft,
  TrendingUp,
  CloudOff,
  Cloud,
  Copy,
  Power,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatCurrency } from "@/lib/utils";
import { hasLocalAdminSession, clearLocalAdminSession } from "@/lib/local-admin";
import {
  fetchCourses,
  fetchStudents,
  fetchPromoCodes,
  fetchAnalytics,
  createStudent,
  createPromoCode,
  togglePromoCode,
  setEntitlement,
  type AdminCourse,
  type AdminStudent,
  type AdminPromoCode,
  type AdminAnalytics,
  type StoreMode,
} from "@/lib/supabase/local-admin-store";
import type { DiscountType } from "@/types/database";

export default function LocalAdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mode, setMode] = React.useState<StoreMode>("local");

  const [courses, setCourses] = React.useState<AdminCourse[]>([]);
  const [students, setStudents] = React.useState<AdminStudent[]>([]);
  const [codes, setCodes] = React.useState<AdminPromoCode[]>([]);
  const [analytics, setAnalytics] = React.useState<AdminAnalytics | null>(null);
  const [toast, setToast] = React.useState<{ msg: string; ok: boolean } | null>(null);

  const notify = React.useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }, []);

  React.useEffect(() => {
    const ok = hasLocalAdminSession();
    setAuthed(ok);
    if (!ok) router.replace("/");
  }, [router]);

  const reload = React.useCallback(async () => {
    const [c, s, p, a] = await Promise.all([
      fetchCourses(),
      fetchStudents(),
      fetchPromoCodes(),
      fetchAnalytics(),
    ]);
    setCourses(c.courses);
    setStudents(s.students);
    setCodes(p.codes);
    setAnalytics(a.analytics);
    setMode(c.mode);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (authed) void reload();
  }, [authed, reload]);

  if (authed === null || (authed && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!authed) return null;

  const signOut = () => {
    clearLocalAdminSession();
    router.push("/");
  };

  const metrics = [
    {
      icon: Users,
      label: "Enrolled Students",
      value: analytics?.totalStudents ?? 0,
      grad: "from-blue-500 to-indigo-600",
    },
    {
      icon: IndianRupee,
      label: "Total Revenue",
      value: formatCurrency(analytics?.totalRevenueInr ?? 0),
      grad: "from-green-500 to-emerald-600",
    },
    {
      icon: BookOpen,
      label: "Active Courses",
      value: analytics?.activeCourses ?? 0,
      grad: "from-purple-500 to-fuchsia-600",
    },
    {
      icon: TrendingUp,
      label: "This Month",
      value: formatCurrency(analytics?.revenueThisMonthInr ?? 0),
      grad: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg",
            toast.ok ? "bg-green-600" : "bg-destructive"
          )}
        >
          {toast.msg}
        </motion.div>
      )}

      <nav className="sticky top-0 z-50 border-b bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl pt-safe">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/" className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">Local Institute Console</p>
            <p className="text-[11px] text-muted-foreground -mt-0.5">Ibemhal IAS · Staff only</p>
          </div>
          <Badge variant={mode === "supabase" ? "success" : "outline"} className="gap-1 text-[10px]">
            {mode === "supabase" ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
            {mode === "supabase" ? "Cloud" : "Local"}
          </Badge>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Exit</span>
          </Button>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className={`bg-gradient-to-br ${m.grad} border-0 text-white`}>
                <CardContent className="p-4">
                  <m.icon className="h-5 w-5 mb-2 opacity-90" />
                  <p className="text-xl font-bold leading-tight">{m.value}</p>
                  <p className="text-[11px] text-white/80">{m.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="students">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="students">
              <Users className="h-4 w-4 mr-1.5" />Students
            </TabsTrigger>
            <TabsTrigger value="entitlements">
              <BookOpen className="h-4 w-4 mr-1.5" />Access
            </TabsTrigger>
            <TabsTrigger value="promos">
              <Ticket className="h-4 w-4 mr-1.5" />Promos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentsTab courses={courses} students={students} onDone={reload} notify={notify} />
          </TabsContent>

          <TabsContent value="entitlements">
            <EntitlementsTab
              courses={courses}
              students={students}
              setStudents={setStudents}
              notify={notify}
            />
          </TabsContent>

          <TabsContent value="promos">
            <PromosTab codes={codes} onDone={reload} notify={notify} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */
function StudentsTab({
  courses,
  students,
  onDone,
  notify,
}: {
  courses: AdminCourse[];
  students: AdminStudent[];
  onDone: () => Promise<void>;
  notify: (m: string, ok?: boolean) => void;
}) {
  const [form, setForm] = React.useState({ fullName: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const genPassword = () =>
    setForm((f) => ({
      ...f,
      password: `Ibem@${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`,
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await createStudent(form);
    notify(res.message, res.ok);
    if (res.ok) {
      setForm({ fullName: "", email: "", phone: "", password: "" });
      await onDone();
    }
    setBusy(false);
  };

  const filtered = students.filter(
    (s) =>
      !query ||
      s.full_name.toLowerCase().includes(query.toLowerCase()) ||
      s.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-2 h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />Create Student Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sn">Full Name</Label>
              <Input
                id="sn"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Thoibi Devi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="se">Email</Label>
              <Input
                id="se"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="student@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp">Phone</Label>
              <Input
                id="sp"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spw">Temporary Password</Label>
              <div className="flex gap-2">
                <Input
                  id="spw"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="min 6 characters"
                />
                <Button type="button" variant="outline" size="sm" onClick={genPassword}>
                  Generate
                </Button>
              </div>
              {form.password && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(form.password);
                    notify("Password copied");
                  }}
                  className="text-[11px] text-primary inline-flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />Copy password
                </button>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : <><Plus className="mr-2 h-4 w-4" />Create Student</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Students ({students.length})</span>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email…"
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No students yet. Create one on the left.
            </p>
          ) : (
            <ul className="divide-y max-h-[520px] overflow-y-auto">
              {filtered.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {s.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {s.enrolledCourseIds.length}/{courses.length} courses
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Entitlements                                                        */
/* ------------------------------------------------------------------ */
function EntitlementsTab({
  courses,
  students,
  setStudents,
  notify,
}: {
  courses: AdminCourse[];
  students: AdminStudent[];
  setStudents: React.Dispatch<React.SetStateAction<AdminStudent[]>>;
  notify: (m: string, ok?: boolean) => void;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(students[0]?.id ?? null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const student = students.find((s) => s.id === selectedId) ?? null;

  const toggle = async (course: AdminCourse) => {
    if (!student) return;
    const has = student.enrolledCourseIds.includes(course.id);
    setPending(course.id);

    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id
          ? {
              ...s,
              enrolledCourseIds: has
                ? s.enrolledCourseIds.filter((id) => id !== course.id)
                : [...s.enrolledCourseIds, course.id],
            }
          : s
      )
    );

    const ok = await setEntitlement(
      student.id,
      course.id,
      !has,
      course.discounted_price_inr ?? course.price_inr
    );
    notify(
      ok
        ? `${has ? "Revoked" : "Granted"} — ${course.title}`
        : "Could not update access",
      ok
    );
    setPending(null);
  };

  const filtered = courses.filter(
    (c) => !query || c.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-2 h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Student</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Create a student first.
            </p>
          ) : (
            <ul className="divide-y max-h-[520px] overflow-y-auto">
              {students.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      selectedId === s.id && "bg-primary/5 border-l-2 border-primary"
                    )}
                  >
                    <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.full_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {s.enrolledCourseIds.length}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {student ? `Course Access — ${student.full_name}` : "Course Access"}
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter courses…"
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!student ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Select a student to manage their course entitlements.
            </p>
          ) : (
            <ul className="divide-y max-h-[520px] overflow-y-auto">
              {filtered.map((c) => {
                const granted = student.enrolledCourseIds.includes(c.id);
                const isPending = pending === c.id;
                return (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggle(c)}
                      disabled={isPending}
                      role="checkbox"
                      aria-checked={granted}
                      className={cn(
                        "h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                        granted
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-muted-foreground/30 hover:border-primary"
                      )}
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : granted ? (
                        <Check className="h-3 w-3" />
                      ) : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm truncate", granted && "font-medium")}>{c.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatCurrency(c.discounted_price_inr ?? c.price_inr)}
                        </span>
                      </div>
                    </div>
                    {granted && <Badge variant="success" className="text-[10px]">Enrolled</Badge>}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Promo codes                                                         */
/* ------------------------------------------------------------------ */
function PromosTab({
  codes,
  onDone,
  notify,
}: {
  codes: AdminPromoCode[];
  onDone: () => Promise<void>;
  notify: (m: string, ok?: boolean) => void;
}) {
  const [form, setForm] = React.useState({
    code: "",
    description: "",
    discountType: "percentage" as DiscountType,
    discountValue: 25,
    maxUses: "" as string,
    expiresAt: "",
  });
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await createPromoCode({
      code: form.code,
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    });
    notify(res.message, res.ok);
    if (res.ok) {
      setForm({ ...form, code: "", description: "", maxUses: "", expiresAt: "" });
      await onDone();
    }
    setBusy(false);
  };

  const flip = async (c: AdminPromoCode) => {
    await togglePromoCode(c.id, !c.is_active);
    notify(`${c.code} ${c.is_active ? "deactivated" : "activated"}`);
    await onDone();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-2 h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />Generate Promo Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pc">Code</Label>
              <Input
                id="pc"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="IAR2026"
                className="uppercase tracking-wider font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd">Description</Label>
              <Input
                id="pd"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Aspirant rebate 2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Discount Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["percentage", "flat"] as DiscountType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, discountType: t })}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors",
                      form.discountType === t
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {t === "percentage" ? "% Percentage" : "₹ Flat"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pv">
                  {form.discountType === "percentage" ? "Percent off" : "Rupees off"}
                </Label>
                <Input
                  id="pv"
                  type="number"
                  min={1}
                  max={form.discountType === "percentage" ? 100 : undefined}
                  required
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm">Max uses</Label>
                <Input
                  id="pm"
                  type="number"
                  min={1}
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="unlimited"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pe">Expires on</Label>
              <Input
                id="pe"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : <><Plus className="mr-2 h-4 w-4" />Create Code</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Promo Codes ({codes.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y max-h-[560px] overflow-y-auto">
            {codes.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-bold tracking-wider">
                      {c.code}
                    </code>
                    <Badge variant={c.is_active ? "success" : "outline"} className="text-[10px]">
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-[11px] font-medium text-primary">
                      {c.discount_type === "percentage"
                        ? `${c.discount_value}% off`
                        : `${formatCurrency(c.discount_value)} off`}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {c.description || "No description"} ·{" "}
                    {c.max_uses === null
                      ? `${c.current_uses} uses`
                      : `${c.current_uses}/${c.max_uses} used`}
                    {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(c.code);
                    notify(`${c.code} copied`);
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Copy code"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => flip(c)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    c.is_active ? "text-green-600 hover:bg-green-500/10" : "text-muted-foreground hover:bg-muted"
                  )}
                  aria-label="Toggle active"
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
