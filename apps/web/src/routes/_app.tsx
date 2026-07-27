import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

/**
 * Pathless layout route: everything nested under _app renders inside AppShell,
 * which provides the sidebar, header, and command palette host.
 */
export const Route = createFileRoute("/_app")({
  component: () => <AppShell />,
});

// Silence unused import if we later remove AppShell; explicit re-export intentional.
export { Outlet };
