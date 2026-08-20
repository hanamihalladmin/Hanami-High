import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Hanami uses effect-triggered async fetch loaders throughout authenticated dashboards.
      // State updates happen after asynchronous I/O; forcing timer wrappers around every
      // loader adds noise without improving correctness. Other React Hooks rules remain on.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: [
      "app/portal/NotificationAccessibilityPanel.tsx",
      "app/portal/ProfileStudioRoadmapTools.tsx",
    ],
    rules: {
      // These components intentionally evaluate wall-clock time for DND expiry and save-state
      // timestamps. Purity remains enforced globally and on render-time countdown components.
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["app/portal/RoadmapHubPanel.tsx"],
    rules: {
      // This panel fans heterogeneous REST payloads through a single indexed setter bridge.
      // Individual state shapes remain strongly typed; the bridge itself is intentionally broad.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
