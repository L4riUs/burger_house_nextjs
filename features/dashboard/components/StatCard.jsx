"use client";

import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ACCENT_CLASSES = {
  orange: { icon: "bg-orange-500/10 text-orange-500", bar: "bg-orange-500" },
  emerald: { icon: "bg-emerald-500/10 text-emerald-500", bar: "bg-emerald-500" },
  blue: { icon: "bg-blue-500/10 text-blue-500", bar: "bg-blue-500" },
  purple: { icon: "bg-purple-500/10 text-purple-500", bar: "bg-purple-500" },
  amber: { icon: "bg-amber-500/10 text-amber-500", bar: "bg-amber-500" },
  red: { icon: "bg-red-500/10 text-red-500", bar: "bg-red-500" },
  gray: { icon: "bg-gray-500/10 text-gray-500", bar: "bg-gray-500" },
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  accent = "blue",
  loading = false,
}) {
  const classes = ACCENT_CLASSES[accent] || ACCENT_CLASSES.blue;

  if (loading) {
    return (
      <Card className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-muted" />
        <div className="space-y-3 animate-pulse">
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="h-8 w-24 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${classes.bar}`} />
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${classes.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== null && trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {trend >= 0 ? <TrendingUpIcon className="h-3 w-3" /> : <TrendingDownIcon className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </Card>
  );
}