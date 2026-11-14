"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrvyn } from "@/lib/orvyn/data-context";
import {
  Activity, Bell, CalendarDays, ChevronRight,
  FolderKanban, LayoutDashboard, ListTodo, LogOut, Menu, Moon, NotebookPen,
  Orbit, Plus, RefreshCcw, Search, Settings2, Sparkles, Target, Timer, X,
} from "lucide-react";
import { TaskDialog } from "./task-dialog";

export const navigation = [
  { href: "/dashboard", title: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", title: "My Tasks", icon: ListTodo },
  { href: "/calendar", title: "Calendar", icon: CalendarDays },
  { href: "/projects", title: "Projects", icon: FolderKanban },
  { href: "/goals", title: "Goals", icon: Target },
  { href: "/focus", title: "Focus Station", icon: Timer },
  { href: "/notes", title: "Notes", icon: NotebookPen },
  { href: "/analytics", title: "Analytics", icon: Activity },
  { href: "/settings", title: "Settings", icon: Settings2 },
] as const;

export function OrvynShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const state = useOrvyn();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const title = navigation.find(n => pathname === n.href)?.title || "Mission Control";
  const displayName = state.profile?.display_name === "Explorer" ? state.email.split("@")[0] : (state.profile?.display_name || state.email.split("@")[0]);
  const initials = displayName.slice(0, 2).toUpperCase();
  const dueTasks = state.tasks.filter(t => t.status !== "done" && t.status !== "archived" && t.due_at && new Date(t.due_at) < new Date(Date.now() + 86400000));
  const results = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    return [
      ...state.tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 6).map(t => ({id:t.id,title:t.title,area:"Task",href:"/tasks"})),
      ...state.projects.filter(p => p.name.toLowerCase().includes(q)).slice(0, 4).map(p => ({id:p.id,title:p.name,area:"Project",href:"/projects"})),
      ...state.notes.filter(n => n.title.toLowerCase().includes(q)).slice(0, 4).map(n => ({id:n.id,title:n.title,area:"Note",href:"/notes"})),
    ];
  }, [searchText, state.tasks, state.projects, state.notes]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(o => !o); }
      if (e.key === "Escape") { setSearchOpen(false); setMenuOpen(false); setBellOpen(false); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  const logout = async () => {
    setSigningOut(true);
    try { await createClient().auth.signOut(); router.replace("/auth/login"); router.refresh(); }
    finally { setSigningOut(false); }
  };

  return <div className="ov-app" data-theme={state.profile?.theme === "light" ? "light" : "dark"}>
    <div className="ov-ambient ov-ambient-one"/><div className="ov-ambient ov-ambient-two"/>
    {menuOpen && <button className="ov-menu-shade" aria-label="Close menu" onClick={() => setMenuOpen(false)}/>}
    <aside className={`ov-sidebar ${menuOpen ? "ov-sidebar-open" : ""}`}>
      <Link className="ov-brand" href="/dashboard"><span className="ov-brand-symbol"><Orbit size={26} strokeWidth={2}/></span><span>ORVYN<span className="ov-brand-dot">.</span><small>YOUR PERSONAL OS</small></span></Link>
      <div className="ov-nav-caption">WORKSPACE</div>
      <nav aria-label="Main navigation" className="ov-nav">
        {navigation.slice(0,8).map(item => <Link key={item.href} href={item.href} className={`ov-nav-item ${pathname === item.href ? "ov-nav-active" : ""}`}><item.icon size={18}/><span>{item.title}</span>{pathname === item.href && <span className="ov-nav-active-dot"/>}</Link>)}
      </nav>
      <div className="ov-sidebar-spacer"/>
      <div className="ov-sidebar-bottom">
        <Link href="/settings" className={`ov-nav-item ${pathname === "/settings" ? "ov-nav-active" : ""}`}><Settings2 size={18}/>Settings</Link>
        <div className="ov-side-tip"><span className="ov-side-tip-icon"><Sparkles size={16}/></span><strong>Shape your future</strong><p>Small steps. Meaningful progress.</p></div>
        <div className="ov-user"><span className="ov-avatar">{initials}</span><span className="ov-user-words"><strong title={state.email}>{displayName}</strong><small>Personal workspace</small></span><button className="ov-icon-button" onClick={logout} disabled={signingOut} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button></div>
      </div>
    </aside>
    <div className="ov-main">
      <header className="ov-header">
        <div className="ov-header-start"><button className="ov-icon-button ov-mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={21}/></button><div className="ov-breadcrumb"><span>Workspace</span><ChevronRight size={15}/><strong>{title}</strong></div></div>
        <div className="ov-header-actions">
          <button className="ov-search-trigger" onClick={() => setSearchOpen(true)}><Search size={16}/><span>Search anything...</span><kbd>Ctrl K</kbd></button>
          <button className="ov-icon-button" title="Refresh data" aria-label="Refresh data" onClick={() => void state.refresh()}><RefreshCcw size={17}/></button>
          <div className="ov-relative"><button className="ov-icon-button" aria-label="Upcoming deadlines" onClick={() => setBellOpen(!bellOpen)}><Bell size={18}/>{dueTasks.length > 0 && <i className="ov-notice-dot"/>}</button>
            {bellOpen && <div className="ov-bell-popup"><strong>Upcoming deadlines</strong>{dueTasks.length === 0 ? <p>Nothing urgent right now.</p> : dueTasks.slice(0,5).map(t => <p key={t.id}>{t.title}</p>)}</div>}
          </div>
          <button className="ov-btn ov-btn-primary ov-header-add" onClick={() => setNewTaskOpen(true)}><Plus size={17}/> New Task</button>
          <span className="ov-avatar ov-top-avatar">{initials}</span>
        </div>
      </header>
      <main className="ov-content">
        {state.error && <div className="ov-message ov-message-error"><span><strong>Database connection needs attention.</strong> {state.error}</span><button onClick={() => void state.refresh()} className="ov-btn ov-btn-small">Retry</button></div>}
        {state.notice && <div className={`ov-message ${state.notice.startsWith("Error:") ? "ov-message-error" : "ov-message-success"}`}><span>{state.notice}</span><button aria-label="Dismiss message" onClick={state.dismissNotice}><X size={15}/></button></div>}
        {children}
      </main>
    </div>
    <nav className="ov-mobile-bottom" aria-label="Mobile navigation">
      {navigation.slice(0,3).map(item => <Link key={item.href} href={item.href} className={pathname === item.href ? "ov-mobile-selected" : ""}><item.icon size={20}/><span>{item.href === "/dashboard" ? "Home" : item.title}</span></Link>)}
      <button className="ov-mobile-add" aria-label="New task" onClick={() => setNewTaskOpen(true)}><Plus size={23}/></button>
      <button onClick={() => setMenuOpen(true)}><Menu size={20}/><span>More</span></button>
    </nav>
    {searchOpen && <div className="ov-modal-backdrop" onClick={() => setSearchOpen(false)}><div className="ov-search-modal" role="dialog" aria-modal="true" aria-label="Search ORVYN" onClick={e => e.stopPropagation()}><div className="ov-search-line"><Search size={20}/><input autoFocus value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Search tasks, projects, notes..."/><button className="ov-key" onClick={() => setSearchOpen(false)}>ESC</button></div><div className="ov-search-items">{searchText && results.length === 0 && <p>No matches found.</p>}{!searchText && <p>Start typing to explore your workspace.</p>}{results.map(result => <button key={result.area+result.id} onClick={() => { setSearchOpen(false); setSearchText(""); router.push(result.href); }}><Search size={15}/><span>{result.title}</span><small>{result.area}</small></button>)}</div></div></div>}
    <TaskDialog open={newTaskOpen} onClose={() => setNewTaskOpen(false)}/>
  </div>;
}
