export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type GoalStatus = "active" | "completed" | "paused" | "archived";

export interface Task {
  id: string; user_id: string; project_id: string | null; milestone_id: string | null;
  title: string; description: string; status: TaskStatus; priority: Priority;
  estimate_minutes: number | null; due_at: string | null; completed_at: string | null;
  created_at: string; updated_at: string; version: number;
}
export interface Project {
  id: string; user_id: string; name: string; description: string;
  color: string; status: "planned" | "active" | "paused" | "completed" | "archived";
  created_at: string;
}
export interface Goal {
  id: string; user_id: string; title: string; description: string;
  status: GoalStatus; target_at: string | null; created_at: string;
}
export interface Milestone {
  id: string; user_id: string; goal_id: string; title: string;
  status: "todo" | "in_progress" | "done"; due_at: string | null; sort_order: number;
}
export interface Note {
  id: string; user_id: string; project_id: string | null;
  title: string; plain_text: string; updated_at: string; created_at: string;
}
export interface CalendarEvent {
  id: string; user_id: string; title: string; starts_at: string; ends_at: string;
  event_type: "personal" | "meeting" | "task_block" | "break"; all_day: boolean;
}
export interface FocusSession {
  id: string; user_id: string; started_at: string; ended_at: string | null;
  duration_seconds: number | null; mode: "focus" | "short_break" | "long_break";
}
export interface Profile {
  id: string; display_name: string; timezone: string; theme: "dark" | "light" | "system";
}
export interface TaskDraft {
  title: string; description?: string; priority: Priority; status?: TaskStatus;
  project_id?: string | null; estimate_minutes?: number | null; due_at?: string | null;
}
export type PageKind = "dashboard" | "tasks" | "calendar" | "projects" | "goals" | "focus" | "notes" | "analytics" | "settings";
