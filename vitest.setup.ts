// Registers jest-dom matchers (toBeInTheDocument, toHaveTextContent, …) for the
// jsdom component suites (ADR-125). Runs before every test file; for the node
// pure-function suites it is a cheap no-op (matcher registration only, no DOM).
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount rendered React trees between tests. RTL's automatic cleanup only
// registers when Vitest globals are enabled; globals stay off (ADR-123), so it
// is wired here. The guard scopes it to the jsdom suites — node test files have
// no `document` and skip it.
afterEach(() => {
  if (typeof document !== "undefined") cleanup();
});
