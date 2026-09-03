// Pure SBOM body parser — no server-only deps, so it is unit-testable directly.
// Detects CycloneDX vs SPDX and pulls the headline fields (spec version, author)
// the satellite table stores alongside the raw document.

export type ParsedSbom = {
  format: "cyclonedx" | "spdx";
  specVersion: string | null;
  author: string | null;
  document: unknown;
};

// Best-effort header/body parse into the stored shape. Format precedence:
// explicit X-SBOM-Format header → CycloneDX marker (bomFormat) → SPDX marker
// (spdxVersion). specVersion/author are pulled from well-known fields when
// present; both are nullable (the column allows null). Returns null when the
// body is not an object or the format can't be determined.
export function parseSbom(formatHeader: string | null, body: unknown): ParsedSbom | null {
  const doc = body as Record<string, unknown> | null;
  if (doc === null || typeof doc !== "object") return null;

  let format: "cyclonedx" | "spdx" | null = null;
  const hdr = (formatHeader ?? "").trim().toLowerCase();
  if (hdr === "cyclonedx" || hdr === "spdx") {
    format = hdr;
  } else if (typeof doc.bomFormat === "string" && doc.bomFormat.toLowerCase() === "cyclonedx") {
    format = "cyclonedx";
  } else if (typeof doc.spdxVersion === "string") {
    format = "spdx";
  }
  if (format === null) return null;

  let specVersion: string | null = null;
  if (format === "cyclonedx" && typeof doc.specVersion === "string") {
    specVersion = doc.specVersion;
  } else if (format === "spdx" && typeof doc.spdxVersion === "string") {
    specVersion = doc.spdxVersion;
  }

  // CycloneDX: metadata.tools[].vendor/name. (SPDX creators could be added later.)
  let author: string | null = null;
  const meta = doc.metadata as Record<string, unknown> | undefined;
  const tools = meta?.tools;
  if (Array.isArray(tools) && tools.length > 0 && typeof tools[0] === "object" && tools[0] !== null) {
    const t = tools[0] as Record<string, unknown>;
    const name = typeof t.name === "string" ? t.name : "";
    const vendor = typeof t.vendor === "string" ? t.vendor : "";
    author = [vendor, name].filter(Boolean).join(" ") || null;
  }

  return { format, specVersion, author, document: body };
}
