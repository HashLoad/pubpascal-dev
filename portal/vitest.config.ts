import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Portal test runner (ADR-120). The `@/*` alias is read from the single
// `tsconfig.json` source of truth via vite-tsconfig-paths (ADR-121) — no
// hand-maintained alias map. `node` stays the global default (ADR-124): the
// pure-function suite from Demand 1/2 runs without a DOM. Component tests opt
// into jsdom per file via the `// @vitest-environment jsdom` docblock.
// No Vitest globals (ADR-123): every test imports `describe`/`it`/`expect`/`vi`
// explicitly; only the jest-dom matchers come from `vitest.setup.ts` (ADR-125),
// so the product `tsconfig`/ESLint config stays untouched.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      // Scoped to the modules actually under test (ADR-127/BR4): a whole-`src/`
      // threshold would be meaninglessly low. Widen this list as new suites land.
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/lib/slug.ts",
        "src/lib/markdown.ts",
        "src/app/[lang]/packages/searchParams.ts",
        "src/utils/pubPoints.ts",
        "src/lib/publish-validation/runner.ts",
        "src/lib/publish-validation/rules/readme.ts",
        "src/components/PackageCard.tsx",
        "src/components/ScoresPanel.tsx",
        "src/components/PartnerCard.tsx",
        "src/lib/rate-limit/keys.ts",
        "src/lib/turnstile/index.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 80,
      },
    },
  },
});
