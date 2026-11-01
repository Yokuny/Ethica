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
// Geist e Geist Mono são servidas localmente via theme.css.
import './index.css';
import { queryClient, router } from './router.js';

// PWA (AD-128): o service worker só no build de produção; o dev server do Vite não o usa.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root não encontrado.');

// Toaster montado uma única vez na raiz (T11) — toast() de qualquer tela
// (ex.: erro do kanban, WEB-03) renderiza aqui, fora da árvore de rotas.
// TanStackDevtools (idem, montado uma única vez): removeDevtoolsOnBuild do
// plugin @tanstack/devtools-vite (vite.config.ts) já tira isto do bundle de
// produção sozinho, sem guard de import.meta.env.DEV aqui.
createRoot(rootElement).render(
  <StrictMode>
    {/* Sonner lê useTheme() do pacote compartilhado. O provider fixa "light"
        para que toast e controles nativos acompanhem o tema claro único. */}
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
