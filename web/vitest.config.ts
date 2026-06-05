import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test-setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // DOMPurify v3 ESM exports a factory function, not an initialized instance.
      // The CJS build auto-initializes when `window` is present (jsdom provides it).
      // This alias ensures direct imports (e.g. in dompurify.test.ts) get a working
      // sanitize() method. Note: component-level imports may use vitest's optimizer,
      // so CherryRender tests verify integration via render/output assertions instead.
      dompurify: path.resolve(__dirname, "./node_modules/dompurify/dist/purify.cjs.js"),
    },
  },
});
