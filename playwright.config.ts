import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests drive the real app in a browser. They run against a production build with Supabase
 * deliberately left unconfigured, which puts the app in demo mode (in-memory social data, payment pages show the
 * setup message). That keeps them fast and deterministic: no backend, no test accounts, no secrets.
 * Real login and payments can't be automated (thirdweb emails a code); the RLS script covers the database.
 *
 * Locally this uses your installed Google Chrome (no browser download). CI installs Chromium.
 */
const channel = process.env.CI ? undefined : "chrome";
// an unusual port on purpose, and never reusing a running server: tests must only ever hit the build they just made
const PORT = Number(process.env.E2E_PORT ?? 4189);
// second build with a (fake, fully stubbed) Supabase configured, so the signed-in StablePay screens can be laid out and tested
const AUTH_PORT = PORT + 1;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // each worker is a full browser; a handful is plenty and keeps laptops (and small CI runners) responsive
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1280, height: 800 } }, testIgnore: /(mobile|signedin)\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"], channel }, testMatch: /(mobile|a11y)\.spec/ },
    { name: "signed-in", use: { ...devices["Desktop Chrome"], channel, baseURL: `http://127.0.0.1:${AUTH_PORT}` }, testMatch: /signedin\.spec/ },
  ],
  webServer: [
    {
      command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --host 127.0.0.1 --port ${PORT} --strictPort`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "", VITE_AUTH_EXCHANGE_URL: "" },
    },
    {
      command: `npx vite build --outDir dist-e2e-auth --emptyOutDir && npx vite preview --outDir dist-e2e-auth --host 127.0.0.1 --port ${AUTH_PORT} --strictPort`,
      url: `http://127.0.0.1:${AUTH_PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { VITE_SUPABASE_URL: "http://127.0.0.1:54399", VITE_SUPABASE_ANON_KEY: "e2e-anon-key", VITE_AUTH_EXCHANGE_URL: "http://127.0.0.1:54399/session" },
    },
  ],
});
