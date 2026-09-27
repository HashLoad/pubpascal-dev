export const siteConfig = {
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pubpascal.dev").replace(
    /\/+$/,
    "",
  ),
  name: "PubPascal-Dev",
  description:
    "O portal centralizado de pacotes e bibliotecas para Delphi, Lazarus, C++ Builder e RAD Studio. Descubra componentes open-source e comerciais de alta qualidade.",
  keywords: [
    "delphi",
    "lazarus",
    "pascal",
    "packages",
    "rad studio",
    "components",
    "object pascal",
    "libraries",
  ],
  defaultOgImagePath: "/opengraph-image",
} as const;

export type SiteConfig = typeof siteConfig;
