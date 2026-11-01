import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Port 15173 matches the api CORS_ORIGIN (.env.example) — the back-end only
// accepts credentials:'include' from that origin. `strictPort` is required because
// of that: without it Vite silently falls back to 15174 when 15173 is
// taken (an orphan dev server is enough), and then EVERY call dies with
// "CORS Allow Origin Not Matching Origin" — an error that points to the back-end and
// hides the real cause. With strictPort the dev server fails loudly, saying
// which port is taken. envDir points to the single .env at the
// monorepo root (same file the api reads through
// process.env) — without it, client.api.ts does not find VITE_API_URL and every
// call fails with "Não foi possível conectar ao servidor".
//
// devtools() MUST be the FIRST plugin (official docs) — it instruments the
// other plugins/transforms for source inspection (go-to-source) and injects the
// console piping before any other transformation runs.
// removeDevtoolsOnBuild (default true) already strips TanStackDevtools/panels from the
// production bundle by itself — main.tsx imports/mounts without a manual guard of
// import.meta.env.DEV.
//
// tanstackRouter() MUST come before react() (same order as the reference
// front) — the plugin rewrites the routes before the Babel/SWC of
// @vitejs/plugin-react processes the files (AD-030).
export default defineConfig({
  plugins: [
    devtools(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routeFileIgnorePrefix: '@',
      // *.unit.test.ts(x) sits next to the route file (not in @something/)
      // — without it, the plugin warns "does not export a Route" for each one
      // of them on every build/dev (the warning ignores Vite --logLevel, it goes
      // direto no stdout).
      routeFileIgnorePattern: '\\.unit\\.test\\.tsx?$',
      semicolons: true,
    }),
    react(),
    tailwindcss(),
  ],
  envDir: '../../',
  // The prebundle changes the devtools-ui import.meta.url to .vite/deps and
  // breaks the relative font paths (the request gets HTML).
  // Keep the original module so Vite resolves the package assets.
  optimizeDeps: {
    exclude: ['@tanstack/react-devtools', '@tanstack/devtools', '@tanstack/devtools-ui'],
    include: ['@tanstack/react-devtools > @tanstack/devtools > @tanstack/devtools-ui > dayjs'],
  },
  server: { port: 15173, strictPort: true },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
