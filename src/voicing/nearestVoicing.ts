import type { VoicingEngine } from "../core/contracts";
import { resolveVoicingNearest } from "../pitches";

/** 就近声部连接 + 参考音区惩罚（与现有 pitches 一致） */
export const nearestVoicingEngine: VoicingEngine = {
  id: "nearest-register",
  label: "就近 + 参考音区",
  resolve(prev, chord) {
    return resolveVoicingNearest(prev, chord.rootPc, chord.kind);
  },
};
