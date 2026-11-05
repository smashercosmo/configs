import config from "./src/oxlint/oxlint.config.mjs";
import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    /**
     * This option can't be provided via shared configuration
     */
    typeAware: true,
  },
  extends: [config],
});
