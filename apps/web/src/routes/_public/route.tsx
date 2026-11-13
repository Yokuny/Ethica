import { createFileRoute, Outlet } from '@tanstack/react-router';

// Purely visual pathless layout (no guard).
function PublicLayout() {
  return (
    <main className="flex min-h-dvh w-full min-w-0 flex-col bg-background px-4 py-6 md:px-6">
      <Outlet />
    </main>
  );
}

export const Route = createFileRoute('/_public')({
  component: PublicLayout,
});
