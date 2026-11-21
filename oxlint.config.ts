import { defineConfig } from "oxlint";

import config from "./src/oxlint/oxlint.config.mjs";

export default defineConfig({
  options: {
    /** Options can't be provided via shared configuration */
    reportUnusedDisableDirectives: "error",
    typeAware: true,
  },
  extends: [config],
});
