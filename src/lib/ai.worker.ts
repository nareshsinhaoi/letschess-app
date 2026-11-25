import { findBestMove } from "./engine";
import type { Difficulty } from "./types";

self.onmessage = (e: MessageEvent<{ id: number; fen: string; difficulty: Difficulty }>) => {
  const { id, fen, difficulty } = e.data;
  try {
    const result = findBestMove(fen, difficulty);
    (self as unknown as Worker).postMessage({ id, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
