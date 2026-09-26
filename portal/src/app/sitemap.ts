import type { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";
import { siteConfig } from "@/lib/site-config";

type PackageSitemapRow = {
  slug: string;
  updated_at: string | null;
};

const LOCALIZED_ROUTES: Array<{
  path: string;
  changeFrequency: "weekly";
  priority: number;
}> = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/packages", changeFrequency: "weekly", priority: 0.8 },
  { path: "/partners", changeFrequency: "weekly", priority: 0.8 },
];

const NON_LOCALIZED_ROUTES: Array<{
  path: string;
  changeFrequency: "weekly";
  priority: number;
}> = [{ path: "/portal-status", changeFrequency: "weekly", priority: 0.8 }];

function localizedAlternates(path: string): Record<string, string> {
  return {
    "pt-BR": `${siteConfig.url}/pt-BR${path}`,
    en: `${siteConfig.url}/en${path}`,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const localizedEntries: MetadataRoute.Sitemap = LOCALIZED_ROUTES.flatMap((route) =>
    (["pt-BR", "en"] as const).map((locale) => ({
      url: `${siteConfig.url}/${locale}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: { languages: localizedAlternates(route.path) },
    })),
  );

  const staticEntries: MetadataRoute.Sitemap = NON_LOCALIZED_ROUTES.map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  let packageEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("packages")
      .select("slug, updated_at")
      .eq("status", "active");

    if (error) {
      console.warn("[sitemap] supabase query failed", error);
    } else {
      packageEntries = ((data ?? []) as PackageSitemapRow[]).flatMap((row) =>
        (["pt-BR", "en"] as const).map((locale) => ({
          url: `${siteConfig.url}/${locale}/packages/${row.slug}`,
          lastModified: row.updated_at ? new Date(row.updated_at) : now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
          alternates: { languages: localizedAlternates(`/packages/${row.slug}`) },
        })),
      );
    }
  } catch (err) {
    console.warn("[sitemap] supabase client failed", err);
  }

  return [...localizedEntries, ...staticEntries, ...packageEntries];
}
