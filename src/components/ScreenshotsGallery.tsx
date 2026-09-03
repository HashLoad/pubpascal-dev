// A horizontal strip of package screenshots. Images are repo-hosted
// (*.githubusercontent.com, enforced on save) so they pass the img-src CSP. Plain
// <img> on purpose — these are arbitrary external URLs, not assets we optimize.
export default function ScreenshotsGallery({
  screenshots,
}: {
  screenshots: string[];
}) {
  if (screenshots.length === 0) return null;

  return (
    <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
      {screenshots.map((src, i) => (
        <a
          key={src}
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Screenshot ${i + 1}`}
            loading="lazy"
            className="h-48 w-auto rounded-xl border border-slate-800 object-cover transition-opacity hover:opacity-90"
          />
        </a>
      ))}
    </div>
  );
}
