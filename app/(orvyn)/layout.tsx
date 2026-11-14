import "./orvyn.css";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrvynProvider } from "@/lib/orvyn/data-context";
import { OrvynShell } from "@/components/orvyn/shell";

// Next.js 16 with Cache Components requires request-time auth behind Suspense.
async function AuthenticatedWorkspace({ children }: {children: React.ReactNode}) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/login");
  return <OrvynProvider userId={user.id} email={user.email ?? "ORVYN user"}><OrvynShell>{children}</OrvynShell></OrvynProvider>;
}

export default function OrvynLayout({children}: {children: React.ReactNode}) {
  return <Suspense fallback={<div className="ov-app"><div className="ov-loading" style={{width:"100%"}}><div className="ov-loading-orbit"/><h2>Connecting to ORVYN</h2><p>Securing your workspace...</p></div></div>}>
    <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>
  </Suspense>;
}
