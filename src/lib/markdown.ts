// Flatten markdown to plain text for short contexts (cards, list rows, SEO meta)
// where the raw markup (**bold**, # heading, `code`) would otherwise leak.
export function stripMarkdown(md: string | null | undefined): string {
  if (!md) return "";
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → label
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^\s*>\s?/gm, "") // blockquotes
    .replace(/^\s*[-*+]\s+/gm, "") // bullet markers
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // bold / italic / strike
    .replace(/\s+/g, " ")
    .trim();
}
