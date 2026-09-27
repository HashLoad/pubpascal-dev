import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const runtime = "edge";
export const alt = `${siteConfig.name} — pacotes Delphi, Lazarus e RAD Studio`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND_RED = "#ED1C24";
const BRAND_SLATE = "#0F172A";
const BRAND_SLATE_SOFT = "#1E293B";

export default async function Image() {
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
              fontSize: 28,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#94A3B8",
              marginBottom: 24,
              display: "flex",
            }}
          >
            pubpascal.dev
          </div>
          <div
            style={{
              fontSize: 104,
              fontWeight: 800,
              lineHeight: 1.05,
              color: "#FFFFFF",
              display: "flex",
            }}
          >
            {siteConfig.name}
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 36,
              color: "#CBD5E1",
              lineHeight: 1.3,
              display: "flex",
              maxWidth: 980,
            }}
          >
            Portal de pacotes Delphi, Lazarus, C++ Builder e RAD Studio.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "32px 96px",
            background: BRAND_SLATE_SOFT,
            fontSize: 24,
            color: "#94A3B8",
          }}
        >
          <div style={{ display: "flex" }}>Open Source & Comercial</div>
          <div style={{ display: "flex", color: BRAND_RED, fontWeight: 700 }}>
            pubpascal.dev
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
