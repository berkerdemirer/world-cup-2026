export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Vercel/Neon expose DATABASE_URL at runtime, not during `next build` — see app/layout.tsx.
  if (!process.env.DATABASE_URL) return;

  const { runMigrations } = await import("./lib/migrate");
  await runMigrations();
}
