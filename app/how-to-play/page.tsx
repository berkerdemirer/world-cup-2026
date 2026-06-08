import { AppShell } from "@/components/app-shell";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/scoring";
import { CalendarDays, GitFork, Trophy, Lock, Sparkles } from "lucide-react";

export default async function HowToPlayPage() {
  await requireUser();
  const s = await getSettings();

  return (
    <AppShell>
      <PageHeader
        title="Rules"
        subtitle="Predict matches, fill your bracket, climb the table."
      />

      {/* The two ways to score */}
      <div className="mb-2 grid gap-3 md:grid-cols-2">
        <OverviewCard
          Icon={CalendarDays}
          title="Predict the scores"
          body="Call the final score of every match. The closer you are, the more you bank."
        />
        <OverviewCard
          Icon={GitFork}
          title="Fill your bracket"
          body="Pick who reaches each knockout round. Later rounds pay more."
        />
      </div>

      {/* Match prediction scoring */}
      <SectionLabel>Match predictions</SectionLabel>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-ink/70">
        Each match scores the <span className="font-semibold text-ink">single highest tier</span> it
        qualifies for.
      </p>
      <div className="flex flex-col gap-2.5">
        <TierRow
          pill={<TierPill cls="bg-brand text-brand-foreground" pts={s.ptsExact} label="Exact" />}
          title="Exact score"
          desc="You nailed the precise scoreline."
          example="Predicted 2–1, final was 2–1."
        />
        <TierRow
          pill={<TierPill cls="bg-royal text-white" pts={s.ptsGoalDiff} label="+GD" />}
          title="Goal difference"
          desc="Right winner and right margin, wrong scoreline."
          example="Predicted 2–1, final was 3–2."
        />
        <TierRow
          pill={<TierPill cls="bg-line text-ink" pts={s.ptsOutcome} label="Result" />}
          title="Right result"
          desc="Correct winner or draw, but missed the margin."
          example="Predicted 3–0, final was 1–0 — or a draw you called wrong, like 1–1 finishing 2–2."
        />
        <TierRow
          pill={<TierPill cls="bg-line/70 text-muted-foreground" pts={0} label="Miss" />}
          title="Miss"
          desc="Wrong result."
          example="Predicted a home win, the away side won."
        />
      </div>
      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">Note</span> Knockout matches are
        scored on the final result <span className="font-semibold text-ink">including extra time</span>{" "}
        — penalty shoot-outs don&rsquo;t count toward the score.
      </p>

      {/* Bracket scoring */}
      <SectionLabel>Bracket</SectionLabel>
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-ink/70">
        You score for <span className="font-semibold text-ink">every team you place in the right
        round</span>.
      </p>
      <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Round</th>
              <th className="px-4 py-3 text-center">Teams to pick</th>
              <th className="px-4 py-3 text-center">Points each</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <BracketRow round="Round of 16" pick={16} points={s.ptsBracketR16} />
            <BracketRow round="Quarter-finalists" pick={8} points={s.ptsBracketQf} />
            <BracketRow round="Semi-finalists" pick={4} points={s.ptsBracketSf} />
            <BracketRow round="Finalists" pick={2} points={s.ptsBracketFinal} />
            <BracketRow round="Champion" pick={1} points={s.ptsBracketWinner} highlight />
          </tbody>
        </table>
      </div>

      {/* Leaderboard */}
      <SectionLabel>The table</SectionLabel>
      <div className="grid gap-3 md:grid-cols-2">
        <OverviewCard
          Icon={Trophy}
          title="Total = match + bracket"
          body="The Table ranks everyone by their combined points."
        />
        <OverviewCard
          Icon={Trophy}
          title="Breaking ties"
          body="Most exact scores wins. Still tied? Whoever joined first."
        />
      </div>

      {/* Locks & timing */}
      <SectionLabel>When things lock</SectionLabel>
      <div className="flex flex-col gap-2.5">
        <TierRow
          pill={<LockPill />}
          title="Matches lock at kickoff"
          desc="Edit a prediction any time before the match starts."
        />
        <TierRow
          pill={<LockPill />}
          title="Bracket locks when the knockouts begin"
          desc="Get every round in before the knockout stage kicks off."
        />
      </div>

      {/* Tip */}
      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-ink px-5 py-4 text-white">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" strokeWidth={2.25} />
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">Short on time?</span> Hit{" "}
          <span className="font-semibold text-brand">&ldquo;I&rsquo;m feeling lucky&rdquo;</span> on
          Fixtures to auto-fill every open match, then tweak.
        </p>
      </div>
    </AppShell>
  );
}

function OverviewCard({
  Icon,
  title,
  body,
}: {
  Icon: typeof CalendarDays;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 grid size-10 place-items-center rounded-xl bg-brand text-brand-foreground">
        <Icon className="size-5" strokeWidth={2.25} />
      </div>
      <h3 className="display text-xl uppercase leading-none text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function TierRow({
  pill,
  title,
  desc,
  example,
}: {
  pill: React.ReactNode;
  title: string;
  desc: string;
  example?: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-card px-4 py-3.5 shadow-sm ring-1 ring-black/5 md:px-5">
      <div className="shrink-0 pt-0.5">{pill}</div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-ink">{title}</div>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
        {example && (
          <p className="mt-1.5 text-xs font-medium text-ink/60">
            <span className="font-semibold uppercase tracking-wide">e.g.</span> {example}
          </p>
        )}
      </div>
    </div>
  );
}

function TierPill({ cls, pts, label }: { cls: string; pts: number; label: string }) {
  return (
    <span
      className={`flex w-[5.5rem] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${cls}`}
    >
      <span className="text-sm font-black normal-case">{pts > 0 ? `+${pts}` : "0"}</span>
      {label}
    </span>
  );
}

function LockPill() {
  return (
    <span className="grid size-9 place-items-center rounded-xl bg-line text-ink">
      <Lock className="size-4" strokeWidth={2.25} />
    </span>
  );
}

function BracketRow({
  round,
  pick,
  points,
  highlight,
}: {
  round: string;
  pick: number;
  points: number;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "bg-brand/10" : ""}>
      <td className="px-4 py-3 font-semibold text-ink">{round}</td>
      <td className="px-4 py-3 text-center text-muted-foreground">{pick}</td>
      <td className="px-4 py-3 text-center">
        <span className="display text-lg text-ink">{points}</span>
      </td>
    </tr>
  );
}
