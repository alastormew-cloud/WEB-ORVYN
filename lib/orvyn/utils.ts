import type { Task, FocusSession, Milestone } from "./types";
export function safeDate(s: string | null) { return s ? new Date(s) : null; }
export function dayKey(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function prettyDate(s: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!s) return "No date";
  return new Date(s).toLocaleDateString(undefined, opts ?? { month: "short", day: "numeric" });
}
export function timeAgo(s: string) {
  const n = Math.max(0, Math.round((Date.now() - new Date(s).getTime()) / 60000));
  if (n < 1) return "Just now";
  if (n < 60) return `${n}m ago`;
  if (n < 1440) return `${Math.floor(n / 60)}h ago`;
  return `${Math.floor(n / 1440)}d ago`;
}
export function weeklyCounts(tasks: Task[]) {
  const today = new Date(); const weekday = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - weekday);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday); date.setDate(monday.getDate() + i);
    const key = dayKey(date);
    return { day: date.toLocaleDateString(undefined, { weekday: "short" }), key,
      count: tasks.filter(t => t.completed_at && dayKey(t.completed_at) === key).length };
  });
}
export function focusHours(sessions: FocusSession[]) {
  return sessions.reduce((sum, session) => sum + (session.mode === "focus" ? (session.duration_seconds || 0) : 0), 0) / 3600;
}
export function goalPercent(milestones: Milestone[], goalId: string) {
  const related = milestones.filter(m => m.goal_id === goalId);
  return related.length ? Math.round(100 * related.filter(m => m.status === "done").length / related.length) : 0;
}
export const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 } as const;
