import { redirect } from "next/navigation";
// Preserve all starter auth flows; route the entry page into ORVYN.
export default function Home() { redirect("/dashboard"); }
