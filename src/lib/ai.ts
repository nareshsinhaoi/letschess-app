import type { Difficulty } from "./types";
import type { SearchResult } from "./engine";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (r: SearchResult | null) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./ai.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; result?: SearchResult | null; error?: string }>) => {
      const resolve = pending.get(e.data.id);
      pending.delete(e.data.id);
      resolve?.(e.data.result ?? null);
    };
  }
  return worker;
}

/** Ask the engine for a move. Always takes at least `minMs` so replies feel considered. */
export async function requestAiMove(fen: string, difficulty: Difficulty, minMs = 450): Promise<SearchResult | null> {
  const id = ++seq;
  const started = performance.now();
  const result = await new Promise<SearchResult | null>((resolve) => {
    pending.set(id, resolve);
    getWorker().postMessage({ id, fen, difficulty });
  });
  const elapsed = performance.now() - started;
  if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
  return result;
}

/** Drop any in-flight request (e.g. on undo/restart) so a stale reply is ignored. */
export function cancelAi() {
  for (const resolve of pending.values()) resolve(null);
  pending.clear();
}
