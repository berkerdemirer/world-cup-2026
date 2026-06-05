import { requireUser } from "@/lib/session";
import { Nav } from "./nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Nav displayName={session.displayName} isAdmin={!!session.isAdmin} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
