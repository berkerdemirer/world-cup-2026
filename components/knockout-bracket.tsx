import { STAGE_LABELS } from "@/lib/format";
import {
  BRACKET_CONNECTOR_WIDTH_PX,
  BRACKET_SLOT_HEIGHT_PX,
  BRACKET_SLOT_WIDTH_PX,
  bracketColumnHeight,
  bracketSlotTop,
  type BracketHalf,
  type KnockoutBracketLayout,
} from "@/lib/knockout-bracket-layout";
import type { KnockoutRound } from "@/lib/queries";
import { KnockoutMatchSlot } from "@/components/knockout-match-slot";

function BracketConnectors({
  roundIndex,
  matchCount,
  side,
}: {
  roundIndex: number;
  matchCount: number;
  side: "left" | "right";
}) {
  const height = bracketColumnHeight(matchCount);
  const pairs = matchCount / 2 ** (roundIndex + 1);

  return (
    <div
      className="relative shrink-0"
      style={{ width: BRACKET_CONNECTOR_WIDTH_PX, height }}
      aria-hidden="true"
    >
      {Array.from({ length: pairs }, (_, pairIndex) => {
        const topA = bracketSlotTop(roundIndex, pairIndex * 2);
        const topB = bracketSlotTop(roundIndex, pairIndex * 2 + 1);
        const centerA = topA + BRACKET_SLOT_HEIGHT_PX / 2;
        const centerB = topB + BRACKET_SLOT_HEIGHT_PX / 2;
        const midY = (centerA + centerB) / 2;

        return (
          <div key={pairIndex} className="pointer-events-none absolute inset-x-0" style={{ height }}>
            <div
              className="absolute border-line"
              style={{
                top: centerA,
                height: centerB - centerA,
                ...(side === "left"
                  ? { left: "50%", right: 0, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1 }
                  : { left: 0, right: "50%", borderTopWidth: 1, borderLeftWidth: 1, borderBottomWidth: 1 }),
              }}
            />
            <div
              className="absolute h-px bg-line"
              style={{
                top: midY,
                ...(side === "left" ? { left: "50%", right: 0 } : { left: 0, right: "50%" }),
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function BracketColumn({
  round,
  roundIndex,
  matchCount,
}: {
  round: KnockoutRound;
  roundIndex: number;
  matchCount: number;
}) {
  const height = bracketColumnHeight(matchCount);

  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {STAGE_LABELS[round.stage]}
      </div>
      <div className="relative" style={{ height, width: BRACKET_SLOT_WIDTH_PX }}>
        {round.matches.map((match, matchIndex) => (
          <div
            key={match.id}
            className="absolute left-0"
            style={{ top: bracketSlotTop(roundIndex, matchIndex), width: BRACKET_SLOT_WIDTH_PX }}
          >
            <KnockoutMatchSlot match={match} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketHalfView({ half, side }: { half: BracketHalf; side: "left" | "right" }) {
  if (half.rounds.length === 0) return null;

  const matchCount = half.rounds[0].matches.length;
  const columns =
    side === "left"
      ? half.rounds.map((round, roundIndex) => ({ round, roundIndex }))
      : [...half.rounds].reverse().map((round, roundIndex) => ({
          round,
          roundIndex: half.rounds.length - 1 - roundIndex,
        }));

  return (
    <div className={`flex shrink-0 items-start ${side === "right" ? "flex-row-reverse" : ""}`}>
      {columns.map(({ round, roundIndex }, i) => (
        <div key={round.stage} className="flex items-start">
          <BracketColumn round={round} roundIndex={roundIndex} matchCount={matchCount} />
          {i < columns.length - 1 && (
            <BracketConnectors roundIndex={roundIndex} matchCount={matchCount} side={side} />
          )}
        </div>
      ))}
    </div>
  );
}

function CenterColumn({ layout }: { layout: KnockoutBracketLayout }) {
  const matchCount = layout.left.rounds[0]?.matches.length ?? 1;
  const height = bracketColumnHeight(matchCount);
  const finalMatch = layout.final?.matches[0];
  const thirdMatch = layout.thirdPlace?.matches[0];
  const finalTop = bracketSlotTop(Math.log2(matchCount), 0);

  return (
    <div className="flex shrink-0 flex-col items-center px-3">
      <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {layout.final ? STAGE_LABELS.FINAL : "Final"}
      </div>
      <div className="relative" style={{ height, width: BRACKET_SLOT_WIDTH_PX }}>
        {finalMatch && (
          <div className="absolute left-0" style={{ top: finalTop, width: BRACKET_SLOT_WIDTH_PX }}>
            <KnockoutMatchSlot match={finalMatch} />
          </div>
        )}
        {thirdMatch && (
          <div
            className="absolute left-0"
            style={{ top: finalTop + BRACKET_SLOT_HEIGHT_PX + 24, width: BRACKET_SLOT_WIDTH_PX }}
          >
            <div className="mb-1 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {STAGE_LABELS.THIRD_PLACE}
            </div>
            <KnockoutMatchSlot match={thirdMatch} />
          </div>
        )}
      </div>
    </div>
  );
}

function SemiFinalBridge({ matchCount }: { matchCount: number }) {
  const height = bracketColumnHeight(matchCount);
  const y = bracketSlotTop(Math.log2(matchCount), 0) + BRACKET_SLOT_HEIGHT_PX / 2;

  return (
    <div
      className="relative min-w-6 flex-1"
      style={{ height, minWidth: BRACKET_CONNECTOR_WIDTH_PX }}
      aria-hidden="true"
    >
      <div className="absolute right-0 left-0 h-px bg-line" style={{ top: y }} />
    </div>
  );
}

export function KnockoutBracket({ layout }: { layout: KnockoutBracketLayout }) {
  const matchCount = layout.left.rounds[0]?.matches.length ?? 0;
  const height = bracketColumnHeight(matchCount);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground lg:hidden">
        Scroll horizontally to follow the full bracket from the Round of 32 to the final.
      </p>
      <div className="overflow-x-auto rounded-2xl bg-card/40 p-4 ring-1 ring-black/5 lg:p-6">
        <div
          className="flex w-full min-w-max items-start justify-between gap-2 lg:gap-0"
          style={{ minHeight: height + 48 }}
        >
          <BracketHalfView half={layout.left} side="left" />
          <SemiFinalBridge matchCount={matchCount} />
          <CenterColumn layout={layout} />
          <SemiFinalBridge matchCount={matchCount} />
          <BracketHalfView half={layout.right} side="right" />
        </div>
      </div>
    </div>
  );
}
