import { redirect } from "next/navigation";
// The original Supabase starter sends authenticated users to /protected.
// Redirect that destination to our private ORVYN dashboard.
export default function ProtectedPage() { redirect("/dashboard"); }
