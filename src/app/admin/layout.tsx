import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AdminAccessDenied from "@/components/AdminAccessDenied";
import AdminShell from "@/components/AdminShell";

// /admin uses cookies + per-request Supabase auth — never statically prerender.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware (Tier 1) already redirects anon traffic; this is a defensive guard.
  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return <AdminAccessDenied />;
  }

  return <AdminShell>{children}</AdminShell>;
}
