import type { ChordResolver } from "../core/contracts";
import { resolveChord } from "../harmony";

/** 大调调内三和弦/七和弦体系（当前默认行为） */
export const majorDiatonicResolver: ChordResolver = {
  id: "major-diatonic",
  label: "大调调内",
  resolve: resolveChord,
};
