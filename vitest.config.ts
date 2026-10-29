import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // never talk to a real backend from unit tests
    env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "", VITE_AUTH_EXCHANGE_URL: "http://session.test", VITE_THIRDWEB_CLIENT_ID: "test-client" },
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/utils/**", "src/context/**", "src/components/amixof/**", "src/components/stablepay/**", "src/components/auth/**"],
      exclude: ["src/**/*.test.*", "src/test/**", "src/routeTree.gen.ts", "src/lib/queryClient.ts"],
      reporter: ["text-summary", "html"],
    },
  },
});
