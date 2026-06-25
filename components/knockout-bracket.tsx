"use client";

import { Bracket } from "bracketkit";
import { KnockoutMatchSlot } from "@/components/knockout-match-slot";
import { getThirdPlaceMatch, toBracketkitRounds } from "@/lib/knockout-bracket-data";
import type { KnockoutRound } from "@/lib/queries";

export function KnockoutBracket({ rounds }: { rounds: KnockoutRound[] }) {
  const bracketRounds = toBracketkitRounds(rounds);
  const thirdPlace = getThirdPlaceMatch(rounds);

  if (bracketRounds.length === 0) return null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Scroll horizontally to follow the bracket from the Round of 32 to the final.
      </p>
      <div className="overflow-x-auto rounded-2xl bg-card/40 p-4 ring-1 ring-black/5 md:p-6">
        <Bracket
          rounds={bracketRounds}
          matchWidth={220}
          connectorWidth={48}
          matchGap={12}
          className="[--bracket-connector-color:#9c978c] [--bracket-connector-width:2px]"
          renderRoundHeader={(round) => (
            <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {round.name}
            </div>
          )}
          renderMatch={(match) => <KnockoutMatchSlot match={match} />}
        />
      </div>

      {thirdPlace && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="display text-xl uppercase text-ink">Third-place play-off</h2>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="inline-block overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5">
            <KnockoutMatchSlot match={thirdPlace} />
          </div>
        </section>
      )}
    </div>
  );
}
