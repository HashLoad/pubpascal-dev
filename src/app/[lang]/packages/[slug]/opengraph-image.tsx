import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/site-config";

export const runtime = "edge";
export const alt = `${siteConfig.name} — pacote`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_RED = "#ED1C24";
const BRAND_SLATE = "#0F172A";
const BRAND_SLATE_SOFT = "#1E293B";
const BRAND_BLUE = "#007ACC";

type PackageOgRow = {
  name: string;
  description: string | null;
  license_type: string | null;
  highlight_level: "gold" | "silver" | "bronze" | "none" | null;
};

const HIGHLIGHT_RING: Record<string, string> = {
  gold: "#F59E0B",
  silver: "#94A3B8",
  bronze: "#B45309",
};

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

async function fetchPackage(slug: string): Promise<PackageOgRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  try {
    const supabase = createClient(url, anon, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase
      .from("packages")
      .select("name, description, license_type, highlight_level")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) {
      console.warn("[packages/[slug]/opengraph-image] query failed", error);
      return null;
    }
    return (data as PackageOgRow | null) ?? null;
  } catch (err) {
    console.warn("[packages/[slug]/opengraph-image] client failed", err);
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pkg = await fetchPackage(slug);

  const title = pkg?.name ?? "Pacote não encontrado";
  const description = pkg?.description
    ? truncate(pkg.description, 140)
    : "Este pacote não está disponível no catálogo público.";
  const isCommercial = (pkg?.license_type ?? "").toLowerCase() === "commercial";
  const licenseLabel = isCommercial ? "Comercial" : "Open Source";
  const licenseColor = isCommercial ? BRAND_RED : BRAND_BLUE;
  const tierRing = pkg?.highlight_level
    ? HIGHLIGHT_RING[pkg.highlight_level]
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BRAND_SLATE,
          display: "flex",
          flexDirection: "column",
          color: "#F8FAFC",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ height: 12, background: BRAND_RED, display: "flex" }} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 96px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                fontSize: 26,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: "#94A3B8",
                display: "flex",
              }}
            >
              pubpascal.dev
            </div>
            {tierRing ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 18px",
                  border: `3px solid ${tierRing}`,
                  borderRadius: 999,
                  color: tierRing,
                  fontWeight: 700,
                  fontSize: 22,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                {pkg?.highlight_level}
              </div>
            ) : null}
          </div>

          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.05,
              color: "#FFFFFF",
              display: "flex",
              maxWidth: 1020,
            }}
          >
            {truncate(title, 48)}
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 32,
              color: "#CBD5E1",
              lineHeight: 1.3,
              display: "flex",
              maxWidth: 1020,
            }}
          >
            {description}
          </div>

          <div style={{ marginTop: 36, display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 22px",
                background: licenseColor,
                color: "#FFFFFF",
                fontSize: 24,
                fontWeight: 700,
                borderRadius: 8,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {licenseLabel}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "28px 96px",
            background: BRAND_SLATE_SOFT,
            fontSize: 24,
            color: "#94A3B8",
          }}
        >
          <div style={{ display: "flex" }}>{siteConfig.name}</div>
          <div style={{ display: "flex", color: BRAND_RED, fontWeight: 700 }}>
            pubpascal.dev
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
