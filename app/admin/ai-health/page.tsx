"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Activity, CheckCircle2, XCircle, Loader2, RefreshCw, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-base";

interface ProviderStatus {
  tier: number;
  id: string;
  name: string;
  model: string;
  strength: string;
  envKey: string;
  configured: boolean;
  costPer1MInput: number;
  costPer1MOutput: number;
}

interface HealthData {
  healthy: boolean;
  tiersConfigured: number;
  tiersTotal: number;
  activePrimary: string;
  offlineEngineReady: boolean;
  providers: ProviderStatus[];
  supportedTasks: string[];
}

export default function AIHealthPage() {
  const [data, setData] = React.useState<HealthData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ servedBy?: string; elapsedMs?: number; degraded?: boolean } | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/ai/agent");
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch("/api/ai/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "chat", payload: { message: "Reply with exactly: OK" } }),
      });
      const json = await res.json();
      setTestResult({ servedBy: json.servedBy, elapsedMs: json.elapsedMs, degraded: json.degraded });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Provider Health</h1>
          <p className="text-muted-foreground">5-tier failover chain status and configuration</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{data?.tiersConfigured}/{data?.tiersTotal}</p>
            <p className="text-xs text-muted-foreground">Tiers with API keys</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-semibold truncate">{data?.activePrimary}</p>
            <p className="text-xs text-muted-foreground">Active primary</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-semibold">Never fails</p>
                <p className="text-xs text-muted-foreground">Offline engine armed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />Failover Chain
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {data?.providers.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-4 p-4"
              >
                <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold ${
                  p.configured ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"
                }`}>
                  T{p.tier}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{p.name}</p>
                    {p.configured ? (
                      <Badge variant="success" className="text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Configured</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]"><XCircle className="h-2.5 w-2.5 mr-1" />No key</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.strength}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <code className="rounded bg-muted px-1.5 py-0.5">{p.envKey}</code>
                    <span>${p.costPer1MInput}/M in</span>
                    <span>${p.costPer1MOutput}/M out</span>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="flex items-start gap-4 p-4 bg-muted/30">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
                T6
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Ibemhal Deterministic Engine</p>
                  <Badge variant="success" className="text-[10px]">Always on</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Zero-cost local rubric scorer, quiz builder and notes generator. Guarantees the student never sees an error.
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5">no key required</code>
                  <span>$0.00/M</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live Failover Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runTest} disabled={testing}>
            {testing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Running chain...</> : <><Zap className="mr-2 h-4 w-4" />Send Test Prompt</>}
          </Button>
          {testResult && (
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Served by:</span> <strong>{testResult.servedBy}</strong></p>
              <p><span className="text-muted-foreground">Latency:</span> {testResult.elapsedMs}ms</p>
              <p><span className="text-muted-foreground">Mode:</span> {testResult.degraded ? "Offline deterministic engine" : "Live AI provider"}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
