import { Toaster } from '@ethica/ui/components/sonner';
import { TooltipProvider } from '@ethica/ui/components/tooltip';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { ThemeProvider } from 'next-themes';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Geist and Geist Mono are served locally through theme.css.
import './index.css';
import { queryClient, router } from './router.js';

// PWA (AD-128): the service worker only in the production build; the Vite dev server does not use it.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root não encontrado.');

// Toaster mounted only once at the root (T11) — toast() from any screen
// (e.g. kanban error, WEB-03) renders here, outside the route tree.
// TanStackDevtools (likewise, mounted only once): removeDevtoolsOnBuild of the
// @tanstack/devtools-vite plugin (vite.config.ts) already strips this from the production
// bundle by itself, without an import.meta.env.DEV guard here.
createRoot(rootElement).render(
  <StrictMode>
    {/* Sonner reads useTheme() from the shared package. The provider pins "light"
        so toast and native controls follow the single light theme. */}
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster />
          <TanStackDevtools
            config={{ hideUntilHover: true }}
            plugins={[
              { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
              { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel router={router} /> },
            ]}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
