"use client";
import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useOrvyn } from "@/lib/orvyn/data-context";
import type { Priority, Task } from "@/lib/orvyn/types";

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0,16);
}
export function TaskDialog({ open, onClose, task }: {open:boolean;onClose:()=>void;task?:Task | null}) {
  const { busy, projects, addTask, editTask } = useOrvyn();
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium"); const [project, setProject] = useState("");
  const [date, setDate] = useState(""); const [minutes, setMinutes] = useState("45");
  useEffect(() => {
    if (open) { setTitle(task?.title || ""); setDescription(task?.description || ""); setPriority(task?.priority || "medium"); setProject(task?.project_id || ""); setDate(toLocalInput(task?.due_at)); setMinutes(String(task?.estimate_minutes || 45)); }
  }, [open,task]);
  useEffect(() => { if (!open) return; const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; document.addEventListener("keydown",handler); return () => document.removeEventListener("keydown",handler); }, [open,onClose]);
  if (!open) return null;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!title.trim() || busy) return;
    const draft = { title: title.trim(), description, priority, project_id: project || null,
      estimate_minutes: minutes ? Math.min(1440,Math.max(1,Number(minutes))) : null,
      due_at: date ? new Date(date).toISOString() : null };
    const okay = task ? await editTask(task.id,draft) : await addTask(draft);
    if (okay) onClose();
  };
  return <div className="ov-modal-backdrop" onMouseDown={e=> {if(e.target===e.currentTarget)onClose();}}><section className="ov-modal" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
    <div className="ov-modal-top"><div><span className="ov-eyebrow">TASK MANAGEMENT</span><h2 id="task-editor-title">{task ? "Edit Task" : "Create a Task"}</h2></div><button className="ov-icon-button" aria-label="Close" onClick={onClose}><X size={19}/></button></div>
    <form onSubmit={e=>void submit(e)} className="ov-form">
      <label>Task name<input autoFocus required maxLength={240} value={title} onChange={e=>setTitle(e.target.value)} placeholder="What needs to get done?"/></label>
      <label>Description<textarea rows={3} maxLength={3000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Add optional details..."/></label>
      <div className="ov-form-grid"><label>Priority<select value={priority} onChange={e=>setPriority(e.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><label>Project<select value={project} onChange={e=>setProject(e.target.value)}><option value="">Personal task</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
      <div className="ov-form-grid"><label>Due date / time<input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Estimate (minutes)<input type="number" min="1" max="1440" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label></div>
      <div className="ov-modal-actions"><button className="ov-btn" type="button" onClick={onClose}>Cancel</button><button className="ov-btn ov-btn-primary" type="submit" disabled={busy || !title.trim()}>{busy ? "Saving..." : task ? "Save changes" : "Create task"}</button></div>
    </form>
  </section></div>;
}
