import { createFileRoute, Outlet } from '@tanstack/react-router';
import { PublicFooter } from './@components/public-footer.js';

// Purely visual pathless layout (no guard): every public page closes with the same footer.
function PublicLayout() {
  return (
    <main className="flex min-h-dvh w-full min-w-0 flex-col bg-background px-4 py-6 md:px-6">
      <Outlet />
      <PublicFooter />
    </main>
  );
}

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});
