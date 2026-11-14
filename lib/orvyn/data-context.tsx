"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent, FocusSession, Goal, Milestone, Note, Profile, Project, Task, TaskDraft, TaskStatus } from "./types";

type NoteDraft = { title: string; plain_text: string; project_id?: string | null };
type Ctx = {
  email: string; userId: string; loading: boolean; busy: boolean; error: string | null; notice: string | null;
  tasks: Task[]; projects: Project[]; goals: Goal[]; milestones: Milestone[];
  notes: Note[]; events: CalendarEvent[]; sessions: FocusSession[]; profile: Profile | null;
  refresh: () => Promise<void>;
  addTask: (draft: TaskDraft) => Promise<boolean>;
  editTask: (id: string, draft: TaskDraft) => Promise<boolean>;
  changeTaskStatus: (task: Task, status: TaskStatus) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  addProject: (name: string, description?: string) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  addGoal: (title: string, description?: string) => Promise<boolean>;
  toggleGoal: (goal: Goal) => Promise<boolean>;
  addMilestone: (goalId: string, title: string) => Promise<boolean>;
  toggleMilestone: (milestone: Milestone) => Promise<boolean>;
  addNote: (draft: NoteDraft) => Promise<boolean>;
  editNote: (id: string, draft: NoteDraft) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  addEvent: (title: string, startsAt: string, endsAt: string) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  addSession: (start: Date, seconds: number) => Promise<boolean>;
  saveProfile: (displayName: string, theme: Profile["theme"]) => Promise<boolean>;
  dismissNotice: () => void;
};
const Context = createContext<Ctx | null>(null);

export function OrvynProvider({ children, email, userId }: {children: React.ReactNode; email: string; userId: string}) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    // Browser-side queries use the existing Supabase SSR auth cookies + RLS policies.
    const results = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("milestones").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("notes").select("id,user_id,project_id,title,plain_text,created_at,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("calendar_events").select("*").eq("user_id", userId).order("starts_at"),
      supabase.from("focus_sessions").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("id,display_name,timezone,theme").eq("id", userId).maybeSingle(),
    ]);
    const failure = results.find(r => r.error);
    if (failure?.error) {
      setError(`${failure.error.message}. If this is a new setup, apply the included ORVYN SQL migration in Supabase first.`);
    } else {
      setTasks((results[0].data || []) as Task[]);
      setProjects((results[1].data || []) as Project[]);
      setGoals((results[2].data || []) as Goal[]);
      setMilestones((results[3].data || []) as Milestone[]);
      setNotes((results[4].data || []) as Note[]);
      setEvents((results[5].data || []) as CalendarEvent[]);
      setSessions((results[6].data || []) as FocusSession[]);
      setProfile((results[7].data || null) as Profile | null);
    }
    setLoading(false);
  }, [supabase, userId]);
  useEffect(() => { void refresh(); }, [refresh]);

  // RLS is the authorization boundary. These client-side inputs never set another owner's ID.
  const mutate = useCallback(async (request: () => PromiseLike<{error: {message:string}|null}>, message: string) => {
    setBusy(true); setNotice(null);
    try {
      const result = await request();
      if (result.error) { setNotice(`Error: ${result.error.message}`); return false; }
      await refresh(); setNotice(message); return true;
    } catch (e) {
      setNotice(`Error: ${e instanceof Error ? e.message : "Request failed"}`); return false;
    } finally { setBusy(false); }
  }, [refresh]);

  const addTask = (draft: TaskDraft) => mutate(() => supabase.from("tasks").insert({
    user_id: userId, title: draft.title.trim(), description: draft.description || "", priority: draft.priority,
    status: draft.status || "todo", project_id: draft.project_id || null,
    estimate_minutes: draft.estimate_minutes || null, due_at: draft.due_at || null,
    completed_at: draft.status === "done" ? new Date().toISOString() : null,
  }), "Task created");
  const editTask = (id: string, draft: TaskDraft) => mutate(() => supabase.from("tasks").update({
    title: draft.title.trim(), description: draft.description || "", priority: draft.priority,
    project_id: draft.project_id || null, estimate_minutes: draft.estimate_minutes || null,
    due_at: draft.due_at || null,
  }).eq("id", id).eq("user_id", userId), "Task updated");
  const changeTaskStatus = (task: Task, status: TaskStatus) => mutate(() => supabase.from("tasks").update({
    status, completed_at: status === "done" ? new Date().toISOString() : null,
  }).eq("id", task.id).eq("user_id", userId), status === "done" ? "Task completed" : "Task updated");
  const deleteTask = (id: string) => mutate(() => supabase.from("tasks").delete().eq("id", id).eq("user_id", userId), "Task deleted");
  const addProject = (name: string, description = "") => mutate(() => supabase.from("projects").insert({ user_id: userId, name: name.trim(), description }), "Project created");
  const deleteProject = (id: string) => mutate(() => supabase.from("projects").delete().eq("id", id).eq("user_id", userId), "Project deleted");
  const addGoal = (title: string, description = "") => mutate(() => supabase.from("goals").insert({ user_id: userId, title: title.trim(), description }), "Goal created");
  const toggleGoal = (goal: Goal) => mutate(() => supabase.from("goals").update({ status: goal.status === "completed" ? "active" : "completed" }).eq("id", goal.id).eq("user_id", userId), "Goal updated");
  const addMilestone = (goalId: string, title: string) => mutate(() => supabase.from("milestones").insert({ user_id: userId, goal_id: goalId, title: title.trim() }), "Milestone created");
  const toggleMilestone = (milestone: Milestone) => mutate(() => supabase.from("milestones").update({ status: milestone.status === "done" ? "todo" : "done" }).eq("id", milestone.id).eq("user_id", userId), "Milestone updated");
  const addNote = (draft: NoteDraft) => mutate(() => supabase.from("notes").insert({ user_id: userId, title: draft.title.trim() || "Untitled", plain_text: draft.plain_text, content: {}, project_id: draft.project_id || null }), "Note created");
  const editNote = (id: string, draft: NoteDraft) => mutate(() => supabase.from("notes").update({ title: draft.title.trim() || "Untitled", plain_text: draft.plain_text, project_id: draft.project_id || null }).eq("id", id).eq("user_id", userId), "Note saved");
  const deleteNote = (id: string) => mutate(() => supabase.from("notes").delete().eq("id", id).eq("user_id", userId), "Note deleted");
  const addEvent = (title: string, startsAt: string, endsAt: string) => mutate(() => supabase.from("calendar_events").insert({ user_id: userId, title: title.trim(), starts_at: startsAt, ends_at: endsAt, event_type: "personal" }), "Event scheduled");
  const deleteEvent = (id: string) => mutate(() => supabase.from("calendar_events").delete().eq("id", id).eq("user_id", userId), "Event removed");
  const addSession = (start: Date, seconds: number) => mutate(() => supabase.from("focus_sessions").insert({ user_id: userId, started_at: start.toISOString(), ended_at: new Date().toISOString(), duration_seconds: seconds, mode: "focus" }), "Focus session saved");
  const saveProfile = (display_name: string, theme: Profile["theme"]) => mutate(() => supabase.from("profiles").update({ display_name: display_name.trim(), theme }).eq("id", userId), "Settings saved");

  return <Context.Provider value={{ email, userId, loading, busy, error, notice, tasks, projects, goals, milestones, notes, events, sessions, profile, refresh, addTask, editTask, changeTaskStatus, deleteTask, addProject, deleteProject, addGoal, toggleGoal, addMilestone, toggleMilestone, addNote, editNote, deleteNote, addEvent, deleteEvent, addSession, saveProfile, dismissNotice: () => setNotice(null) }}>{children}</Context.Provider>;
}
export function useOrvyn() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useOrvyn must be inside OrvynProvider");
  return ctx;
}
