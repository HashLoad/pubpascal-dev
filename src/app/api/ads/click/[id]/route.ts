import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    const { data: row, error } = await supabase
      .from("ads")
      .select("target_url, status, start_date, end_date")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.warn("[ads/click] lookup failed", error);
      return NextResponse.json({ error: "lookup failed" }, { status: 500 });
    }

    if (
      !row ||
      row.status !== "active" ||
      typeof row.target_url !== "string" ||
      row.target_url.length === 0 ||
      (row.start_date && row.start_date > nowIso) ||
      (row.end_date && row.end_date < nowIso)
    ) {
      return NextResponse.json({ error: "ad not available" }, { status: 404 });
    }

    // Fire-and-forget click increment via service-role (RPC not exposed to anon,
    // so visitors can't inflate metrics by calling it directly). A counter outage
    // must not block the user click.
    try {
      await createServiceClient().rpc("increment_ad_clicks", { ad_id: id });
    } catch (rpcErr) {
      console.warn("[ads/click] increment failed", rpcErr);
    }

    return NextResponse.redirect(row.target_url, 302);
  } catch (err) {
    console.warn("[ads/click] unexpected", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
