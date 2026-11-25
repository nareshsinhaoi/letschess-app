import { useEffect, useRef } from "react";
import type { Move } from "chess.js";

export function MoveList({
  history,
  current,
  onSelect,
}: {
  history: Move[];
  current: number;
  onSelect: (ply: number) => void;
}) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector(".mv.is-current");
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [current, history.length]);

  if (history.length === 0)
    return <p className="moves-empty">Moves appear here in standard notation as you play.</p>;

  const rows = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push(
      <li key={i} className="mv-row">
        <span className="mv-num">{i / 2 + 1}.</span>
        {[i, i + 1].map((k) =>
          history[k] ? (
            <button
              key={k}
              className={`mv ${current === k + 1 ? "is-current" : ""}`}
              onClick={() => onSelect(k + 1)}
            >
              {history[k].san}
            </button>
          ) : (
            <span key={k} className="mv mv-blank" />
          ),
        )}
      </li>,
    );
  }
  return (
    <ol className="moves" ref={ref}>
      {rows}
    </ol>
  );
}
