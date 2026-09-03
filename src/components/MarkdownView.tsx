import React from "react";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "a",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "code",
  "pre",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "blockquote",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "hr",
  "br",
  "del",
  "span",
];

const ALLOWED_ATTR = ["href", "title", "alt", "src", "class", "id", "lang"];

const ALLOWED_URI_SCHEMES = ["http", "https", "mailto"];

// A README rendered OFF GitHub has its relative image/link URLs (e.g.
// `assets/chat.png`) broken — GitHub resolves them against the repo, we don't.
// Rewrite relative `img src` to raw.githubusercontent (which the img-src CSP
// allows) and relative `a href` to the repo's blob view, using the repo URL.
function parseGithubRepo(repoUrl: string): { owner: string; repo: string } | null {
  const m = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(repoUrl.trim());
  return m ? { owner: m[1], repo: m[2] } : null;
}

function isAbsoluteUrl(url: string): boolean {
  return /^(https?:|data:|blob:|mailto:|#)/i.test(url.trim()) || url.trim().startsWith("//");
}

function resolveRelative(base: string, url: string): string {
  // Proper URL resolution so `../` escapes the blob/HEAD prefix correctly
  // (e.g. `../../releases` -> the repo's releases page, not a broken blob path).
  try {
    return new URL(url.trim(), base).href;
  } catch {
    return url;
  }
}

// GitHub-style syntax highlighting for fenced code blocks (Delphi/Pascal, JSON,
// bash, etc.). highlight.js emits <span class="hljs-…"> tokens that survive the
// sanitizer (span + class are allowed); the theme CSS is imported in the layout.
marked.use(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      try {
        const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      } catch {
        return code;
      }
    },
  }),
);
marked.setOptions({ gfm: true, breaks: false });

// sanitize-html is pure JS (no jsdom), so it works in serverless functions.
// When `repoUrl` is given (the repo README), relative img/link URLs are rewritten
// to absolute GitHub URLs so they resolve off-site.
function sanitize(html: string, repoUrl?: string): string {
  const repo = repoUrl ? parseGithubRepo(repoUrl) : null;
  const rawBase = repo
    ? `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/HEAD/`
    : "";
  const blobBase = repo
    ? `https://github.com/${repo.owner}/${repo.repo}/blob/HEAD/`
    : "";

  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { "*": ALLOWED_ATTR },
    allowedSchemes: ALLOWED_URI_SCHEMES,
    transformTags: repo
      ? {
          img: (tagName, attribs) => {
            if (attribs.src && !isAbsoluteUrl(attribs.src)) {
              attribs.src = resolveRelative(rawBase, attribs.src);
            }
            return { tagName, attribs };
          },
          a: (tagName, attribs) => {
            if (attribs.href && !isAbsoluteUrl(attribs.href)) {
              attribs.href = resolveRelative(blobBase, attribs.href);
            }
            return { tagName, attribs };
          },
        }
      : {},
  });
}

export default function MarkdownView({
  source,
  repoUrl,
}: {
  source: string;
  repoUrl?: string;
}) {
  if (!source || source.trim().length === 0) return null;

  let safe: string;
  try {
    const html = marked.parse(source, { async: false }) as string;
    safe = sanitize(html, repoUrl);
  } catch {
    // Never crash the page on a parse/sanitize failure — degrade to safe plaintext
    // (React escapes children, so no HTML is injected).
    return (
      <pre className="whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-sm text-slate-300 overflow-x-auto">
        {source}
      </pre>
    );
  }

  return (
    <div
      className="prose prose-invert max-w-none prose-headings:font-sans prose-headings:font-semibold prose-h1:pb-2 prose-h1:border-b prose-h1:border-slate-800 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-800 prose-ul:my-4 prose-li:my-1 prose-a:text-brand-blue hover:prose-a:text-brand-blue-light prose-code:text-brand-red prose-code:bg-slate-900/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
